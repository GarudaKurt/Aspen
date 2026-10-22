-- Persist customer appointment requests and their provider-managed status.
-- Apply this migration in the Supabase SQL editor before using the booking flow.

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  booking_reference text not null unique default (
    'ASP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
  ),
  customer_id uuid not null references auth.users(id) on delete cascade,
  business_id text not null,
  business_name text not null,
  service_id text not null,
  service_name text not null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  pet_name text not null,
  pet_type text not null,
  appointment_date date not null,
  appointment_time text not null,
  notes text not null default '',
  status text not null default 'Pending'
    check (status in ('Pending', 'Confirmed', 'Rejected', 'Completed', 'Cancelled')),
  rejection_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists appointments_customer_date_idx
  on public.appointments(customer_id, appointment_date, appointment_time);
create index if not exists appointments_business_status_idx
  on public.appointments(business_id, status, appointment_date);

drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at
before update on public.appointments
for each row execute procedure public.set_updated_at();

create or replace function public.is_provider_or_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('provider', 'admin')
  );
$$;

alter table public.appointments enable row level security;

drop policy if exists "appointments_select_own_or_provider" on public.appointments;
create policy "appointments_select_own_or_provider"
on public.appointments for select
to authenticated
using (customer_id = auth.uid() or public.is_provider_or_admin());

drop policy if exists "appointments_insert_own" on public.appointments;
create policy "appointments_insert_own"
on public.appointments for insert
to authenticated
with check (customer_id = auth.uid());

drop policy if exists "appointments_update_provider" on public.appointments;
create policy "appointments_update_provider"
on public.appointments for update
to authenticated
using (public.is_provider_or_admin())
with check (public.is_provider_or_admin());

create or replace function public.cancel_my_appointment(p_appointment_id uuid)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_appointment public.appointments;
begin
  update public.appointments
  set status = 'Cancelled', updated_at = timezone('utc', now())
  where id = p_appointment_id
    and customer_id = auth.uid()
    and status in ('Pending', 'Confirmed')
  returning * into updated_appointment;

  return updated_appointment;
end;
$$;

grant select, insert on public.appointments to authenticated;
grant update on public.appointments to authenticated;
grant execute on function public.cancel_my_appointment(uuid) to authenticated;
