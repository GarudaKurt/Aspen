-- Provider onboarding consistency guards.
-- The current Tenant Dashboard supports one registered business per provider.
-- Stop rather than silently changing data if legacy duplicates already exist.

do $$
begin
  if exists (
    select 1
    from public.businesses
    group by owner_id
    having count(*) > 1
  ) then
    raise exception
      'Duplicate businesses exist for at least one provider; resolve them before applying 0020_provider_onboarding_guards.sql';
  end if;
end;
$$;

create unique index if not exists businesses_one_owner_idx
  on public.businesses(owner_id);
