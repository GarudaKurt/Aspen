-- Apply after 0031. Existing objects and URLs remain unchanged.
begin;
alter table public.media_assets add column if not exists upload_source_type text;
alter table public.media_assets add column if not exists upload_source_size bigint;
alter table public.media_assets add column if not exists upload_source_filename text;
create or replace function public.capture_photo_source()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if TG_OP = 'INSERT' then
    new.upload_source_type := new.content_type;
    new.upload_source_size := new.byte_size;
    new.upload_source_filename := new.original_filename;
  elsif (new.upload_source_type,new.upload_source_size,new.upload_source_filename)
    is distinct from (old.upload_source_type,old.upload_source_size,old.upload_source_filename) then
    raise exception 'Upload source identities are immutable';
  end if;
  return new;
end $$;
drop trigger if exists media_assets_capture_source on public.media_assets;
create trigger media_assets_capture_source before insert or update on public.media_assets
for each row execute function public.capture_photo_source();
create or replace function public.guard_business_photo_metadata()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  -- File identities must never be redirected to somebody else's R2 key.
  if TG_OP = 'UPDATE' and
    (new.id, new.owner_id, new.business_id, new.service_id, new.provider_application_id,
     new.object_key, new.category, new.content_type, new.byte_size, new.visibility)
    is distinct from
    (old.id, old.owner_id, old.business_id, old.service_id, old.provider_application_id,
     old.object_key, old.category, old.content_type, old.byte_size, old.visibility) and not (
      old.status = 'pending' and new.status = 'pending' and old.upload_sha256 is not null
      and (new.id,new.owner_id,new.business_id,new.service_id,new.provider_application_id,new.category,new.visibility)
        is not distinct from (old.id,old.owner_id,old.business_id,old.service_id,old.provider_application_id,old.category,old.visibility)
      and old.content_type in ('image/jpeg','image/png') and new.content_type = 'image/webp'
      and new.byte_size > 0 and new.byte_size < old.byte_size
      and new.object_key = regexp_replace(old.object_key, '\.(jpg|png)$', '.webp')
      and new.original_filename = regexp_replace(old.original_filename, '\.[^.]+$', '.webp', 'i')
    ) then
    raise exception 'Media file identities are immutable';
  end if;
  if TG_OP = 'INSERT' and (
    new.object_key not like (
      case when new.service_id is not null then 'services/' || new.service_id::text
           when new.provider_application_id is not null then 'applications/' || new.provider_application_id::text
           when new.business_id is not null then 'businesses/' || new.business_id::text
           else 'users/' || new.owner_id::text end
      || '/' || new.category || '/' || new.id::text || '-%')
    or new.object_key ~ '(^|/)\.\.(/|$)'
  ) then
    raise exception 'Invalid media object key';
  end if;
  if new.category in ('business_cover', 'business_gallery') then
    perform 1 from public.businesses where id = new.business_id for update;
    if TG_OP = 'INSERT' then
      if new.object_key not like 'businesses/' || new.business_id::text || '/' || new.category || '/' || new.id::text || '-%'
         or new.object_key ~ '(^|/)\.\.(/|$)' then
        raise exception 'Invalid business photo key';
      end if;
    end if;
    if new.visibility <> 'public' or new.content_type not in ('image/jpeg','image/png','image/webp') then
      raise exception 'Business photos must be public images';
    end if;
    if new.status in ('pending','active') and (
      select count(*) from public.media_assets
      where business_id = new.business_id and category in ('business_cover','business_gallery')
        and status = new.status and id <> new.id
    ) >= 12 then
      raise exception 'A business can have at most 12 photos';
    end if;
  end if;
  return new;
end $$;


