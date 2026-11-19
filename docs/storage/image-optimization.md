# Quality-first photo optimization

Apply `supabase/migrations/0032_photo_optimization.sql` after 0031 before deploying this code. It stores immutable source metadata separately from final metadata and commits the converted file identity and cover selection atomically. Existing files and URLs need no migration. Reservations created before this migration finish in their original format.

Business cover/gallery and service uploads use the existing private staging flow. The server verifies source checksum, MIME, extension, signature and complete image decoding, then uses the installed Sharp library to try **lossless WebP**, effort 4. Dimensions are never resized. ICC profiles and EXIF orientation are retained; other EXIF metadata, including GPS, is not copied to converted images. Existing WebP, animated, high-bit-depth, non-RGB and dimensions outside WebP's supported range retain their validated originals. Originals also win whenever WebP is equal or larger. PNG/JPEG remain accepted input formats.

Only the selected final version is written to the final R2 bucket, with matching extension, MIME, byte count and SHA-256. The original temporarily occupies the private staging bucket and is deleted after commit. Keep the staging bucket lifecycle expiry configured for abandoned uploads or failed cleanup. Eliminating temporary staging would require a different large-upload architecture; this implementation preserves direct uploads without routing large bodies through Vercel functions.

The existing 15 MiB configured upload limit and 24-million decoded-pixel limit remain. Validation and encoding each have a 20-second Sharp timeout. A process permits two optimization jobs and four waiting jobs, in addition to the existing per-owner database quota and browser concurrency limit. These are per-process limits, not a global distributed semaphore. Encoding failures return a retryable failure instead of choosing a different format on retry. Client metadata requests remain small JSON.

## Measured samples

Measured by `node --test tests/image-optimization.test.cjs` using repository images and generated fixtures. Sizes are bytes; results depend on source content. JPEG variants below were generated at quality 95 from the referenced PNG. These are sample results, not a promised reduction for every upload.

| Sample | Original | WebP candidate | Stored | Saved |
| --- | ---: | ---: | ---: | ---: |
| Business photo `image_4.png` | 2,595,038 | 1,397,472 | 1,397,472 | 46.15% |
| Business photo JPG/JPEG | 430,508 | 1,390,996 | 430,508 | 0% (original retained) |
| Logo PNG | 286,190 | 170,174 | 170,174 | 40.54% |
| Logo JPG/JPEG | 76,850 | 180,508 | 76,850 | 0% (original retained) |
| Transparent PNG fixture | 11,798 | 278 | 278 | 97.64% |
| Oriented JPEG fixture | 4,206 | 706 | 706 | 83.21% |
| Tiny PNG fixture | 90 | 248 | 90 | 0% (original retained) |

Tests compare every visible decoded colour channel and alpha, including after EXIF orientation. WebP can discard invisible RGB values behind fully transparent pixels. Lossless encoding avoids a subjective lossy-quality threshold and deliberately sacrifices potential JPEG savings to protect quality. Sharp WebP and colour metadata options: https://sharp.pixelplumbing.com/api-output/

## Verification and deployment

- Optimizer tests cover actual PNG photos/logos, JPG/JPEG, alpha, orientation, existing WebP, larger-candidate fallback, corrupt/disguised content and excessive dimensions.
- Route tests exercise real encoding with mocked R2/Supabase boundaries, including files above 4 MiB, final metadata, lost commit responses, authentication and ownership checks.
- `tests/approved-services.sql.test.cjs` applies actual migrations to isolated PostgreSQL, tests converted cover/service commits, renewal, immutable identities, authorization and rerunning the migration. Set `PGLITE_MODULE` to the installed PGlite module to run it.
- Live Supabase/R2 and signed-in UI verification have not been performed. After applying 0032, upload PNG and JPEG through cover, gallery and Services. Check final R2 Content-Type/size/key against `media_assets`, verify staging cleanup and preview the dashboard, public cards, profile and gallery at desktop/mobile widths. Replace/remove and retry a failed upload, then check a previously stored image still loads.

For a new upload, compare `media_assets.upload_source_size` with `byte_size`; storage savings are `100 * (1 - byte_size::numeric / nullif(upload_source_size,0))`. These source columns contain metadata only, never an additional image copy.
