/* eslint-disable @typescript-eslint/no-require-imports */
// Run with PGLITE_MODULE pointing at a temporary @electric-sql/pglite install.
// This tests actual PostgreSQL policies/triggers in memory, never live Supabase.
const assert = require('node:assert/strict');
const fs = require('node:fs');
if (!process.env.PGLITE_MODULE) {
  console.log('SQL integration checks skipped: set PGLITE_MODULE to a temporary PGlite installation.');
  process.exit(0);
}
const { PGlite } = require(process.env.PGLITE_MODULE);
const read = (name) => fs.readFileSync(`supabase/migrations/${name}`, 'utf8');
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

(async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key, email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid$$;
      create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('email','fixture@example.test')$$;
      grant usage on schema auth, public to anon, authenticated;
      grant execute on all functions in schema auth to anon, authenticated;
      create table public.profiles(id uuid primary key references auth.users, role text, updated_at timestamptz);
      create function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.profiles where id=auth.uid() and role='admin')$$;
      create function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now(); return new; end$$;
      insert into auth.users values ('${uid(1)}',now()),('${uid(2)}',now()),('${uid(3)}',now());
      insert into public.profiles values ('${uid(1)}','admin',now()),('${uid(2)}','customer',now()),('${uid(3)}','provider',now());
      grant select,update on public.profiles to authenticated;
    `);
    // Relevant real tenancy schema and policies; unrelated Storage/appointment
    // compatibility SQL needs the rest of Supabase and is outside this fixture.
    await db.exec(read('0017_tenancy.sql').split('insert into storage.buckets')[0]);
    for (const migration of ['0018_media_assets.sql','0019_rbac_hardening.sql','0020_provider_onboarding_guards.sql','0024_business_photos.sql','0025_publish_approved_businesses.sql','0026_business_cover_photos.sql','0027_business_photo_webp_keys.sql','0028_restore_original_business_photo_formats.sql','0029_public_service_visibility.sql','0030_direct_photo_uploads.sql','0031_approved_provider_service_management.sql']) await db.exec(read(migration));
    const as = async (id, role = 'authenticated') => {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? '']);
      await db.exec(`set role ${role}`);
    };

    await db.exec(read('0031_approved_provider_service_management.sql'));
    await as(uid(2));
    await db.query("insert into public.provider_applications(id,applicant_id,provider_type,business_name,business_description,selected_services) values ($1,$2,'Clinic','Approved clinic','Description',array['Veterinary'])",[uid(10),uid(2)]);
    await assert.rejects(db.query('select public.approve_provider_application($1)',[uid(10)]), /Only administrators/);
    await as(uid(1));
    const business = (await db.query('select (public.approve_provider_application($1)).*',[uid(10)])).rows[0];
    assert.equal(business.status,'published');
    // Reproduce legacy approval: application approved, business still pending.
    await db.query("update public.businesses set status='pending' where id=$1",[business.id]);
    await as(uid(2));
    await db.query("insert into public.business_services(id,business_id,title,category,description,starting_price,status) values($1,$2,'Bath','Grooming','Gentle bath',500,'draft')",[uid(20),business.id]);
    await as(null,'anon');
    assert.equal((await db.query('select id from public.businesses')).rows.length,0);
    assert.equal((await db.query('select id from public.business_services')).rows.length,0);
    await as(uid(2));
    await db.query("update public.business_services set status='active' where id=$1",[uid(20)]);
    assert.equal((await db.query('select status from public.businesses where id=$1',[business.id])).rows[0].status,'published');
    // Uploads still use the original reservation + commit workflow.
    await db.query("select public.reserve_photo_upload($1,'service',$2,'add',null,'bath.png','image/png',6000000,$3)",[uid(30),uid(20),'a'.repeat(64)]);
    await db.query('select public.finish_photo_upload($1)',[uid(30)]);
    await db.query('select public.set_service_photo_order($1,$2)',[uid(20),[uid(30)]]);
    await as(null,'anon');
    assert.equal((await db.query('select id from public.businesses')).rows.length,1);
    assert.equal((await db.query('select id from public.business_services')).rows.length,1);
    assert.equal((await db.query('select id from public.media_assets')).rows.length,1);
    await as(uid(2));
    await db.query("update public.business_services set description='Updated bath',starting_price=650 where id=$1",[uid(20)]);
    await as(null,'anon');
    const updated = (await db.query('select description,starting_price from public.business_services')).rows[0];
    assert.equal(updated.description,'Updated bath'); assert.equal(Number(updated.starting_price),650);
    await as(uid(2));
    await db.query("update public.business_services set status='paused' where id=$1",[uid(20)]);
    await as(null,'anon');
    assert.equal((await db.query('select id from public.business_services')).rows.length,0);
    assert.equal((await db.query('select id from public.media_assets')).rows.length,0);
    await as(uid(2));
    await db.query("update public.business_services set status='active' where id=$1",[uid(20)]);
    await assert.rejects(db.query("update public.businesses set verified=true where id=$1",[business.id]), /Only administrators/);
    await assert.rejects(db.query("update public.profiles set role='admin' where id=$1",[uid(2)]), /Only administrators/);
    await assert.rejects(db.query("update public.business_services set starting_price=-10 where id=$1",[uid(20)]), /valid starting price/);
    await assert.rejects(db.query("update public.business_services set starting_price='NaN' where id=$1",[uid(20)]), /valid starting price/);
    await assert.rejects(db.query("insert into public.business_services(business_id,title,category,description,status) values($1,'Incomplete','Veterinary','','active')",[business.id]), /valid starting price/);
    // Another provider owns an unapproved draft business.
    await as(uid(3));
    const unapproved = (await db.query("insert into public.businesses(owner_id,slug,name,provider_type) values($1,'unapproved','Unapproved','Clinic') returning id",[uid(3)])).rows[0].id;
    await assert.rejects(db.query("insert into public.business_services(business_id,title,category,description,status) values($1,'Bad','Veterinary','Not approved','draft')",[unapproved]), /approved|row-level/);
    assert.equal((await db.query("update public.business_services set title='Stolen' where id=$1 returning id",[uid(20)])).rows.length,0);
    assert.equal((await db.query("delete from public.business_services where id=$1 returning id",[uid(20)])).rows.length,0);
    await assert.rejects(db.query("insert into public.media_assets(owner_id,service_id,category,object_key,original_filename,content_type,byte_size) values($1,$2,'service_photo','wrong','wrong.png','image/png',100)",[uid(3),uid(20)]));
    // Published business alone is not proof of initial approval.
    await as(uid(1));
    await db.query("update public.businesses set status='published' where id=$1",[unapproved]);
    await as(uid(3));
    await assert.rejects(db.query("insert into public.business_services(business_id,title,category,description,starting_price,status) values($1,'Bad','Veterinary','Not approved',100,'active')",[unapproved]), /approved|row-level/);
    await as(null,'anon');
    assert.equal((await db.query('select id from public.businesses where id=$1',[unapproved])).rows.length,0);
    // Application status is always checked, including pending/rejected/withdrawn.
    for (const status of ['pending','rejected','withdrawn']) {
      await as(uid(1));
      await db.exec('reset role'); // Seed historical application fixtures as database owner.
      await db.query("insert into public.provider_applications(id,applicant_id,provider_type,business_name,business_description,business_id,status) values($1,$2,'Clinic','Not approved','Description',$3,$4)",[uid(100 + ['pending','rejected','withdrawn'].indexOf(status)),uid(3),unapproved,status]);
      await as(uid(3));
      await assert.rejects(db.query("insert into public.business_services(business_id,title,category,description,starting_price,status) values($1,'Bad','Veterinary','Not approved',100,'active')",[unapproved]), /approved|row-level/);
    }
    // This schema uses archived for a suspended/disabled business, not a new status.
    for (const status of ['archived','rejected','draft']) {
      await as(uid(1));
      await db.query('update public.businesses set status=$1 where id=$2',[status,business.id]);
      await as(uid(2));
      assert.equal((await db.query("update public.business_services set title='Blocked' where id=$1 returning id",[uid(20)])).rows.length,0);
      assert.equal((await db.query('delete from public.business_services where id=$1 returning id',[uid(20)])).rows.length,0);
      await assert.rejects(db.query("insert into public.business_services(business_id,title,category,description,starting_price,status) values($1,'Blocked','Veterinary','Blocked',100,'active')",[business.id]), /approved|row-level/);
      await assert.rejects(db.query("update public.businesses set status='published' where id=$1",[business.id]), /Only administrators/);
      assert.equal((await db.query('delete from public.media_assets where id=$1 returning id',[uid(30)])).rows.length,0);
      await as(null,'anon');
      assert.equal((await db.query('select id from public.business_services')).rows.length,0);
    }
    await as(uid(1));
    await db.query("update public.businesses set status='published' where id=$1",[business.id]);
    await db.exec('reset role');
    await db.query('update auth.users set email_confirmed_at=null where id=$1',[uid(2)]);
    await as(uid(2));
    await assert.rejects(db.query("insert into public.business_services(business_id,title,category,description,starting_price,status) values($1,'Blocked','Veterinary','Unverified',100,'active')",[business.id]), /approved|row-level/);
    console.log('Approved-service SQL passed: rerunnable migration, initial admin approval, legacy approval publication, draft/privacy, immediate edits, unpublish/republish, original upload reservations, owner isolation, unapproved application denial, restricted-business denial, verification and role protection.');
  } finally { await db.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
