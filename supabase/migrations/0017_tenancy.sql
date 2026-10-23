-- Provider tenancy foundation.
-- This migration stores provider applications and provider-owned businesses,
-- services, locations, hours, and amenities. Credentials and payment details
-- remain outside these tables and are owned by Supabase Auth/payment providers.

create table if not exists public.provider_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  provider_type text not null,
  business_name text not null,
  business_description text not null,
  years_experience integer check (years_experience is null or years_experience >= 0),
  facebook_page text,
  location_details jsonb not null default '{}'::jsonb,
  selected_services text[] not null default '{}',
  identity_documents jsonb not null default '[]'::jsonb,
  billing_details jsonb not null default '{}'::jsonb,
  review_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  submitted_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists provider_applications_one_pending_idx
  on public.provider_applications(applicant_id)
  where status = 'pending';
create index if not exists provider_applications_status_idx
  on public.provider_applications(status, submitted_at desc);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null unique,
  name text not null,
  provider_type text not null default 'Individual provider',
  description text not null default '',
  years_experience integer check (years_experience is null or years_experience >= 0),
  facebook_page text,
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'published', 'rejected', 'archived')),
  verified boolean not null default false,
  cover_photo_path text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists businesses_owner_idx on public.businesses(owner_id);
create index if not exists businesses_status_idx on public.businesses(status);

alter table public.provider_applications
  add column if not exists business_id uuid references public.businesses(id) on delete set null;
create index if not exists provider_applications_business_idx
  on public.provider_applications(business_id);

create table if not exists public.business_locations (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  province text not null default '',
  city_municipality text not null default '',
  barangay text not null default '',
  street_address text not null default '',
  landmark text not null default '',
  additional_details text not null default '',
  longitude double precision,
  latitude double precision,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint business_locations_coordinates_check check (
    (longitude is null and latitude is null)
    or (longitude between -180 and 180 and latitude between -90 and 90)
  )
);

