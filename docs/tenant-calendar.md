# Tenant calendar

## Setup

Apply `supabase/migrations/0033_tenant_calendar.sql` in Supabase after the existing migrations through 0032, then deploy this application revision. No environment variables or new application dependencies are required. The migration is transactional and rerunnable.

The migration backfills appointment schedules and registers `appointments` and `business_calendar_events` with the existing `supabase_realtime` publication. If the publication is absent, enable Postgres Changes for these two tables in the Supabase dashboard. Do not disable RLS. See [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes).

## Data and permissions

- Customer appointments remain in `public.appointments`. No mirrored calendar records are created. The original appointment date, time, status and customer fields are unchanged.
- A trigger derives `starts_at` and `ends_at` (UTC `timestamptz`) from the appointment's civil date/time in `Asia/Manila`. It resolves the existing business slug to `business_uuid` for Realtime filtering.
- `duration_minutes` snapshots the sum of selected service durations on insertion or service selection changes. Each unknown duration uses 60 minutes; `duration_estimated` makes this visible in appointment details. Changing service prices/durations later does not silently move booked end times. Legacy bookings use the currently saved service durations during backfill. Durations are capped at seven days.
- Legacy unparseable times have null timestamps and are counted in a visible calendar warning. Correct those source records through a trusted appointment maintenance workflow; never invent a time or silently hide the issue.
- Only meetings and custom events use `business_calendar_events`, with a business UUID, title, description, optional location, type, status, start/end times, creator and timestamps.
- RLS restricts custom-event reads to the authenticated provider owner. Writes also require a verified provider with an approved business application and an active business, using the existing `can_manage_business_services` permission helper. Admins retain their separate control plane.
- Event ownership and creation identity are immutable. Updates/deletes compare `updated_at` so an older editor cannot overwrite a newer change.
- Deletion sets `deleted_at`; ordinary queries exclude it. Soft deletion produces a business-filtered Realtime update. There is no client hard-delete permission or restore UI.
- Calendar interactions never write to appointments. The details panel links to the existing Appointments page for permitted appointment actions. This feature does not add a new customer appointment rescheduling workflow; any permitted changes to the existing appointment date/time automatically update the calendar through the database trigger.

## API and synchronization

`GET /api/tenant-calendar?businessId=<uuid>&start=<ISO timestamp>&end=<ISO timestamp>` returns `{ events, truncated, unscheduled }`. Optional `type` (`all`, `appointment`, `meeting`, `event`) and `status` (`all` or an existing appointment status) filters are validated with Zod. Ranges must be positive and at most 43 days. Responses are private and not cached.

Every request checks the verified session, provider role and ownership. Queries use business and overlapping start/end conditions, backed by indexes. Data is fetched in batches of 500, capped at 2,000 appointments plus 2,000 internal events per range; an explicit warning asks users to narrow very busy ranges. Agenda renders 50 entries per page. The UI fetches a complete bounded range before applying its local type/status filters so hidden active schedules still contribute to conflict warnings.

`saveCalendarEvent` and `deleteCalendarEvent` are server actions, with Zod validation and independent authorization on every call. Creation/editing accepts only internal `meeting` and `event` types. Appointments cannot be supplied as a custom event type. Event text has maximum lengths, and end time must follow start time by no more than seven days.

The browser subscribes to business-filtered appointment and custom-event changes. Events are refetched after a short debounce, reconnect, tab focus, and every 30 seconds while visible. Subscriptions, timers, listeners, and obsolete fetches are cleaned up on navigation/unmount. Range changes never display data from the previous date range. No secrets or service-role credentials are sent to the browser.

The existing provider appointment inbox also listens for inserts and updates for its business, including cancellation and rescheduling. Its confirm/reject writes compare the prior status, preventing a stale inbox from overwriting a cancellation or another provider action.

Month, Week, Day and Agenda share the same event data. Multi-day events are shown on each overlapping day; midnight end times are exclusive. Display/editing always use Manila time, independent of browser locale or daylight saving time. The Week view becomes a readable seven-day list on small screens; Month uses counts and date drill-down on mobile.

## Conflicts

Pending/Confirmed appointments and Confirmed custom events are checked for intersecting time ranges. Adjacent events, Completed, Cancelled and Rejected entries do not generate conflicts. The calendar checks its full loaded range, and saving an event checks overlaps on the server, including events beyond that visible range.

These are advisory schedule warnings, not a capacity or staff allocation system. Simultaneous appointments can be legitimate. Conflict checks do not reserve a slot or prevent a race between simultaneous bookings. A saved event remains saved if a subsequent conflict check fails; the UI reports that distinction.

## Verification

Run `node --test tests/tenant-calendar.test.cjs`, `npm run typecheck`, and `npm run build`.

For actual PostgreSQL policy/trigger tests, point `PGLITE_MODULE` to a temporary installation of `@electric-sql/pglite`, then run `node tests/tenant-calendar.sql.test.cjs`. This runs only an isolated database. It covers migration reruns/backfill, service duration snapshots, Manila schedule changes, cancellation, custom CRUD, stale versions, immutable ownership, RLS isolation, suspension and soft deletion. It does not exercise hosted Supabase Realtime delivery.

After applying the migration in a test project:

1. Sign in as an approved provider, open Calendar, and confirm that existing bookings match Appointments.
2. In a second session, request a booking; verify it appears once. Confirm/cancel it in the existing workflow and check calendar status updates.
3. Create an internal meeting, edit/reschedule it, then delete it. Confirm no appointment records change.
4. Test an overlap and an adjacent time slot. Check midnight-spanning events in Day/Week views.
5. Open the same internal event in two sessions, save one, then verify the stale editor is rejected.
6. Check Month/Week/Day/Agenda, date navigation, filters and event dialogs on desktop and mobile; verify keyboard focus, Escape and dropdown stacking.
7. Repeat with another provider/customer to confirm isolation. Disconnect Realtime temporarily and verify polling/reconnect recovery.

No changes to live Supabase are made by adding this migration file. Hosted CRUD, live delivery and authenticated browser acceptance require the migration and a provider session.
