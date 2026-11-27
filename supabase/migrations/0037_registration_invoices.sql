begin;

alter table public.provider_applications
  add column selected_plan text check (selected_plan in ('Free','Basic','Professional','Enterprise')),
  add column first_due_on date;
alter table public.tenant_subscriptions
  add column renewal_plan text check (renewal_plan in ('Free','Basic','Professional','Enterprise')),
  add column prior_plan text,
  add column plan_effective_on date;

create function public.monthly_plan_price(p_plan text) returns integer
language sql immutable strict set search_path='' as $$
  select case p_plan when 'Free' then 0 when 'Basic' then 999 when 'Professional' then 1999 when 'Enterprise' then 2999 end;
$$;

create table public.tenant_invoices (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity unique,
  business_id uuid not null references public.tenant_subscriptions(business_id),
  billed_to text not null, billing_name text, billing_email text, billing_address text,
  plan text not null,
  amount_php integer not null check(amount_php>0),
  period_start date not null, period_end date not null check(period_end>=period_start),
  due_on date not null, issued_at timestamptz not null default now(),
  status text not null check(status in ('open','paid','void')),
  unique(id,business_id)
);
create unique index one_billable_invoice_per_cycle on public.tenant_invoices(business_id,due_on) where status<>'void';
create index tenant_invoices_history on public.tenant_invoices(business_id,number desc);
alter table public.tenant_invoices enable row level security;
revoke all on public.tenant_invoices from public,anon,authenticated;
grant select on public.tenant_invoices to authenticated;
create policy invoice_read on public.tenant_invoices for select to authenticated
using(public.is_admin() or public.is_business_owner(business_id));

-- Snapshot only the contact fields needed for the invoice. Future edits to a
-- business or its application must never rewrite an issued invoice.
create function public.snapshot_invoice_contact() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  select nullif(billing_details->>'fullName',''), nullif(billing_details->>'email',''),
         nullif(billing_details->>'address','')
    into new.billing_name, new.billing_email, new.billing_address
    from public.provider_applications where business_id=new.business_id and status='approved'
    order by reviewed_at desc nulls last, id limit 1;
  return new;
end $$;
revoke all on function public.snapshot_invoice_contact() from public,anon,authenticated;
create trigger snapshot_invoice_contact before insert on public.tenant_invoices
for each row execute function public.snapshot_invoice_contact();

alter table public.tenant_payments add column invoice_id uuid,
  add foreign key(invoice_id,business_id) references public.tenant_invoices(id,business_id);
-- Under 0036 an enrolled business had one fixed plan. Recover billed periods from
-- recorded payments, prioritizing the verified period over rejected attempts.
insert into public.tenant_invoices(business_id,billed_to,plan,amount_php,period_start,period_end,due_on,issued_at,status)
select distinct on (p.business_id,p.due_on) p.business_id,b.name,s.plan,p.amount_php,p.period_start,p.period_end,p.due_on,p.submitted_at,
  case when p.status='paid' then 'paid' when p.status='pending' or (s.due_on=p.due_on and s.renew) then 'open' else 'void' end
from public.tenant_payments p join public.tenant_subscriptions s using(business_id)
join public.businesses b on b.id=p.business_id
order by p.business_id,p.due_on,(p.status='paid') desc,(p.status='pending') desc,p.submitted_at desc;
update public.tenant_payments p set invoice_id=i.id from public.tenant_invoices i
where i.business_id=p.business_id and i.due_on=p.due_on;
alter table public.tenant_payments alter column invoice_id set not null;
create index tenant_payments_invoice on public.tenant_payments(invoice_id);

create function public.issue_renewal_invoice(s public.tenant_subscriptions) returns void
language sql security definer set search_path='' as $$
  insert into public.tenant_invoices(business_id,billed_to,plan,amount_php,period_start,period_end,due_on,status)
  select s.business_id,b.name,coalesce(s.renewal_plan,s.plan),public.monthly_plan_price(coalesce(s.renewal_plan,s.plan)),
    s.due_on+1,((s.due_on+1)+interval '1 month')::date-1,s.due_on,'open'
  from public.businesses b where b.id=s.business_id and s.renew and s.due_on is not null
    and coalesce(s.renewal_plan,s.plan)<>'Free'
  on conflict(business_id,due_on) where status<>'void' do nothing;
$$;
select public.issue_renewal_invoice(s) from public.tenant_subscriptions s;

