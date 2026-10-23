# Provider tenancy backend

Migration `0017_tenancy.sql` adds the provider tenancy foundation without
changing Supabase Auth. Run it after the existing migrations in the Supabase
SQL editor or through the project's migration workflow.

Cloudflare R2 media metadata is added by `0018_media_assets.sql`; run it after
`0017_tenancy.sql`. R2 stores the binary objects and Supabase stores only
metadata and ownership.

## Data model

- `provider_applications` stores a submitted provider application and its
  review state. Verification document values are metadata/object keys only;
  upload the actual files to private Cloudflare R2 through the media flow.
- `businesses` belongs to one `profiles` row and owns the provider's public
  identity and publication state.
- `business_locations`, `business_hours`, `business_amenities`, and
  `business_services` are child records of a business.
- `business_service_photos` remains available for legacy/provider references;
  new R2-managed media is recorded in `media_assets`; the legacy table remains
  readable for existing provider data.
- `media_assets` stores the R2 object key, ownership, category, MIME type, file
  size, visibility, and upload status. It never stores file bytes.
- `appointments.business_uuid` is an optional normalized relationship. The
  existing `appointments.business_id` text slug remains supported so current
  bookings are not discarded.

## Roles and approval

New accounts remain `customer` until an administrator approves the provider
application and assigns `profiles.role = 'provider'`. The provider dashboard
and business write policies require that role. This prevents an unreviewed
listing from becoming an editable provider account.

## Application API

The shared Zod schemas are in `src/features/tenancy/schemas.ts`. Server-only
queries and server actions are in `src/features/tenancy/api/`. They use the
existing cookie-based Supabase server client and the authenticated user's RLS
context. No service-role key is used in the browser or in these actions.

## Guest-to-provider onboarding

Visitors may open **Get Listed** and complete the public Business and Services
steps before creating an account. Authentication is required when they enter
the Identity step, before any verification document is selected or uploaded.
The same existing Supabase login/signup dialog is used for this gate.

The browser keeps only non-sensitive draft fields in session storage so the
business and service selections survive the authentication redirect. Identity
files and billing details are never written to browser storage. A browser-wide
auth boundary scopes the temporary draft to the signed-in user and clears it on
sign-out or account changes; the explicit logout actions also clear it as a
defense in depth measure. The final server action re-checks the Supabase
session, requires a verified email, and uses the session user's ID as
`provider_applications.applicant_id`; it never accepts an owner ID from the
form.

The application status can be checked by returning to `/list-your-business`:
pending applications remain under review, rejected applications show the
reviewer's reason and can be resubmitted, and approved applications link to
the provider Tenant Dashboard. A pending application prevents duplicate
submission, while `0020_provider_onboarding_guards.sql` enforces the current
one-business-per-provider model at the database level.

The media API creates short-lived presigned R2 upload URLs, validates the
uploaded object's magic bytes and size server-side, and only then marks the
metadata row active. Identity documents remain private and are served through
short-lived signed URLs. Public image URLs use the optional `R2_PUBLIC_URL`
custom domain or short-lived signed URLs when no custom domain is configured.
Each account is limited to 30 upload records per rolling hour, and the server
enforces a 5 MB object limit plus category-specific MIME/content checks.

## Manual setup

1. Apply `0017_tenancy.sql` after `0016_appointments.sql`, then apply
   `0018_media_assets.sql`, `0019_rbac_hardening.sql`, and
   `0020_provider_onboarding_guards.sql`.
2. Approve an application only after review. The migration includes an admin-only
   function that promotes the profile, creates the provider business, location,
   and initial draft services atomically:

   ```sql
   select public.approve_provider_application('<application-uuid>');
   ```

   If an administrator needs to repair a legacy record, the role can be assigned
   directly only after the same review:

   ```sql
   update public.profiles
   set role = 'provider'
   where id = '<verified-auth-user-uuid>';
   ```

3. Configure Cloudflare R2 before testing uploads. Do not put R2
  credentials or the Supabase service-role key in `NEXT_PUBLIC_*` variables.
   The application no longer writes new files to the legacy Supabase Storage
   bucket from `0017_tenancy.sql`.

4. Add a payment provider separately before treating subscription or card
   controls as live billing. This migration intentionally stores no payment
   credentials or card numbers.