create table if not exists public.business_services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category text not null,
  title text not null,
  description text not null default '',
  starting_price numeric(12,2),
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  status text not null default 'draft'
    check (status in ('active', 'draft', 'paused')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists business_services_business_idx
  on public.business_services(business_id, status);

create table if not exists public.business_service_photos (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.business_services(id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.business_hours (
  business_id uuid not null references public.businesses(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  is_open boolean not null default true,
  open_time time,
  close_time time,
  primary key (business_id, day_of_week),
  constraint business_hours_time_check check (
    not is_open or (open_time is not null and close_time is not null and open_time < close_time)
  )
);

create table if not exists public.business_amenities (
  business_id uuid not null references public.businesses(id) on delete cascade,
  amenity_id text not null,
  label text not null,
  is_custom boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (business_id, amenity_id)
);

create index if not exists business_amenities_business_idx
  on public.business_amenities(business_id);

-- Keep tenancy self-contained when migrations are run from an existing
-- project where the appointment migration's helper function was not applied.
-- This is intentionally the same provider/admin check used by 0016.
create or replace function public.is_provider_or_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('provider', 'admin')
  );
$$;

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
  where id = p_application_id;

  if application_row.id is null then
    raise exception 'Provider application was not found';
  end if;

  if application_row.business_id is not null then
    select * into created_business from public.businesses where id = application_row.business_id;
    return created_business;
  end if;

  base_slug := trim(both '-' from regexp_replace(lower(application_row.business_name), '[^a-z0-9]+', '-', 'g'));
  if base_slug = '' then base_slug := 'business'; end if;
  final_slug := left(base_slug, 80);
  if exists (select 1 from public.businesses where slug = final_slug) then
    final_slug := left(base_slug, 70) || '-' || left(application_row.applicant_id::text, 8);
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
    'pending',
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

alter table public.businesses enable row level security;
alter table public.business_locations enable row level security;
alter table public.business_services enable row level security;
alter table public.business_service_photos enable row level security;
alter table public.business_hours enable row level security;
alter table public.business_amenities enable row level security;
alter table public.provider_applications enable row level security;

drop trigger if exists provider_applications_set_updated_at on public.provider_applications;
create trigger provider_applications_set_updated_at
before update on public.provider_applications
for each row execute procedure public.set_updated_at();

drop trigger if exists businesses_set_updated_at on public.businesses;
create trigger businesses_set_updated_at
before update on public.businesses
for each row execute procedure public.set_updated_at();

drop trigger if exists business_locations_set_updated_at on public.business_locations;
create trigger business_locations_set_updated_at
before update on public.business_locations
for each row execute procedure public.set_updated_at();

drop trigger if exists business_services_set_updated_at on public.business_services;
create trigger business_services_set_updated_at
before update on public.business_services
for each row execute procedure public.set_updated_at();

create or replace function public.is_business_owner(p_business_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.businesses
    where id = p_business_id and owner_id = auth.uid()
  );
$$;

drop policy if exists "provider_applications_insert_own" on public.provider_applications;
create policy "provider_applications_insert_own"
on public.provider_applications for insert to authenticated
with check (applicant_id = auth.uid());

drop policy if exists "provider_applications_select_own_or_admin" on public.provider_applications;
create policy "provider_applications_select_own_or_admin"
on public.provider_applications for select to authenticated
using (applicant_id = auth.uid() or public.is_admin());

drop policy if exists "provider_applications_update_admin" on public.provider_applications;
create policy "provider_applications_update_admin"
on public.provider_applications for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "businesses_select_published_or_owner" on public.businesses;
create policy "businesses_select_published_or_owner"
on public.businesses for select
using (status = 'published' or owner_id = auth.uid() or public.is_admin());

drop policy if exists "businesses_insert_owner" on public.businesses;
create policy "businesses_insert_owner"
on public.businesses for insert to authenticated
with check (owner_id = auth.uid() and (public.is_provider_or_admin() or public.is_admin()));

drop policy if exists "businesses_update_owner" on public.businesses;
create policy "businesses_update_owner"
on public.businesses for update to authenticated
using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists "businesses_delete_owner" on public.businesses;
create policy "businesses_delete_owner"
on public.businesses for delete to authenticated
using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "business_locations_select_published_or_owner" on public.business_locations;
create policy "business_locations_select_published_or_owner"
on public.business_locations for select
using (exists (select 1 from public.businesses b where b.id = business_id and (b.status = 'published' or b.owner_id = auth.uid() or public.is_admin())));
drop policy if exists "business_locations_manage_owner" on public.business_locations;
create policy "business_locations_manage_owner"
on public.business_locations for all to authenticated
using (public.is_business_owner(business_id) or public.is_admin())
with check (public.is_business_owner(business_id) or public.is_admin());

drop policy if exists "business_services_select_published_or_owner" on public.business_services;
create policy "business_services_select_published_or_owner"
on public.business_services for select
using (exists (select 1 from public.businesses b where b.id = business_id and (b.status = 'published' or b.owner_id = auth.uid() or public.is_admin())));
drop policy if exists "business_services_manage_owner" on public.business_services;
create policy "business_services_manage_owner"
on public.business_services for all to authenticated
using (public.is_business_owner(business_id) or public.is_admin())
with check (public.is_business_owner(business_id) or public.is_admin());

drop policy if exists "business_service_photos_select_published_or_owner" on public.business_service_photos;
create policy "business_service_photos_select_published_or_owner"
on public.business_service_photos for select
using (exists (
  select 1 from public.business_services s
  join public.businesses b on b.id = s.business_id
  where s.id = service_id and (b.status = 'published' or b.owner_id = auth.uid() or public.is_admin())
));
drop policy if exists "business_service_photos_manage_owner" on public.business_service_photos;
create policy "business_service_photos_manage_owner"
on public.business_service_photos for all to authenticated
using (exists (select 1 from public.business_services s where s.id = service_id and (public.is_business_owner(s.business_id) or public.is_admin())))
with check (exists (select 1 from public.business_services s where s.id = service_id and (public.is_business_owner(s.business_id) or public.is_admin())));

drop policy if exists "business_hours_select_published_or_owner" on public.business_hours;
create policy "business_hours_select_published_or_owner"
on public.business_hours for select
using (exists (select 1 from public.businesses b where b.id = business_id and (b.status = 'published' or b.owner_id = auth.uid() or public.is_admin())));
drop policy if exists "business_hours_manage_owner" on public.business_hours;
create policy "business_hours_manage_owner"
on public.business_hours for all to authenticated
using (public.is_business_owner(business_id) or public.is_admin())
with check (public.is_business_owner(business_id) or public.is_admin());

drop policy if exists "business_amenities_select_published_or_owner" on public.business_amenities;
create policy "business_amenities_select_published_or_owner"
on public.business_amenities for select
using (exists (select 1 from public.businesses b where b.id = business_id and (b.status = 'published' or b.owner_id = auth.uid() or public.is_admin())));
drop policy if exists "business_amenities_manage_owner" on public.business_amenities;
create policy "business_amenities_manage_owner"
on public.business_amenities for all to authenticated
using (public.is_business_owner(business_id) or public.is_admin())
with check (public.is_business_owner(business_id) or public.is_admin());

grant select on public.businesses, public.business_locations, public.business_services,
  public.business_service_photos, public.business_hours, public.business_amenities to anon, authenticated;
grant insert on public.provider_applications to authenticated;
grant select on public.provider_applications to authenticated;
grant update on public.provider_applications to authenticated;
grant insert, update, delete on public.businesses, public.business_locations,
  public.business_services, public.business_service_photos, public.business_hours,
  public.business_amenities to authenticated;
grant execute on function public.is_business_owner(uuid) to authenticated;
grant execute on function public.approve_provider_application(uuid) to authenticated;

insert into storage.buckets (id, name, public)
values ('provider-verification-documents', 'provider-verification-documents', false)
on conflict (id) do nothing;

drop policy if exists "provider_documents_insert_own" on storage.objects;
create policy "provider_documents_insert_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'provider-verification-documents'
  and exists (
    select 1 from public.provider_applications a
    where a.id::text = split_part(name, '/', 1)
      and a.applicant_id = auth.uid()
  )
);

drop policy if exists "provider_documents_select_own_or_admin" on storage.objects;
create policy "provider_documents_select_own_or_admin"
on storage.objects for select to authenticated
using (
  bucket_id = 'provider-verification-documents'
  and (
    public.is_admin()
    or exists (
      select 1 from public.provider_applications a
      where a.id::text = split_part(name, '/', 1)
        and a.applicant_id = auth.uid()
    )
  )
);

drop policy if exists "provider_documents_delete_own_or_admin" on storage.objects;
create policy "provider_documents_delete_own_or_admin"
on storage.objects for delete to authenticated
using (
  bucket_id = 'provider-verification-documents'
  and (
    public.is_admin()
    or exists (
      select 1 from public.provider_applications a
      where a.id::text = split_part(name, '/', 1)
        and a.applicant_id = auth.uid()
    )
  )
);

-- Keep existing appointment records compatible while allowing new rows to
-- reference a normalized business UUID. Existing business_id slugs remain valid.
alter table public.appointments add column if not exists business_uuid uuid references public.businesses(id) on delete set null;
create index if not exists appointments_business_uuid_idx
  on public.appointments(business_uuid, status, appointment_date);

drop policy if exists "appointments_select_own_or_provider" on public.appointments;
create policy "appointments_select_own_or_provider"
on public.appointments for select to authenticated
using (
  customer_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.businesses b
    where b.owner_id = auth.uid()
      and (b.id = business_uuid or b.slug = business_id)
  )
);

drop policy if exists "appointments_update_provider" on public.appointments;
create policy "appointments_update_provider"
on public.appointments for update to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.businesses b
    where b.owner_id = auth.uid()
      and (b.id = business_uuid or b.slug = business_id)
  )
)
with check (
  public.is_admin()
  or exists (
    select 1 from public.businesses b
    where b.owner_id = auth.uid()
      and (b.id = business_uuid or b.slug = business_id)
  )
);
