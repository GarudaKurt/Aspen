# Direct business and service photo uploads

Business galleries and service forms support multi-select, drag/drop, previews, two concurrent uploads, individual progress/errors, and retries that retain completed images. Covers remain single-image uploads. PNG, JPG/JPEG and WebP bytes are preserved; images are not resized or compressed.

## Required rollout steps

1. Apply `supabase/migrations/0030_direct_photo_uploads.sql` after migrations through 0029. It updates the existing media metadata/photo functions, adds upload identity/expiry/order fields, and creates a private `photo_upload_quotas` counter table. It preserves existing image references and does not grant providers publication or admin privileges.
2. Create a **separate private R2 bucket**, for example `aspen-dev-uploads-staging`. Leave both its `r2.dev` public URL and custom public domains disabled. Never use the publicly served business-photo bucket for staging.
3. Give the existing server-side R2 API token object read/write access to both the final and staging buckets. Keep credentials on the server; no new credentials belong in `NEXT_PUBLIC_*` variables.
4. Set `R2_UPLOAD_BUCKET_NAME=aspen-dev-uploads-staging` in local/server/Vercel environment settings. Keep `R2_BUCKET_NAME` pointing at the existing final bucket. A missing or identical staging bucket fails closed.
5. Set this CORS policy on the **staging** bucket, adjusting origins to actual deployments. Do not include arbitrary preview origins or a wildcard:

```json
[
  {
    "AllowedOrigins": ["https://aspen-sepia.vercel.app", "http://localhost:3000"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

6. Add a staging bucket lifecycle rule expiring objects with prefix `pending/` after **one day**. Successful and rejected uploads are normally deleted immediately. Lifecycle cleanup covers abandoned uploads and replayed, still-valid staging URLs.
7. Optionally set `NEXT_PUBLIC_MAX_PHOTO_MIB=15`. Valid integers are 1–20; omitted/invalid values use 15 MiB. This policy is shared between frontend and backend at build time. Redeploy/rebuild after changing it. The SQL safety ceiling is 20 MiB for photo categories; other media retains its 5 MiB limit.
8. Redeploy the application after the migration and storage settings are ready. Test a real upload in each configured browser origin.

R2 CORS is required even with signed URLs: https://developers.cloudflare.com/r2/buckets/cors/
R2 conditional writes: https://developers.cloudflare.com/r2/api/s3/conditional-operations/
R2 lifecycle setup: https://developers.cloudflare.com/r2/buckets/object-lifecycles/

## Upload protocol and security

- The browser sends small JSON metadata and a SHA-256 digest to `/api/photo-uploads`. File bytes never pass through Next.js request bodies. Existing small multipart endpoints remain compatible but retain their 4 MiB proxy limit.
- The server verifies the session, confirmed email, provider role and business/service ownership. SQL reservations serialize per owner and reuse an upload UUID for retries.
- Signed PUT URLs last ten minutes and bind the staging object, content type and exact content length. The browser supplies Content-Length automatically for the File body; application JavaScript must not set that forbidden header.
- An HMAC-protected completion ticket binds owner, target, action, replacement ID, filename, content type, byte size, digest and expiry. The signing operation uses a purpose-separated HMAC with the existing server-side R2 secret. Rotating that secret invalidates outstanding tickets; retry obtains fresh tickets.
- Completion checks the reservation and ownership again, HEADs the staged file, reads through a strict byte bound with ETag matching, compares SHA-256, and validates extension, MIME, signatures and complete Sharp decoding. The existing 24-million-pixel limit protects decoding memory independently of byte size.
- Only validated original bytes are written to a separate final key with `If-None-Match: *`. The final object's digest metadata makes lost-response retries safe. A still-valid staging URL cannot overwrite the final image.
- SQL activation is transactional and idempotent. A cover replacement leaves the old cover intact until activation succeeds. Service display order is persisted separately from completion order.
- Database quotas allow 30 upload authorizations/renewals and 120 validation attempts per owner per hour. Protected counters cannot be reset by deleting media rows. Pending reservations expire after ten minutes; a retry renews the expiry. Definitive validation failures and explicit cancellation release pending slots.
- Galleries retain 12 active photos and permit pending replacements. Service forms retain six selected images; finalization temporarily permits up to 12 active service images so six replacements can be validated before the previous six are deleted.

## Errors, recovery, and operations

- A 400 indicates invalid metadata, image bytes or ticket. A 403 indicates session/ownership/origin denial. A 409 indicates stale replacement, quota capacity or changed reservation. A 429 indicates the hourly quota. Unexpected storage/database failures return a safe error and reference ID; correlate that ID with server logs, never log signed URLs or secrets.
- If a response is lost after activation, retry with the same upload ID: the server reuses the final image and reconciles metadata without uploading successful bytes again.
- A metadata failure may leave a validated final object without an active record. Keep that object while the commit outcome is uncertain so a retry can recover. Operational reconciliation should match final keys against `media_assets` and investigate old failed/pending/deleted rows before deletion. Do not apply the staging lifecycle rule to the final bucket.
- Replacement cleanup is retried by looking up the prior deleted asset when completion is repeated. Storage permission/outage failures may still require operational cleanup.
- Stored originals remain unchanged. Larger originals increase download traffic; any future thumbnails should be optional derivatives and must not replace originals.

## Verification

Run `node --test tests/direct-photo-uploads.test.cjs tests/business-photos.test.cjs tests/service-publication.test.cjs` and `pnpm exec tsc --noEmit`.

For actual PostgreSQL migration/RLS tests, install `@electric-sql/pglite` outside the project, point `PGLITE_MODULE` at it, then run `node tests/direct-photo-uploads.sql.test.cjs` and `node tests/business-photos.sql.test.cjs`. These tests never connect to live Supabase.

After rollout, verify PNG/JPEG/WebP, a valid image above 4 MiB, several images together, a disconnected upload and retry, cover replacement at gallery capacity, service photo ordering after refresh, a rejected disguised file, and unauthorized access. Local mocked storage tests do not replace this live CORS/credential check.
