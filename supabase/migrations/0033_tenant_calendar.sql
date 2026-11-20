-- Calendar appointments remain in appointments; only internal events have a new table.
-- Requires migrations 0016 through 0032. Safe to rerun.
begin;

alter table public.appointments add column if not exists starts_at timestamptz;
alter table public.appointments add column if not exists ends_at timestamptz;
alter table public.appointments add column if not exists duration_minutes integer;
alter table public.appointments add column if not exists duration_estimated boolean not null default true;

create or replace function public.sync_appointment_calendar_schedule()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  business_row public.businesses;
  service_ids text[];
  total_duration integer;
  known_count integer;
begin
  select * into business_row from public.businesses where slug = new.business_id;
  -- Legacy slug identifiers remain supported, with a canonical UUID for live updates.
  new.business_uuid := business_row.id;
  if tg_op = 'INSERT' or old.duration_minutes is null
    or new.service_id is distinct from old.service_id
    or new.business_id is distinct from old.business_id then
    select array_agg(distinct trim(item)) into service_ids
      from unnest(string_to_array(new.service_id, ',')) item where trim(item) <> '';
    select coalesce(sum(s.duration_minutes), 0)::integer, count(*)::integer
      into total_duration, known_count
      from public.business_services s
      where s.business_id = business_row.id and s.id::text = any(service_ids)
        and s.duration_minutes > 0;
    new.duration_estimated := known_count < coalesce(cardinality(service_ids), 1) or known_count = 0;
    new.duration_minutes := least(10080, greatest(1,
      total_duration + greatest(coalesce(cardinality(service_ids), 1) - known_count, 0) * 60));
  else
    new.duration_minutes := old.duration_minutes;
    new.duration_estimated := old.duration_estimated;
  end if;
  if trim(new.appointment_time) !~* '^((0?[1-9]|1[0-2]):[0-5][0-9] ?[AP]M|([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?)$' then
    new.starts_at := null;
    new.ends_at := null;
    return new;
  end if;
  begin
    new.starts_at := (new.appointment_date + trim(new.appointment_time)::time) at time zone 'Asia/Manila';
    new.ends_at := new.starts_at + make_interval(mins => new.duration_minutes);
  exception when invalid_datetime_format or datetime_field_overflow then
    -- Do not make legacy malformed bookings disappear or break status updates.
    -- The calendar explicitly reports these records as unscheduled.
    new.starts_at := null;
    new.ends_at := null;
  end;
  return new;
end;
$$;
revoke all on function public.sync_appointment_calendar_schedule() from public, anon, authenticated;
drop trigger if exists appointments_calendar_schedule on public.appointments;
create trigger appointments_calendar_schedule before insert or update on public.appointments
for each row execute function public.sync_appointment_calendar_schedule();
update public.appointments set appointment_date = appointment_date where starts_at is null;
create index if not exists appointments_calendar_range_idx on public.appointments(business_uuid, starts_at, ends_at);
create index if not exists appointments_calendar_slug_range_idx on public.appointments(business_id, starts_at, ends_at);

create table if not exists public.business_calendar_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 160),
  description text not null default '' check (length(description) <= 4000),
  location text not null default '' check (length(location) <= 240),
  event_type text not null check (event_type in ('meeting', 'event')),
  status text not null default 'Confirmed' check (status in ('Confirmed', 'Completed', 'Cancelled')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (isfinite(starts_at) and isfinite(ends_at) and ends_at > starts_at and ends_at <= starts_at + interval '7 days')
);
create index if not exists business_calendar_events_range_idx
  on public.business_calendar_events(business_id, starts_at, ends_at) where deleted_at is null;

create or replace function public.guard_calendar_event_identity()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := now();
    new.deleted_at := null;
  elsif new.business_id is distinct from old.business_id or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at or new.id is distinct from old.id then
    raise exception 'Calendar event ownership cannot change';
  elsif old.deleted_at is not null then
    raise exception 'This calendar event has been deleted';
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function public.guard_calendar_event_identity() from public, anon, authenticated;
drop trigger if exists calendar_event_identity on public.business_calendar_events;
create trigger calendar_event_identity before insert or update on public.business_calendar_events
for each row execute function public.guard_calendar_event_identity();

alter table public.business_calendar_events enable row level security;
drop policy if exists calendar_events_read_owner on public.business_calendar_events;
create policy calendar_events_read_owner on public.business_calendar_events for select to authenticated
using (public.is_business_owner(business_id));
drop policy if exists calendar_events_insert_owner on public.business_calendar_events;
create policy calendar_events_insert_owner on public.business_calendar_events for insert to authenticated
with check (public.can_manage_business_services(business_id) and created_by = auth.uid());
drop policy if exists calendar_events_update_owner on public.business_calendar_events;
create policy calendar_events_update_owner on public.business_calendar_events for update to authenticated
using (public.can_manage_business_services(business_id))
with check (public.can_manage_business_services(business_id));
-- Soft deletion sends an UPDATE through Realtime, including the business filter.
revoke all on public.business_calendar_events from anon, authenticated;
grant select, insert, update on public.business_calendar_events to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'appointments') then
      alter publication supabase_realtime add table public.appointments;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'business_calendar_events') then
      alter publication supabase_realtime add table public.business_calendar_events;
    end if;
  end if;
end;
$$;
commit;
