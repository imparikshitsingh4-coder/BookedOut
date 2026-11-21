-- Defaults created with every business: a brand kit, a test-mode subscription,
-- and a review-link field used by review requests and the QR generator.

alter table public.businesses
  add column review_link text check (review_link is null or char_length(review_link) <= 2048);

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

  insert into public.brand_kits (business_id, updated_by)
  values (new.id, new.created_by)
  on conflict (business_id) do nothing;

  insert into public.subscriptions (business_id, plan, status, provider, trial_ends_at)
  values (new.id, 'starter', 'trialing', 'test', now() + interval '14 days')
  on conflict (business_id) do nothing;

  return new;
end;
$$;

-- Backfill for businesses created before this migration.
insert into public.brand_kits (business_id, updated_by)
select b.id, b.created_by from public.businesses b
on conflict (business_id) do nothing;

insert into public.subscriptions (business_id, plan, status, provider, trial_ends_at)
select b.id, 'starter', 'trialing', 'test', now() + interval '14 days' from public.businesses b
on conflict (business_id) do nothing;
