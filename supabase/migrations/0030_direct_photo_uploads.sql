-- Direct photo uploads: reservations reuse media_assets; a private counter prevents
-- deleting a reservation from resetting the per-owner upload/validation quota.
-- Apply after 0029. R2_UPLOAD_BUCKET_NAME must be a separate PRIVATE staging bucket.
begin;
create table if not exists public.photo_upload_quotas (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  reservations integer not null default 0,
  validations integer not null default 0
);
alter table public.photo_upload_quotas enable row level security;
revoke all on public.photo_upload_quotas from public, anon, authenticated;
create or replace function public.consume_photo_upload_quota(p_phase text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_count integer;
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid() and role = 'provider') then
    raise exception 'Provider access required';
  end if;
  if p_phase is null or p_phase not in ('reserve','validate') then raise exception 'Invalid quota phase'; end if;
  insert into public.photo_upload_quotas(owner_id,window_start) values(auth.uid(),now()) on conflict do nothing;
  perform 1 from public.photo_upload_quotas where owner_id = auth.uid() for update;
  update public.photo_upload_quotas set window_start = now(), reservations = 0, validations = 0
    where owner_id = auth.uid() and window_start <= now() - interval '1 hour';
  if p_phase = 'reserve' then
    update public.photo_upload_quotas set reservations = reservations + 1 where owner_id = auth.uid() and reservations < 30 returning reservations into v_count;
  else
    update public.photo_upload_quotas set validations = validations + 1 where owner_id = auth.uid() and validations < 120 returning validations into v_count;
  end if;
  if v_count is null then raise exception 'Upload rate limit reached; retry later'; end if;
end $$;
revoke all on function public.consume_photo_upload_quota(text) from public, anon;
grant execute on function public.consume_photo_upload_quota(text) to authenticated;
alter table public.media_assets add column if not exists upload_sha256 text;
alter table public.media_assets add column if not exists upload_action text;
alter table public.media_assets add column if not exists upload_photo_id uuid;
alter table public.media_assets add column if not exists upload_expires_at timestamptz;
alter table public.media_assets add column if not exists display_order integer;
alter table public.media_assets drop constraint if exists media_assets_byte_size_check;
alter table public.media_assets add constraint media_assets_byte_size_check check (
  byte_size > 0 and byte_size <= case when category in ('business_cover','business_gallery','service_photo') then 20971520 else 5242880 end
);
create or replace function public.guard_photo_upload_identity()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if (new.upload_sha256, new.upload_action, new.upload_photo_id) is distinct from
     (old.upload_sha256, old.upload_action, old.upload_photo_id) then
    raise exception 'Upload identities are immutable';
  end if;
  return new;
end $$;
drop trigger if exists media_assets_guard_upload_identity on public.media_assets;
create trigger media_assets_guard_upload_identity before update on public.media_assets
for each row execute function public.guard_photo_upload_identity();

create or replace function public.guard_business_photo_metadata()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  -- File identities must never be redirected to somebody else's R2 key.
  if TG_OP = 'UPDATE' and
    (new.id, new.owner_id, new.business_id, new.service_id, new.provider_application_id,
     new.object_key, new.category, new.content_type, new.byte_size, new.visibility)
    is distinct from
    (old.id, old.owner_id, old.business_id, old.service_id, old.provider_application_id,
     old.object_key, old.category, old.content_type, old.byte_size, old.visibility) then
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


drop trigger if exists media_assets_guard_business_photos on public.media_assets;
create trigger media_assets_guard_business_photos before insert or update on public.media_assets
for each row execute function public.guard_business_photo_metadata();


