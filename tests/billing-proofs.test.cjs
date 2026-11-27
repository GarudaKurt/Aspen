/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const load = require("./load-source.cjs");

test("receipt endpoint validates bytes before private storage and binds the payment to the signed-in business", async (t) => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "isolated-test-key";
  t.after(() => {
    if (key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = key;
  });
  const biz = "8fd052a6-f83a-4f93-9a35-0dfceeb77e02";
  const due = "2027-01-01",
    writes = [],
    submissions = [];
  let user = { profile: { role: "provider" }, user: { id: "test-owner" } },
    allowed = true, legacy=false;
  const { POST, GET } = load("src/app/api/billing/proofs/route.ts", {
    "@/server/auth/session": {
      getCurrentProfile: async () => user,
      isEmailVerified: () => true,
    },
    "@/features/tenant-dashboard/overview-data": {
      getDashboardBusiness: async () => ({ data: { id: biz } }),
    },
    "@/features/billing/api/queries": {
      getSubscription: async () => ({ data: { due_on: due, renew: true } }),
      transferInstructions: () => ({ bank: "Test only" }),
    },
    "@/lib/supabase/config": {
      getRequiredSupabaseConfig: () => ({ url: "https://example.test" }),
    },
    "@/lib/r2/client": {
      putReceipt: async (path, bytes, mime) =>
        writes.push({ path, bytes, mime }),
      readReceipt: async () => new Blob(["private receipt"]).stream(),
    },
    "@/lib/supabase/server-client": {
      createSupabaseServerClient: async () => ({
        rpc: async (name) => {
          assert.equal(name, "begin_billing_upload");
          return { data: allowed };
        },
        storage:{from:bucket=>({download:async(path)=>{
          assert.equal(bucket,"billing-proofs");assert.equal(path,biz+"/"+submissions[1].p_id);
          return {data:new Blob(["old"],{type:"image/png"})};
        }})},
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: allowed
                  ? { business_id: biz, receipt_mime: legacy?null:"application/pdf" }
                  : null,
              }),
            }),
          }),
        }),
      }),
    },
    "@supabase/supabase-js": {
      createClient: () => ({
        rpc: async (name, args) => {
          assert.equal(name, "record_invoice_receipt");
          submissions.push(args);
          return { error: null };
        },
      }),
    },
    "next/cache": { revalidatePath() {} },
  });
  function request(
    bytes,
    origin = "https://aspen.test",
    pdf = false,
    override = {},
  ) {
    const form = new FormData();
    for (const [k, v] of Object.entries({
      method: "bank",
      amount: "100.25",
      invoice: "00000000-0000-4000-8000-000000000123",
      reference: "TEST-REF",
      paid: "2020-01-01",
      due,
      business_id: "other",
      ...override,
    }))
      form.set(k, v);
    form.set(
      "proof",
      new File([bytes], pdf ? "receipt.pdf" : "receipt.png", {
        type: pdf ? "application/pdf" : "image/png",
      }),
    );
    return new Request("https://aspen.test/api/billing/proofs", {
      method: "POST",
      headers: { origin },
      body: form,
    });
  }
  assert.equal(
    (await POST(request("wrong", "https://elsewhere.test"))).status,
    403,
  );
  assert.equal((await POST(request("disguised as an image"))).status, 400);
  const oversized = new Request("https://aspen.test/api/billing/proofs", {
    method: "POST",
    headers: {
      origin: "https://aspen.test",
      "content-type": "multipart/form-data; boundary=test",
    },
    body: new Uint8Array(4 * 1024 * 1024),
  });
  assert.equal((await POST(oversized)).status, 413);
  allowed = false;
  assert.equal((await POST(request("ignored"))).status, 429);
  allowed = true;
  assert.equal(writes.length, 0);
  const image = await sharp({
    create: { width: 3, height: 3, channels: 3, background: "green" },
  })
    .png()
    .toBuffer();
  assert.equal((await POST(request(image))).status, 200);
  assert.equal(writes[0].mime, "image/png");
  assert.equal(
    writes[0].path,
    "billing-receipts/" + biz + "/" + submissions[0].p_id,
  );
  assert.equal(submissions[0].p_business, biz);
  assert.equal(submissions[0].p_actor, "test-owner");
  assert.equal(submissions[0].p_amount, 100.25);
  assert.equal(
    (await POST(request("%PDF-1.4 truncated", undefined, true))).status,
    400,
  );
  assert.equal(
    (
      await POST(
        request(image, undefined, false, { method: "maya", reference: "" }),
      )
    ).status,
    400,
  );
  const prefix = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n";
  const pdf =
    prefix +
    "xref\n0 2\n0000000000 65535 f \n0000000009 00000 n \ntrailer\n<< /Size 2 /Root 1 0 R >>\nstartxref\n" +
    prefix.length +
    "\n%%EOF\n";
  assert.equal(
    (
      await POST(
        request(pdf, undefined, true, { method: "cash", reference: "" }),
      )
    ).status,
    200,
  );
  const download = () =>
    GET(
      new Request(
        "https://aspen.test/api/billing/proofs?id=" + submissions[1].p_id,
      ),
    );
  const response = await download();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/pdf");
  assert.match(response.headers.get("content-disposition"), /^attachment/);
  legacy=true;
  const oldReceipt=await download();
  assert.equal(oldReceipt.headers.get("content-type"),"image/png");
  assert.equal(await oldReceipt.text(),"old");
  allowed = false;
  assert.equal((await download()).status, 404);
  user = null;
  assert.equal((await POST(request(image))).status, 403);
  assert.equal(writes.length, 2);
});

test("Manila expiry and two calendar months of retention cover month-end and leap day", () => {
  const { cycleState } = load("src/features/billing/mappers.ts");
  const s = { due_on: "2023-12-30", renew: false };
  assert.equal(cycleState(s, "2023-12-30").suspended, false);
  assert.match(cycleState(s, "2023-12-31").reminder, /60 days remain/);
  assert.match(
    cycleState(s, "2024-02-29").reminder,
    /retention period has ended/,
  );
});
