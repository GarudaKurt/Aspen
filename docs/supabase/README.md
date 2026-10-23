# Supabase Phase 1 setup

This folder documents the Phase 1 authentication foundation. Credentials and
OAuth identities remain managed by Supabase Auth. The application stores only
the profile record and role data needed by Aspen in `public.profiles`.

## Required environment variables

Create a local `.env.local` file (never commit it):

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://vjifcnvrmnyqyvuirdns.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

Only the public URL and publishable/anon key belong in browser-exposed
variables. Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the client.

## Database setup

1. Create a Supabase project.
2. In the Supabase SQL editor, run the migrations in `supabase/migrations/` in
   filename order. For Phase 1, `0002_profiles_and_auth.sql` creates the
   profile table, user trigger, roles, and RLS policies.
3. If using the Supabase CLI, link the project and run `supabase db push`.
4. Confirm that a newly registered user creates one matching row in
   `public.profiles`.

## Provider tenancy setup

The provider/business backend is defined in
`supabase/migrations/0017_tenancy.sql`. Run it after
`0016_appointments.sql`. It adds:

- `provider_applications` for provider onboarding and review status.
- `businesses` owned by a provider profile.
- Business locations, services, service-photo metadata, hours, and amenities.
- Ownership-based RLS policies for provider and customer access.
- Provider verification metadata; binary verification files are stored in
  Cloudflare R2 through the media upload flow.
- An optional `appointments.business_uuid` relationship while preserving the
  existing text business slug for older bookings.

Provider applications remain customer accounts until an administrator approves
them. After reviewing an application, an administrator can run:

```sql
select public.approve_provider_application('<application-uuid>');
```

This promotes the profile to the `provider` role and creates the provider
business, location, and initial draft services atomically. Publish the business
only after the review is complete:

```sql
update public.businesses
set status = 'published', verified = true
where id = '<business-uuid>';
```

Visitors may begin **Get Listed** without an account. Authentication is
required before the Identity step and before final submission. The client
persists only non-sensitive draft fields in session storage; identity files and
billing details stay out of browser storage. The server requires a verified
Supabase user and records that session user's ID as the application owner.

The tenancy server actions and queries use the authenticated Supabase server
client and shared Zod schemas. They do not use or expose the service-role key.
Verification documents must be uploaded as private R2 media assets. Store only
the R2 object key and document metadata in `provider_applications` and
`media_assets`; never store file bytes, passwords, card numbers, or SMTP/OAuth
secrets in application tables. The Supabase Storage bucket created by older
versions of `0017_tenancy.sql` is no longer used by the application and can be
retained for legacy data or removed manually after confirming it is empty.

Subscription and payment credentials are intentionally not stored by the
tenancy migration. Connect a payment provider separately before treating
billing controls as live payment functionality.

See [tenancy.md](./tenancy.md) for the complete provider data model, approval
workflow, storage policy details, and manual setup checklist.

## Provider and admin role separation

`customer`, `provider`, and `admin` are distinct application roles. New Auth
users receive `customer`. Submitting a provider application does not change the
role; only the admin approval function changes it to `provider` and creates the
provider-owned business. Providers can manage only their own business records.

The provider dashboard and admin control plane are separate routes:

- `/tenant-dashboard` is exact-role `provider` access.
- `/admin/provider-applications` is exact-role `admin` access.
- `/admin/provider-applications` is the administrative review UI and uses the
  admin-only approval/rejection RPCs.

Apply `supabase/migrations/0019_rbac_hardening.sql` after the tenancy and media
migrations, then apply `0020_provider_onboarding_guards.sql`. The hardening
migration prevents non-admin users from changing `profiles.role`, blocks
admins from submitting provider applications through RLS, restricts direct
business creation to providers, and adds rejection handling with required
reasons. Migration `0020` enforces the current one-business-per-provider
architecture after checking for legacy duplicates. Private R2 verification
documents are exposed to the admin review UI only through short-lived signed
URLs.

