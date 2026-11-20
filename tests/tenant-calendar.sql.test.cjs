/* eslint-disable @typescript-eslint/no-require-imports */
// Isolated PostgreSQL execution; never writes to a hosted Supabase project.
const assert = require('node:assert/strict');
const fs = require('node:fs');
if (!process.env.PGLITE_MODULE) {
  console.log('SQL calendar checks skipped: set PGLITE_MODULE to a temporary PGlite installation.');
  process.exit(0);
}
const { PGlite } = require(process.env.PGLITE_MODULE);
const read = (file) => fs.readFileSync(`supabase/migrations/${file}`, 'utf8');
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
(async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key, email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('email','fixture@example.test')$$;
      grant usage on schema auth, public to anon,authenticated;
      grant execute on all functions in schema auth to anon,authenticated;
      create table public.profiles(id uuid primary key references auth.users, role text, updated_at timestamptz);
      create function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.profiles where id=auth.uid() and role='admin')$$;
      create function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end$$;
      insert into auth.users values ('${uid(1)}',now()),('${uid(2)}',now()),('${uid(3)}',now()),('${uid(4)}',now());
      insert into public.profiles values ('${uid(1)}','admin',now()),('${uid(2)}','customer',now()),('${uid(3)}','customer',now()),('${uid(4)}','customer',now());
      grant select on public.profiles to authenticated;
    `);
    await db.exec(read('0016_appointments.sql'));
    const tenancy = read('0017_tenancy.sql');
    await db.exec(tenancy.split('insert into storage.buckets')[0]);
    await db.exec(tenancy.slice(tenancy.indexOf('-- Keep existing appointment records compatible')));
    for(const file of ['0018_media_assets.sql','0019_rbac_hardening.sql','0020_provider_onboarding_guards.sql','0024_business_photos.sql','0025_publish_approved_businesses.sql','0026_business_cover_photos.sql','0027_business_photo_webp_keys.sql','0028_restore_original_business_photo_formats.sql','0029_public_service_visibility.sql','0030_direct_photo_uploads.sql','0031_approved_provider_service_management.sql','0032_photo_optimization.sql']) await db.exec(read(file));
    const as = async (id, role='authenticated') => {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id ?? '']);
      await db.exec(`set role ${role}`);
    };
    const businesses=[];
    for(const id of [2,3]) {
      await as(uid(id));
      await db.query("insert into public.provider_applications(id,applicant_id,provider_type,business_name,business_description,selected_services) values($1,$2,'Clinic',$3,'Description',array['Veterinary'])",[uid(id+10),uid(id),`Clinic ${id}`]);
      await as(uid(1));
      businesses.push((await db.query('select (public.approve_provider_application($1)).*',[uid(id+10)])).rows[0]);
    }
    const business = businesses[0];
    await as(uid(2));
    await db.query("insert into public.business_services(id,business_id,title,category,duration_minutes,status) values($1,$2,'Grooming','Grooming',90,'draft'),($3,$2,'Checkup','Veterinary',30,'draft')",[uid(20),business.id,uid(21)]);
    // A pre-migration appointment must be backfilled from the same record.
    await as(uid(4));
    const insert = `insert into public.appointments(id,customer_id,business_id,business_name,service_id,service_name,customer_name,customer_email,customer_phone,pet_name,pet_type,appointment_date,appointment_time)
      values($1,$2,$3,'Clinic',$4,'Grooming','Customer','test@example.test','123','Pet','Dog','2026-11-20',$5) returning *`;
    await db.query(insert,[uid(30),uid(4),business.slug,`${uid(20)},${uid(21)}`,'11:30 PM']);
    await db.query(insert,[uid(31),uid(4),business.slug,'unknown-service','not a time']);
    await db.exec('reset role');
    await db.exec(read('0033_tenant_calendar.sql'));
    await db.exec(read('0033_tenant_calendar.sql'));
    await as(uid(2));
    let booking=(await db.query('select * from public.appointments where id=$1',[uid(30)])).rows[0];
    assert.equal(new Date(booking.starts_at).toISOString(),'2026-11-20T15:30:00.000Z');
    assert.equal(new Date(booking.ends_at).toISOString(),'2026-11-20T17:30:00.000Z');
    assert.equal(booking.duration_minutes,120); assert.equal(booking.duration_estimated,false); assert.equal(booking.business_uuid,business.id);
    assert.equal((await db.query('select starts_at from public.appointments where id=$1',[uid(31)])).rows[0].starts_at,null);
    // Service changes must not silently alter already-booked durations.
    await db.query('update public.business_services set duration_minutes=45 where id=$1',[uid(20)]);
    await db.query("update public.appointments set appointment_date='2026-11-21',appointment_time='9:00 AM',status='Confirmed',duration_minutes=1,starts_at=now() where id=$1",[uid(30)]);
    booking=(await db.query('select * from public.appointments where id=$1',[uid(30)])).rows[0];
    assert.equal(new Date(booking.starts_at).toISOString(),'2026-11-21T01:00:00.000Z');
    assert.equal(booking.duration_minutes,120); assert.equal(booking.status,'Confirmed');
    await as(uid(4));
    await db.query('select public.cancel_my_appointment($1)',[uid(30)]);
    assert.equal((await db.query('select status from public.appointments where id=$1',[uid(30)])).rows[0].status,'Cancelled');
    // A fresh customer booking is normalized without duplicating it in calendar_events.
    const fresh=(await db.query(insert,[uid(32),uid(4),business.slug,uid(20),'9:00 AM'])).rows[0];
    assert.equal(fresh.business_uuid,business.id); assert.equal(fresh.duration_minutes,45);
    assert.equal(new Date(fresh.starts_at).toISOString(),'2026-11-20T01:00:00.000Z');
    await as(uid(3));
    assert.equal((await db.query('select id from public.appointments')).rows.length,0);
    await as(uid(2));
    assert.equal((await db.query("update public.appointments set status='Confirmed' where id=$1 and business_id=$2 and status='Pending' returning id",[uid(30),business.slug])).rows.length,0);
    const custom = `insert into public.business_calendar_events(id,business_id,title,event_type,starts_at,ends_at)
      values($1,$2,'Staff meeting','meeting','2026-11-20T01:00:00Z','2026-11-20T02:00:00Z') returning *`;
    let meeting=(await db.query(custom,[uid(40),business.id])).rows[0];
    assert.equal(meeting.created_by,uid(2));
    const originalVersion=meeting.updated_at;
    await db.query("update public.business_calendar_events set title='Rescheduled',starts_at='2026-11-20T02:00Z',ends_at='2026-11-20T03:00Z' where id=$1",[uid(40)]);
    assert.equal((await db.query('update public.business_calendar_events set title=$1 where id=$2 and updated_at=$3 returning id',['Stale edit',uid(40),originalVersion])).rows.length,0);
    await assert.rejects(db.query('update public.business_calendar_events set business_id=$1 where id=$2',[businesses[1].id,uid(40)]));
    await assert.rejects(db.query("update public.business_calendar_events set ends_at=starts_at where id=$1",[uid(40)]));
    await assert.rejects(db.query("update public.business_calendar_events set ends_at=starts_at+interval '8 days' where id=$1",[uid(40)]));
    await as(uid(3));
    assert.equal((await db.query('select id from public.business_calendar_events')).rows.length,0);
    assert.equal((await db.query("update public.business_calendar_events set title='Unauthorized' where id=$1 returning id",[uid(40)])).rows.length,0);
    await assert.rejects(db.query(custom,[uid(41),business.id]));
    await as(uid(4));
    await assert.rejects(db.query(custom,[uid(42),business.id]));
    await as(null,'anon');
    await assert.rejects(db.query('select * from public.business_calendar_events'));
    await as(uid(2));
    await db.query('update public.business_calendar_events set deleted_at=now() where id=$1',[uid(40)]);
    assert.equal((await db.query('select id from public.business_calendar_events where deleted_at is null')).rows.length,0);
    await assert.rejects(db.query('update public.business_calendar_events set deleted_at=null where id=$1',[uid(40)]));
    await assert.rejects(db.query('delete from public.business_calendar_events where id=$1',[uid(40)]));
    assert.equal((await db.query('select id from public.appointments')).rows.length,3);
    await as(uid(1));
    await db.query("update public.businesses set status='archived' where id=$1",[business.id]);
    await as(uid(2));
    await assert.rejects(db.query(custom,[uid(43),business.id]));
    console.log('Calendar PostgreSQL checks passed: migration rerun, backfill, durations, Manila rescheduling, cancellation, CRUD, optimistic concurrency, ownership, RLS, suspension, soft delete.');
  } finally { await db.close(); }
})().catch((error)=>{console.error(error);process.exitCode=1;});