create or replace function public.reserve_photo_upload(
  p_id uuid, p_kind text, p_target_id uuid, p_action text, p_photo_id uuid,
  p_filename text, p_content_type text, p_byte_size integer, p_sha256 text
) returns text language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_business_id uuid;
  v_existing public.media_assets;
  v_category text;
  v_key text;
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid() and role = 'provider') then
    raise exception 'Provider access required';
  end if;
  -- Serialize reservations per owner: parallel batches cannot bypass the quota.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 30));
  if p_kind = 'business' then
    select id into v_business_id from public.businesses where id = p_target_id and owner_id = auth.uid() for update;
  elsif p_kind = 'service' then
    select b.id into v_business_id from public.business_services s join public.businesses b on b.id = s.business_id
      where s.id = p_target_id and b.owner_id = auth.uid() for update of b;
  end if;
  if v_business_id is null then raise exception 'Target not found or access denied'; end if;
  if p_id is null or p_action is null or p_action not in ('add','replace','add_cover','replace_cover')
    or (p_kind = 'service' and (p_action <> 'add' or p_photo_id is not null))
    or p_byte_size is null or p_byte_size not between 1 and 20971520
    or p_content_type is null or p_content_type not in ('image/jpeg','image/png','image/webp')
    or p_sha256 is null or p_sha256 !~ '^[a-f0-9]{64}$'
    or p_filename is null or length(p_filename) not between 1 and 255 then
    raise exception 'Invalid upload details';
  end if;
  v_category := case when p_kind = 'business' then 'business_gallery' else 'service_photo' end;
  v_key := case when p_kind = 'business' then 'businesses/' else 'services/' end || p_target_id::text || '/' || v_category || '/' || p_id::text || '-photo' ||
    case p_content_type when 'image/jpeg' then '.jpg' when 'image/png' then '.png' else '.webp' end;
  -- Every authorization (including renewals and client-created reservations)
  -- consumes protected quota. Clients cannot bypass it by inserting/deleting media.
  perform public.consume_photo_upload_quota('reserve');
  update public.media_assets set status = 'failed' where owner_id = auth.uid() and status = 'pending'
    and upload_sha256 is not null and upload_expires_at < now()
    and ((p_kind = 'business' and business_id = p_target_id) or (p_kind = 'service' and service_id = p_target_id));
  select * into v_existing from public.media_assets where id = p_id;
  if found then
    if v_existing.owner_id <> auth.uid() or regexp_replace(v_existing.object_key, '\.webp$', case coalesce(v_existing.upload_source_type,v_existing.content_type) when 'image/png' then '.png' when 'image/jpeg' then '.jpg' else '.webp' end) <> v_key
      or coalesce(v_existing.upload_source_filename,v_existing.original_filename) <> p_filename or coalesce(v_existing.upload_source_size,v_existing.byte_size) <> p_byte_size
      or coalesce(v_existing.upload_source_type,v_existing.content_type) <> p_content_type or v_existing.upload_sha256 is distinct from p_sha256
      or v_existing.upload_action is distinct from p_action or v_existing.upload_photo_id is distinct from p_photo_id
      or v_existing.status = 'deleted' then raise exception 'Upload ID conflict'; end if;
    if v_existing.status in ('pending','failed') then
      if p_kind = 'service' and (select count(*) from public.media_assets where service_id = p_target_id and category = 'service_photo' and status = 'pending' and id <> p_id) >= 6 then
        raise exception 'Too many pending service photos';
      end if;
      update public.media_assets set status = 'pending', upload_expires_at = now() + interval '10 minutes' where id = p_id;
      return 'pending';
    end if;
    return v_existing.status;
  end if;
  if p_action in ('replace','replace_cover') and not exists (
    select 1 from public.media_assets where id = p_photo_id and business_id = p_target_id
      and owner_id = auth.uid() and category in ('business_cover','business_gallery') and status = 'active'
  ) then raise exception 'Photo not found or access denied'; end if;
  if p_action in ('add','add_cover') and p_photo_id is not null then raise exception 'Invalid photo action'; end if;
  if (select count(*) from public.media_assets where owner_id = auth.uid() and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Upload rate limit reached; retry later';
  end if;
  if p_kind = 'service' and (select count(*) from public.media_assets where service_id = p_target_id and category = 'service_photo' and status = 'pending') >= 6 then
    raise exception 'Too many pending service photos';
  end if;
  insert into public.media_assets(id, owner_id, business_id, service_id, category, visibility, object_key,
    original_filename, content_type, byte_size, status, upload_sha256, upload_action, upload_photo_id, upload_expires_at)
  values (p_id, auth.uid(), case when p_kind = 'business' then p_target_id end,
    case when p_kind = 'service' then p_target_id end, v_category, 'public', v_key,
    p_filename, p_content_type, p_byte_size, 'pending', p_sha256, p_action, p_photo_id, now() + interval '10 minutes');
  return 'pending';
end $$;

-- Preserve the original completion RPC for old clients. Conversion and activation
-- share a transaction; all existing RLS, ownership, cover and count checks apply.
create or replace function public.finish_optimized_photo_upload(p_id uuid, p_content_type text, p_byte_size integer)
returns text language plpgsql security invoker set search_path = public, pg_temp as $$
declare v_asset public.media_assets; v_business_id uuid;
begin
  select * into v_asset from public.media_assets where id=p_id and owner_id=auth.uid();
  if not found then raise exception 'Photo reservation not found'; end if;
  v_business_id := v_asset.business_id;
  if v_asset.service_id is not null then
    select business_id into v_business_id from public.business_services where id=v_asset.service_id;
  end if;
  perform 1 from public.businesses where id=v_business_id and owner_id=auth.uid() for update;
  if not found then raise exception 'Business not found or access denied'; end if;
  select * into v_asset from public.media_assets where id=p_id and owner_id=auth.uid() for update;
  if v_asset.status='active' then
    if v_asset.content_type is distinct from p_content_type or v_asset.byte_size is distinct from p_byte_size::bigint then
      raise exception 'Final photo metadata conflict';
    end if;
    return null;
  end if;
  if v_asset.status <> 'pending' or v_asset.upload_sha256 is null then raise exception 'Invalid photo reservation'; end if;
  if p_content_type='image/webp' and v_asset.content_type in ('image/jpeg','image/png') then
    update public.media_assets set content_type=p_content_type, byte_size=p_byte_size,
      object_key=regexp_replace(object_key,'\.(jpg|png)$','.webp'),
      original_filename=regexp_replace(original_filename,'\.[^.]+$','.webp','i')
    where id=p_id;
  elsif p_content_type is distinct from v_asset.content_type or p_byte_size::bigint is distinct from v_asset.byte_size then
    raise exception 'Invalid final photo metadata';
  end if;
  return public.finish_photo_upload(p_id);
end $$;
revoke all on function public.finish_optimized_photo_upload(uuid,text,integer) from public,anon;
grant execute on function public.finish_optimized_photo_upload(uuid,text,integer) to authenticated;
commit;

