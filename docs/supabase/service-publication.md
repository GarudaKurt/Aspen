# Service publishing and public discovery

Business approval and service availability are separate states:

- An administrator approves a provider application using `approve_provider_application`. Migration `0025_publish_approved_businesses.sql` makes this create a `published` business. The optional `verified` badge is not the publication gate.
- Providers publish or pause their own services (`active` / `paused`). Drafts remain private. Service actions cannot change business approval or verification.
- The landing page and `/business-profile/[slug]` read real Supabase businesses with `status = 'published'`. Public service lists and starting prices include only `active` services. A published business may still have no active services; pausing a service does not unpublish the entire business.

## Apply the database change

Apply `0029_public_service_visibility.sql` after the existing migrations. It tightens public read policies for draft/paused services and their photo metadata. It creates no tables and changes no approval states. Keep the business approval triggers enabled.

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

For an approved application with a still-`pending` business (for example, a legacy manual approval), ensure migration 0025 is applied. An authenticated administrator can call the existing `approve_provider_application` RPC again for that application ID. It publishes the existing pending business without creating another record. This must use the administrator's authenticated session; the SQL Editor does not automatically supply an admin `auth.uid()`. Do not disable triggers or expose a service-role key to the browser. Rejected, archived and draft businesses must go through the appropriate administrative review, not a provider-side status override.

## Verification

1. As the approved provider, complete the draft service's name, category, description and price. Publish once, then reload Services; it must remain Active.
2. In a signed-out browser, reload Home and open the card's `/business-profile/{slug}` link. Check service title, price and details, and the existing business photos/hours.
3. Edit the service and reload its public profile. Confirm the existing service ID was updated, not duplicated.
4. Pause the service. Reload the public profile: the service and its price contribution must disappear. The administrator-published business remains listed.
5. A pending/rejected/archived/draft business must remain absent from public queries, even when viewed by its owner through public routes.
6. A second provider must not be able to change the first provider's service. Failed requests must leave the displayed status unchanged.

Local automated checks:

```sh
node --test tests/service-publication.test.cjs
# Uses an isolated PostgreSQL engine, not your Supabase project:
PGLITE_MODULE=/path/to/@electric-sql/pglite node tests/business-photos.sql.test.cjs
```

Server action tests mock the database boundary; the PostgreSQL checks execute the actual migrations and policies. Neither replaces a signed-in end-to-end check against your configured Supabase project.