create function public.sync_renewal_invoice() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='UPDATE' then
    if (new.due_on,new.renew,new.renewal_plan,new.plan) is not distinct from (old.due_on,old.renew,old.renewal_plan,old.plan) then return new; end if;
    if new.due_on is not distinct from old.due_on then
      if exists(select 1 from public.tenant_payments where business_id=new.business_id and status='pending') then
        raise exception 'A receipt is awaiting review'; end if;
      update public.tenant_invoices set status='void' where business_id=new.business_id and due_on=new.due_on and status='open';
    end if;
  end if;
  perform public.issue_renewal_invoice(new);
  return new;
end $$;
create trigger subscription_invoice after insert or update of due_on,renew,renewal_plan,plan on public.tenant_subscriptions
for each row execute function public.sync_renewal_invoice();

create function public.enroll_selected_plan() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status='approved' and old.status<>'approved' and new.selected_plan is not null then
    if new.reviewed_by is null or (new.selected_plan<>'Free' and (new.first_due_on is null or new.first_due_on<public.billing_today())) then
      raise exception 'Confirm the first payment due date before approval'; end if;
    insert into public.tenant_subscriptions(business_id,plan,due_on,enrolled_by)
      values(new.business_id,new.selected_plan,case when new.selected_plan<>'Free' then new.first_due_on end,new.reviewed_by);
  end if;
  return new;
end $$;
create trigger application_plan_enrollment after update of status on public.provider_applications
for each row execute function public.enroll_selected_plan();

create function public.guard_application_billing() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='INSERT' and new.selected_plan is null then raise exception 'Select a subscription plan'; end if;
  if tg_op='UPDATE' and new.selected_plan is distinct from old.selected_plan then raise exception 'Submitted plan is immutable'; end if;
  if ((tg_op='INSERT' and new.first_due_on is not null) or
      (tg_op='UPDATE' and new.first_due_on is distinct from old.first_due_on)) and not public.is_admin()
    then raise exception 'Administrator required'; end if;
  return new;
end $$;
create trigger application_billing_guard before insert or update on public.provider_applications for each row execute function public.guard_application_billing();
create function public.approve_application_with_terms(p_application_id uuid,p_due date) returns public.businesses
language plpgsql security definer set search_path='' as $$
begin
  if not public.is_admin() then raise exception 'Administrator required'; end if;
  update public.provider_applications set first_due_on=p_due where id=p_application_id and status='pending';
  return public.approve_provider_application(p_application_id);
end $$;

-- Monthly renewal invoices are issued on enrollment and when verification opens the next cycle.
-- Suspension stops additional charges. Late verified payments retain their actual coverage in the ledger.
create function public.link_invoice_payment() returns trigger language plpgsql security definer set search_path='' as $$
declare i public.tenant_invoices;
begin
  select * into strict i from public.tenant_invoices
    where business_id=new.business_id and due_on=new.due_on and status='open' for update;
  if new.invoice_id is not null and new.invoice_id<>i.id then raise exception 'Invoice changed'; end if;
  new.invoice_id:=i.id;
  new.amount_php:=i.amount_php;
  return new;
end $$;
create trigger link_payment_invoice before insert on public.tenant_payments for each row execute function public.link_invoice_payment();
create function public.mark_invoice_paid() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status='paid' and old.status='pending' then
    update public.tenant_invoices set status='paid' where id=new.invoice_id and status='open';
    if not found then raise exception 'Invoice is no longer payable'; end if;
  end if;
  return new;
end $$;
create trigger invoice_paid after update of status on public.tenant_payments for each row execute function public.mark_invoice_paid();

-- Require the exact invoice shown to the customer, even if a plan changed at the same due date.
create function public.submit_invoice_payment(p_invoice uuid,p_business uuid,p_id uuid,p_method text,p_reference text,p_paid date,p_due date)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_business_owner(p_business) then raise exception 'Provider required'; end if;
  perform 1 from public.tenant_subscriptions where business_id=p_business for update;
  if not exists(select 1 from public.tenant_invoices where id=p_invoice and business_id=p_business and due_on=p_due and status='open')
    then raise exception 'Refresh the current invoice'; end if;
  perform public.submit_billing_payment(p_business,p_id,p_method,p_reference,p_paid,p_due);
end $$;
revoke execute on function public.submit_billing_payment(uuid,uuid,text,text,date,date) from authenticated;

