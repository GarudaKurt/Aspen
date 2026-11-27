/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");

// Runs against the two approved businesses in the isolated chat/tenancy PostgreSQL fixture.
module.exports = async function billingChecks({
  db,
  as,
  businesses,
  uid,
  read,
}) {
  const bid = businesses[0].id;
  const scalar = async (sql, params = []) =>
    Object.values((await db.query(sql, params)).rows[0])[0];
  await db.exec("reset role");
  await db.exec(`create schema storage;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated,anon;
    grant select,insert,update,delete on storage.objects to authenticated;
  `);
  await db.exec(read("0036_tenant_billing.sql"));
  await as(uid(2));
  await assert.rejects(
    db.query("select enroll_tenant_subscription($1,'Basic',billing_today())", [
      bid,
    ]),
  );
  await as(uid(1));
  await db.query(
    "select enroll_tenant_subscription($1,'Basic',billing_today())",
    [bid],
  );
  await assert.rejects(
    db.query(
      "select enroll_tenant_subscription($1,'Professional',billing_today())",
      [bid],
    ),
  );
  await as(uid(2));
  await db.query("select set_billing_preferences($1,false,'bank')", [bid]);
  assert.equal(await scalar("select billing_access($1)", [bid]), true);
  await assert.rejects(
    db.query("update tenant_subscriptions set due_on=billing_today()+365"),
  );
  await db.exec("reset role");
  await db.query(
    "update tenant_subscriptions set due_on=billing_today()-65 where business_id=$1",
    [bid],
  );
  await as(null, "anon");
  assert.equal(
    await scalar("select count(*)::int from businesses where id=$1", [bid]),
    0,
  );
  await as(uid(2));
  assert.equal(
    await scalar("select can_manage_business_services($1)", [bid]),
    false,
  );
  await db.query("select set_billing_preferences($1,true,'gcash')", [bid]);
  for (let attempt = 0; attempt < 6; attempt++) {
    assert.equal(await scalar("select begin_billing_upload($1)", [bid]), true);
  }
  assert.equal(await scalar("select begin_billing_upload($1)", [bid]), false);
  const submit = (id) =>
    db.query(
      "select submit_billing_payment($1,$2,'gcash','TEST-REF',billing_today(),billing_today()-65)",
      [bid, id],
    );
  await assert.rejects(submit(uid(81)), /Receipt is missing/);
  await assert.rejects(
    db.query("insert into storage.objects values('billing-proofs',$1)", [
      bid + "/" + uid(81),
    ]),
  );
  await db.exec("reset role");
  await db.query(
    "insert into storage.objects values('billing-proofs',$1),('billing-proofs',$2)",
    [bid + "/" + uid(81), bid + "/" + uid(82)],
  );
  await as(uid(2));
  await submit(uid(81));
  await assert.rejects(submit(uid(82)));
  await assert.rejects(
    db.query("select review_billing_payment($1,true,'')", [uid(81)]),
  );
  await as(uid(3));
  assert.equal(await scalar("select count(*)::int from tenant_payments"), 0);
  assert.equal(await scalar("select count(*)::int from storage.objects"), 0);
  await as(uid(1));
  await assert.rejects(
    db.query("select review_billing_payment($1,false,'')", [uid(81)]),
  );
  await db.query(
    "select review_billing_payment($1,false,'Reference could not be matched')",
    [uid(81)],
  );
  await as(uid(2));
  await submit(uid(82));
  await as(uid(1));
  await db.query("select review_billing_payment($1,true,'Verified')", [
    uid(82),
  ]);
  await assert.rejects(
    db.query("select review_billing_payment($1,true,'Verified')", [uid(82)]),
  );
  await as(uid(2));
  assert.equal(
    await scalar("select can_manage_business_services($1)", [bid]),
    true,
  );
  assert.equal(
    await scalar("select reactivated from tenant_payments where id=$1", [
      uid(82),
    ]),
    true,
  );
  assert.equal(await scalar("select count(*)::int from storage.objects"), 2);
  assert.equal(await scalar("select count(*)::int from tenant_payments"), 2);
  await as(null, "anon");
  assert.equal(
    await scalar("select count(*)::int from businesses where id=$1", [bid]),
    1,
  );
  await db.exec("reset role");
  await db.exec(read("0037_registration_invoices.sql"));
  await as(uid(2));
  assert.equal(
    await scalar(
      "select count(*)::int from tenant_invoices where status='paid'",
    ),
    1,
  );
  assert.equal(
    await scalar("select count(distinct invoice_id)::int from tenant_payments"),
    1,
  );
  const invoice = async () =>
    scalar(
      "select id from tenant_invoices where business_id=$1 and status='open'",
      [bid],
    );
  const original = await invoice();
  await as(uid(3));
  assert.equal(
    await scalar("select count(*)::int from tenant_invoices where id=$1", [
      original,
    ]),
    0,
  );
  await assert.rejects(
    db.query("select change_renewal_plan($1,'Professional',null)", [bid]),
  );
  await as(uid(1));
  await db.query("select change_renewal_plan($1,'Professional',null)", [bid]);
  const changed = await invoice();
  assert.notEqual(original, changed);
  assert.equal(
    await scalar("select amount_php from tenant_invoices where id=$1", [
      original,
    ]),
    999,
  );
  assert.equal(
    await scalar("select amount_php from tenant_invoices where id=$1", [
      changed,
    ]),
    1999,
  );
  await db.query("select change_renewal_plan($1,'Professional',null)", [bid]);
  assert.equal(await invoice(), changed);
  await db.exec("reset role");
  await db.query("insert into storage.objects values('billing-proofs',$1)", [
    bid + "/" + uid(83),
  ]);
  await as(uid(2));
  const pay = (id) =>
    db.query(
      "select submit_invoice_payment($1,$2,$3,'bank','TEST-NEW',billing_today(),(select due_on from tenant_subscriptions where business_id=$2))",
      [id, bid, uid(83)],
    );
  await assert.rejects(pay(original), /Refresh/);
  await pay(changed);
  await as(uid(1));
  await assert.rejects(
    db.query("select change_renewal_plan($1,'Enterprise',null)", [bid]),
    /pending/,
  );
  await db.query("select review_billing_payment($1,true,'Verified')", [
    uid(83),
  ]);
  await as(uid(2));
  assert.equal(
    await scalar(
      "select count(*)::int from tenant_invoices where status='open'",
    ),
    1,
  );
  assert.equal(
    await scalar("select amount_php from tenant_payments where id=$1", [
      uid(83),
    ]),
    1999,
  );
  assert.equal(
    await scalar("select plan from tenant_billing_terms where business_id=$1", [
      bid,
    ]),
    "Basic",
  );
  await db.query("select set_billing_preferences($1,false,null)", [bid]);
  assert.equal(
    await scalar(
      "select count(*)::int from tenant_invoices where status='open'",
    ),
    0,
  );
  await db.query("select set_billing_preferences($1,true,null)", [bid]);
  assert.equal(
    await scalar(
      "select count(*)::int from tenant_invoices where status='open'",
    ),
    1,
  );
  await db.exec("reset role");
  await db.query("insert into auth.users values($1,now())", [uid(7)]);
  await db.query("insert into profiles(id,role) values($1,'customer')", [
    uid(7),
  ]);
  await as(uid(7));
  await assert.rejects(
    db.query(
      "insert into provider_applications(id,applicant_id,provider_type,business_name,business_description,selected_services) values($1,$2,'Clinic','Invoice clinic','Description',array['Veterinary'])",
      [uid(90), uid(7)],
    ),
    /Select a subscription plan/,
  );
  await db.query(
    "insert into provider_applications(id,applicant_id,provider_type,business_name,business_description,selected_services,selected_plan,billing_details) values($1,$2,'Clinic','Invoice clinic','Description',array['Veterinary'],'Professional',jsonb_build_object('fullName','Clinic Billing','address','Test address','email','billing@example.test'))",
    [uid(90), uid(7)],
  );
  await as(uid(1));
  await assert.rejects(
    db.query("select approve_application_with_terms($1,null)", [uid(90)]),
    /first payment due date/,
  );
  await db.query(
    "select approve_application_with_terms($1,billing_today()+10)",
    [uid(90)],
  );
  await db.query(
    "select approve_application_with_terms($1,billing_today()+10)",
    [uid(90)],
  );
  await as(uid(7));
  assert.equal(
    await scalar("select plan from tenant_billing_terms"),
    "Professional",
  );
  assert.equal(await scalar("select count(*)::int from tenant_invoices"), 1);
  assert.equal(
    await scalar("select billing_email from tenant_invoices"),
    "billing@example.test",
  );
  await as(uid(1));
  const enrolled = await scalar(
    "select business_id from provider_applications where id=$1",
    [uid(90)],
  );
  await db.query("select change_renewal_plan($1,'Free',null)", [enrolled]);
  await as(uid(7));
  assert.equal(
    await scalar(
      "select count(*)::int from tenant_invoices where status='open'",
    ),
    0,
  );
  assert.equal(
    await scalar("select upcoming_plan from tenant_billing_terms"),
    "Free",
  );
  await as(null, "anon");
  await assert.rejects(db.query("select * from tenant_invoices"));
  await db.exec("reset role");
  await db.query("insert into auth.users values($1,now())", [uid(8)]);
  await db.query("insert into profiles(id,role) values($1,'customer')", [
    uid(8),
  ]);
  await as(uid(8));
  await db.query(
    "insert into provider_applications(id,applicant_id,provider_type,business_name,business_description,selected_services,selected_plan) values($1,$2,'Clinic','Free clinic','Description',array['Veterinary'],'Free')",
    [uid(91), uid(8)],
  );
  await as(uid(1));
  const freeBusiness = await scalar(
    "select (approve_application_with_terms($1,null)).id",
    [uid(91)],
  );
  await as(uid(8));
  assert.equal(await scalar("select plan from tenant_billing_terms"), "Free");
  assert.equal(await scalar("select count(*)::int from tenant_invoices"), 0);
  await as(uid(1));
  await assert.rejects(
    db.query("select change_renewal_plan($1,'Basic',null)", [freeBusiness]),
    /first paid due date/,
  );
  await db.query("select change_renewal_plan($1,'Basic',billing_today()+30)", [
    freeBusiness,
  ]);
  await as(uid(8));
  assert.equal(
    await scalar("select amount_php from tenant_invoices where status='open'"),
    999,
  );
  await db.exec("reset role");
  await db.exec(read("0038_invoice_receipts.sql"));
  // Advance the billing clock past this tenant's first due date.
  await db.exec("create or replace function public.billing_today() returns date language sql stable set search_path='' as $$ select (now() at time zone 'Asia/Manila')::date + 31 $$");
  await as(uid(8));
  const open = await scalar(
    "select id from tenant_invoices where status='open'",
  );
  const dueDate = await scalar(
    "select due_on::text from tenant_invoices where id=$1",
    [open],
  );
  const record = (id, amount, method = "cash", ref = null) =>
    db.query(
      "select record_invoice_receipt($1,$2,$3,$4,$5,$6,billing_today(),$7,$8,'application/pdf')",
      [freeBusiness, open, uid(id), uid(8), amount, ref, dueDate, method],
    );
  assert.equal(await scalar("select billing_access($1)",[freeBusiness]),false);
  await assert.rejects(record(94, 100));
  await db.exec("set role service_role");
  await record(94, 100.25);
  await assert.rejects(record(95, 100));
  await as(uid(1));
  await db.query("select review_billing_payment($1,false,'Unclear')", [
    uid(94),
  ]);
  await db.exec("set role service_role");
  await record(95, 100.25);
  await as(uid(1));
  await db.query("select review_billing_payment($1,true,'Received cash')", [
    uid(95),
  ]);
  await as(uid(8));
  assert.equal(
    await scalar("select status from tenant_invoices where id=$1", [open]),
    "open",
  );
  assert.equal(
    Number(
      await scalar("select credited_php from tenant_invoices where id=$1", [
        open,
      ]),
    ),
    100.25,
  );
  assert.equal(
    await scalar(
      "select due_on::text from tenant_subscriptions where business_id=$1",
      [freeBusiness],
    ),
    dueDate,
  );
  await assert.rejects(
    db.query("select set_billing_preferences($1,false,null)", [freeBusiness]),
  );
  await db.exec("set role service_role");
  assert.equal(await scalar("select billing_access($1)",[freeBusiness]),false);
  await assert.rejects(record(96, 999, "maya", "MAYA-TEST"));
  await record(96, 898.75, "maya", "MAYA-TEST");
  await as(uid(1));
  await db.query("select review_billing_payment($1,true,'Transfer verified')", [
    uid(96),
  ]);
  await assert.rejects(
    db.query("select review_billing_payment($1,true,'Again')", [uid(96)]),
  );
  await as(uid(8));
  assert.equal(
    await scalar("select status from tenant_invoices where id=$1", [open]),
    "paid",
  );
  assert.equal(
    await scalar(
      "select count(*)::int from tenant_invoices where status='open'",
    ),
    1,
  );
  assert.equal(
    await scalar("select settles_invoice from tenant_payments where id=$1", [
      uid(96),
    ]),
    true,
  );
  assert.equal(await scalar("select billing_access($1)",[freeBusiness]),true);
  assert.equal(await scalar("select reactivated from tenant_payments where id=$1",[uid(96)]),true);
  await db.exec("reset role");
  await db.exec("create or replace function public.billing_today() returns date language sql stable set search_path='' as $$ select (now() at time zone 'Asia/Manila')::date $$");
  await as(uid(3));
  assert.equal(
    await scalar(
      "select count(*)::int from tenant_payments where invoice_id=$1",
      [open],
    ),
    0,
  );
  console.log(
    "Invoice integration passed: plan at approval, legacy backfill, immutable charges, renewal, cancellation, repricing and tenant isolation.",
  );
  console.log(
    "Billing enrollment, expiry, retention, private receipt access, review and restoration passed.",
  );
};
