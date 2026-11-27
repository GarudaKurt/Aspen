-- Run after 0035. Existing businesses keep their access until explicitly enrolled.
begin;
create table public.tenant_subscriptions (
  business_id uuid primary key references public.businesses(id) on delete restrict,
  plan text not null check (plan in ('Free','Basic','Professional','Enterprise')),
  monthly_php integer generated always as (case plan when 'Free' then 0 when 'Basic' then 999 when 'Professional' then 1999 when 'Enterprise' then 2999 end) stored,
  due_on date, renew boolean not null default true,
  preferred_method text check (preferred_method in ('card','bank','gcash')),
  receipt_window timestamptz, receipt_attempts integer not null default 0,
  enrolled_by uuid not null references auth.users, enrolled_at timestamptz not null default now(),
  check ((plan='Free') = (due_on is null))
);
create table public.tenant_payments (
  id uuid primary key, business_id uuid not null references public.tenant_subscriptions on delete restrict,
  due_on date not null, period_start date not null, period_end date not null,
  amount_php integer not null check(amount_php>0), method text not null check(method in ('bank','gcash')),
  reference text not null check(length(btrim(reference)) between 3 and 100), paid_on date not null,
  submitted_by uuid not null references auth.users, submitted_at timestamptz not null default now(),
  status text not null default 'pending' check(status in ('pending','paid','rejected')),
  reviewed_by uuid references auth.users, reviewed_at timestamptz, feedback text,
  reactivated boolean not null default false
);
create unique index tenant_payment_open_cycle on public.tenant_payments(business_id,due_on) where status in ('pending','paid');
create unique index tenant_payment_reference on public.tenant_payments(business_id,method,lower(reference)) where status <> 'rejected';
create index tenant_payment_history on public.tenant_payments(business_id,submitted_at desc);
create index tenant_payment_review_queue on public.tenant_payments(submitted_at) where status='pending';
alter table public.tenant_subscriptions enable row level security;
alter table public.tenant_payments enable row level security;
revoke all on public.tenant_subscriptions, public.tenant_payments from public,anon,authenticated;
grant select on public.tenant_subscriptions, public.tenant_payments to authenticated;
create policy subscription_read on public.tenant_subscriptions for select to authenticated
using (public.is_admin() or public.is_business_owner(business_id));
create policy payment_read on public.tenant_payments for select to authenticated
using (public.is_admin() or public.is_business_owner(business_id));

-- Receipts are created exclusively by the validated server upload endpoint.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('billing-proofs','billing-proofs',false,3145728,array['image/jpeg','image/png','image/webp']);
create policy billing_proof_read on storage.objects for select to authenticated
using (bucket_id='billing-proofs');
create policy billing_proof_private on storage.objects as restrictive for select to authenticated
using (bucket_id<>'billing-proofs' or exists (
  select 1 from public.tenant_payments p where name=p.business_id::text || '/' || p.id::text
));
create policy billing_proof_no_anonymous_read on storage.objects as restrictive for select to anon
using (bucket_id<>'billing-proofs');
create policy billing_proof_no_insert on storage.objects as restrictive for insert to authenticated,anon
with check (bucket_id<>'billing-proofs');
create policy billing_proof_no_update on storage.objects as restrictive for update to authenticated,anon
using (bucket_id<>'billing-proofs') with check (bucket_id<>'billing-proofs');
create policy billing_proof_no_delete on storage.objects as restrictive for delete to authenticated,anon
using (bucket_id<>'billing-proofs');

create function public.billing_today() returns date language sql stable set search_path='' as $$
  select (now() at time zone 'Asia/Manila')::date;
$$;
create function public.billing_access(p_business uuid) returns boolean language sql stable security definer set search_path='' as $$
  select not exists(select 1 from public.tenant_subscriptions where business_id=p_business and due_on < public.billing_today());
$$;
-- Preserve independently applied admin restrictions and listing state on reactivation.
create policy billing_listing_access on public.businesses as restrictive for select
using(owner_id=(select auth.uid()) or public.is_admin() or public.billing_access(id));
create policy billing_service_access on public.business_services as restrictive for select
using(public.is_business_owner(business_id) or public.is_admin() or public.billing_access(business_id));
create or replace function public.can_manage_business_services(p_business_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select public.billing_access(p_business_id) and public.is_business_owner(p_business_id)
    and public.has_approved_business_application(p_business_id)
    and exists(select 1 from public.businesses where id=p_business_id and status in ('pending','published'))
    and exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null);
$$;
create function public.billing_guard_booking() returns trigger language plpgsql security definer set search_path='' as $$
declare bid uuid;
begin
  select id into bid from public.businesses where slug=new.business_id;
  if not public.billing_access(bid) and (tg_op='INSERT' or new.status<>'Cancelled') and not public.is_admin() then
    raise exception 'This business subscription has expired';
  end if;
  return new;
end $$;
create trigger appointments_billing_access before insert or update of status on public.appointments
for each row execute function public.billing_guard_booking();

