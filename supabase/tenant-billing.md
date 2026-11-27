# Tenant billing deployment

Apply `0036_tenant_billing.sql` then `0037_registration_invoices.sql` and `0038_invoice_receipts.sql` before deploying the updated registration, approval and billing routes together. The first migration creates subscriptions, private receipt storage and the payment ledger. The second adds the registration plan, invoices and links to payments. Existing subscriptions keep their terms. Recorded payment attempts for the same business and due date are linked to one historical invoice. Businesses without a recorded plan require manual confirmation.

## Server configuration

Set these server-only environment variables in the deployment and restart or redeploy.

| Variable | Purpose |
| --- | --- |
| `BILLING_BANK_INSTRUCTIONS` | Tenant-facing bank transfer recipient and instructions. |
| `BILLING_GCASH_INSTRUCTIONS` | Tenant-facing GCash recipient and instructions. |
| `BILLING_MAYA_INSTRUCTIONS`, `BILLING_CASH_INSTRUCTIONS` | Optional tenant-facing instructions for Maya and direct cash. |
| `R2_BILLING_BUCKET_NAME` | Durable private R2 bucket for receipts. Disable public domains and r2.dev access. Grant the existing R2 server credentials object read/write access and exclude the `billing-receipts/` prefix from temporary upload expiration rules. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only credential for recording an already validated and stored receipt in the ledger. |

Supply only information intended for paying tenants in the instruction fields. Tenants can record an already completed payment even when instructions are empty. Keep the bucket private. Providers and administrators download receipts through the authenticated application endpoint. Card preference is available; card checkout requires a separate processor integration.

## Operation

1. Registration records the selected monthly plan. On the provider application review screen, confirm that plan and enter the first paid due date. Approval, enrollment and issuance of the first renewal invoice share a transaction. Free plans require no date and generate no charges. For older applications without a saved selection, use the approved business slug at `/admin/billing` to enroll manually. A separate admin application should call `approve_application_with_terms(p_application_id, p_due)` with its signed-in administrator session.
2. Tenants can change renewal intent at any time. No automatic debit takes place. The current term includes the whole due date in Asia/Manila.
3. On the following day, database policies hide the listing from public discovery and block paid operations. Billing and support remain available. Suspension is calculated on access without a scheduled job. The public catalog uses its existing short-lived cache.
4. An administrator reconciles the reference and amount with the receiving account before approving a receipt. A rejection requires feedback. Full verified settlement grants one month starting after the current term or on verification day if access has lapsed. Inactive months do not accumulate additional charges. Existing admin publication restrictions continue to apply.
5. Two calendar months after suspension, the account is flagged for review. The application retains the data until a separate retention policy is adopted. Billing reminders and review outcomes appear inside Aspen.

## Invoices and plan changes

Each paid tenant has one payable invoice for the next monthly term. Verifying the final outstanding amount settles that invoice and issues the following month's invoice in the same transaction. No timer or page visit is needed. Suspension leaves the outstanding invoice available for reactivation. No additional invoices accumulate during suspension. Rejected proofs remain attached for audit and can be resubmitted against the open invoice.

Invoices retain their number, billed-to details available at issue, plan, price and quoted period. Tenant Billing separates invoices from payment attempts, provides a text download for each invoice and shows actual verified coverage for late renewals. Turning renewal off voids the open invoice. A future plan change voids the unpaid renewal quote and replaces it at the applicable price. Resolve pending proofs and settle any partly paid invoice before changing its renewal terms. Use **Change renewal plan** in admin Billing or `change_renewal_plan(p_business, p_plan, p_first_due)`. Moving from Free to paid requires a first due date. A downgrade to Free takes effect after the current paid term.

The Current Invoice sheet accepts one JPEG, PNG, WebP or PDF up to 3 MiB. Transactions support centavos. Direct cash can omit the reference. Accepted partial payments reduce the outstanding balance while keeping the original due date. A private download endpoint uses the signed-in user’s RLS visibility before it reads R2 or retrieves an older Supabase Storage receipt. Admin payment notifications link to the review queue at `/admin/billing`. Tenant notifications link back to their invoice after review.

To verify a deployment, use an approved test business, a test transfer reference, and a non-sensitive receipt. Check receipt download with the submitting provider, an unrelated provider and an administrator. Verify rejection, resubmission and approval in the dashboard before enabling real payment instructions.
