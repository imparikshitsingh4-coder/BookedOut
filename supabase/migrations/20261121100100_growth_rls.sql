-- Row Level Security for the growth tables.
--
-- Same principles as the core schema: no anonymous access, every row is reached
-- through business membership, and destructive or identity-changing actions
-- require the owner (or admin) role.

alter table public.follow_ups enable row level security;
alter table public.reviews enable row level security;
alter table public.referrals enable row level security;
alter table public.campaigns enable row level security;
alter table public.marketing_posts enable row level security;
alter table public.brand_kits enable row level security;
alter table public.designs enable row level security;
alter table public.subscriptions enable row level security;
alter table public.platform_admins enable row level security;

revoke all on table public.follow_ups from anon;
revoke all on table public.reviews from anon;
revoke all on table public.referrals from anon;
revoke all on table public.campaigns from anon;
revoke all on table public.marketing_posts from anon;
revoke all on table public.brand_kits from anon;
revoke all on table public.designs from anon;
revoke all on table public.subscriptions from anon;
revoke all on table public.platform_admins from anon;

grant select, insert, update, delete on table public.follow_ups to authenticated;
grant select, insert, update, delete on table public.reviews to authenticated;
grant select, insert, update, delete on table public.referrals to authenticated;
grant select, insert, update, delete on table public.campaigns to authenticated;
grant select, insert, update, delete on table public.marketing_posts to authenticated;
grant select, insert, update, delete on table public.brand_kits to authenticated;
grant select, insert, update, delete on table public.designs to authenticated;
grant select, insert, update on table public.subscriptions to authenticated;
grant select on table public.platform_admins to authenticated;

grant all on table public.follow_ups to service_role;
grant all on table public.reviews to service_role;
grant all on table public.referrals to service_role;
grant all on table public.campaigns to service_role;
grant all on table public.marketing_posts to service_role;
grant all on table public.brand_kits to service_role;
grant all on table public.designs to service_role;
grant all on table public.subscriptions to service_role;
grant all on table public.platform_admins to service_role;

-- ---------------------------------------------------------------------------
-- follow_ups
-- ---------------------------------------------------------------------------
create policy "follow_ups select members"
  on public.follow_ups for select to authenticated
  using (public.is_business_member(business_id));

create policy "follow_ups insert members as themselves"
  on public.follow_ups for insert to authenticated
  with check (
    public.is_business_member(business_id)
    and created_by = (select auth.uid())
  );

create policy "follow_ups update members"
  on public.follow_ups for update to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "follow_ups delete owners and admins"
  on public.follow_ups for delete to authenticated
  using (public.has_business_role(business_id, array['owner', 'admin']::public.business_role[]));

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------
create policy "reviews select members"
  on public.reviews for select to authenticated
  using (public.is_business_member(business_id));

create policy "reviews insert members as themselves"
  on public.reviews for insert to authenticated
  with check (
    public.is_business_member(business_id)
    and created_by = (select auth.uid())
  );

create policy "reviews update members"
  on public.reviews for update to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "reviews delete owners and admins"
  on public.reviews for delete to authenticated
  using (public.has_business_role(business_id, array['owner', 'admin']::public.business_role[]));

-- ---------------------------------------------------------------------------
-- referrals
-- ---------------------------------------------------------------------------
create policy "referrals select members"
  on public.referrals for select to authenticated
  using (public.is_business_member(business_id));

create policy "referrals insert members as themselves"
  on public.referrals for insert to authenticated
  with check (
    public.is_business_member(business_id)
    and created_by = (select auth.uid())
  );

create policy "referrals update members"
  on public.referrals for update to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "referrals delete owners and admins"
  on public.referrals for delete to authenticated
  using (public.has_business_role(business_id, array['owner', 'admin']::public.business_role[]));

-- ---------------------------------------------------------------------------
-- campaigns
-- ---------------------------------------------------------------------------
create policy "campaigns select members"
  on public.campaigns for select to authenticated
  using (public.is_business_member(business_id));