create function public.enroll_tenant_subscription(p_business uuid,p_plan text,p_due date)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_admin() then raise exception 'Administrator required'; end if;
  if not public.has_approved_business_application(p_business) then raise exception 'Approved business required'; end if;
  if p_due < public.billing_today() then raise exception 'Choose today or a future first due date'; end if;
  insert into public.tenant_subscriptions(business_id,plan,due_on,enrolled_by)
    values(p_business,p_plan,p_due,auth.uid());
end $$;

create function public.set_billing_preferences(p_business uuid,p_renew boolean,p_method text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_business_owner(p_business) then raise exception 'Provider required'; end if;
  update public.tenant_subscriptions set renew=coalesce(p_renew,renew), preferred_method=coalesce(p_method,preferred_method)
    where business_id=p_business and monthly_php>0;
  if not found then raise exception 'Paid subscription required'; end if;
end $$;

-- Bound concurrent or invalid uploads before decoding an image or writing to Storage.
create function public.begin_billing_upload(p_business uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if not public.is_business_owner(p_business) then raise exception 'Provider required'; end if;
  update public.tenant_subscriptions set
    receipt_attempts=case when receipt_window > now()-interval '10 minutes' then receipt_attempts+1 else 1 end,
    receipt_window=case when receipt_window > now()-interval '10 minutes' then receipt_window else now() end
    where business_id=p_business and renew and monthly_php>0 and
      (receipt_window is null or receipt_window <= now()-interval '10 minutes' or receipt_attempts<6)
      and not exists(select 1 from public.tenant_payments where business_id=p_business and status='pending');
  return found;
end $$;
revoke all on function public.begin_billing_upload(uuid) from public,anon;
grant execute on function public.begin_billing_upload(uuid) to authenticated;

create function public.submit_billing_payment(p_business uuid,p_id uuid,p_method text,p_reference text,p_paid date,p_due date)
returns void language plpgsql security definer set search_path='' as $$
declare s public.tenant_subscriptions; starts date;
begin
  if not public.is_business_owner(p_business) then raise exception 'Provider required'; end if;
  select * into strict s from public.tenant_subscriptions where business_id=p_business for update;
  if s.monthly_php=0 or s.due_on is distinct from p_due or p_paid>public.billing_today()
    or not s.renew then raise exception 'Check billing preferences and current cycle'; end if;
  if not exists(select 1 from storage.objects where bucket_id='billing-proofs' and name=p_business::text||'/'||p_id::text)
    then raise exception 'Receipt is missing'; end if;
  starts := greatest(s.due_on+1,public.billing_today());
  insert into public.tenant_payments(id,business_id,due_on,period_start,period_end,amount_php,method,reference,paid_on,submitted_by)
    values(p_id,p_business,s.due_on,starts,(starts+interval '1 month')::date-1,s.monthly_php,p_method,btrim(p_reference),p_paid,auth.uid());
end $$;

create function public.review_billing_payment(p_id uuid,p_approve boolean,p_feedback text)
returns void language plpgsql security definer set search_path='' as $$
declare p public.tenant_payments; s public.tenant_subscriptions; starts date; ends date;
begin
  if not public.is_admin() then raise exception 'Administrator required'; end if;
  select * into strict p from public.tenant_payments where id=p_id for update;
  if p.status<>'pending' or p_approve is null then raise exception 'Submission already reviewed'; end if;
  if length(p_feedback)>500 or (not p_approve and nullif(btrim(p_feedback),'') is null)
    then raise exception 'Enter a rejection reason (up to 500 characters)'; end if;
  select * into strict s from public.tenant_subscriptions where business_id=p.business_id for update;
  if s.due_on is distinct from p.due_on then raise exception 'Billing cycle has changed'; end if;
  starts := greatest(s.due_on+1,public.billing_today());
  ends := (starts+interval '1 month')::date-1;
  if p_approve then
    update public.tenant_subscriptions set due_on=ends where business_id=s.business_id;
  end if;
  update public.tenant_payments set status=case when p_approve then 'paid' else 'rejected' end,
    reviewed_at=now(),reviewed_by=auth.uid(),feedback=nullif(btrim(p_feedback),''),
    reactivated=p_approve and s.due_on<public.billing_today(),
    period_start=case when p_approve then starts else period_start end,
    period_end=case when p_approve then ends else period_end end where id=p.id;
end $$;

revoke all on function public.enroll_tenant_subscription(uuid,text,date),public.set_billing_preferences(uuid,boolean,text),
 public.submit_billing_payment(uuid,uuid,text,text,date,date),public.review_billing_payment(uuid,boolean,text),public.billing_guard_booking() from public,anon,authenticated;
grant execute on function public.enroll_tenant_subscription(uuid,text,date),public.set_billing_preferences(uuid,boolean,text),
 public.submit_billing_payment(uuid,uuid,text,text,date,date),public.review_billing_payment(uuid,boolean,text) to authenticated;
commit;
