/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file, mocks = {}) {
  const filename = path.resolve(file);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const compiled = { exports: {} };
  const localRequire = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name === 'server-only') return {};
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`, mocks);
    if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), `${name}.ts`), mocks);
    return require(name);
  };
  new Function('require', 'module', 'exports', output)(localRequire, compiled, compiled.exports);
  return compiled.exports;
}
const dates = load('src/features/tenant-calendar/dates.ts');
const schemas = load('src/features/tenant-calendar/schemas.ts');
const bid = '00000000-0000-4000-8000-000000000001';
const eid = '00000000-0000-4000-8000-000000000002';
const instant = (time) => dates.toInstant(`2026-11-20T${time}`);
const event = (id, start, end, status = 'Confirmed') => ({ id, startsAt: instant(start), endsAt: instant(end), status });

test('calendar ranges and datetime inputs use Manila regardless of the machine time zone', () => {
  assert.equal(instant('00:00'), '2026-11-19T16:00:00.000Z');
  assert.equal(dates.manilaDate('2026-11-19T16:30:00Z'), '2026-11-20');
  assert.equal(dates.toLocalInput(instant('09:30')), '2026-11-20T09:30');
  assert.equal(dates.calendarRange('2026-11-20', 'month').days.length, 42);
  assert.equal(dates.calendarRange('2026-11-20', 'week').days[0], '2026-11-16');
  assert.equal(dates.calendarRange('2026-11-20', 'agenda').days.length, 30);
  assert.equal(dates.moveAnchor('2026-01-31', 'month', 1), '2026-02-01');
  assert.equal(dates.addDays('2024-02-28', 1), '2024-02-29');
});
test('all same-day and overnight events remain visible, excluding end-at-midnight from the next day', () => {
  const events = [event('a','09:00','10:00'), event('b','11:00','12:00'), { id:'overnight', startsAt:instant('23:00'), endsAt: dates.toInstant('2026-11-21T01:00') }];
  assert.equal(dates.eventsOnDate(events, '2026-11-20').length, 3);
  assert.equal(dates.eventsOnDate(events, '2026-11-21').length, 1);
  assert.equal(dates.eventsOnDate([{ startsAt:instant('23:00'), endsAt:dates.toInstant('2026-11-21T00:00') }], '2026-11-21').length, 0);
});
test('conflicts detect nested overlaps but exclude cancelled, rejected, completed and adjacent events', () => {
  assert.deepEqual([...dates.conflictIds([event('a','09:00','12:00'),event('b','10:00','11:00'),event('c','11:00','11:30'),event('d','12:00','13:00'),event('e','09:00','13:00','Cancelled'),event('f','09:00','13:00','Completed')])].sort(), ['a','b','c']);
});
const valid = { businessId:bid, title:'Staff meeting', description:'', location:'', type:'meeting', status:'Confirmed', startsAt:instant('09:00'), endsAt:instant('10:00') };
test('Zod rejects invalid ranges, appointment mutations, missing versions and reversed schedules', () => {
  assert.ok(schemas.calendarEventSchema.safeParse(valid).success);
  for (const input of [{...valid,type:'appointment'}, {...valid,id:eid}, {...valid, endsAt:instant('08:00')}, {...valid, title:' '}, {...valid, endsAt:'2027-01-01T00:00:00Z'}]) assert.equal(schemas.calendarEventSchema.safeParse(input).success,false);
  assert.equal(schemas.calendarRangeSchema.safeParse({ businessId:bid, start:instant('09:00'), end:'2027-02-01T00:00:00Z' }).success,false);
});

function fixture({ role='provider', verified=true, user=true, owned=true, allowed=true, stale=false, dbError=null } = {}) {
  const calls=[];
  const client = { rpc: async () => ({ data:allowed, error:null }), from(table) {
    calls.push(['from',table]);
    const query = { select(...args) { calls.push(['select',...args]);return this; }, eq(...args) { calls.push(['eq',...args]);return this; },
      update(payload) { calls.push(['update',payload]);return this; }, insert(payload) { calls.push(['insert',payload]);return this; },
      is(){return this;},in(){return this;},neq(){return this;},lt(){return this;},gt(){return this;},
      async maybeSingle() { return { data: table==='businesses' ? owned ? {id:bid,slug:'clinic'}:null : stale ? null : {id:eid}, error:dbError }; },
      then(resolve) { return Promise.resolve({count:1,error:null}).then(resolve); } };
    return query;
  } };
  const mocks = { 'next/cache':{revalidatePath(){}}, '@/lib/supabase/server-client':{createSupabaseServerClient:async()=>client},
    '@/server/auth/session':{getCurrentProfile:async()=> user ? {user:{id:'owner'},profile:{role}}:null,isEmailVerified:()=>verified} };
  return {calls, actions:load('src/features/tenant-calendar/actions.ts',mocks), server:load('src/features/tenant-calendar/server.ts',mocks)};
}
test('calendar mutations require verified provider ownership and approved-business permissions', async () => {
  for(const options of [{role:'customer'},{role:'admin'},{verified:false},{user:false},{owned:false},{allowed:false}]) {
    const f=fixture(options); const result=await f.actions.saveCalendarEvent(valid);
    assert.equal(result.ok,false); assert.equal(f.calls.some(([name])=>name==='insert'||name==='update'),false);
  }
});
test('custom CRUD scopes by business and version, reports conflicts, and never writes appointments', async () => {
  const f=fixture();
  assert.deepEqual(await f.actions.saveCalendarEvent(valid),{ok:true,conflicts:2});
  assert.equal((await f.actions.saveCalendarEvent({...valid,id:eid,updatedAt:instant('08:00')})).ok,true);
  assert.equal((await f.actions.deleteCalendarEvent({businessId:bid,id:eid,updatedAt:instant('08:00')})).ok,true);
  assert.ok(f.calls.some(([name,column,value])=>name==='eq'&&column==='business_id'&&value===bid));
  assert.ok(f.calls.some(([name,column])=>name==='eq'&&column==='updated_at'));
  assert.ok(f.calls.some(([name,payload])=>name==='update'&&payload.deleted_at));
  const stale=fixture({stale:true}); assert.equal((await stale.actions.saveCalendarEvent({...valid,id:eid,updatedAt:instant('08:00')})).ok,false);
  assert.equal((await stale.actions.deleteCalendarEvent({businessId:bid,id:eid,updatedAt:instant('08:00')})).ok,false);
});
test('missing migrations have actionable errors; empty metadata and real booking status map directly', () => {
  const f=fixture(); assert.match(f.server.calendarFailure({code:'42703'}).error,/0033/);
  const mapped=f.server.mapCalendarEvent({id:eid,service_name:'Grooming',status:'Cancelled',starts_at:instant('09:00'),ends_at:instant('10:00'),updated_at:instant('08:00'),customer_name:'Test customer',booking_reference:'ASP-test',pet_name:'Test pet',duration_estimated:true},true);
  assert.equal(mapped.type,'appointment'); assert.equal(mapped.status,'Cancelled'); assert.equal(mapped.id,`appointment:${eid}`); assert.equal(mapped.durationEstimated,true);
});

test('range queries preserve multiple appointments, exclude other tenants and deleted events, and handle empty results', async () => {
  const tables = {
    businesses: [{id:bid,owner_id:'owner',slug:'clinic'}],
    appointments: [
      {id:'a',business_id:'clinic',service_name:'Bath',starts_at:instant('09:00'),ends_at:instant('10:00'),status:'Confirmed'},
      {id:'b',business_id:'clinic',service_name:'Checkup',starts_at:instant('11:00'),ends_at:instant('12:00'),status:'Cancelled'},
      {id:'private',business_id:'other',starts_at:instant('09:00'),ends_at:instant('10:00')},
      {id:'tomorrow',business_id:'clinic',starts_at:dates.toInstant('2026-11-21T09:00'),ends_at:dates.toInstant('2026-11-21T10:00')},
    ],
    business_calendar_events: [{id:'m',business_id:bid,title:'Meeting',event_type:'meeting',status:'Confirmed',starts_at:instant('13:00'),ends_at:instant('14:00'),deleted_at:null},
      {id:'deleted',business_id:bid,title:'Removed',starts_at:instant('13:00'),ends_at:instant('14:00'),deleted_at:instant('08:00')}],
  };
  let entitled = true;
  const client={async rpc(name, args) {
    assert.equal(name, 'billing_access'); assert.equal(args.p_business, bid);
    return {data: entitled, error:null};
  },from(table){
    let rows=[...(tables[table]??[])]; let head=false;
    const builder={
      select(_columns, options){head=Boolean(options?.head);return this;},
      eq(k,v){rows=rows.filter(r=>r[k]===v);return this;},is(k,v){rows=rows.filter(r=>r[k]===v);return this;},
      lt(k,v){rows=rows.filter(r=>r[k]<v);return this;},gt(k,v){rows=rows.filter(r=>r[k]>v);return this;},gte(k,v){rows=rows.filter(r=>r[k]>=v);return this;},
      order(){return this;},range(a,b){rows=rows.slice(a,b+1);return this;},returns(){return this;},
      async maybeSingle(){return {data:rows[0]??null,error:null};},
      then(resolve){return Promise.resolve({data:head?null:rows,error:null,count:rows.length}).then(resolve);},
    }; return builder;
  }};
  const mocks={'@/lib/supabase/server-client':{createSupabaseServerClient:async()=>client},'@/server/auth/session':{getCurrentProfile:async()=>({user:{id:'owner'},profile:{role:'provider'}}),isEmailVerified:()=>true}};
  const {loadCalendar}=load('src/features/tenant-calendar/server.ts',mocks);
  const range={businessId:bid,...dates.calendarRange('2026-11-20','day'),type:'all',status:'all'};
  let result=await loadCalendar(range);
  assert.deepEqual(result.events.map(e=>e.id),['appointment:a','appointment:b','event:m']);
  assert.equal(result.truncated,false);
  result=await loadCalendar({...range,type:'appointment',status:'Cancelled'});
  assert.deepEqual(result.events.map(e=>e.id),['appointment:b']);
  result=await loadCalendar({...range,...dates.calendarRange('2026-12-01','day')});
  assert.equal(result.events.length,0);
  entitled = false;
  await assert.rejects(loadCalendar(range), /Renew your subscription/);
});
