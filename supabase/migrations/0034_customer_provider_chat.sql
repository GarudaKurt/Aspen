-- Shared customer/provider chat. 0009_chat.sql was an empty placeholder.
-- Requires the existing profiles, businesses and approval helpers through 0031.
begin;
create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  unique(business_id, customer_id)
);
create table if not exists public.chat_participants (
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  participant_role text not null check (participant_role in ('customer','provider')),
  last_read_seq bigint not null default 0 check (last_read_seq >= 0),
  archived boolean not null default false,
  hidden boolean not null default false,
  muted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(conversation_id,user_id),
  unique(conversation_id,participant_role)
);
create table if not exists public.chat_messages (
  seq bigint generated always as identity primary key,
  id uuid not null unique default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null,
  body text not null check (length(body) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  unique(sender_id,client_id),
  check (deleted_at is not null or length(trim(body)) > 0)
);
create table if not exists public.chat_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation text not null,
  window_start timestamptz not null,
  attempts integer not null,
  primary key(user_id,operation)
);
create index if not exists chat_participants_inbox_idx on public.chat_participants(user_id,participant_role,archived) where not hidden;
create index if not exists chat_conversations_activity_idx on public.chat_conversations(last_activity_at desc,id desc);
create index if not exists chat_messages_history_idx on public.chat_messages(conversation_id,seq desc);
create index if not exists chat_messages_sync_idx on public.chat_messages(conversation_id,updated_at,seq);
create index if not exists chat_messages_sender_time_idx on public.chat_messages(sender_id,created_at desc);

create or replace function public.is_chat_member(p_conversation uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.chat_participants cp
    join public.chat_conversations c on c.id=cp.conversation_id
    join public.businesses b on b.id=c.business_id
    join public.profiles p on p.id=cp.user_id
    join auth.users u on u.id=p.id and u.email_confirmed_at is not null
    where cp.conversation_id=p_conversation and cp.user_id=auth.uid()
      and ((cp.participant_role='customer' and c.customer_id=auth.uid() and p.role in ('customer','provider'))
        or (cp.participant_role='provider' and b.owner_id=auth.uid() and p.role='provider'))
  );
$$;
revoke all on function public.is_chat_member(uuid) from public,anon;
grant execute on function public.is_chat_member(uuid) to authenticated;

alter table public.chat_conversations enable row level security;
alter table public.chat_participants enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_rate_limits enable row level security;
drop policy if exists chat_conversations_member_read on public.chat_conversations;
create policy chat_conversations_member_read on public.chat_conversations for select to authenticated using(public.is_chat_member(id));
drop policy if exists chat_participants_member_read on public.chat_participants;
create policy chat_participants_member_read on public.chat_participants for select to authenticated using(public.is_chat_member(conversation_id));
drop policy if exists chat_messages_member_read on public.chat_messages;
create policy chat_messages_member_read on public.chat_messages for select to authenticated using(public.is_chat_member(conversation_id));
-- Mutations are RPC-only, including when a caller bypasses the Next.js server.
revoke all on public.chat_conversations,public.chat_participants,public.chat_messages,public.chat_rate_limits from anon,authenticated;
grant select on public.chat_conversations,public.chat_participants,public.chat_messages to authenticated;

create or replace function public.chat_require_user()
returns uuid language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from auth.users u join public.profiles p on p.id=u.id
    where u.id=auth.uid() and u.email_confirmed_at is not null and p.role in ('customer','provider')) then
    raise exception 'A verified customer or provider account is required' using errcode='42501';
  end if;
  return auth.uid();
end;
$$;
create or replace function public.chat_check_rate(p_operation text,p_limit integer)
returns void language plpgsql security definer set search_path=public as $$
declare amount integer;
begin
  insert into public.chat_rate_limits(user_id,operation,window_start,attempts)
  values(auth.uid(),p_operation,clock_timestamp(),1)
  on conflict(user_id,operation) do update
    set attempts=case when chat_rate_limits.window_start <= clock_timestamp()-interval '1 minute' then 1 else chat_rate_limits.attempts+1 end,
        window_start=case when chat_rate_limits.window_start <= clock_timestamp()-interval '1 minute' then clock_timestamp() else chat_rate_limits.window_start end
  returning attempts into amount;
  if amount>p_limit then raise exception 'Too many chat requests. Wait a minute and retry' using errcode='P0001'; end if;
end;
$$;
revoke all on function public.chat_require_user(),public.chat_check_rate(text,integer) from public,anon,authenticated;

