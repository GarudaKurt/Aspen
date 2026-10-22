# Aspen Supabase authentication guide

This guide covers the Phase 1 email/password, Google OAuth, and Apple OAuth
configuration for Aspen. It is intentionally separate from the repository's
existing README files.

## 1. Authentication data model

Supabase Auth owns `auth.users` and the provider identities linked to each
user. Aspen must not create a second password or OAuth-user table. Email
passwords, confirmation state, reset tokens, and OAuth identities remain in
Supabase Auth.

Aspen's `public.profiles` table is application metadata only. The migration
`supabase/migrations/0002_profiles_and_auth.sql` creates one profile per Auth
user, assigns the safe default role `customer`, and creates the profile from
the `auth.users` insert trigger. Roles are the database enum values
`customer`, `provider`, and `admin`.

The trigger is security-definer code with a fixed `search_path`; it does not
allow a newly registered user to choose an admin role. Row-level security
allows a user to read/update their own profile and allows admins to manage
profiles.

## 2. Environment variables

Create `.env.local` locally and keep it out of Git:

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://vjifcnvrmnyqyvuirdns.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

For production, set `NEXT_PUBLIC_SITE_URL` to the deployed origin, for
example `https://app.example.com`, and use the production Supabase project
values. The public URL and publishable/anon key are safe to expose to the
browser, subject to Supabase RLS. Never expose a service-role key in a
`NEXT_PUBLIC_*` variable or client component. If server administration is
added later, keep `SUPABASE_SERVICE_ROLE_KEY` server-only and use it only in
trusted server code.

## 3. Supabase URL configuration

In Supabase Dashboard → Authentication → URL Configuration:

- Set Site URL to the normal production origin.
- Add `http://localhost:3000/callback` for local OAuth and email flows.
- Add `https://app.example.com/callback` for the production origin.
- Add any separately deployed preview callback URLs only when they are
  required and controlled.

The application passes a same-origin callback URL to Supabase and the route
at `src/app/(auth)/callback/route.ts` exchanges the one-time PKCE code for a
cookie-backed session. Its `next` value is restricted to a relative path to
avoid open redirects.

## 4. Email and password

In Dashboard → Authentication → Providers → Email:

1. Enable Email provider.
2. Keep Confirm email enabled for production.
3. Configure the sender and SMTP settings appropriate for the environment.
4. Ensure the confirmation email template redirects through an allowed URL.

The app uses Zod schemas in
`src/features/auth/schemas/auth.schema.ts` with the existing controlled form
in `src/features/auth/components/auth-form.tsx`:

- Sign up calls `auth.signUp` with an email verification redirect and does not
  accept a role or password metadata from the browser.
- Sign in calls `auth.signInWithPassword`.
- When Confirm email is enabled, signup displays a confirmation message and
  provides a resend action with a 60-second client cooldown. Supabase remains
  responsible for the verification token and email delivery.
- Forgot password calls `auth.resetPasswordForEmail` with
  `/callback?next=/reset-password`.
- Reset password calls `auth.updateUser({ password })` after the recovery
  session is established.

Do not treat a client-side success message as proof of authorization. Server
route protection uses the cookie-backed server client, `auth.getUser()`, and
requires `user.email_confirmed_at` before allowing tenant/admin access. The
Next 16 `proxy.ts` applies the same check before protected route rendering.

When email confirmation is enabled, add this application callback URL to
Supabase Dashboard → Authentication → URL Configuration:

```text
http://localhost:3000/callback
```

Use the equivalent HTTPS callback URL for production. The confirmation email
redirect is handled by `src/app/(auth)/callback/route.ts`, which exchanges the
one-time code and sends the verified user to `/login?verified=1`. Invalid or
expired verification links return to login with a clear error message.

## 5. Google OAuth

### Google Cloud setup

1. Create or select a Google Cloud project.
2. Configure the OAuth consent screen and the `openid`, email, and profile
   scopes required by Supabase.
3. Create an OAuth Client ID for a Web application.
4. In Authorized redirect URIs, add exactly:

   ```text
   https://vjifcnvrmnyqyvuirdns.supabase.co/auth/v1/callback
   ```

   This is the Supabase provider callback, not the Aspen `/callback` route.
5. Copy the Google Client ID and Client Secret into Supabase Dashboard →
   Authentication → Providers → Google and enable the provider.

The browser calls `signInWithOAuth` with the provider and an `options.redirectTo`
set to the allowed Aspen callback URL. Supabase performs the provider exchange
and returns the user to that callback.

## 6. Apple OAuth

Apple Sign in requires an Apple Developer account and Apple Developer Program
membership. Apple may require paid membership and organization/domain
verification depending on the account and deployment scenario; confirm the
current terms in Apple's developer portal before launch.

1. Create or select an App ID and enable Sign in with Apple.
2. Create a Services ID for the web application and associate it with the
   primary App ID.
