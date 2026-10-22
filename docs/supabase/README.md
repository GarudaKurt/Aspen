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
