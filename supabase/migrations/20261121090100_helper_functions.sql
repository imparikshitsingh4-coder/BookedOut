-- Membership helpers used by the Row Level Security policies.
--
-- They are SECURITY DEFINER so a policy on business_members can ask "is this user
-- a member?" without re-entering business_members' own policies (which Postgres
-- would otherwise reject as infinite recursion). search_path is pinned and
-- execute rights are limited to authenticated users.

create or replace function public.is_business_member(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.business_members m
    where m.business_id = target_business_id
      and m.user_id = (select auth.uid())
  );
$$;

comment on function public.is_business_member(uuid) is
  'True when the current user is a member (any role) of the given business.';

create or replace function public.has_business_role(target_business_id uuid, allowed_roles public.business_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.business_members m
    where m.business_id = target_business_id
      and m.user_id = (select auth.uid())
      and m.role = any (allowed_roles)
  );
$$;

comment on function public.has_business_role(uuid, public.business_role[]) is
  'True when the current user holds one of the given roles in the given business.';

create or replace function public.shares_business_with(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.business_members me
    join public.business_members them on them.business_id = me.business_id
    where me.user_id = (select auth.uid())
      and them.user_id = target_user_id
  );
$$;

comment on function public.shares_business_with(uuid) is
  'True when the current user and the target user both belong to at least one common business.';

-- Functions are not executable by PUBLIC/anon; policies only ever run them for
-- authenticated requests.
revoke execute on function public.is_business_member(uuid) from public;
revoke execute on function public.has_business_role(uuid, public.business_role[]) from public;
revoke execute on function public.shares_business_with(uuid) from public;

grant execute on function public.is_business_member(uuid) to authenticated;
grant execute on function public.has_business_role(uuid, public.business_role[]) to authenticated;
grant execute on function public.shares_business_with(uuid) to authenticated;
