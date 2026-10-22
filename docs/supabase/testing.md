# Authentication test plan

## Automated checks

- TypeScript compilation: `npx tsc --noEmit`
- Lint: `npm run lint`
- Production build: `npm run build`

## Supabase checks

Before testing OAuth, verify the provider is enabled in the same Supabase
project referenced by `NEXT_PUBLIC_SUPABASE_URL`. The public Auth settings
endpoint can confirm provider state without exposing credentials, but provider
secrets must still be checked in the Supabase Dashboard.

For the current local configuration, the project URL resolves to
`https://vjifcnvrmnyqyvuirdns.supabase.co`. Google must be enabled under
Authentication → Providers and configured with a Google Web Client ID and
Client Secret before the Google button can work.

Run these checks in a non-production Supabase project:

1. Create a user through the app and confirm the `handle_new_user` trigger
   creates a profile with the default `customer` role, but do not treat the
   unverified account as active.
2. Before verification, open `/tenant-dashboard` directly and confirm the
   request returns to login with an email-verification message.
3. Resend the verification email and confirm the cooldown prevents repeated
   requests.
4. Click a valid verification link and confirm the callback returns to login
   with a success message.
5. Sign in, refresh, and call a protected server route; the session cookie
   should still identify the same verified user.
6. Change the profile display name as the signed-in user; read another user’s
   profile and confirm RLS denies it.
7. Sign out and confirm protected route access redirects to `/login`.
8. Repeat the sign-in and callback flow for Google.
9. Use expired or malformed verification callback codes and confirm the app returns to the
   login page without creating a session.
