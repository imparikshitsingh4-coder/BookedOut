-- BookedOut core schema.
-- Tables: profiles, businesses, business_members, customers.
-- RLS policies live in 20261121090200_rls_policies.sql so they can be reviewed
-- separately from the data model.

create type public.business_role as enum ('owner', 'admin', 'staff');

comment on type public.business_role is
  'Role of a user inside a business. owner: full control, admin: manages team/customers, staff: day-to-day work.';

-- Keep updated_at honest on every table that has it.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth.users row
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (full_name is null or char_length(btrim(full_name)) between 1 and 120),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 2048),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Application profile for each authenticated user. Created automatically on sign-up.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])$'),
  description text check (description is null or char_length(description) <= 2000),
  contact_email text check (contact_email is null or contact_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  contact_phone text check (contact_phone is null or char_length(contact_phone) <= 32),
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 64),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.businesses is 'A tenant: the small business using BookedOut. All customer data is scoped to one business.';

create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- business_members: which user belongs to which business, with a role
-- ---------------------------------------------------------------------------
create table public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.business_role not null default 'staff',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_members_business_id_user_id_key unique (business_id, user_id)
);

comment on table public.business_members is 'Membership of a user in a business. The membership row is the source of truth for authorization.';

create index business_members_user_id_idx on public.business_members (user_id);
create index business_members_business_id_idx on public.business_members (business_id);

create trigger business_members_set_updated_at
  before update on public.business_members
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- customers: scoped to exactly one business
-- ---------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 1 and 160),
  email text check (email is null or char_length(email) <= 254),
  phone text check (phone is null or char_length(phone) <= 32),
  notes text check (notes is null or char_length(notes) <= 5000),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.customers is 'Customers belonging to a business. Never visible across businesses.';

-- One customer per email address per business (case-insensitive); customers
-- without an email are allowed in any number.
create unique index customers_business_id_email_key
  on public.customers (business_id, lower(email))
  where email is not null;

create index customers_business_id_idx on public.customers (business_id);

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Automatic rows
-- ---------------------------------------------------------------------------

-- Every new auth user gets a profile. SECURITY DEFINER so it can write to
-- public.profiles regardless of the caller's policies; it is owned by the
-- migration role, which bypasses RLS on this table.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The creator of a business becomes its owner, so the first member always exists
-- and no client-side claim of ownership is trusted.
create or replace function public.handle_new_business()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.business_members (business_id, user_id, role)
    values (new.id, new.created_by, 'owner')
    on conflict (business_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_business_created
  after insert on public.businesses
  for each row execute function public.handle_new_business();
