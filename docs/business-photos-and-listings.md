# Business photos and public listings

Changes are on `dev/backend-upload`. Authentication and application review remain separate from photo management. No new database tables are required.

## Deployment

Apply these migrations in Supabase SQL Editor after the existing tenancy/media/RBAC migrations through 0021:

1. `supabase/migrations/0024_business_photos.sql`
2. `supabase/migrations/0025_publish_approved_businesses.sql`
3. `supabase/migrations/0026_business_cover_photos.sql` (dedicated Business Info cover controls)
4. `supabase/migrations/0027_business_photo_webp_keys.sql` (previous WebP key policy, if already applied)
5. `supabase/migrations/0028_restore_original_business_photo_formats.sql` (restores original-format uploads)

Numbers 0022/0023 are reserved for the separate authentication branch; these migrations do not depend on them. Do not rerun the foundational migrations or disable security triggers. SQL was tested against the existing tenancy/RLS migrations in an isolated PostgreSQL runtime, not applied to the hosted project by this change.

Set these **server-only** variables locally and in the appropriate Vercel deployment environment, then redeploy:

```dotenv
R2_ACCESS_KEY_ID=<R2 access key>
R2_SECRET_ACCESS_KEY=<R2 secret key>
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_BUCKET_NAME=aspen-dev-uploads
```

`R2_ACCOUNT_ID` remains a supported alternative to `R2_ENDPOINT`. Use the account S3 endpoint without a bucket path. The old public Cloudflare variable names (including the misspelled endpoint name) were renamed in the ignored local environment file without exposing their values. Make the same change in Vercel; `.env.local` is not uploaded to Vercel automatically.

Keep this bucket private because it may also contain identity documents. Business gallery and service photos use access-checked, short-lived signed URLs. A public R2 domain / `R2_PUBLIC_URL` is **not required**. Public business images are validated by Aspen's server before R2 storage, so browser-to-R2 uploads are not used for them.

