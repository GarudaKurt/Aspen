-- RBAC hardening and the admin-only provider application rejection workflow.

create or replace function public.is_provider()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'provider'
  );
$$;

create or replace function public.is_business_owner(p_business_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select public.is_provider() and exists (
    select 1 from public.businesses
    where id = p_business_id and owner_id = auth.uid()
  );
$$;

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only administrators can change application roles';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation
before update on public.profiles
for each row execute procedure public.prevent_profile_role_escalation();

drop policy if exists "provider_applications_insert_own" on public.provider_applications;
create policy "provider_applications_insert_own"
on public.provider_applications for insert to authenticated
with check (
  applicant_id = auth.uid()
  and status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
  and business_id is null
  and not public.is_admin()
);

create or replace function public.prevent_provider_application_status_escalation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' and (
      new.status <> 'pending'
      or new.reviewed_by is not null
      or new.reviewed_at is not null
      or new.business_id is not null
    ) then
      raise exception 'Provider applications must be submitted as pending';
    end if;
    if tg_op = 'UPDATE' then
      if old.applicant_id <> auth.uid()
        or old.status <> 'pending'
        or new.status is distinct from old.status
        or new.provider_type is distinct from old.provider_type
        or new.business_name is distinct from old.business_name
        or new.business_description is distinct from old.business_description
        or new.years_experience is distinct from old.years_experience
        or new.facebook_page is distinct from old.facebook_page
        or new.location_details is distinct from old.location_details
        or new.selected_services is distinct from old.selected_services
        or new.billing_details is distinct from old.billing_details
        or new.review_notes is distinct from old.review_notes
        or new.reviewed_by is distinct from old.reviewed_by
        or new.reviewed_at is distinct from old.reviewed_at
        or new.submitted_at is distinct from old.submitted_at
        or new.created_at is distinct from old.created_at
        then
        raise exception 'Applicants may only update identity documents while pending';
      end if;
    end if;
  elsif tg_op = 'UPDATE'
    and new.status is distinct from old.status
    and old.status <> 'pending' then
    raise exception 'Only pending applications can change status';
  end if;
  return new;
end;
$$;

drop trigger if exists provider_applications_prevent_status_escalation on public.provider_applications;
create trigger provider_applications_prevent_status_escalation
before insert or update on public.provider_applications
for each row execute procedure public.prevent_provider_application_status_escalation();

drop policy if exists "provider_applications_update_admin" on public.provider_applications;
create policy "provider_applications_update_admin"
on public.provider_applications for update to authenticated
using (public.is_admin() or (applicant_id = auth.uid() and status = 'pending'))
with check (public.is_admin() or (applicant_id = auth.uid() and status = 'pending'));

drop policy if exists "businesses_insert_owner" on public.businesses;
create policy "businesses_insert_owner"
on public.businesses for insert to authenticated
with check (owner_id = auth.uid() and public.is_provider());

create or replace function public.prevent_provider_publication_escalation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' and (new.status <> 'draft' or new.verified) then
      raise exception 'Only administrators can publish or verify a business';
    end if;
    if tg_op = 'UPDATE' and (new.status is distinct from old.status or new.verified is distinct from old.verified) then
      raise exception 'Only administrators can change business approval state';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists businesses_prevent_provider_publication_escalation on public.businesses;
create trigger businesses_prevent_provider_publication_escalation
before insert or update on public.businesses
for each row execute procedure public.prevent_provider_publication_escalation();

create or replace function public.reject_provider_application(
  p_application_id uuid,
  p_rejection_reason text
)
returns public.provider_applications
language plpgsql
security definer set search_path = public
as $$
declare
  application_row public.provider_applications;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can reject provider applications';
  end if;
  if nullif(trim(coalesce(p_rejection_reason, '')), '') is null then
    raise exception 'A rejection reason is required';
  end if;

  select * into application_row
  from public.provider_applications
  where id = p_application_id
  for update;

  if application_row.id is null then
    raise exception 'Provider application was not found';
  end if;
  if application_row.status <> 'pending' then
    raise exception 'Only pending applications can be rejected';
  end if;

  update public.provider_applications
  set status = 'rejected',
      review_notes = trim(p_rejection_reason),
      reviewed_by = auth.uid(),
      reviewed_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where id = p_application_id
  returning * into application_row;

  return application_row;
end;
$$;

grant execute on function public.reject_provider_application(uuid, text) to authenticated;
