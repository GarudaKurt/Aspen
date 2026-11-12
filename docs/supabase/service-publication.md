# Service publishing and public discovery

Business approval and service availability are separate states:

- An administrator approves a provider application using `approve_provider_application`. Migration `0025_publish_approved_businesses.sql` makes this create a `published` business. The optional `verified` badge is not the publication gate.
- Approved providers create, edit, publish and unpublish their own services without a service review. UI labels Published / Draft / Unpublished map to the existing database values `active` / `draft` / `paused`. No status enum conversion is needed.
- Both server actions and PostgreSQL check the linked approved application, matching applicant/owner, provider role and confirmed email. Archived, rejected and draft businesses cannot manage services. This schema uses `archived` to restrict a business; it has no separate `suspended` status.
- New listings remain private while photos upload. Publish happens after all requested uploads, deletions and photo ordering succeed. Retrying does not duplicate successful images or the service. Updates to an already published service remain live; these are not a separate revision/draft system.
- The landing page and `/business-profile/[slug]` read real Supabase businesses with `status = 'published'`. Public service lists and starting prices include only `active` services. A published business may still have no active services; pausing a service does not unpublish the entire business.

## Apply the database change

Apply `0031_approved_provider_service_management.sql` after migrations through **0030**, then deploy the accompanying application changes. It adds approval-aware service policies and a publication trigger, tightens public business visibility, and protects service photo metadata writes. It creates no tables, does not bulk-publish records, and leaves initial application approval/admin verification in place. Keep every trigger enabled.

Public catalog queries use an anonymous Supabase client so providers and admins see the same public listings as customers. Their authenticated session is unchanged. Owner previews continue to use their dashboard data. Published businesses without a correctly linked approved application are hidden; investigate those legacy records instead of bypassing approval.

## Diagnose a business that is still missing

Run this read-only query in the correct Supabase project's SQL Editor:

```sql
select b.id, b.slug, b.status as business_status, b.verified,
       a.id as application_id, a.status as application_status,
       count(s.id) filter (where s.status = 'active') as active_services,
       count(s.id) filter (where s.status = 'draft') as draft_services,
       count(s.id) filter (where s.status = 'paused') as paused_services
from public.businesses b
left join public.provider_applications a on a.business_id = b.id
left join public.business_services s on s.business_id = b.id
group by b.id, a.id
order by b.created_at desc;
```

For a legacy approved application whose linked business is still `pending`, the owner's first service publication atomically sets that business to `published`. The trigger verifies that the application belongs to that owner and is already approved. No second administrator action or duplicate business record is required. Rejected/archived/draft businesses cannot use this transition. Initial registration still uses the existing administrator-only `approve_provider_application` RPC.

## Verification

1. As the approved provider, complete the draft service's name, category, description and price. Publish once, then reload Services; it must remain Published.
2. In a signed-out browser, reload Home and open the card's `/business-profile/{slug}` link. Check service title, price and details, and the existing business photos/hours.
3. Edit the service and reload its public profile. Confirm the existing service ID was updated, not duplicated.
4. Unpublish the service. Reload the public profile: the service and its price contribution must disappear. The approved business remains listed.
5. A pending/rejected/archived/draft business must remain absent from public queries, even when viewed by its owner through public routes.
6. A second provider must not be able to change the first provider's service. Failed requests must leave the displayed status unchanged.

7. Publish with two selected photos and interrupt one upload. Confirm the new listing stays private, then retry only the failed image and verify publication. Preview before saving must not create any database record.

Local automated checks:

```sh
node --test tests/service-publication.test.cjs tests/service-workflow-ui.test.cjs tests/business-photos.test.cjs tests/direct-photo-uploads.test.cjs
# Uses an isolated PostgreSQL engine, not your Supabase project:
PGLITE_MODULE=/path/to/@electric-sql/pglite node tests/approved-services.sql.test.cjs
```

Server action tests mock the database boundary; the PostgreSQL checks execute the actual migrations and policies. Neither replaces a signed-in end-to-end check against your configured Supabase project.
