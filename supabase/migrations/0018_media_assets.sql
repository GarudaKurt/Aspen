-- Cloudflare R2 media metadata.
-- Binary objects live in R2; Supabase stores ownership, validation metadata,
-- and the R2 object key used to create public or signed URLs.

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  service_id uuid references public.business_services(id) on delete cascade,
  provider_application_id uuid references public.provider_applications(id) on delete cascade,
  category text not null check (category in ('business_cover', 'business_gallery', 'service_photo', 'identity_document', 'review_photo')),
  visibility text not null default 'private' check (visibility in ('public', 'private')),
  object_key text not null unique,
  original_filename text not null,
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 5242880),
  status text not null default 'pending' check (status in ('pending', 'active', 'failed', 'deleted')),
  created_at timestamptz not null default timezone('utc', now()),
  uploaded_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint media_assets_target_check check (
    (category in ('business_cover', 'business_gallery') and business_id is not null and service_id is null and provider_application_id is null)
    or (category = 'service_photo' and service_id is not null and provider_application_id is null)
    or (category = 'identity_document' and provider_application_id is not null and business_id is null and service_id is null and visibility = 'private')
    or (category = 'review_photo' and business_id is not null)
  )
);

create index if not exists media_assets_business_idx
  on public.media_assets(business_id, category, status);
create index if not exists media_assets_service_idx
  on public.media_assets(service_id, category, status);
create index if not exists media_assets_application_idx
  on public.media_assets(provider_application_id, category, status);

drop trigger if exists media_assets_set_updated_at on public.media_assets;
create trigger media_assets_set_updated_at
before update on public.media_assets
for each row execute procedure public.set_updated_at();

alter table public.media_assets enable row level security;

drop policy if exists "media_assets_select_owner_or_public" on public.media_assets;
create policy "media_assets_select_owner_or_public"
on public.media_assets for select
using (
  owner_id = auth.uid()
  or public.is_admin()
  or (
    visibility = 'public'
    and status = 'active'
    and (
      exists (select 1 from public.businesses b where b.id = business_id and b.status = 'published')
      or exists (
        select 1 from public.business_services s
        join public.businesses b on b.id = s.business_id
        where s.id = service_id and b.status = 'published'
      )
    )
  )
);

drop policy if exists "media_assets_insert_authorized" on public.media_assets;
create policy "media_assets_insert_authorized"
on public.media_assets for insert to authenticated
with check (
  owner_id = auth.uid()
  and (
    public.is_admin()
    or (business_id is not null and exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid()))
    or (service_id is not null and exists (
      select 1 from public.business_services s
      join public.businesses b on b.id = s.business_id
      where s.id = service_id and b.owner_id = auth.uid()
    ))
    or (provider_application_id is not null and exists (
      select 1 from public.provider_applications a
      where a.id = provider_application_id and a.applicant_id = auth.uid()
    ))
  )
);

drop policy if exists "media_assets_update_owner" on public.media_assets;
create policy "media_assets_update_owner"
on public.media_assets for update to authenticated
using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists "media_assets_delete_owner" on public.media_assets;
create policy "media_assets_delete_owner"
on public.media_assets for delete to authenticated
using (owner_id = auth.uid() or public.is_admin());

grant select on public.media_assets to anon, authenticated;
grant insert, update, delete on public.media_assets to authenticated;
