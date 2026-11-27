begin;

alter table public.tenant_payments
  alter column amount_php type numeric(12,2),
  alter column reference drop not null,
  drop constraint tenant_payments_reference_check,
  drop constraint tenant_payments_method_check,
  add check(method in ('bank','gcash','maya','cash')),
  add check((method='cash' and reference is null) or
            (reference is not null and length(btrim(reference)) between 3 and 100)),
  add column receipt_mime text check(receipt_mime in ('image/jpeg','image/png','image/webp','application/pdf')),
  add column settles_invoice boolean not null default false;
-- A null receipt_mime identifies receipts already stored in Supabase Storage.
alter table public.tenant_subscriptions drop constraint tenant_subscriptions_preferred_method_check,
  add check(preferred_method in ('bank','gcash','maya','cash','card'));
alter table public.tenant_invoices add column credited_php numeric(12,2) not null default 0;
update public.tenant_invoices set credited_php=amount_php where status='paid';
update public.tenant_payments set settles_invoice=true where status='paid';
alter table public.tenant_invoices add check(credited_php between 0 and amount_php and
  (status='paid')=(credited_php=amount_php) and (status<>'void' or credited_php=0));

drop index public.tenant_payment_open_cycle;
create unique index tenant_payment_pending_invoice on public.tenant_payments(invoice_id) where status='pending';
drop trigger link_payment_invoice on public.tenant_payments;
drop trigger invoice_paid on public.tenant_payments;
drop function public.link_invoice_payment(), public.mark_invoice_paid();
drop function public.submit_invoice_payment(uuid,uuid,uuid,text,text,date,date);
drop function public.submit_billing_payment(uuid,uuid,text,text,date,date);

-- The authenticated upload endpoint validates the bytes, writes R2, then invokes
-- this server-only RPC. A direct tenant RPC cannot fabricate a receipt.
create function public.record_invoice_receipt(p_business uuid,p_invoice uuid,p_id uuid,p_actor uuid,
  p_amount numeric,p_reference text,p_paid date,p_due date,p_method text,p_mime text)
returns void language plpgsql security definer set search_path='' as $$
declare s public.tenant_subscriptions; i public.tenant_invoices; starts date;
begin
  if not exists(select 1 from public.businesses b join public.profiles p on p.id=b.owner_id
    join auth.users u on u.id=p.id where b.id=p_business and p.id=p_actor and p.role='provider' and u.email_confirmed_at is not null)
    then raise exception 'Verified business owner required'; end if;
  select * into strict s from public.tenant_subscriptions where business_id=p_business for update;
  select * into strict i from public.tenant_invoices where id=p_invoice and business_id=p_business for update;
  if not s.renew or i.status<>'open' or i.due_on is distinct from p_due or s.due_on is distinct from p_due
    or p_paid>public.billing_today() or p_mime is null or p_amount is null or p_amount<=0
    or round(p_amount,2)<>p_amount or p_amount>i.amount_php-i.credited_php then raise exception 'Check invoice balance and payment details'; end if;
  starts:=greatest(i.due_on+1,public.billing_today());
  insert into public.tenant_payments(id,business_id,invoice_id,due_on,period_start,period_end,amount_php,method,reference,paid_on,submitted_by,receipt_mime)
  values(p_id,p_business,i.id,i.due_on,starts,(starts+interval '1 month')::date-1,p_amount,p_method,nullif(btrim(p_reference),''),p_paid,p_actor,p_mime);
end $$;
revoke all on function public.record_invoice_receipt(uuid,uuid,uuid,uuid,numeric,text,date,date,text,text) from public,anon,authenticated;
grant execute on function public.record_invoice_receipt(uuid,uuid,uuid,uuid,numeric,text,date,date,text,text) to service_role;

create or replace function public.review_billing_payment(p_id uuid,p_approve boolean,p_feedback text)
returns void language plpgsql security definer set search_path='' as $$
declare p public.tenant_payments; i public.tenant_invoices; s public.tenant_subscriptions;
  settled boolean:=false; starts date; ends date;
begin
  if not public.is_admin() then raise exception 'Administrator required'; end if;
  select * into strict p from public.tenant_payments where id=p_id for update;
  if p.status<>'pending' or p_approve is null then raise exception 'Submission already reviewed'; end if;
  if length(p_feedback)>500 or (not p_approve and nullif(btrim(p_feedback),'') is null)
    then raise exception 'Enter a rejection reason (up to 500 characters)'; end if;
  select * into strict s from public.tenant_subscriptions where business_id=p.business_id for update;
  select * into strict i from public.tenant_invoices where id=p.invoice_id for update;
  if i.status<>'open' or i.due_on<>s.due_on then raise exception 'Invoice changed'; end if;
  if p_approve then
    settled:=i.credited_php+p.amount_php=i.amount_php;
    update public.tenant_invoices set credited_php=credited_php+p.amount_php,
      status=case when settled then 'paid' else 'open' end where id=i.id;
    if settled then
      starts:=greatest(i.due_on+1,public.billing_today());
      ends:=(starts+interval '1 month')::date-1;
      update public.tenant_subscriptions set due_on=ends where business_id=i.business_id;
    end if;
  end if;
  update public.tenant_payments set status=case when p_approve then 'paid' else 'rejected' end,
    settles_invoice=settled, reviewed_at=now(), reviewed_by=auth.uid(), feedback=nullif(btrim(p_feedback),''),
    reactivated=settled and i.due_on<public.billing_today(), period_start=coalesce(starts,period_start),
    period_end=coalesce(ends,period_end) where id=p.id;
end $$;
commit;
