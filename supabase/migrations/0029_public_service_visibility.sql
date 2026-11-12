-- Service publication is separate from administrator-controlled business approval.
-- Keep owner/admin management access; expose only active services publicly.
begin;

drop policy if exists "business_services_select_published_or_owner" on public.business_services;
create policy "business_services_select_published_or_owner"
on public.business_services for select
using (
  public.is_business_owner(business_id) or public.is_admin()
  or (status = 'active' and exists (
    select 1 from public.businesses b
    where b.id = business_id and b.status = 'published'
  ))
);

drop policy if exists "business_service_photos_select_published_or_owner" on public.business_service_photos;
create policy "business_service_photos_select_published_or_owner"
on public.business_service_photos for select
using (exists (
  select 1 from public.business_services s
  join public.businesses b on b.id = s.business_id
  where s.id = service_id and (
    public.is_business_owner(b.id) or public.is_admin()
    or (s.status = 'active' and b.status = 'published')
  )
));

drop policy if exists "media_assets_select_owner_or_public" on public.media_assets;
create policy "media_assets_select_owner_or_public"
on public.media_assets for select
using (
  owner_id = auth.uid() or public.is_admin()
  or (visibility = 'public' and status = 'active' and (
    (service_id is null and exists (select 1 from public.businesses b where b.id = business_id and b.status = 'published'))
    or exists (
      select 1 from public.business_services s
      join public.businesses b on b.id = s.business_id
      where s.id = service_id and s.status = 'active' and b.status = 'published'
    )
  ))
);

commit;