3. Configure the website domain and return URL using the exact Supabase
   callback URI:

   ```text
   https://vjifcnvrmnyqyvuirdns.supabase.co/auth/v1/callback
   ```

4. Create a Sign in with Apple key and record its Key ID and Team ID.
5. In Supabase Dashboard → Authentication → Providers → Apple, enter the
   Services ID, Team ID, Key ID, and generated private key, then enable Apple.

Apple can return a private relay email. A user's name may only be returned on
the first consent, so the application should not depend on the provider name
being present for subsequent logins. Keep the Apple client-secret rotation
process documented for production operations.

## 7. Route and session behavior

Next 16 uses the root `proxy.ts` file. It refreshes the Supabase cookie
session and protects tenant dashboard, business dashboard, and admin route
prefixes. Server-only authorization helpers are in `src/server/auth/`.

The browser and server clients use `@supabase/ssr`, which is appropriate for
cookie-backed sessions in an SSR framework. The provider login page and the
regular login page use the same AuthForm behavior while preserving their
existing layouts.

## 8. Verification checklist

Run the automated checks:

```text
npx tsc --noEmit
npm run lint
npm run build
```

Then verify in a non-production Supabase project:

1. Register with email/password; confirm the email and verify one profile row
   is created with role `customer`.
2. Before clicking the link, attempt to open a protected dashboard and confirm
   the app returns to login with an email-verification message.
3. Resend the verification email and confirm the 60-second cooldown prevents
   repeated requests.
4. Click the confirmation link, confirm the verified notice, sign in, refresh,
   open a protected dashboard, and sign out.
5. Test Google success, cancellation, disabled-provider, and
   redirect-mismatch cases.
6. Request a reset email and complete the reset-password flow.
7. Attempt to read or update another user's profile and verify RLS denies it.
8. Confirm malformed or expired callback codes return to login without a
   session.

## 9. Rate-limit and Google troubleshooting

### `Email rate limit exceeded`

This normally comes from Supabase Auth's email delivery bucket, not from Zod
validation or the password policy. Supabase's built-in email service is
best-effort and currently allows only two Auth emails per hour per project.
Signup confirmation, password recovery, and resend operations share the email
delivery limits. A repeated request for the same address can also hit the
per-user confirmation window.

For a short local test, wait for the bucket to refill and avoid repeatedly
clicking submit or resend. The Auth form also ignores a second in-flight
submission. Do not disable confirmation or try to bypass the limit.

For ongoing MVP testing, configure a custom SMTP service in Dashboard →
Authentication → Emails → SMTP Settings. Budget-friendly options include
Mailtrap for development-only inbox testing, or a transactional provider such
as Amazon SES, Brevo, or SendGrid after reviewing its current free tier and
regional sending requirements. Store SMTP credentials only in Supabase's
Dashboard; never add them to `.env.local` or browser code. After configuring
SMTP, send a test email and inspect Authentication → Logs before retrying the
signup flow.

### `Unsupported provider: provider is not enabled`

This response means Google is disabled in the Supabase project identified by
`NEXT_PUBLIC_SUPABASE_URL`, or its provider configuration has not been saved.
In the project at `https://vjifcnvrmnyqyvuirdns.supabase.co`:

1. Open Authentication → Providers → Google.
2. Enable Google.
3. Paste the Google OAuth Web Client ID and Client Secret and save.
4. In Google Cloud Console, add the Supabase provider callback shown by the
   Supabase Google provider page. For this project it should be:

   ```text
   https://vjifcnvrmnyqyvuirdns.supabase.co/auth/v1/callback
   ```

5. Add the local origin `http://localhost:3000` to Google's Authorized
   JavaScript origins, and verify that the OAuth consent screen has the
   `openid`, email, and profile scopes.
6. In Supabase Authentication → URL Configuration, allow:

   ```text
   http://localhost:3000/callback
   ```

The frontend already calls `auth.signInWithOAuth({ provider: "google" })` and
uses the callback route. If the error persists after saving the provider,
restart Next.js and confirm that `.env.local` points to the same Supabase
project; do not expose or commit the Client Secret.

## Troubleshooting

- **Redirect URI mismatch:** provider consoles must contain the hosted
  Supabase `/auth/v1/callback`; Supabase URL Configuration must contain the
  Aspen `/callback` URL.
- **OAuth button reports missing configuration:** check the three public env
  variables and restart Next.js after changing `.env.local`.
- **User signs in but dashboard redirects:** run the migration and confirm the
  profile trigger created a row. Provider/admin routes also require the
  corresponding profile role.
- **Email link is rejected:** check Site URL, Additional Redirect URLs, and
  the email template's redirect target.
- **Apple name is empty:** this is expected after the first Apple consent; use
  the profile form or existing email as the durable identity display value.