create function public.apply_verified_renewal_plan() returns trigger language plpgsql set search_path='' as $$
begin
  if old.renewal_plan is not null and old.renewal_plan<>'Free' and new.due_on>old.due_on then
    new.prior_plan:=case when old.plan_effective_on>public.billing_today() then old.prior_plan else old.plan end;
    new.plan_effective_on:=greatest(old.due_on+1,public.billing_today());
    new.plan:=old.renewal_plan;
    new.renewal_plan:=null;
  end if;
  return new;
end $$;
create trigger verified_renewal_plan before update of due_on on public.tenant_subscriptions
for each row execute function public.apply_verified_renewal_plan();

create function public.change_renewal_plan(p_business uuid,p_plan text,p_first_due date default null)
returns void language plpgsql security definer set search_path='' as $$
declare s public.tenant_subscriptions;
begin
  if not public.is_admin() then raise exception 'Administrator required'; end if;
  if public.monthly_plan_price(p_plan) is null then raise exception 'Unknown plan'; end if;
  select * into strict s from public.tenant_subscriptions where business_id=p_business for update;
  if exists(select 1 from public.tenant_payments where business_id=p_business and status='pending') then raise exception 'Review the pending receipt first'; end if;
  if s.plan='Free' or (s.renew and s.renewal_plan='Free' and s.due_on<public.billing_today()) then
    if p_plan='Free' then return; end if;
    if p_first_due is null or p_first_due<public.billing_today() then raise exception 'Confirm first paid due date'; end if;
    update public.tenant_subscriptions set plan=p_plan,due_on=p_first_due,renew=true,renewal_plan=null,prior_plan=null,plan_effective_on=null where business_id=p_business;
  else
    if s.plan_effective_on>public.billing_today() then raise exception 'A verified plan change is already scheduled'; end if;
    update public.tenant_subscriptions set renew=true,renewal_plan=nullif(p_plan,plan) where business_id=p_business;
  end if;
end $$;
create or replace function public.billing_access(p_business uuid) returns boolean language sql stable security definer set search_path='' as $$
  select not exists(select 1 from public.tenant_subscriptions where business_id=p_business and due_on<public.billing_today()
    and not (renew and coalesce(renewal_plan,'')='Free'));
$$;

-- Project effective terms without relying on a midnight task or a tenant page visit.
create view public.tenant_billing_terms with (security_invoker=true) as
select business_id, effective_plan as plan, public.monthly_plan_price(effective_plan) as monthly_php,
  case when effective_plan<>'Free' then due_on end as due_on,renew,preferred_method,
  case when effective_plan='Free' then 0 else public.monthly_plan_price(coalesce(renewal_plan,plan)) end as renewal_php,
  case when plan_effective_on>public.billing_today() then plan
       when effective_plan<>'Free' then renewal_plan end as upcoming_plan,
  case when plan_effective_on>public.billing_today() then plan_effective_on
       when renewal_plan is not null and effective_plan<>'Free' then due_on+1 end as upcoming_on
from (select s.*, case when renew and renewal_plan='Free' and due_on<public.billing_today() then 'Free'
  when plan_effective_on>public.billing_today() then prior_plan else plan end as effective_plan
  from public.tenant_subscriptions s) terms;
revoke all on public.tenant_billing_terms from public,anon,authenticated;
grant select on public.tenant_billing_terms to authenticated;

create or replace function public.set_billing_preferences(p_business uuid,p_renew boolean,p_method text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_business_owner(p_business) then raise exception 'Provider required'; end if;
  update public.tenant_subscriptions set renew=coalesce(p_renew,renew), preferred_method=coalesce(p_method,preferred_method)
    where business_id=p_business and monthly_php>0 and not(renew and coalesce(renewal_plan,'')='Free' and due_on<public.billing_today());
  if not found then raise exception 'Paid subscription required'; end if;
end $$;
revoke all on function public.issue_renewal_invoice(public.tenant_subscriptions),public.sync_renewal_invoice(),public.enroll_selected_plan(),
 public.guard_application_billing(),public.link_invoice_payment(),public.mark_invoice_paid(),public.apply_verified_renewal_plan(),
 public.approve_application_with_terms(uuid,date),public.change_renewal_plan(uuid,text,date),public.submit_invoice_payment(uuid,uuid,uuid,text,text,date,date)
from public,anon,authenticated;
grant execute on function public.approve_application_with_terms(uuid,date),public.change_renewal_plan(uuid,text,date),
 public.submit_invoice_payment(uuid,uuid,uuid,text,text,date,date) to authenticated;
commit;
