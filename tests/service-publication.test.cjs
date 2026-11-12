/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(file, mocks = {}) {
  const filename = path.resolve(file);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} };
  const localRequire = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name === 'server-only') return {};
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`, mocks);
    if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), `${name}.ts`), mocks);
    return require(name);
  };
  new Function('require', 'module', 'exports', output)(localRequire, mod, mod.exports);
  return mod.exports;
}
const bid = '00000000-0000-4000-8000-000000000001';
const sid = '00000000-0000-4000-8000-000000000002';
const otherBid = '00000000-0000-4000-8000-000000000003';
const draft = { id: sid, title: 'Grooming', category: 'Grooming', description: 'Full grooming service', price: '500', duration: '60 min', photos: [], status: 'Active' };

function fixture({ current = { user: { id: 'owner', verified: true }, profile: { role: 'provider' } }, businessStatus = 'published', serviceBusiness = bid, description = draft.description, failWrite = false } = {}) {
  const tables = {
    businesses: [{ id: bid, owner_id: 'owner', status: businessStatus }],
    business_services: [{ id: sid, business_id: serviceBusiness, title: draft.title, category: draft.category, description, starting_price: 500, status: 'draft' }],
  };
  const invalidated = [];
  const writes = [];
  const deletedObjects = [];
  const client = { from(table) {
    let rows = tables[table] ?? [];
    let payload;
    let inserting = false;
    const builder = {
      select() { return this; },
      eq(key, value) { rows = rows.filter((r) => r[key] === value); return this; },
      update(value) { payload = value; return this; },
      insert(value) { payload = value; inserting = true; return this; },
      async maybeSingle() { return { data: rows[0] ?? null, error: null }; },
      async single() {
        if (failWrite || (!inserting && rows.length !== 1)) return { data: null, error: { message: 'write rejected' } };
        if (payload) {
          writes.push({ table, payload });
          if (inserting) { rows = [{ id: 'new-row', ...payload }]; tables[table].push(rows[0]); }
          else Object.assign(rows[0], payload);
        }
        return { data: rows[0], error: null };
      },
    };
    return builder;
  } };
  const actions = load('src/features/tenancy/api/actions.ts', {
    'next/cache': { revalidatePath: (...args) => invalidated.push(args) },
    '@/lib/supabase/server-client': { createSupabaseServerClient: async () => client },
    '@/server/auth/session': { getCurrentProfile: async () => current, isEmailVerified: (u) => u.verified },
    '@/lib/r2/client': { deleteR2Object: async (key) => deletedObjects.push(key) },
  });
  return { ...actions, tables, writes, invalidated, deletedObjects };
}

test('publish and pause persist status and refresh public discovery/profile routes', async () => {
  const f = fixture();
  for (const status of ['Active', 'Paused']) {
    assert.equal((await f.setBusinessServiceStatus({ businessId: bid, serviceId: sid, status })).ok, true);
    assert.equal(f.tables.business_services[0].status, status.toLowerCase());
  }
  assert.equal(f.tables.businesses[0].status, 'published');
  assert.ok(f.invalidated.some(([p]) => p === '/'));
  assert.ok(f.invalidated.some(([p, type]) => p === '/business-profile/[slug]' && type === 'page'));
  assert.equal(f.writes.every((w) => w.table === 'business_services'), true);
});

test('pending, draft, rejected and archived businesses cannot self-publish through either action', async () => {
  for (const businessStatus of ['pending', 'draft', 'rejected', 'archived']) {
    const f = fixture({ businessStatus });
    assert.equal((await f.setBusinessServiceStatus({ businessId: bid, serviceId: sid, status: 'Active' })).ok, false);
    assert.equal((await f.saveBusinessService(bid, draft)).ok, false);
    assert.equal(f.writes.length, 0);
  }
});

test('signed-out, unverified, customer and other-owner status changes are rejected', async () => {
  for (const current of [null, { user: { id: 'owner' }, profile: { role: 'provider' } }, { user: { id: 'owner', verified: true }, profile: { role: 'customer' } }, { user: { id: 'stranger', verified: true }, profile: { role: 'provider' } }]) {
    const f = fixture({ current });
    assert.equal((await f.setBusinessServiceStatus({ businessId: bid, serviceId: sid, status: 'Active' })).ok, false);
    assert.equal(f.writes.length, 0);
  }
});

test('service IDs cannot be used to update or move another business service', async () => {
  const f = fixture({ serviceBusiness: otherBid });
  assert.equal((await f.setBusinessServiceStatus({ businessId: bid, serviceId: sid, status: 'Active' })).ok, false);
  assert.equal((await f.saveBusinessService(bid, draft)).ok, false);
  assert.equal(f.tables.business_services[0].business_id, otherBid);
  assert.equal(f.writes.length, 0);
});

test('incomplete services require editing before publication, but can still be paused', async () => {
  const f = fixture({ description: '' });
  assert.equal((await f.setBusinessServiceStatus({ businessId: bid, serviceId: sid, status: 'Active' })).ok, false);
  assert.equal((await f.setBusinessServiceStatus({ businessId: bid, serviceId: sid, status: 'Paused' })).ok, true);
});

test('failed writes do not report success or invalidate public pages', async () => {
  const f = fixture({ failWrite: true });
  assert.equal((await f.setBusinessServiceStatus({ businessId: bid, serviceId: sid, status: 'Active' })).ok, false);
  assert.equal(f.tables.business_services[0].status, 'draft');
  assert.equal(f.invalidated.length, 0);
});

test('editing an existing service keeps its ID and does not create a duplicate', async () => {
  const f = fixture();
  assert.equal((await f.saveBusinessService(bid, { ...draft, title: 'Updated grooming' })).ok, true);
  assert.equal(f.tables.business_services.length, 1);
  assert.equal(f.tables.business_services[0].id, sid);
  assert.equal(f.tables.business_services[0].title, 'Updated grooming');
});

test('invalid IDs or unsupported statuses are rejected before writes', async () => {
  const f = fixture();
  for (const input of [{ businessId: 'bad', serviceId: sid, status: 'Active' }, { businessId: bid, serviceId: sid, status: 'approved' }]) {
    assert.equal((await f.setBusinessServiceStatus(input)).ok, false);
  }
  assert.equal(f.writes.length, 0);
});

test('service deletion checks ownership before touching public R2 objects', async () => {
  for (const options of [{ serviceBusiness: otherBid }, { current: { user: { id: 'stranger', verified: true }, profile: { role: 'provider' } } }]) {
    const f = fixture(options);
    assert.equal((await f.deleteBusinessService(bid, sid)).ok, false);
    assert.equal(f.deletedObjects.length, 0);
  }
});
