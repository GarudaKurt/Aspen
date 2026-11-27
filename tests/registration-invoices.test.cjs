/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const load = require("./load-source.cjs");

test("registration accepts only catalog plans and keeps client prices out of the application", () => {
  const { planFromQuery, subscriptionPlans } = load(
    "src/features/subscriptions/data/plans.ts",
  );
  const { providerApplicationSchema } = load("src/features/tenancy/schemas.ts");
  const fields = providerApplicationSchema.pick({ selectedPlan: true });
  for (const { name } of subscriptionPlans) {
    const selectedPlan = planFromQuery(name.toLowerCase());
    assert.deepEqual(fields.parse({ selectedPlan, monthly_php: 1 }), {
      selectedPlan: name,
    });
  }
  for (const input of [null, "", "trial", "Admin"]) {
    assert.equal(planFromQuery(input), null);
    assert.equal(fields.safeParse({ selectedPlan: input }).success, false);
  }
});

test("invoice download uses the authenticated business and exports the issued charges and verified coverage", async () => {
  const id = "67444bc5-c1ff-46cb-9a3c-6ffee13cad3d";
  let business = "some-other-business";
  const { GET } = load("src/app/api/billing/invoices/[id]/route.ts", {
    "@/features/tenant-dashboard/overview-data": {
      getDashboardBusiness: async () => ({ data: { id: business } }),
    },
    "@/features/billing/api/queries": {
      invoiceDetail: async (invoiceId, owner) =>
        invoiceId === id && owner === "owner"
          ? {
              invoice: {
                id,
                number: 42,
                billed_to: "Clinic",
                billing_email: "billing@example.test",
                due_on: "2026-10-31",
                issued_at: "2026-10-12T00:00:00Z",
                period_start: "2026-11-01",
                period_end: "2026-11-30",
                plan: "Professional",
                status: "paid",
                credited_php: 1999,
                amount_php: 1999,
              },
              payments: [
                {
                  status: "paid",
                  settles_invoice: true,
                  paid_on: "2026-11-03",
                  period_start: "2026-11-03",
                  period_end: "2026-12-02",
                  reference: "TEST-VERIFIED",
                  method: "gcash",
                  amount_php: 1999,
                },
              ],
            }
          : null,
    },
  });
  const download = (value) =>
    GET(new Request("https://example.test/invoice?business=owner"), {
      params: Promise.resolve({ id: value }),
    });
  assert.equal((await download(id)).status, 404);
  business = "owner";
  assert.equal((await download("bad-id")).status, 404);
  const response = await download(id);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.match(response.headers.get("content-disposition"), /ASP-0000042.txt/);
  const statement = await response.text();
  for (const value of [
    "billing@example.test",
    "1,999.00",
    "Professional",
    "TEST-VERIFIED",
    "Verified coverage",
    "0.00",
  ]) {
    assert.ok(statement.includes(value), value);
  }
});