## Cloudflare R2 media storage

Images and verification documents are stored in Cloudflare R2. Supabase stores
only ownership and metadata in `public.media_assets`. Apply
`supabase/migrations/0018_media_assets.sql` after `0017_tenancy.sql`.

Add these values to local `.env.local`, Vercel, and Jenkins runtime secrets as
appropriate:

```dotenv
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_BUCKET_NAME=aspen-media
R2_ACCESS_KEY_ID=server-only-access-key
R2_SECRET_ACCESS_KEY=server-only-secret-key
# Optional. Use a custom R2 domain for published images.
R2_PUBLIC_URL=https://images.example.com
```

The R2 values must remain server-only. Do not name them `NEXT_PUBLIC_*`, put
them in browser code, or commit them to the repository. The application creates
short-lived presigned PUT URLs, uploads directly from the browser, then reads
the object back server-side to verify its magic bytes and size before marking
the Supabase metadata row active.

### R2 bucket setup

1. In Cloudflare Dashboard → R2, create a bucket such as `aspen-media`.
2. Create an R2 API token with Object Read & Write access limited to this
   bucket. Store the access key ID and secret in the deployment secret store.
3. Copy the Cloudflare account ID into `R2_ACCOUNT_ID`.
4. For public business and service images, connect a custom domain to the
   bucket and set it as `R2_PUBLIC_URL`. Do not expose the bucket publicly if
   it contains identity documents.
5. Apply migration `0018_media_assets.sql` in the Supabase SQL editor.

For direct browser uploads, configure the bucket CORS policy with the exact
application origins (do not use `*` in production):

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://YOUR_PRODUCTION_DOMAIN"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

The media API supports business covers, business galleries, service photos,
review photos, and private identity documents. Identity documents always use
private visibility and short-lived signed download URLs. R2 object keys are
scoped by business, service, application, or user and include a generated UUID
to prevent accidental overwrites.

## Authentication providers

In Supabase Dashboard → Authentication → Providers:

- Enable Email. Keep email confirmation enabled for production.
- Enable Google and add the provider credentials.
- Enable Apple and add the Services ID, Team ID, key ID, and private key.

Configure the application redirect URLs in Supabase Dashboard → Authentication →
URL Configuration. These are the URLs used by the `redirectTo` value in the
application:

```text
https://YOUR_DOMAIN/callback
```

For local development, also add:

```text
http://localhost:3000/callback
```

Google and Apple do not use the application callback above as their provider
redirect URI. In each provider's developer console, use Supabase's hosted
callback URI:

```text
https://vjifcnvrmnyqyvuirdns.supabase.co/auth/v1/callback
```

Then paste the provider credentials into the matching Supabase Auth provider
configuration. The provider redirects to Supabase first; Supabase redirects to
the application `/callback` route after it exchanges the provider response.

The application callback exchanges the one-time OAuth code for a cookie-backed
session and only permits same-site relative `next` paths.

## Security and route behavior

- Browser auth uses `@supabase/ssr` and the publishable key.
- `proxy.ts` refreshes the Supabase session and protects tenant dashboard,
  business dashboard, and admin route prefixes when Supabase is configured.
- Server code should use `createSupabaseServerClient()` and call
  `auth.getUser()` for authorization decisions. Do not trust client state or
  `getSession()` alone for authorization.
- Profile reads and updates are restricted by RLS to the signed-in user or an
  admin role.

## Manual verification checklist

- Register with a valid email/password and confirm the email link.
- Sign in with email/password and verify the session survives a refresh.
- Start Google and Apple OAuth and verify both return through `/callback`.
- Request a password reset and complete the `/reset-password` flow.
- Open `/tenant-dashboard` signed out and verify redirect to `/login`.
- Open it signed in and verify the dashboard loads.
- Verify a user cannot select or update another user’s profile through the
  Supabase API.

See [authentication.md](./authentication.md) for the complete provider setup,
email recovery flow, environment guidance, and troubleshooting checklist.