create or replace function public.manage_business_photo(
  p_business_id uuid, p_action text, p_photo_id uuid,
  p_new_id uuid default null, p_filename text default null,
  p_content_type text default null, p_byte_size integer default null
) returns text language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_business public.businesses;
  v_photo public.media_assets;
  v_key text;
  v_old_key text;
  v_extension text;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'provider')
     or coalesce(auth.jwt()->>'email','') = '' then
    raise exception 'Provider access required';
  end if;

  select * into v_business from public.businesses
    where id = p_business_id and owner_id = auth.uid() for update;
  if not found then raise exception 'Business not found or access denied'; end if;

  if p_action is null or p_action not in ('add','replace','delete','cover','add_cover','replace_cover','remove_cover') then
    raise exception 'Invalid photo action';
  end if;

  if p_action not in ('add','add_cover') then
    select * into v_photo from public.media_assets
      where id = p_photo_id and business_id = p_business_id and owner_id = auth.uid()
        and category in ('business_cover','business_gallery') and status = 'active';
    if not found then raise exception 'Photo not found or access denied'; end if;
    v_old_key := v_photo.object_key;
  end if;

  if (p_action = 'add_cover' and v_business.cover_photo_path is not null)
     or (p_action in ('replace_cover','remove_cover') and v_business.cover_photo_path is distinct from v_old_key) then
    raise exception 'The cover photo changed; reload before retrying';
  end if;

  if p_action in ('replace','delete','replace_cover','remove_cover') then
    update public.media_assets set status = 'deleted' where id = p_photo_id;
  end if;

  if p_action in ('add','replace','add_cover','replace_cover') then
    if p_new_id is null or p_byte_size is null or p_content_type is null
      or p_byte_size not between 1 and 20971520
      or p_content_type not in ('image/jpeg','image/png','image/webp')
      or p_filename is null or length(p_filename) > 255 then
      raise exception 'Invalid photo details';
    end if;

    v_extension := case p_content_type
      when 'image/jpeg' then '.jpg'
      when 'image/png' then '.png'
      when 'image/webp' then '.webp'
    end;
    if lower(p_filename) !~ (replace(v_extension, '.', '\.') || '$')
       and not (p_content_type = 'image/jpeg' and lower(p_filename) ~ '\.jpeg$') then
      raise exception 'Photo filename does not match its content type';
    end if;

    v_key := 'businesses/' || p_business_id::text || '/business_gallery/' || p_new_id::text || '-photo' || v_extension;
    if exists (select 1 from public.media_assets where id = p_new_id) then
      update public.media_assets set status = 'active', uploaded_at = now()
      where id = p_new_id and owner_id = auth.uid() and business_id = p_business_id
        and status = 'pending' and object_key = v_key and byte_size = p_byte_size
        and content_type = p_content_type and original_filename = p_filename
        and upload_action = p_action and upload_photo_id is not distinct from p_photo_id;
      if not found then raise exception 'Invalid photo reservation'; end if;
    else
    insert into public.media_assets(id,owner_id,business_id,category,visibility,object_key,
      original_filename,content_type,byte_size,status,uploaded_at)
    values(p_new_id,auth.uid(),p_business_id,'business_gallery','public',v_key,
      p_filename,p_content_type,p_byte_size,'active',now());
    end if;

    if p_action in ('add_cover','replace_cover') or v_business.cover_photo_path is null or v_business.cover_photo_path = v_old_key then
      update public.businesses set cover_photo_path = v_key where id = p_business_id;
    end if;
  elsif p_action = 'remove_cover' then
    update public.businesses set cover_photo_path = null where id = p_business_id;
  elsif p_action = 'cover' then
    update public.businesses set cover_photo_path = v_old_key where id = p_business_id;
  elsif p_action = 'delete' and v_business.cover_photo_path = v_old_key then
    update public.businesses set cover_photo_path = (
      select object_key from public.media_assets where business_id = p_business_id
        and category in ('business_cover','business_gallery') and status = 'active' and visibility = 'public'
      order by created_at, id limit 1
    ) where id = p_business_id;
  end if;

  return case when p_action in ('replace','delete','replace_cover','remove_cover') then v_old_key else null end;
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
    if v_existing.owner_id <> auth.uid() or v_existing.object_key <> v_key
      or v_existing.original_filename <> p_filename or v_existing.byte_size <> p_byte_size
      or v_existing.content_type <> p_content_type or v_existing.upload_sha256 is distinct from p_sha256
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

