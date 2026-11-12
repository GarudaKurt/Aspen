-- New business photos are stored as server-generated WebP objects. Existing
-- object keys remain unchanged and continue to resolve through their metadata.
begin;

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
      or p_byte_size not between 1 and 4194304
      or p_content_type <> 'image/webp'
      or p_filename is null or p_filename !~ '\.webp$' or length(p_filename) > 255 then
      raise exception 'Business photos must be optimized WebP files';
    end if;

    v_key := 'businesses/' || p_business_id::text || '/business_gallery/' || p_new_id::text || '-photo.webp';
    insert into public.media_assets(id,owner_id,business_id,category,visibility,object_key,
      original_filename,content_type,byte_size,status,uploaded_at)
    values(p_new_id,auth.uid(),p_business_id,'business_gallery','public',v_key,
      p_filename,p_content_type,p_byte_size,'active',now());

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

revoke all on function public.manage_business_photo(uuid,text,uuid,uuid,text,text,integer) from public, anon;
grant execute on function public.manage_business_photo(uuid,text,uuid,uuid,text,text,integer) to authenticated;
commit;
