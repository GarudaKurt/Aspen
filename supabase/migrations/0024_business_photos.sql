-- Business galleries reuse media_assets. Apply after 0021 (0022/0023, if present,
-- are independent auth hardening migrations). No publication permissions change.
begin;

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
        and status in ('pending','active') and id <> new.id
    ) >= 12 then
      raise exception 'A business can have at most 12 photos';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists media_assets_guard_business_photos on public.media_assets;
create trigger media_assets_guard_business_photos before insert or update on public.media_assets
for each row execute function public.guard_business_photo_metadata();

-- Lock the business for all gallery mutations: replacements and cover changes
-- remain atomic even when two dashboard tabs submit simultaneously.
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
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'provider')
     or coalesce(auth.jwt()->>'email','') = '' then
    raise exception 'Provider access required';
  end if;
  select * into v_business from public.businesses
    where id = p_business_id and owner_id = auth.uid() for update;
  if not found then raise exception 'Business not found or access denied'; end if;
  if p_action not in ('add','replace','delete','cover') then raise exception 'Invalid photo action'; end if;
  if p_action <> 'add' then
    select * into v_photo from public.media_assets
      where id = p_photo_id and business_id = p_business_id and owner_id = auth.uid()
        and category in ('business_cover','business_gallery') and status = 'active';
    if not found then raise exception 'Photo not found or access denied'; end if;
    v_old_key := v_photo.object_key;
  end if;
  if p_action in ('replace','delete') then
    -- Retain a cleanup record until the server confirms R2 deletion.
    update public.media_assets set status = 'deleted' where id = p_photo_id;
  end if;
  if p_action in ('add','replace') then
    if p_new_id is null or p_byte_size not between 1 and 4194304
      or p_content_type not in ('image/jpeg','image/png','image/webp')
      or p_filename is null or length(p_filename) > 255 then
      raise exception 'Invalid photo details';
    end if;
    v_key := 'businesses/' || p_business_id::text || '/business_gallery/' || p_new_id::text || '-photo';
    insert into public.media_assets(id,owner_id,business_id,category,visibility,object_key,
      original_filename,content_type,byte_size,status,uploaded_at)
    values(p_new_id,auth.uid(),p_business_id,'business_gallery','public',v_key,
      p_filename,p_content_type,p_byte_size,'active',now());
    if v_business.cover_photo_path is null or v_business.cover_photo_path = v_old_key then
      update public.businesses set cover_photo_path = v_key where id = p_business_id;
    end if;
  elsif p_action = 'cover' then
    update public.businesses set cover_photo_path = v_old_key where id = p_business_id;
  elsif p_action = 'delete' and v_business.cover_photo_path = v_old_key then
    update public.businesses set cover_photo_path = (
      select object_key from public.media_assets where business_id = p_business_id
        and category in ('business_cover','business_gallery') and status = 'active' and visibility = 'public'
      order by created_at, id limit 1
    ) where id = p_business_id;
  end if;
  return case when p_action in ('replace','delete') then v_old_key else null end;
end $$;
revoke all on function public.manage_business_photo(uuid,text,uuid,uuid,text,text,integer) from public, anon;
grant execute on function public.manage_business_photo(uuid,text,uuid,uuid,text,text,integer) to authenticated;
commit;
