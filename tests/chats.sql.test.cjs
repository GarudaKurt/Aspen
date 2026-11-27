/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
if (!process.env.PGLITE_MODULE) {
  console.log(
    "Chat SQL tests skipped: set PGLITE_MODULE to a temporary PGlite installation.",
  );
  process.exit(0);
}
const { PGlite } = require(process.env.PGLITE_MODULE);
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const read = (file) => fs.readFileSync(`supabase/migrations/${file}`, "utf8");
(async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth;
      create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('email','fixture@example.test')$$;
      grant usage on schema public,auth to anon,authenticated;
      grant execute on all functions in schema auth to anon,authenticated;
      create table public.profiles(id uuid primary key references auth.users,role text,updated_at timestamptz,display_name text);
      create function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.profiles where id=auth.uid() and role='admin')$$;
      create function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end$$;
      insert into auth.users values ${[1, 2, 3, 4, 5, 6].map((n) => `('${uid(n)}',${n === 6 ? "null" : "now()"})`).join(",")};
      insert into public.profiles(id,role,display_name) values ${[1, 2, 3, 4, 5, 6].map((n) => `('${uid(n)}','${n === 1 ? "admin" : "customer"}','User ${n}')`).join(",")};
      grant select on public.profiles to authenticated;`);
    await db.exec(read("0016_appointments.sql"));
    const tenancy = read("0017_tenancy.sql");
    await db.exec(tenancy.split("insert into storage.buckets")[0]);
    await db.exec(
      tenancy.slice(
        tenancy.indexOf("-- Keep existing appointment records compatible"),
      ),
    );
    for (const file of [
      "0018_media_assets.sql",
      "0019_rbac_hardening.sql",
      "0020_provider_onboarding_guards.sql",
      "0024_business_photos.sql",
      "0025_publish_approved_businesses.sql",
      "0026_business_cover_photos.sql",
      "0027_business_photo_webp_keys.sql",
      "0028_restore_original_business_photo_formats.sql",
      "0029_public_service_visibility.sql",
      "0030_direct_photo_uploads.sql",
      "0031_approved_provider_service_management.sql",
      "0032_photo_optimization.sql",
      "0034_customer_provider_chat.sql",
      "0035_provider_unread_messages.sql",
    ])
      await db.exec(read(file));
    await db.exec(read("0034_customer_provider_chat.sql"));
    const as = async (id, role = "authenticated") => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id ?? "",
      ]);
      await db.exec(`set role ${role}`);
    };
    const businesses = [];
    for (const n of [2, 3]) {
      await as(uid(n));
      await db.query(
        "insert into provider_applications(id,applicant_id,provider_type,business_name,business_description,selected_services) values($1,$2,'Clinic',$3,'Description',array['Veterinary'])",
        [uid(n + 10), uid(n), `Clinic ${n}`],
      );
      await as(uid(1));
      const business = (
        await db.query("select (approve_provider_application($1)).*", [
          uid(n + 10),
        ])
      ).rows[0];
      await db.query("update businesses set status='published' where id=$1", [
        business.id,
      ]);
      businesses.push(business);
    }
    await require("./tenant-billing-checks.cjs")({ db, as, businesses, uid, read });
    const start = async (slug) =>
      (await db.query("select start_business_chat($1) as id", [slug])).rows[0]
        .id;
    await as(uid(4));
    const thread = await start(businesses[0].slug);
    assert.equal(await start(businesses[0].slug), thread);
    const send = async (client, body = "Hello") =>
      (
        await db.query("select * from send_chat_message($1,$2,$3)", [
          thread,
          uid(client),
          body,
        ])
      ).rows[0];
    const first = await send(100, "<script>alert(1)</script>");
    assert.equal((await send(100, "<script>alert(1)</script>")).id, first.id);
    await assert.rejects(send(100, "different"));
    assert.equal(
      (await db.query("select count(*)::int as n from chat_messages")).rows[0]
        .n,
      1,
    );
    await assert.rejects(
      db.query(
        "insert into chat_messages(conversation_id,sender_id,client_id,body) values($1,$2,$3,'spoof')",
        [thread, uid(2), uid(101)],
      ),
    );
    await assert.rejects(send(102, "x".repeat(4001)));
    await assert.rejects(send(102, "\n\t "));
    await assert.rejects(
      db.query("update chat_messages set body='tampered' where id=$1", [
        first.id,
      ]),
    );
    await assert.rejects(
      db.query("delete from chat_messages where id=$1", [first.id]),
    );
    await as(uid(5));
    assert.equal(
      (await db.query("select * from chat_messages")).rows.length,
      0,
    );
    await assert.rejects(send(103));
    await assert.rejects(
      db.query("select * from get_chat_history($1)", [thread]),
    );
    const unread = async (business) => Number((await db.query(
      "select provider_unread_messages($1) as total", [business.id],
    )).rows[0].total);
    assert.equal(await unread(businesses[0]), 0);
    await as(uid(3));
    assert.equal(await unread(businesses[0]), 0);
    await assert.rejects(send(104));
    await as(uid(1));
    assert.equal(
      (await db.query("select * from chat_messages")).rows.length,
      0,
    );
    await as(uid(6));
    await assert.rejects(start(businesses[0].slug));
    await as(null, "anon");
    await assert.rejects(db.query("select * from chat_messages"));
    await as(uid(2));
    await assert.rejects(start(businesses[0].slug), /another business/);
    const inbox = (
      await db.query("select * from list_chat_conversations('provider')")
    ).rows;
    assert.equal(await unread(businesses[0]), 1);
    assert.equal(await unread(businesses[1]), 0);
    assert.equal(inbox[0].unread_count, 1);
    assert.equal(inbox[0].name, "User 4");
    await db.query("select read_chat_conversation($1,$2)", [thread, first.seq]);
    await assert.rejects(
      db.query("select read_chat_conversation($1,$2)", [thread, 99999]),
    );
    await assert.rejects(
      db.query("select change_chat_message($1,$2,false,$3)", [
        first.id,
        "stolen",
        first.updated_at,
      ]),
    );
    const reply = await send(105, "Welcome");
    assert.equal(reply.sender_id, uid(2));
    assert.equal(await unread(businesses[0]), 0);
    await as(uid(4));
    const history = (
      await db.query("select * from get_chat_history($1)", [thread])
    ).rows;
    assert.deepEqual(
      history.map((m) => m.id),
      [reply.id, first.id],
    );
    assert.equal(history[1].read_by_recipient, true);
    const page = (
      await db.query("select chat_history_page($1) as page", [thread])
    ).rows[0].page;
    const edited = (
      await db.query("select * from change_chat_message($1,$2,false,$3)", [
        first.id,
        "Edited",
        first.updated_at,
      ])
    ).rows[0];
    await assert.rejects(
      db.query("select change_chat_message($1,$2,false,$3)", [
        first.id,
        "Stale",
        first.updated_at,
      ]),
    );
    const changes = (
      await db.query("select sync_chat_messages($1,$2,0) as page", [
        thread,
        page.watermark,
      ])
    ).rows[0].page;
    assert.equal(changes.messages[0].body, "Edited");
    await db.query("select change_chat_message($1,null,true,$2)", [
      first.id,
      edited.updated_at,
    ]);
    assert.equal(
      (await db.query("select body from chat_messages where id=$1", [first.id]))
        .rows[0].body,
      "",
    );
    await db.query("select set_chat_preferences($1,true,true,true)", [thread]);
    assert.equal(
      (await db.query("select * from list_chat_conversations('customer')")).rows
        .length,
      0,
    );
    await as(uid(2));
    await send(106, "Another reply");
    await as(uid(4));
    const restored = (
      await db.query("select * from list_chat_conversations('customer')")
    ).rows[0];
    assert.equal(restored.muted, true);
    assert.equal(restored.archived, false);
    assert.equal(
      (
        await db.query(
          "select * from list_chat_conversations('customer',false,null,null,1,$1)",
          [thread],
        )
      ).rows[0].id,
      thread,
    );
    await as(uid(2));
    for (let n = 200; n < 228; n++) await send(n);
    await assert.rejects(send(228), /Too many/);
    await as(uid(4));
    for (let n = 400; n < 426; n++) await send(n);
    const firstPage = (
      await db.query("select chat_history_page($1) as page", [thread])
    ).rows[0].page;
    assert.equal(firstPage.messages.length, 51);
    const nextPage = (
      await db.query("select chat_history_page($1,$2) as page", [
        thread,
        firstPage.messages[49].seq,
      ])
    ).rows[0].page;
    assert.ok(nextPage.messages.length > 0);
    assert.equal(nextPage.messages[0].id, firstPage.messages[50].id);
    assert.ok(
      nextPage.messages.every((item) => item.seq < firstPage.messages[49].seq),
    );
    const expired = await send(450);
    await db.exec("reset role");
    await db.query(
      "update chat_messages set created_at=now()-interval '25 hours' where id=$1",
      [expired.id],
    );
    await as(uid(4));
    await assert.rejects(
      db.query("select change_chat_message($1,'late',false,$2)", [
        expired.id,
        expired.updated_at,
      ]),
      /15 minutes/,
    );
    await assert.rejects(
      db.query("select change_chat_message($1,null,true,$2)", [
        expired.id,
        expired.updated_at,
      ]),
      /24 hours/,
    );
    await as(uid(1));
    await db.query("update businesses set status='archived' where id=$1", [
      businesses[0].id,
    ]);
    await as(uid(4));
    await assert.rejects(send(300), /inactive/);
    console.log(
      "Chat PostgreSQL checks passed: real approval helpers, migration rerun, ownership/RLS, idempotency, history, read receipts, edit/delete, synchronization, preferences, rate limits and inactive business.",
    );
  } finally {
    await db.close();
  }
})().catch((error) => {
  console.error(error.message, error.where ?? "", error.internalQuery ?? "");
  process.exitCode = 1;
});