create policy "campaigns insert members as themselves"
  on public.campaigns for insert to authenticated
  with check (
    public.is_business_member(business_id)
    and created_by = (select auth.uid())
  );

create policy "campaigns update members"
  on public.campaigns for update to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "campaigns delete owners and admins"
  on public.campaigns for delete to authenticated
  using (public.has_business_role(business_id, array['owner', 'admin']::public.business_role[]));

-- ---------------------------------------------------------------------------
-- marketing_posts
-- ---------------------------------------------------------------------------
create policy "marketing_posts select members"
  on public.marketing_posts for select to authenticated
  using (public.is_business_member(business_id));

create policy "marketing_posts insert members as themselves"
  on public.marketing_posts for insert to authenticated
  with check (
    public.is_business_member(business_id)
    and created_by = (select auth.uid())
  );

create policy "marketing_posts update members"
  on public.marketing_posts for update to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "marketing_posts delete owners and admins"
  on public.marketing_posts for delete to authenticated
  using (public.has_business_role(business_id, array['owner', 'admin']::public.business_role[]));

-- ---------------------------------------------------------------------------
-- brand_kits
-- ---------------------------------------------------------------------------
create policy "brand_kits select members"
  on public.brand_kits for select to authenticated
  using (public.is_business_member(business_id));

create policy "brand_kits insert owners and admins"
  on public.brand_kits for insert to authenticated
  with check (
    public.has_business_role(business_id, array['owner', 'admin']::public.business_role[])
    and updated_by = (select auth.uid())
  );

create policy "brand_kits update owners and admins"
  on public.brand_kits for update to authenticated
  using (public.has_business_role(business_id, array['owner', 'admin']::public.business_role[]))
  with check (public.has_business_role(business_id, array['owner', 'admin']::public.business_role[]));

create policy "brand_kits delete owners"
  on public.brand_kits for delete to authenticated
  using (public.has_business_role(business_id, array['owner']::public.business_role[]));

-- ---------------------------------------------------------------------------
-- designs
-- ---------------------------------------------------------------------------
create policy "designs select members"
  on public.designs for select to authenticated
  using (public.is_business_member(business_id));

create policy "designs insert members as themselves"
  on public.designs for insert to authenticated
  with check (
    public.is_business_member(business_id)
    and created_by = (select auth.uid())
  );

create policy "designs update members"
  on public.designs for update to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "designs delete owners and admins"
  on public.designs for delete to authenticated
  using (public.has_business_role(business_id, array['owner', 'admin']::public.business_role[]));

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------
create policy "subscriptions select members"
  on public.subscriptions for select to authenticated
  using (public.is_business_member(business_id));

-- Only the owner can start or change billing, and through the API only the
-- built-in test provider is allowed. A real provider is written by the trusted
-- server (service role) after its webhook is verified.
create policy "subscriptions insert owner test mode"
  on public.subscriptions for insert to authenticated
  with check (
    public.has_business_role(business_id, array['owner']::public.business_role[])
    and provider = 'test'
  );

create policy "subscriptions update owner test mode"
  on public.subscriptions for update to authenticated
  using (
    public.has_business_role(business_id, array['owner']::public.business_role[])
    and provider = 'test'
  )
  with check (
    public.has_business_role(business_id, array['owner']::public.business_role[])
    and provider = 'test'
  );

-- ---------------------------------------------------------------------------
-- platform_admins: a user may only see whether they are an admin.
-- ---------------------------------------------------------------------------
create policy "platform_admins select own"
  on public.platform_admins for select to authenticated
  using (user_id = (select auth.uid()));

-- Platform admins get read-only visibility across tenants for the admin
-- dashboard. They cannot write other businesses' data through these policies.
create policy "businesses select platform admins"
  on public.businesses for select to authenticated
  using (public.is_platform_admin());

create policy "customers select platform admins"
  on public.customers for select to authenticated
  using (public.is_platform_admin());

create policy "subscriptions select platform admins"
  on public.subscriptions for select to authenticated
  using (public.is_platform_admin());

create policy "profiles select platform admins"
  on public.profiles for select to authenticated
  using (public.is_platform_admin());
