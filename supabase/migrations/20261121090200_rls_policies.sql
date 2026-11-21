-- Row Level Security for BookedOut.
--
-- Principles:
--   * anonymous visitors have no table access at all;
--   * every tenant row is reachable only through membership in the business;
--   * writes that change who can do what (memberships, business settings) require
--     owner or admin;
--   * nobody can grant themselves a role: the WITH CHECK clauses below only allow
--     the roles the caller is entitled to assign.

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.customers enable row level security;

-- Supabase grants new tables to anon/authenticated by default; remove anon.
revoke all on table public.profiles from anon;
revoke all on table public.businesses from anon;
revoke all on table public.business_members from anon;
revoke all on table public.customers from anon;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.businesses to authenticated;
grant select, insert, update, delete on table public.business_members to authenticated;
grant select, insert, update, delete on table public.customers to authenticated;

grant all on table public.profiles to service_role;
grant all on table public.businesses to service_role;
grant all on table public.business_members to service_role;
grant all on table public.customers to service_role;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
-- A user can read their own profile.
create policy "profiles select own"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

-- Team screens need the names of colleagues, so members of a shared business can
-- read each other's profiles. Nobody outside those businesses can.
create policy "profiles select business colleagues"
  on public.profiles for select
  to authenticated
  using (public.shares_business_with(id));

create policy "profiles update own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Profiles are created by the auth trigger only; no INSERT policy on purpose.

-- ---------------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------------
create policy "businesses select members"
  on public.businesses for select
  to authenticated
  using (public.is_business_member(id));

-- The creator can always read the business they just created. This also covers
-- `insert ... returning`, whose output is filtered by the SELECT policies before
-- the owner-membership trigger has fired.
create policy "businesses select creator"
  on public.businesses for select
  to authenticated
  using (created_by = (select auth.uid()));

-- Anyone signed in may create a business, but only as themselves.
create policy "businesses insert self as creator"
  on public.businesses for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "businesses update owners and admins"
  on public.businesses for update
  to authenticated
  using (public.has_business_role(id, array['owner', 'admin']::public.business_role[]))
  with check (public.has_business_role(id, array['owner', 'admin']::public.business_role[]));

create policy "businesses delete owners"
  on public.businesses for delete
  to authenticated
  using (public.has_business_role(id, array['owner']::public.business_role[]));

-- ---------------------------------------------------------------------------
-- business_members
-- ---------------------------------------------------------------------------
create policy "business_members select members"
  on public.business_members for select
  to authenticated
  using (public.is_business_member(business_id));

-- Owners may add anyone in any role; admins may add staff only.
create policy "business_members insert owners and admins"
  on public.business_members for insert
  to authenticated
  with check (
    public.has_business_role(business_id, array['owner']::public.business_role[])
    or (
      public.has_business_role(business_id, array['admin']::public.business_role[])
      and role = 'staff'
    )
  );

-- Owners may change any membership except their own owner row in a way that
-- removes the last owner; admins may only edit staff rows and keep them staff.
create policy "business_members update owners and admins"
  on public.business_members for update
  to authenticated
  using (
    public.has_business_role(business_id, array['owner']::public.business_role[])
    or (
      public.has_business_role(business_id, array['admin']::public.business_role[])
      and role = 'staff'
    )
  )
  with check (
    public.has_business_role(business_id, array['owner']::public.business_role[])
    or (
      public.has_business_role(business_id, array['admin']::public.business_role[])
      and role = 'staff'
    )
  );

-- Owner rows cannot be deleted through the API (this keeps a business from being
-- orphaned); admins can remove staff only.
create policy "business_members delete owners and admins"
  on public.business_members for delete
  to authenticated
  using (
    (
      public.has_business_role(business_id, array['owner']::public.business_role[])
      and role <> 'owner'
    )
    or (
      public.has_business_role(business_id, array['admin']::public.business_role[])
      and role = 'staff'
    )
  );

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
create policy "customers select members"
  on public.customers for select
  to authenticated
  using (public.is_business_member(business_id));

create policy "customers insert members as themselves"
  on public.customers for insert
  to authenticated
  with check (
    public.is_business_member(business_id)
    and created_by = (select auth.uid())
  );

create policy "customers update members"
  on public.customers for update
  to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "customers delete owners and admins"
  on public.customers for delete
  to authenticated
  using (public.has_business_role(business_id, array['owner', 'admin']::public.business_role[]));