create or replace function public.start_business_chat(p_slug text)
returns uuid language plpgsql security definer set search_path=public as $$
declare caller uuid; business_row public.businesses; thread_id uuid;
begin
  caller:=public.chat_require_user();
  if p_slug is null or length(p_slug)>160 then raise exception 'Invalid business'; end if;
  select * into business_row from public.businesses where slug=p_slug;
  if business_row.id is null or business_row.owner_id=caller then raise exception 'Choose another business to message'; end if;
  perform public.chat_check_rate('conversation',10);
  select c.id into thread_id from public.chat_conversations c where c.business_id=business_row.id and c.customer_id=caller;
  if thread_id is not null then
    if not public.is_chat_member(thread_id) then raise exception 'Conversation access denied' using errcode='42501'; end if;
    update public.chat_participants set hidden=false,archived=false,updated_at=clock_timestamp()
      where chat_participants.conversation_id=thread_id and user_id=caller;
    return thread_id;
  end if;
  if business_row.status<>'published' or not public.has_approved_business_application(business_row.id)
    or not exists(select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=business_row.owner_id and p.role='provider' and u.email_confirmed_at is not null) then
    raise exception 'This business is not currently accepting new conversations';
  end if;
  insert into public.chat_conversations(business_id,customer_id) values(business_row.id,caller)
    on conflict(business_id,customer_id) do update set business_id=excluded.business_id returning id into thread_id;
  insert into public.chat_participants(conversation_id,user_id,participant_role)
    values(thread_id,caller,'customer'),(thread_id,business_row.owner_id,'provider')
    on conflict do nothing;
  return thread_id;
end;
$$;

create or replace function public.send_chat_message(p_conversation uuid,p_client_id uuid,p_body text)
returns public.chat_messages language plpgsql security definer set search_path=public as $$
declare caller uuid; result public.chat_messages;
begin
  caller:=public.chat_require_user();
  if p_client_id is null or p_body is null or length(trim(p_body)) not between 1 and 4000 or p_body !~ '[^[:space:]]' then raise exception 'Messages must contain 1 to 4000 characters'; end if;
  if not public.is_chat_member(p_conversation) then raise exception 'Conversation access denied' using errcode='42501'; end if;
  -- A user-level lock serializes retry keys and rate-limit accounting across threads.
  perform pg_advisory_xact_lock(hashtextextended(caller::text,34));
  select * into result from public.chat_messages where sender_id=caller and client_id=p_client_id;
  if result.id is not null then
    if result.conversation_id<>p_conversation or (result.body<>trim(p_body) and result.edited_at is null and result.deleted_at is null) then
      raise exception 'This retry identifier belongs to another message';
    end if;
    return result;
  end if;
  perform 1 from public.chat_conversations c join public.businesses b on b.id=c.business_id
    where c.id=p_conversation and b.status in ('pending','published') and public.has_approved_business_application(b.id)
      and exists(select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=b.owner_id and p.role='provider' and u.email_confirmed_at is not null);
  if not found then raise exception 'Messaging is unavailable while this business is inactive'; end if;
  perform public.chat_check_rate('send',30);
  if (select count(*) from public.chat_messages where sender_id=caller and created_at>now()-interval '1 day')>=2000 then
    raise exception 'Daily message limit reached. Please try again tomorrow';
  end if;
  -- Lock order is consistent for sending, edits and reads. Sequence watermarks
  -- cannot skip an uncommitted message in this conversation.
  perform 1 from public.chat_conversations where id=p_conversation for update;
  insert into public.chat_messages(conversation_id,sender_id,client_id,body,created_at,updated_at)
    values(p_conversation,caller,p_client_id,trim(p_body),clock_timestamp(),clock_timestamp()) returning * into result;
  update public.chat_conversations set last_activity_at=clock_timestamp() where id=p_conversation;
  update public.chat_participants set hidden=false,archived=false,updated_at=clock_timestamp() where conversation_id=p_conversation;
  return result;
end;
$$;

