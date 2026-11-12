/* eslint-disable @typescript-eslint/no-require-imports */
// Real PostgreSQL via a temporary PGlite install; never connects to Supabase.
const assert = require('node:assert/strict');
const fs = require('node:fs');
if (!process.env.PGLITE_MODULE) { console.log('Set PGLITE_MODULE to run SQL integration checks.'); process.exit(0); }
const { PGlite } = require(process.env.PGLITE_MODULE);
const read = name => fs.readFileSync(`supabase/migrations/${name}`, 'utf8');
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
(async()=>{
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key, email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('email','fixture@example.test')$$;
      grant usage on schema auth,public to anon,authenticated;
      grant execute on all functions in schema auth to anon,authenticated;
      create table public.profiles(id uuid primary key references auth.users, role text, updated_at timestamptz);
      create function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.profiles where id=auth.uid() and role='admin')$$;
      create function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end$$;
      insert into auth.users values('${uid(1)}',now()),('${uid(2)}',now()),('${uid(3)}',now());
      insert into public.profiles values('${uid(1)}','admin',now()),('${uid(2)}','customer',now()),('${uid(3)}','provider',now());
      grant select,update on public.profiles to authenticated;
    `);
    await db.exec(read('0017_tenancy.sql').split('insert into storage.buckets')[0]);
    for(const name of ['0018_media_assets.sql','0019_rbac_hardening.sql','0020_provider_onboarding_guards.sql','0024_business_photos.sql','0025_publish_approved_businesses.sql','0026_business_cover_photos.sql','0027_business_photo_webp_keys.sql','0028_restore_original_business_photo_formats.sql','0029_public_service_visibility.sql','0030_direct_photo_uploads.sql']) await db.exec(read(name));
    // Migration remains rerunnable.
    await db.exec(read('0030_direct_photo_uploads.sql'));
    const as=async(id,role='authenticated')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id??'']);await db.exec(`set role ${role}`);};
    await as(uid(2));
    await db.query("insert into public.provider_applications(id,applicant_id,provider_type,business_name,business_description,selected_services) values($1,$2,'Clinic','Real business','Description',array['Veterinary'])",[uid(10),uid(2)]);
    await as(uid(1));
    const business=(await db.query('select (public.approve_provider_application($1)).*',[uid(10)])).rows[0];
    const service=(await db.query('select id from public.business_services where business_id=$1',[business.id])).rows[0];
    const reserve=(id,kind='business',action='add',photoId=null,size=6*1024*1024)=>db.query('select public.reserve_photo_upload($1,$2,$3,$4,$5,$6,$7,$8,$9) as status',[uid(id),kind,kind==='business'?business.id:service.id,action,photoId,'photo.png','image/png',size,'a'.repeat(64)]);
    const finish=id=>db.query('select public.finish_photo_upload($1)',[uid(id)]);
    await as(uid(2));
    assert.equal((await reserve(100)).rows[0].status,'pending');
    assert.equal((await reserve(100)).rows[0].status,'pending');
    assert.equal((await db.query('select count(*)::int as n from public.media_assets')).rows[0].n,1);
    await assert.rejects(reserve(100,'business','add',null,7*1024*1024),/conflict/);
    await finish(100); await finish(100);
    assert.equal((await db.query('select status,byte_size from public.media_assets where id=$1',[uid(100)])).rows[0].status,'active');
    // Pending replacements coexist with a full gallery, then atomically replace one.
    for(let n=101;n<112;n++){await reserve(n);await finish(n);}
    await reserve(112,'business','replace',uid(100)); await finish(112); await finish(112);
    assert.equal((await db.query("select count(*)::int as n from public.media_assets where status='active'")).rows[0].n,12);
    assert.equal((await db.query('select status from public.media_assets where id=$1',[uid(100)])).rows[0].status,'deleted');
    await reserve(113);await assert.rejects(finish(113),/at most 12/);
    await assert.rejects(reserve(114,'business','add',null,21*1024*1024),/Invalid upload/);
    await assert.rejects(db.query("update public.media_assets set upload_sha256=$1 where id=$2",['b'.repeat(64),uid(112)]),/immutable/);
    // Renewing an expired reservation updates its expiry, so another init cannot expire it.
    await db.query("update public.media_assets set status='failed',upload_expires_at=now()-interval '1 hour' where id=$1",[uid(113)]);
    await reserve(113); await reserve(114);
    assert.equal((await db.query('select status from public.media_assets where id=$1',[uid(113)])).rows[0].status,'pending');
    await db.query('select * from public.cancel_photo_upload($1)',[uid(114)]);
    assert.equal((await db.query('select status from public.media_assets where id=$1',[uid(114)])).rows[0].status,'failed');
    assert.equal((await db.query('select * from public.cancel_photo_upload($1)',[uid(112)])).rows.length,0);
    await reserve(120,'service');await reserve(121,'service');await finish(121);await finish(120);
    await db.query('select public.set_service_photo_order($1,$2)',[service.id,[uid(120),uid(121)]]);
    assert.deepEqual((await db.query("select id from public.media_assets where service_id=$1 order by display_order",[service.id])).rows.map(r=>r.id),[uid(120),uid(121)]);
    await assert.rejects(db.query('select public.set_service_photo_order($1,$2)',[service.id,[uid(112)]]),/access denied/);
    await as(uid(3));
    await assert.rejects(reserve(150),/access denied/);await assert.rejects(finish(113),/not found/);
    await assert.rejects(db.query('select public.set_service_photo_order($1,$2)',[service.id,[uid(120)]]),/access denied/);
    await as(null,'anon'); await assert.rejects(reserve(160),/permission denied/);
    // Clients cannot clear rate counters, and deleting reservations cannot reset them.
    await db.exec('reset role');await db.query('delete from public.photo_upload_quotas where owner_id=$1',[uid(2)]);
    await as(uid(2));await assert.rejects(db.query('delete from public.photo_upload_quotas'),/permission denied/);
    for(let n=200;n<230;n++){await reserve(n,'service');await db.query('delete from public.media_assets where id=$1',[uid(n)]);}
    await assert.rejects(reserve(230,'service'),/rate limit/);
    await db.query("insert into public.media_assets(id,owner_id,service_id,category,visibility,object_key,original_filename,content_type,byte_size,status,upload_sha256,upload_action) values($1,$2,$3,'service_photo','public',$4,'photo.png','image/png',$5,'pending',$6,'add')",[uid(300),uid(2),service.id,`services/${service.id}/service_photo/${uid(300)}-photo.png`,6*1024*1024,'a'.repeat(64)]);
    await assert.rejects(reserve(300,'service'),/rate limit/);
    // The validation quota is independent of upload authorization.
    for(let n=0;n<120;n++)await db.query("select public.consume_photo_upload_quota('validate')");
    await assert.rejects(db.query("select public.consume_photo_upload_quota('validate')"),/rate limit/);
    console.log('Direct upload SQL passed: migration rerun, >4MiB, retry idempotency, full-gallery replacement, ownership/RLS, immutable tickets, renewable expiry, service order, durable upload/validation quotas.');
  } finally {await db.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
