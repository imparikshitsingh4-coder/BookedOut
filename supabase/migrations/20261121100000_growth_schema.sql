-- BookedOut growth schema: CRM pipeline, follow-ups, reviews, referrals,
-- marketing content, creative studio designs, brand kits and subscriptions.
--
-- Every table is a tenant table: it belongs to exactly one business and is
-- protected by RLS in 20261121100100_growth_rls.sql.

create type public.customer_status as enum ('lead', 'active', 'vip', 'inactive');
create type public.follow_up_channel as enum ('whatsapp', 'call', 'email', 'in_person');
create type public.follow_up_status as enum ('pending', 'done', 'snoozed');
create type public.review_status as enum ('requested', 'received', 'responded');
create type public.referral_status as enum ('invited', 'signed_up', 'converted', 'rewarded');
create type public.content_status as enum ('idea', 'draft', 'scheduled', 'published');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled');

-- ---------------------------------------------------------------------------
-- Existing tables: extra business profile + CRM fields
-- ---------------------------------------------------------------------------
alter table public.businesses
  add column industry text check (industry is null or char_length(industry) <= 80),
  add column website text check (website is null or char_length(website) <= 2048),
  add column whatsapp_number text check (whatsapp_number is null or char_length(whatsapp_number) <= 32),
  add column logo_url text check (logo_url is null or char_length(logo_url) <= 500000);

alter table public.customers
  add column status public.customer_status not null default 'lead',
  add column tags text[] not null default '{}',
  add column last_contacted_at timestamptz,
  add column whatsapp_opt_in boolean not null default true;

create index customers_business_status_idx on public.customers (business_id, status);

-- ---------------------------------------------------------------------------
-- follow_ups: the reminder queue
-- ---------------------------------------------------------------------------
create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  notes text check (notes is null or char_length(notes) <= 2000),
  channel public.follow_up_channel not null default 'whatsapp',
  status public.follow_up_status not null default 'pending',
  due_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index follow_ups_business_due_idx on public.follow_ups (business_id, status, due_at);
create index follow_ups_customer_idx on public.follow_ups (customer_id);

create trigger follow_ups_set_updated_at
  before update on public.follow_ups
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- reviews: review requests, received ratings and public replies
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  rating smallint check (rating is null or (rating between 1 and 5)),
  comment text check (comment is null or char_length(comment) <= 4000),
  response text check (response is null or char_length(response) <= 4000),
  status public.review_status not null default 'requested',
  requested_at timestamptz not null default now(),
  received_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reviews_business_status_idx on public.reviews (business_id, status);

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- referrals
-- ---------------------------------------------------------------------------
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  referrer_customer_id uuid references public.customers (id) on delete set null,
  referred_name text not null check (char_length(btrim(referred_name)) between 1 and 160),
  referred_phone text check (referred_phone is null or char_length(referred_phone) <= 32),
  referred_email text check (referred_email is null or char_length(referred_email) <= 254),
  code text not null check (char_length(code) between 3 and 24),
  status public.referral_status not null default 'invited',
  reward_note text check (reward_note is null or char_length(reward_note) <= 500),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint referrals_business_code_key unique (business_id, code)
);

create index referrals_business_status_idx on public.referrals (business_id, status);

create trigger referrals_set_updated_at
  before update on public.referrals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- marketing: campaigns and the content calendar
-- ---------------------------------------------------------------------------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  goal text check (goal is null or char_length(goal) <= 500),
  audience text check (audience is null or char_length(audience) <= 500),
  message text check (message is null or char_length(message) <= 4000),
  status public.content_status not null default 'draft',
  starts_on date,
  ends_on date,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index campaigns_business_idx on public.campaigns (business_id, status);

create trigger campaigns_set_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

create table public.marketing_posts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete set null,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  caption text not null check (char_length(caption) between 1 and 4000),
  hashtags text check (hashtags is null or char_length(hashtags) <= 1000),
  platform text not null default 'instagram' check (platform in ('instagram', 'facebook', 'whatsapp', 'tiktok', 'linkedin', 'email')),
  status public.content_status not null default 'draft',
  scheduled_for timestamptz,
  published_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index marketing_posts_business_date_idx on public.marketing_posts (business_id, scheduled_for);

create trigger marketing_posts_set_updated_at
  before update on public.marketing_posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- brand_kits: one brand identity per business
-- ---------------------------------------------------------------------------
create table public.brand_kits (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  logo_url text check (logo_url is null or char_length(logo_url) <= 500000),
  primary_color text not null default '#2559c7' check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  secondary_color text not null default '#0f172a' check (secondary_color ~ '^#[0-9a-fA-F]{6}$'),
  accent_color text not null default '#f59e0b' check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  heading_font text not null default 'Inter' check (char_length(heading_font) between 1 and 80),
  body_font text not null default 'Inter' check (char_length(body_font) between 1 and 80),
  tone text check (tone is null or char_length(tone) <= 200),
  signature text check (signature is null or char_length(signature) <= 500),
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger brand_kits_set_updated_at
  before update on public.brand_kits
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- designs: saved Creative Studio posters, stored as editable layers
-- ---------------------------------------------------------------------------
create table public.designs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  width integer not null default 1080 check (width between 200 and 4000),
  height integer not null default 1350 check (height between 200 and 4000),
  data jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index designs_business_idx on public.designs (business_id, created_at desc);

create trigger designs_set_updated_at
  before update on public.designs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- subscriptions: billing state. `provider = 'test'` is explicit test mode.
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses (id) on delete cascade,
  plan text not null default 'starter' check (plan in ('starter', 'growth', 'pro')),
  status public.subscription_status not null default 'trialing',
  provider text not null default 'test' check (char_length(provider) between 1 and 40),
  provider_customer_id text,
  provider_subscription_id text,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- platform_admins: BookedOut staff. Rows are added with SQL, never through the
-- app; RLS only lets a user see their own row, so admins cannot be enumerated.
-- ---------------------------------------------------------------------------
create table public.platform_admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Security-definer so policies on tenant tables can ask "is this a platform
-- admin?" without needing SELECT on platform_admins.
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_admins a where a.user_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Reviews and follow-ups keep customer freshness in sync with real activity.
-- ---------------------------------------------------------------------------
create or replace function public.mark_customer_contacted(target_customer_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.customers
  set last_contacted_at = now()
  where id = target_customer_id
    and public.is_business_member(business_id);
$$;

revoke execute on function public.mark_customer_contacted(uuid) from public;
grant execute on function public.mark_customer_contacted(uuid) to authenticated;
