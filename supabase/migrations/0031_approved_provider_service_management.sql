-- Business approval is sufficient: no separate service review or approval table.
begin;

create or replace function public.has_approved_business_application(p_business_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.provider_applications a
    join public.businesses b on b.id = a.business_id and b.owner_id = a.applicant_id
    join public.profiles p on p.id = b.owner_id and p.role = 'provider'
    where b.id = p_business_id and a.status = 'approved'
  );
$$;

create or replace function public.can_manage_business_services(p_business_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select public.is_business_owner(p_business_id)
    and public.has_approved_business_application(p_business_id)
    and exists (select 1 from public.businesses where id = p_business_id and status in ('pending','published'))
    and exists (select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null);
$$;

-- Permit only the legacy pending -> published transition after initial approval.
-- Providers still cannot verify, unarchive, approve or reject their own business.
create or replace function public.prevent_provider_publication_escalation()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' and (new.status <> 'draft' or new.verified) then
      raise exception 'Only administrators can approve or verify a business';
    end if;
    if tg_op = 'UPDATE' then
      if new.owner_id is distinct from old.owner_id or new.verified is distinct from old.verified then
        raise exception 'Only administrators can change business ownership or verification';
      end if;
      if new.status is distinct from old.status and not (
        old.status = 'pending' and new.status = 'published'
        and public.can_manage_business_services(old.id)
      ) then
        raise exception 'Only administrators can change business approval state';
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- Separate write policies from SELECT; a permissive FOR ALL policy would also
-- accidentally grant public reads of drafts when combined with public policies.
drop policy if exists business_services_manage_owner on public.business_services;
drop policy if exists business_services_insert_approved_owner on public.business_services;
create policy business_services_insert_approved_owner on public.business_services
for insert to authenticated with check (public.is_admin() or public.can_manage_business_services(business_id));
drop policy if exists business_services_update_approved_owner on public.business_services;
create policy business_services_update_approved_owner on public.business_services
for update to authenticated using (public.is_admin() or public.can_manage_business_services(business_id))
with check (public.is_admin() or public.can_manage_business_services(business_id));
drop policy if exists business_services_delete_approved_owner on public.business_services;
create policy business_services_delete_approved_owner on public.business_services
for delete to authenticated using (public.is_admin() or public.can_manage_business_services(business_id));

create or replace function public.guard_service_publication()
returns trigger language plpgsql security definer set search_path = public
as $$
declare business_state text;
begin
  if tg_op = 'UPDATE' and new.business_id is distinct from old.business_id then
    raise exception 'A service cannot be moved to another business';
  end if;
  -- Serialize with business suspension/archival and other service publications.
  select status into business_state from public.businesses where id = new.business_id for update;
  if not public.is_admin() and not public.can_manage_business_services(new.business_id) then
    raise exception 'An approved, unrestricted business and verified owner are required to manage services';
  end if;
  if new.status = 'active' then
    if business_state not in ('pending','published') or not public.has_approved_business_application(new.business_id) then
      raise exception 'An approved, unrestricted business is required to publish services';
    end if;
    if nullif(btrim(new.title),'') is null or nullif(btrim(new.category),'') is null
      or nullif(btrim(new.description),'') is null or new.starting_price is null
      or new.starting_price < 0 or new.starting_price > 9999999999.99 then
      raise exception 'Add a service name, category, description and valid starting price before publishing';
    end if;
    if business_state = 'pending' then
      update public.businesses set status = 'published' where id = new.business_id;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists business_services_guard_publication on public.business_services;
create trigger business_services_guard_publication before insert or update on public.business_services
for each row execute function public.guard_service_publication();

drop policy if exists business_services_select_published_or_owner on public.business_services;
create policy business_services_select_published_or_owner on public.business_services for select
using (public.is_business_owner(business_id) or public.is_admin() or (
  status = 'active' and public.has_approved_business_application(business_id)
  and exists (select 1 from public.businesses b where b.id = business_id and b.status = 'published')
));

drop policy if exists businesses_select_published_or_owner on public.businesses;
create policy businesses_select_published_or_owner on public.businesses for select
using (owner_id = auth.uid() or public.is_admin()
  or (status = 'published' and public.has_approved_business_application(id)));

revoke all on function public.has_approved_business_application(uuid) from public;
grant execute on function public.has_approved_business_application(uuid) to anon, authenticated;
revoke all on function public.can_manage_business_services(uuid) from public, anon;
grant execute on function public.can_manage_business_services(uuid) to authenticated;
revoke all on function public.guard_service_publication() from public, anon, authenticated;

-- Existing photo ownership policies still apply; restrict service writes when
-- initial approval is absent or business management has been suspended.
drop policy if exists service_media_insert_approved on public.media_assets;
create policy service_media_insert_approved on public.media_assets as restrictive
for insert to authenticated with check (service_id is null or public.is_admin() or exists (
  select 1 from public.business_services s where s.id = service_id and public.can_manage_business_services(s.business_id)
));
drop policy if exists service_media_update_approved on public.media_assets;
create policy service_media_update_approved on public.media_assets as restrictive
for update to authenticated using (service_id is null or public.is_admin() or exists (
  select 1 from public.business_services s where s.id = service_id and public.can_manage_business_services(s.business_id)
)) with check (service_id is null or public.is_admin() or exists (
  select 1 from public.business_services s where s.id = service_id and public.can_manage_business_services(s.business_id)
));
drop policy if exists service_media_delete_approved on public.media_assets;
create policy service_media_delete_approved on public.media_assets as restrictive
for delete to authenticated using (service_id is null or public.is_admin() or exists (
  select 1 from public.business_services s where s.id = service_id and public.can_manage_business_services(s.business_id)
));
commit;
