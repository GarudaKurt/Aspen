-- Approval is the publication decision. Providers still cannot publish themselves.
-- Existing pending businesses are not silently published; an admin may call
-- approve_provider_application again for a previously approved application.
begin;
create or replace function public.approve_provider_application(p_application_id uuid)
returns public.businesses
language plpgsql
security definer set search_path = public
as $$
declare
  application_row public.provider_applications;
  created_business public.businesses;
  base_slug text;
  final_slug text;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can approve provider applications';
  end if;

  select * into application_row
  from public.provider_applications
  where id = p_application_id for update;

  if application_row.id is null then
    raise exception 'Provider application was not found';
  end if;

  if application_row.status = 'approved' and application_row.business_id is not null then
    -- Allows an administrator to publish legacy approvals without recreating rows.
    update public.businesses set status = 'published'
      where id = application_row.business_id and owner_id = application_row.applicant_id
        and status = 'pending';
    select * into created_business from public.businesses where id = application_row.business_id;
    return created_business;
  end if;
  if application_row.status <> 'pending' or application_row.business_id is not null then
    raise exception 'Only pending applications without a business can be approved';
  end if;

  base_slug := trim(both '-' from regexp_replace(lower(application_row.business_name), '[^a-z0-9]+', '-', 'g'));
  if base_slug = '' then base_slug := 'business'; end if;
  final_slug := left(base_slug, 80);
  if exists (select 1 from public.businesses where slug = final_slug) then
    final_slug := left(base_slug, 70) || '-' || left(application_row.id::text, 8);
  end if;

  update public.profiles
  set role = 'provider', updated_at = timezone('utc', now())
  where id = application_row.applicant_id;

  insert into public.businesses (
    owner_id, slug, name, provider_type, description, years_experience,
    facebook_page, status, verified
  ) values (
    application_row.applicant_id,
    final_slug,
    application_row.business_name,
    application_row.provider_type,
    application_row.business_description,
    application_row.years_experience,
    application_row.facebook_page,
    'published',
    false
  ) returning * into created_business;

  insert into public.business_locations (
    business_id, province, city_municipality, barangay, street_address,
    landmark, additional_details, longitude, latitude
  ) values (
    created_business.id,
    coalesce(application_row.location_details ->> 'province', ''),
    coalesce(application_row.location_details ->> 'cityMunicipality', ''),
    coalesce(application_row.location_details ->> 'barangay', ''),
    coalesce(application_row.location_details ->> 'streetAddress', ''),
    coalesce(application_row.location_details ->> 'landmark', ''),
    coalesce(application_row.location_details ->> 'additionalDetails', ''),
    (application_row.location_details -> 'coordinates' ->> 0)::double precision,
    (application_row.location_details -> 'coordinates' ->> 1)::double precision
  );

  insert into public.business_services (business_id, category, title, description, status)
  select created_business.id, service_name, service_name, '', 'draft'
  from unnest(application_row.selected_services) as service_name;

  update public.provider_applications
  set status = 'approved', business_id = created_business.id,
      reviewed_by = auth.uid(), reviewed_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where id = application_row.id;

  return created_business;
end;
$$;

revoke all on function public.approve_provider_application(uuid) from public, anon;
grant execute on function public.approve_provider_application(uuid) to authenticated;
commit;