create or replace function public.finish_photo_upload(p_id uuid)
returns text language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_asset public.media_assets;
  v_business_id uuid;
  v_old_key text;
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid() and role = 'provider') then
    raise exception 'Provider access required';
  end if;
  select * into v_asset from public.media_assets where id = p_id and owner_id = auth.uid() and upload_sha256 is not null;
  if not found then raise exception 'Photo reservation not found'; end if;
  v_business_id := v_asset.business_id;
  if v_asset.service_id is not null then
    select business_id into v_business_id from public.business_services where id = v_asset.service_id;
  end if;
  perform 1 from public.businesses where id = v_business_id and owner_id = auth.uid() for update;
  if not found then raise exception 'Business not found or access denied'; end if;
  select * into v_asset from public.media_assets where id = p_id and owner_id = auth.uid() for update;
  -- Safe retry after a lost response or a concurrent completion.
  if v_asset.status = 'active' then return null; end if;
  if v_asset.status <> 'pending' then raise exception 'Photo reservation is no longer pending'; end if;
  if v_asset.category = 'business_gallery' then
    v_old_key := public.manage_business_photo(v_asset.business_id, v_asset.upload_action, v_asset.upload_photo_id,
      v_asset.id, v_asset.original_filename, v_asset.content_type, v_asset.byte_size::integer);
  elsif v_asset.category = 'service_photo' then
    -- Permit an edit to upload six replacements before the previous six are removed.
    if (select count(*) from public.media_assets where service_id = v_asset.service_id and category = 'service_photo' and status = 'active') >= 12 then
      raise exception 'Remove unused service photos before uploading more';
    end if;
    update public.media_assets set status = 'active', uploaded_at = now() where id = p_id;
  else raise exception 'Invalid photo category';
  end if;
  return v_old_key;
end $$;

revoke all on function public.reserve_photo_upload(uuid,text,uuid,text,uuid,text,text,integer,text) from public, anon;
revoke all on function public.finish_photo_upload(uuid) from public, anon;
grant execute on function public.reserve_photo_upload(uuid,text,uuid,text,uuid,text,text,integer,text) to authenticated;
grant execute on function public.finish_photo_upload(uuid) to authenticated;

create or replace function public.cancel_photo_upload(p_id uuid)
returns table(id uuid, upload_sha256 text) language plpgsql security invoker set search_path = public, pg_temp as $$
declare v_asset public.media_assets; v_business_id uuid;
begin
  if auth.uid() is null or not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'provider') then
    raise exception 'Provider access required';
  end if;
  select m.* into v_asset from public.media_assets m where m.id = p_id and m.owner_id = auth.uid()
    and m.category in ('business_gallery','service_photo') and m.upload_sha256 is not null;
  if not found then return; end if;
  v_business_id := v_asset.business_id;
  if v_asset.service_id is not null then select s.business_id into v_business_id from public.business_services s where s.id = v_asset.service_id; end if;
  -- Match completion's lock order: business first, then asset.
  perform 1 from public.businesses b where b.id = v_business_id and b.owner_id = auth.uid() for update;
  if not found then raise exception 'Business not found or access denied'; end if;
  return query update public.media_assets m set status = 'failed'
    where m.id = p_id and m.owner_id = auth.uid() and m.status = 'pending'
    returning m.id,m.upload_sha256;
end $$;
revoke all on function public.cancel_photo_upload(uuid) from public, anon;
grant execute on function public.cancel_photo_upload(uuid) to authenticated;

create or replace function public.set_service_photo_order(p_service_id uuid, p_ids uuid[])
returns void language plpgsql security invoker set search_path = public, pg_temp as $$
declare v_business_id uuid;
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id = auth.uid() and role = 'provider') then
    raise exception 'Provider access required';
  end if;
  select b.id into v_business_id from public.business_services s join public.businesses b on b.id = s.business_id
    where s.id = p_service_id and b.owner_id = auth.uid() for update of b;
  if v_business_id is null then raise exception 'Service not found or access denied'; end if;
  if p_ids is null or cardinality(p_ids) > 6 or array_position(p_ids,null) is not null
    or (select count(distinct id) from unnest(p_ids) id) <> cardinality(p_ids) then
    raise exception 'Invalid photo order';
  end if;
  if (select count(*) from public.media_assets where id = any(p_ids) and service_id = p_service_id
    and owner_id = auth.uid() and category = 'service_photo' and status = 'active') <> cardinality(p_ids) then
    raise exception 'Photo not found or access denied';
  end if;
  update public.media_assets set display_order = null where service_id = p_service_id and category = 'service_photo' and status = 'active';
  update public.media_assets m set display_order = requested.position::integer
    from unnest(p_ids) with ordinality requested(id,position) where m.id = requested.id;
end $$;
revoke all on function public.set_service_photo_order(uuid,uuid[]) from public, anon;
grant execute on function public.set_service_photo_order(uuid,uuid[]) to authenticated;
commit;