create or replace function public.change_chat_message(p_message uuid,p_body text,p_delete boolean,p_updated_at timestamptz)
returns public.chat_messages language plpgsql security definer set search_path=public as $$
declare caller uuid; result public.chat_messages; thread_id uuid;
begin
  caller:=public.chat_require_user();
  select conversation_id into thread_id from public.chat_messages where id=p_message and sender_id=caller;
  if thread_id is null or not public.is_chat_member(thread_id) then raise exception 'Message access denied' using errcode='42501'; end if;
  if p_delete is null or p_updated_at is null then raise exception 'Invalid message change'; end if;
  if not p_delete and (p_body is null or length(trim(p_body)) not between 1 and 4000 or p_body !~ '[^[:space:]]') then raise exception 'Messages must contain 1 to 4000 characters'; end if;
  perform public.chat_check_rate('change',30);
  perform 1 from public.chat_conversations where id=thread_id for update;
  select * into result from public.chat_messages where id=p_message for update;
  if result.deleted_at is not null or result.updated_at<>p_updated_at then raise exception 'This message changed. Reload before editing'; end if;
  if result.created_at < clock_timestamp() - (case when p_delete then interval '24 hours' else interval '15 minutes' end) then
    raise exception 'Messages can be edited for 15 minutes and deleted for 24 hours';
  end if;
  update public.chat_messages set body=case when p_delete then '' else trim(p_body) end,
    deleted_at=case when p_delete then clock_timestamp() else null end,
    edited_at=case when p_delete then edited_at else clock_timestamp() end,updated_at=clock_timestamp()
    where id=p_message returning * into result;
  update public.chat_participants set updated_at=clock_timestamp() where conversation_id=thread_id;
  return result;
end;
$$;

create or replace function public.read_chat_conversation(p_conversation uuid,p_upto_seq bigint)
returns void language plpgsql security definer set search_path=public as $$
begin
  perform public.chat_require_user();
  if not public.is_chat_member(p_conversation) then raise exception 'Conversation access denied' using errcode='42501'; end if;
  perform 1 from public.chat_conversations where id=p_conversation for update;
  if p_upto_seq is null or p_upto_seq<0 or p_upto_seq>coalesce((select max(seq) from public.chat_messages where conversation_id=p_conversation),0) then raise exception 'Invalid read position'; end if;
  update public.chat_participants set last_read_seq=p_upto_seq,updated_at=clock_timestamp()
    where conversation_id=p_conversation and user_id=auth.uid() and last_read_seq<p_upto_seq;
end;
$$;

create or replace function public.set_chat_preferences(p_conversation uuid,p_archived boolean default null,p_muted boolean default null,p_hidden boolean default null)
returns void language plpgsql security definer set search_path=public as $$
begin
  perform public.chat_require_user();
  if not public.is_chat_member(p_conversation) then raise exception 'Conversation access denied' using errcode='42501'; end if;
  perform public.chat_check_rate('preferences',60);
  update public.chat_participants set archived=coalesce(p_archived,archived),muted=coalesce(p_muted,muted),hidden=coalesce(p_hidden,hidden),updated_at=clock_timestamp()
    where conversation_id=p_conversation and user_id=auth.uid();
end;
$$;

create or replace function public.list_chat_conversations(p_role text,p_archived boolean default false,p_before_at timestamptz default null,p_before_id uuid default null,p_limit integer default 30,p_conversation uuid default null)
returns table(id uuid,business_id uuid,business_slug text,name text,photo_id uuid,preview text,last_activity_at timestamptz,unread_count bigint,muted boolean,archived boolean,participant_role text)
language plpgsql security definer set search_path=public as $$
begin
  perform public.chat_require_user();
  if p_role not in ('customer','provider') or p_role is null or p_limit is null or p_limit not between 1 and 50
    or (p_before_at is null)<>(p_before_id is null) then raise exception 'Invalid inbox request'; end if;
  return query
    select c.id,b.id,b.slug,
      case when p_role='customer' then b.name else coalesce(nullif(trim(profile.display_name),''),'Customer') end,
      case when p_role='customer' then (select m.id from public.media_assets m where m.business_id=b.id and m.object_key=b.cover_photo_path and m.status='active' and m.visibility='public' and m.category in ('business_cover','business_gallery') limit 1) else null::uuid end,
      coalesce((select case when m.deleted_at is null then left(m.body,140) else 'Message deleted' end from public.chat_messages m where m.conversation_id=c.id order by m.seq desc limit 1),'No messages yet'),
      c.last_activity_at,
      (select count(*) from public.chat_messages m where m.conversation_id=c.id and m.seq>cp.last_read_seq and m.sender_id<>auth.uid() and m.deleted_at is null),
      cp.muted,cp.archived,cp.participant_role
    from public.chat_participants cp join public.chat_conversations c on c.id=cp.conversation_id
    join public.businesses b on b.id=c.business_id left join public.profiles profile on profile.id=c.customer_id
    where cp.user_id=auth.uid() and cp.participant_role=p_role
      and ((p_conversation is null and cp.archived=p_archived and not cp.hidden) or c.id=p_conversation)
      and public.is_chat_member(c.id)
      and (p_before_at is null or (c.last_activity_at,c.id)<(p_before_at,p_before_id))
    order by c.last_activity_at desc,c.id desc limit p_limit;
