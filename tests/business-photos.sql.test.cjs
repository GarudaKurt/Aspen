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
    for (const migration of ['0018_media_assets.sql','0019_rbac_hardening.sql','0020_provider_onboarding_guards.sql','0024_business_photos.sql','0025_publish_approved_businesses.sql','0026_business_cover_photos.sql','0027_business_photo_webp_keys.sql','0028_restore_original_business_photo_formats.sql','0029_public_service_visibility.sql']) await db.exec(read(migration));
    const as = async (id, role = 'authenticated') => {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id ?? '']);
      await db.exec(`set role ${role}`);
    };
    await as(uid(2));
    await db.query("insert into public.provider_applications(id,applicant_id,provider_type,business_name,business_description,selected_services) values ($1,$2,'Clinic','Test business','Description',array['Veterinary'])", [uid(10),uid(2)]);
    await assert.rejects(db.query('select public.approve_provider_application($1)',[uid(10)]), /Only administrators/);
    await as(uid(1));
    const approved = await db.query('select (public.approve_provider_application($1)).*',[uid(10)]);
    const business = approved.rows[0];
    assert.equal(business.status,'published');
    assert.equal((await db.query('select status from public.provider_applications where id=$1',[uid(10)])).rows[0].status,'approved');
    assert.equal((await db.query('select role from public.profiles where id=$1',[uid(2)])).rows[0].role,'provider');
    // Idempotent approval never duplicates the business.
    await db.query('select public.approve_provider_application($1)',[uid(10)]);
    assert.equal((await db.query('select count(*)::int as n from public.businesses')).rows[0].n,1);
    // Exercise service publication against real PostgreSQL RLS and stored rows.
    const service = (await db.query('select id from public.business_services where business_id=$1',[business.id])).rows[0];
    await as(null,'anon');
    assert.equal((await db.query('select id from public.business_services')).rows.length,0);
    await as(uid(2));
    await db.query("update public.business_services set description='Full grooming',starting_price=500,status='active' where id=$1",[service.id]);
    await db.query("insert into public.business_service_photos(service_id,storage_path) values ($1,'fixture.jpg')",[service.id]);
    for (const n of [190,191]) {
      await db.query("insert into public.media_assets(id,owner_id,business_id,service_id,category,visibility,object_key,original_filename,content_type,byte_size,status) values ($1,$2,$3,$4,'service_photo','public',$5,'fixture.jpg','image/jpeg',100,'active')", [uid(n),uid(2),n === 190 ? business.id : null,service.id,`services/${service.id}/service_photo/${uid(n)}-fixture.jpg`]);
    }
    await as(null,'anon');
    assert.equal((await db.query("select s.id from public.business_services s join public.businesses b on b.id=s.business_id where s.status='active' and b.status='published'")).rows.length,1);
    assert.equal((await db.query('select id from public.business_service_photos')).rows.length,1);
    assert.equal((await db.query('select id from public.media_assets')).rows.length,2);
    await as(uid(3));
    assert.equal((await db.query("update public.business_services set status='paused' where id=$1 returning id",[service.id])).rows.length,0);
    await as(uid(2));
    await assert.rejects(db.query("update public.businesses set status='published',verified=true where id=$1",[business.id]), /Only administrators/);
    await db.query("update public.business_services set status='paused' where id=$1",[service.id]);
    await as(null,'anon');
    assert.equal((await db.query('select id from public.business_services')).rows.length,0);
    assert.equal((await db.query('select id from public.business_service_photos')).rows.length,0);
    assert.equal((await db.query('select id from public.media_assets')).rows.length,0);
    await as(uid(2));
    assert.equal((await db.query('select id from public.business_services')).rows.length,1);
    await db.query('delete from public.media_assets where service_id=$1',[service.id]);
    console.log('Service SQL checks passed: persisted publish/pause, anonymous discovery, draft/paused privacy, owner visibility, cross-provider denial, and admin publication protection.');
    const mutate = (action,id,newId=null) => db.query('select public.manage_business_photo($1,$2,$3,$4,$5,$6,$7)',[business.id,action,id,newId,'test.png','image/png',100]);
    await as(uid(2));
    await db.query('select public.manage_business_photo($1,$2,$3,$4,$5,$6,$7)',[business.id,'add',null,uid(99),'photo.jpeg','image/jpeg',100]);
    assert.match((await db.query('select object_key from public.media_assets where id=$1',[uid(99)])).rows[0].object_key, /-photo\.jpg$/);
    await assert.rejects(db.query('select public.manage_business_photo($1,$2,$3,$4,$5,$6,$7)',[business.id,'add',null,uid(198),'wrong.jpg','image/png',100]), /filename does not match/);
    for (let n=100;n<111;n++) await mutate('add',null,uid(n));
    assert.match((await db.query('select object_key from public.media_assets where id=$1',[uid(100)])).rows[0].object_key, /-photo\.png$/);
    await assert.rejects(mutate('add',null,uid(112)),/at most 12/);
    await mutate('replace',uid(100),uid(120));
    assert.equal((await db.query("select count(*)::int as n from public.media_assets where status='active'")).rows[0].n,12);
    assert.equal((await db.query('select status from public.media_assets where id=$1',[uid(100)])).rows[0].status,'deleted');
    await mutate('cover',uid(101));
    const coverKey = (await db.query('select cover_photo_path from public.businesses where id=$1',[business.id])).rows[0].cover_photo_path;
    assert.ok(coverKey.includes(uid(101)));
    await mutate('delete',uid(101));
    assert.notEqual((await db.query('select cover_photo_path from public.businesses where id=$1',[business.id])).rows[0].cover_photo_path,coverKey);
    // Dedicated cover removal must not silently promote a remaining gallery image.
    await mutate('cover',uid(102));
    await assert.rejects(mutate('add_cover',null,uid(140)),/cover photo changed/);
    await assert.rejects(mutate('replace_cover',uid(103),uid(140)),/cover photo changed/);
    await assert.rejects(mutate('remove_cover',uid(103)),/cover photo changed/);
    await mutate('replace_cover',uid(102),uid(140));
    assert.ok((await db.query('select cover_photo_path from public.businesses where id=$1',[business.id])).rows[0].cover_photo_path.includes(uid(140)));
    await mutate('remove_cover',uid(140));
    assert.equal((await db.query('select cover_photo_path from public.businesses where id=$1',[business.id])).rows[0].cover_photo_path,null);
    assert.equal((await db.query("select count(*)::int as n from public.media_assets where status='active'")).rows[0].n,10);
    await mutate('add_cover',null,uid(141));
    assert.ok((await db.query('select cover_photo_path from public.businesses where id=$1',[business.id])).rows[0].cover_photo_path.includes(uid(141)));
    await assert.rejects(db.query("update public.media_assets set object_key='applications/stolen/document' where id=$1",[uid(102)]),/immutable/);
    await assert.rejects(db.query("update public.businesses set status='draft' where id=$1",[business.id]),/Only administrators/);
    await as(uid(3));
    await assert.rejects(mutate('cover',uid(102)),/access denied/);
    await assert.rejects(mutate('delete',uid(102)),/access denied/);
    await assert.rejects(mutate('add',null,uid(130)),/access denied/);
    for (const action of ['add_cover','replace_cover','remove_cover']) await assert.rejects(mutate(action,uid(141),uid(150)),/access denied/);
    const updated = await db.query("update public.media_assets set status='deleted' where id=$1 returning id",[uid(102)]);
    assert.equal(updated.rows.length,0);
    await as(null,'anon');
    assert.equal((await db.query('select id from public.businesses')).rows.length,1);
    assert.equal((await db.query('select id from public.media_assets')).rows.length,11);
    await assert.rejects(mutate('cover',uid(102)),/permission denied/);
    await as(uid(1));
    await db.query("update public.businesses set status='archived' where id=$1",[business.id]);
    await as(null,'anon');
    assert.equal((await db.query('select id from public.businesses')).rows.length,0);
    assert.equal((await db.query('select id from public.media_assets')).rows.length,0);
    console.log('PostgreSQL checks passed: admin approval/publication, idempotency, gallery cap, replacement, cover reassignment, explicit removal/replacement, stale cover rejection, immutable keys, ownership/RLS, anonymous visibility and archived-business privacy.');
  } finally { await db.close(); }
})().catch((error) => { console.error(error.message); process.exitCode=1; });