Use an R2 token with Object Read & Write scoped to the configured bucket. See [Cloudflare's S3 SDK setup](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/). If old public-prefixed credentials were actually referenced by a deployed client bundle, rotate those credentials as well as renaming them.

## Gallery behavior

- Up to 12 active/pending business photos per business, enforced under a database row lock.
- JPEG, PNG and WebP; maximum 4 MiB per file, checked in the browser and server. The limit leaves room for multipart headers under [Vercel's 4.5 MB payload limit](https://vercel.com/docs/functions/limitations).
- New public business, cover, gallery, and service-photo uploads retain their original JPEG, PNG, or WebP byte stream and format. Before storage, the server checks the MIME type, filename extension, file signature, image dimensions, and a full image decode. It stores the original file with a server-generated UUID key and its correct `Content-Type`. Existing WebP uploads remain accessible and are not rewritten.
- The server validates MIME signatures, uses its own random object key, and uploads the bytes to R2. The browser never receives R2 write credentials or a writable final-object URL.
- Providers must have a verified Supabase email and own the business. RLS and the metadata RPC enforce ownership independently of UI visibility.
- Selecting a cover retains the other gallery images. Replacing a cover preserves its cover position. Deleting a cover from the gallery selects another active photo. Using **Remove** in Business Info explicitly clears the cover and restores business initials, even if gallery photos remain.
- Replacement/deletion marks old metadata as deleted transactionally. After successful R2 cleanup, the metadata is removed. Failed cleanup remains marked deleted and retries on the next gallery change; it cannot appear publicly. Signed download URLs already issued may remain usable for at most 60 seconds.
- If an RPC connection fails with an unknown commit outcome, the server retains the new object to avoid deleting a potentially committed photo. Reconcile unreferenced gallery objects during storage maintenance; never delete an object that is still referenced by `media_assets`.
- Unsaved previews exist only in browser memory and object URLs are revoked after upload/removal/unmount.

## Business Info cover control

In Tenant Dashboard > Profile > Business Info, choose **Upload photo** or **Replace photo**, review the preview, and select **Save cover photo**. This saves independently of the text fields. **Remove** deletes that cover and clears the listing image; other gallery images remain on the public Photos tab. Use **Use as cover** in the gallery to select an existing image without uploading again.

The cover and gallery share one mutation lock and photo state. Cover replacement/removal verifies the expected current photo under a database row lock, preventing a stale tab from overwriting another cover selection. Replacement works at the 12-photo limit. Public cards, public profile headers and the dashboard use the explicit cover reference; without one, they display the first letters of the first two business-name words (one for a single word).

Apply **0026**, **0027** (if it was previously applied), and then **0028** before deploying these controls; do not rerun already-applied migrations. No new environment variables or tables are needed. Migration **0028** restores PNG/JPEG/WebP uploads while leaving past WebP uploads intact. The delivery endpoint has a read-only fallback for the brief legacy state where a converted WebP object was saved with a suffix-less metadata key. Verify upload, replacement, removal with remaining gallery photos, refresh persistence and public views using a verified provider account after deployment.

## Approval and publication

Public cards and profile routes read `businesses.status = 'published'`; providers cannot set this status themselves. Pending, draft, rejected, and archived businesses are excluded even when the visitor is their owner or an admin. Only active services and active public business photos are shown. Verification documents, fictitious reviews, demo photos, and synthetic ratings are excluded.

Previously `approve_provider_application` created a `pending` business even after approving the application. Migration 0025 makes a new administrator approval create a published business in the same transaction. It does not automatically activate draft services or set the separate verified badge. Providers still configure/activate their actual services and hours.

For **existing** approved applications whose linked business is still pending, an authenticated admin can call the same RPC again with that approved application's ID. This publishes the existing record without duplicating its business, location, or services. Rejected/withdrawn applications cannot be approved with this RPC; archived businesses are not republished by this retry. Existing pending businesses are not silently mass-published by the migration.

Identify those legacy records in the trusted SQL Editor:

```sql
select a.id as application_id, b.id as business_id, b.name,
       a.status as application_status, b.status as business_status
from public.provider_applications a
join public.businesses b on b.id = a.business_id and b.owner_id = a.applicant_id
where a.status = 'approved' and b.status = 'pending';
```

Use the existing admin application's authenticated Supabase client to call:

```ts
await supabase.rpc('approve_provider_application', {
  p_application_id: approvedApplicationId,
});
```

No trigger disabling or provider-side publication is needed. The live anonymous check during development returned zero published businesses and zero public gallery assets. The landing page therefore correctly shows an empty state until publication and uploads are completed.

Pages query fresh data on navigation/refresh; approval and gallery mutations also invalidate relevant paths. An already-open tab is not a realtime subscription. Cards, wishlist entries, booking entry pages, and public profiles share the database-backed source. Unknown or unavailable slugs return a proper not-found page.

Service Coverage now reflects active service records; its edit link opens the existing Services editor rather than saving a browser-only copy. Business hours are saved by weekday name, fixing the previous Monday/Sunday offset. Existing incorrectly saved hours are not guessed or rewritten: providers should review and save their actual schedule once after deployment.

## Verification

```sh
node --test tests/business-photos.test.cjs
pnpm typecheck
pnpm lint
pnpm exec next build --webpack
```

The optional SQL test requires `@electric-sql/pglite` in a temporary location, not as an application dependency. Set `PGLITE_MODULE` to that installation's package directory and run `node tests/business-photos.sql.test.cjs`. It runs real PostgreSQL policy/trigger checks in memory, with minimal Supabase auth fixtures.

Before deployment acceptance, use actual test accounts after applying the migrations:

1. As an admin, approve a pending application. Check its business is published and the applicant is a provider; verify the landing card and corresponding slug page.
2. As the provider, queue multiple photos and confirm previews, progress, upload success, and persistence after refresh. Select a cover, replace it, and delete it. Verify the public card/profile photos update.
3. Fill the gallery to 12; verify a thirteenth addition is rejected while replacement works. Repeat from two tabs to verify concurrent limits.
4. As another provider/customer/anonymous user, verify gallery mutations are denied. Unpublish/archive a business and verify its card, profile, and image endpoint become unavailable publicly.
5. Check desktop and narrow mobile layouts; all controls remain reachable. Verify unsupported/oversized files, interrupted uploads, empty galleries, query failures, and an unknown business slug.

The unit/route tests use mocked dependencies. The SQL tests and R2 storage round-trip were run separately. Desktop/mobile browser checks verified the public empty state, no horizontal overflow, and unavailable slug behavior; local production HTTP checks returned 200 for the landing page, 403 for an anonymous upload, and 404 for a missing photo. A full authenticated browser upload → hosted Supabase metadata → public image flow still requires the migrations and an authenticated provider session.
