-- Count the entire active inbox without fetching or paging through message bodies.
begin;
create or replace function public.provider_unread_messages(p_business_id uuid)
returns bigint language sql stable security invoker set search_path = '' as $$
  select count(*)
  from public.chat_conversations c
  join public.businesses b on b.id = c.business_id
  join public.chat_participants p on p.conversation_id = c.id
  join public.chat_messages m on m.conversation_id = c.id and m.seq > p.last_read_seq
  where b.id = p_business_id and b.owner_id = (select auth.uid())
    and p.user_id = (select auth.uid()) and p.participant_role = 'provider'
    and not p.archived and not p.hidden
    and m.sender_id <> p.user_id and m.deleted_at is null;
$$;
revoke all on function public.provider_unread_messages(uuid) from public, anon;
grant execute on function public.provider_unread_messages(uuid) to authenticated;
commit;