end;
$$;

create or replace function public.get_chat_history(p_conversation uuid,p_before_seq bigint default null,p_limit integer default 50)
returns table(id uuid,seq bigint,conversation_id uuid,sender_id uuid,body text,created_at timestamptz,updated_at timestamptz,edited_at timestamptz,deleted_at timestamptz,client_id uuid,read_by_recipient boolean)
language plpgsql security definer set search_path=public as $$
begin
  perform public.chat_require_user();
  if not public.is_chat_member(p_conversation) then raise exception 'Conversation access denied' using errcode='42501'; end if;
  if p_limit is null or p_limit not between 1 and 100 or p_before_seq<=0 then raise exception 'Invalid history request'; end if;
  return query select m.id,m.seq,m.conversation_id,m.sender_id,m.body,m.created_at,m.updated_at,m.edited_at,m.deleted_at,m.client_id,
    exists(select 1 from public.chat_participants cp where cp.conversation_id=m.conversation_id and cp.user_id<>m.sender_id and cp.last_read_seq>=m.seq)
    from public.chat_messages m where m.conversation_id=p_conversation and (p_before_seq is null or m.seq<p_before_seq)
    order by m.seq desc limit p_limit;
end;
$$;

create or replace function public.chat_history_page(p_conversation uuid,p_before_seq bigint default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare watermark timestamptz; messages jsonb; recipient_read bigint;
begin
  perform public.chat_require_user();
  if not public.is_chat_member(p_conversation) then raise exception 'Conversation access denied' using errcode='42501'; end if;
  perform 1 from public.chat_conversations where id=p_conversation for share;
  watermark:=clock_timestamp();
  select coalesce(jsonb_agg(to_jsonb(m) order by m.seq desc),'[]'::jsonb) into messages from public.get_chat_history(p_conversation,p_before_seq,51) m;
  select last_read_seq into recipient_read from public.chat_participants where conversation_id=p_conversation and user_id<>auth.uid();
  return jsonb_build_object('messages',messages,'watermark',watermark,'recipientRead',coalesce(recipient_read,0));
end;
$$;

create or replace function public.sync_chat_messages(p_conversation uuid,p_after_at timestamptz,p_after_seq bigint default 0)
returns jsonb language plpgsql security definer set search_path=public as $$
declare messages jsonb; recipient_read bigint;
begin
  perform public.chat_require_user();
  if not public.is_chat_member(p_conversation) then raise exception 'Conversation access denied' using errcode='42501'; end if;
  if p_after_at is null or not isfinite(p_after_at) or p_after_seq is null or p_after_seq<0 then raise exception 'Invalid synchronization cursor'; end if;
  perform 1 from public.chat_conversations where id=p_conversation for share;
  select coalesce(jsonb_agg(to_jsonb(m) order by m.updated_at,m.seq),'[]'::jsonb) into messages from (
    select * from public.chat_messages where conversation_id=p_conversation and (updated_at,seq)>(p_after_at,p_after_seq)
    order by updated_at,seq limit 101
  ) m;
  select last_read_seq into recipient_read from public.chat_participants where conversation_id=p_conversation and user_id<>auth.uid();
  return jsonb_build_object('messages',messages,'recipientRead',coalesce(recipient_read,0));
end;
$$;

revoke all on function public.start_business_chat(text),public.send_chat_message(uuid,uuid,text),public.change_chat_message(uuid,text,boolean,timestamptz),public.read_chat_conversation(uuid,bigint),public.set_chat_preferences(uuid,boolean,boolean,boolean),public.list_chat_conversations(text,boolean,timestamptz,uuid,integer,uuid),public.get_chat_history(uuid,bigint,integer),public.chat_history_page(uuid,bigint),public.sync_chat_messages(uuid,timestamptz,bigint) from public,anon;
grant execute on function public.start_business_chat(text),public.send_chat_message(uuid,uuid,text),public.change_chat_message(uuid,text,boolean,timestamptz),public.read_chat_conversation(uuid,bigint),public.set_chat_preferences(uuid,boolean,boolean,boolean),public.list_chat_conversations(text,boolean,timestamptz,uuid,integer,uuid),public.get_chat_history(uuid,bigint,integer),public.chat_history_page(uuid,bigint),public.sync_chat_messages(uuid,timestamptz,bigint) to authenticated;

do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='chat_messages') then alter publication supabase_realtime add table public.chat_messages; end if;
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='chat_participants') then alter publication supabase_realtime add table public.chat_participants; end if;
  end if;
end $$;
commit;
