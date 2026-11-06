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
  const loadedModule = { exports: {} };
  const localRequire = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name === 'server-only') return {};
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`, mocks);
    if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), `${name}.ts`), mocks);
    return require(name);
  };
  new Function('require', 'module', 'exports', output)(localRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

function database(tables = {}) {
  return { from(table) {
    let rows = [...(tables[table] ?? [])];
    const builder = {
      select() { return this; }, order() { return this; }, limit(n) { rows = rows.slice(0, n); return this; },
      eq(key, value) { rows = rows.filter((row) => row[key] === value); return this; }, gte() { return this; },
      in(key, values) { rows = rows.filter((row) => values.includes(row[key])); return this; },
      async maybeSingle() { return { data: rows[0] ?? null, error: null }; },
      async single() { return { data: rows[0] ?? null, error: null }; },
      then(resolve) { return Promise.resolve({ data: rows, count: rows.length, error: null }).then(resolve); },
    };
    return builder;
  } };
}

const bid = '12345678-1234-4234-8234-123456789012';
const serviceId = '32345678-1234-4234-8234-123456789012';
const photoId = '22345678-1234-4234-8234-123456789012';
const photo = { id: photoId, name: 'cover.png', url: `/api/business-photos/${photoId}`, isCover: true };
const png = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'photo.png', { type: 'image/png' });

function request(action = 'add', file = png, extra = {}) {
  const form = new FormData(); form.set('businessId', bid); form.set('action', action);
  if (!['add','add_cover'].includes(action)) form.set('photoId', photoId);
  if (file) form.set('file', file);
  return new Request('https://aspen.test/api/business-photos', { method: 'POST', body: form, headers: { origin: 'https://aspen.test', ...extra } });
}

function routeFixture({ authorized = true, photos = [], rpcError = null, validationError = null, recentUploadCount = 0 } = {}) {
  const writes = []; const deletes = []; const calls = [];
  class ValidationError extends Error {}
  const supabase = database({
    businesses: [{ id: bid, cover_photo_path: null }],
    media_assets: Array.from({ length: recentUploadCount }, () => ({ owner_id: 'owner' })),
  });
  supabase.rpc = async (name, input) => { calls.push({ name, input }); return { data: null, error: rpcError }; };
  const route = load('src/app/api/business-photos/route.ts', {
    'next/cache': { revalidatePath() {} },
    '@/lib/r2/client': { putR2Photo: async (...args) => writes.push(args), deleteR2Object: async (key) => deletes.push(key) },
    '@/features/business-photos/validate': {
      BusinessPhotoValidationError: ValidationError,
      validateBusinessImageUpload: async (_bytes, filename, contentType) => {
        if (validationError) throw new ValidationError(validationError);
        return { contentType, extension: contentType === 'image/png' ? '.png' : contentType === 'image/jpeg' ? '.jpg' : '.webp', filename };
      },
    },
    '@/features/business-photos/server': {
      ownedPhotoBusiness: async () => authorized ? { supabase, business: { id: bid, slug: 'actual-business', cover_photo_path: null }, ownerId: 'owner' } : null,
      businessPhotos: async () => photos,
    },
  });
  return { ...route, writes, deletes, calls };
}

function serviceRequest(file = png, extra = {}) {
  const form = new FormData(); form.set('serviceId', serviceId); if (file) form.set('file', file);
  return new Request('https://aspen.test/api/service-photos', { method: 'POST', body: form, headers: { origin: 'https://aspen.test', ...extra } });
}

function serviceRouteFixture({ authorized = true } = {}) {
  const writes = []; const deletes = []; let inserted;
  const supabase = { from(table) {
    if (table === 'business_services') return {
      select() { return this; }, eq() { return this; }, async maybeSingle() {
        return { data: authorized ? { id: serviceId, businesses: { slug: 'actual-business' } } : null, error: null };
      },
    };
    return {
      select(_columns, options) { this.countMode = Boolean(options?.head); return this; }, eq() { return this; }, gte() { return this; },
      insert(row) { inserted = row; return this; }, async single() { return { data: inserted, error: null }; },
      then(resolve) { return Promise.resolve({ data: null, count: 0, error: null }).then(resolve); },
    };
  } };
  const route = load('src/app/api/service-photos/route.ts', {
    'next/cache': { revalidatePath() {} },
    '@/lib/r2/client': { putR2Photo: async (...args) => writes.push(args), deleteR2Object: async (key) => deletes.push(key), getR2PublicUrl: () => undefined, createR2DownloadUrl: async () => 'https://r2.test/photo' },
    '@/features/business-photos/validate': { BusinessPhotoValidationError: class ValidationError extends Error {}, validateBusinessImageUpload: async (_bytes, filename, contentType) => ({ contentType, extension: contentType === 'image/png' ? '.png' : contentType === 'image/jpeg' ? '.jpg' : '.webp', filename }) },
    '@/server/auth/session': { getCurrentProfile: async () => authorized ? { user: { id: 'owner', email_confirmed_at: 'yes' }, profile: { role: 'provider' } } : null },
    '@/lib/supabase/server-client': { createSupabaseServerClient: async () => supabase },
  });
  return { ...route, writes, deletes, get inserted() { return inserted; } };
}

test('photo validation rejects unsupported, empty and oversized files', () => {
  const { validateBusinessPhoto, MAX_PHOTO_BYTES } = load('src/features/business-photos/types.ts');
  assert.equal(validateBusinessPhoto({ type: 'image/webp', size: MAX_PHOTO_BYTES }), null);
  for (const file of [{ type: 'image/svg+xml', size: 10 }, { type: 'image/png', size: 0 }, { type: 'image/jpeg', size: MAX_PHOTO_BYTES + 1 }]) assert.ok(validateBusinessPhoto(file));
});

test('unverified users, customers and other providers cannot manage a business', async () => {
  for (const current of [null, { user: { id: 'owner' }, profile: { role: 'provider' } }, { user: { id: 'owner', email_confirmed_at: 'yes' }, profile: { role: 'customer' } }, { user: { id: 'other', email_confirmed_at: 'yes' }, profile: { role: 'provider' } }]) {
    const { ownedPhotoBusiness } = load('src/features/business-photos/server.ts', {
      '@/server/auth/session': { getCurrentProfile: async () => current },
      '@/lib/supabase/server-client': { createSupabaseServerClient: async () => database({ businesses: [{ id: bid, owner_id: 'owner' }] }) },
    });
    assert.equal(await ownedPhotoBusiness(bid), null);
  }
});

test('verified business owner is authorized', async () => {
  const { ownedPhotoBusiness } = load('src/features/business-photos/server.ts', {
    '@/server/auth/session': { getCurrentProfile: async () => ({ user: { id: 'owner', email_confirmed_at: 'yes' }, profile: { role: 'provider' } }) },
    '@/lib/supabase/server-client': { createSupabaseServerClient: async () => database({ businesses: [{ id: bid, owner_id: 'owner' }] }) },
  });
  assert.equal((await ownedPhotoBusiness(bid)).business.id, bid);
});

test('cross-origin and unauthorized mutations never reach storage', async () => {
  const route = routeFixture({ authorized: false });
  assert.equal((await route.POST(request('add', png, { origin: 'https://evil.test' }))).status, 403);
  assert.equal((await route.POST(request())).status, 403);
  assert.equal(route.writes.length, 0); assert.equal(route.calls.length, 0);
});

test('spoofed MIME and oversized requests never reach storage', async () => {
  const route = routeFixture();
  const spoof = new File(['<script>bad</script>'], 'fake.png', { type: 'image/png' });
  assert.equal((await route.POST(request('add', spoof))).status, 400);
  assert.equal((await route.POST(request('add', png, { 'content-length': '9999999' }))).status, 413);
  assert.equal(route.writes.length, 0);
});

test('upload rate limits prevent abusive business uploads before R2 storage', async () => {
  const route = routeFixture({ recentUploadCount: 30 });
  assert.equal((await route.POST(request())).status, 429);
  assert.equal(route.writes.length, 0);
  assert.equal(route.calls.length, 0);
});

test('unknown replacement cannot write storage or metadata', async () => {
  const route = routeFixture();
  assert.equal((await route.POST(request('replace'))).status, 404);
  assert.equal(route.writes.length, 0);
});

test('full gallery blocks additions while allowing replacement', async () => {
  const route = routeFixture({ photos: Array.from({ length: 12 }, () => photo) });
  assert.equal((await route.POST(request())).status, 400);
  assert.equal((await route.POST(request('replace'))).status, 200);
  assert.equal(route.writes.length, 1);
  assert.equal(route.calls[0].input.p_photo_id, photoId);
});

test('validated uploads preserve the source bytes, type, and server-generated business key', async () => {
  const route = routeFixture();
  assert.equal((await route.POST(request())).status, 200);
  assert.match(route.writes[0][0], new RegExp(`^businesses/${bid}/business_gallery/[a-f0-9-]+-photo\\.png$`));
  assert.equal(route.writes[0][2], 'image/png');
  assert.deepEqual([...route.writes[0][1]], [...new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])]);
  assert.equal(route.calls[0].name, 'manage_business_photo');
  assert.equal(route.calls[0].input.p_business_id, bid);
  assert.equal(route.calls[0].input.p_content_type, 'image/png');
  assert.equal(route.calls[0].input.p_filename, 'photo.png');
  assert.equal(route.calls[0].input.p_byte_size, 8);
});

test('server-side image validation failures never write R2 or photo metadata', async () => {
  const route = routeFixture({ validationError: 'Invalid image' });
  assert.equal((await route.POST(request())).status, 400);
  assert.equal(route.writes.length, 0);
  assert.equal(route.calls.length, 0);
});

test('service photos use the same server-side original-format validation path', async () => {
  const route = serviceRouteFixture();
  const response = await route.POST(serviceRequest());
  assert.equal(response.status, 200);
  assert.match(route.writes[0][0], new RegExp(`^services/${serviceId}/service_photo/[a-f0-9-]+-photo\\.png$`));
  assert.equal(route.writes[0][2], 'image/png');
  assert.equal(route.inserted.content_type, 'image/png');
  assert.equal(route.inserted.original_filename, 'photo.png');
  assert.equal(route.inserted.byte_size, 8);
});

test('service photo uploads reject spoofed files and unauthorized providers before storage', async () => {
  const spoof = new File(['<script>bad</script>'], 'fake.png', { type: 'image/png' });
  const invalid = serviceRouteFixture();
  assert.equal((await invalid.POST(serviceRequest(spoof))).status, 400);
  assert.equal(invalid.writes.length, 0);
  const denied = serviceRouteFixture({ authorized: false });
  assert.equal((await denied.POST(serviceRequest())).status, 403);
  assert.equal(denied.writes.length, 0);
});

test('image validation decodes a real image without changing its bytes or format', async () => {
  const sharp = require('sharp');
  const source = await sharp({ create: { width: 3000, height: 1200, channels: 3, background: '#3c6355' } })
    .jpeg({ quality: 95 }).withMetadata({ exif: { IFD0: { Copyright: 'private' } } }).toBuffer();
  const { validateBusinessImageUpload } = load('src/features/business-photos/validate.ts');
  const output = await validateBusinessImageUpload(new Uint8Array(source), 'Paw Spot.JPG', 'image/jpeg');
  assert.equal(output.contentType, 'image/jpeg');
  assert.equal(output.extension, '.jpg');
  assert.equal(output.filename, 'Paw Spot.jpg');
  await assert.rejects(validateBusinessImageUpload(new Uint8Array([0xff, 0xd8, 0xff]), 'bad.jpg', 'image/jpeg'), /corrupted/);
});

test('cover selection does not upload or delete existing photos', async () => {
  const route = routeFixture({ photos: [photo] });
  assert.equal((await route.POST(request('cover', null))).status, 200);
  assert.equal(route.writes.length, 0); assert.equal(route.deletes.length, 0);
  assert.equal(route.calls[0].input.p_action, 'cover');
});

test('failed metadata transaction cleans new object but uncertain commit retains it', async () => {
  const rejected = routeFixture({ rpcError: { code: 'P0001' } });
  assert.equal((await rejected.POST(request())).status, 503);
  assert.equal(rejected.deletes.length, 1);
  const uncertain = routeFixture({ rpcError: { code: '' } });
  assert.equal((await uncertain.POST(request())).status, 503);
  assert.equal(uncertain.deletes.length, 0);
});

test('public cards exclude unpublished businesses and private, deleted or unrelated photos', async () => {
  const tables = {
    businesses: [
      { id: bid, slug: 'real-business', name: 'Registered business', status: 'published', provider_type: 'Clinic', cover_photo_path: 'cover-key', business_locations: [{ street_address: 'Actual street', city_municipality: 'Actual city' }], business_services: [{ category: 'Grooming', status: 'active', starting_price: 250 }, { category: 'Hidden draft', status: 'draft', starting_price: 1 }] },
      { id: 'unapproved', status: 'pending' }, { id: 'rejected', status: 'rejected' }, { id: 'archived', status: 'archived' },
    ],
    media_assets: [
      { id: 'gallery', business_id: bid, object_key: 'gallery-key', category: 'business_gallery', status: 'active', visibility: 'public' },
      { id: 'cover', business_id: bid, object_key: 'cover-key', category: 'business_gallery', status: 'active', visibility: 'public' },
      { id: 'private', business_id: bid, category: 'business_gallery', status: 'active', visibility: 'private' },
      { id: 'deleted', business_id: bid, category: 'business_gallery', status: 'deleted', visibility: 'public' },
      { id: 'foreign', business_id: 'other', category: 'business_gallery', status: 'active', visibility: 'public' },
    ],
  };
  const { getPublishedBusinessCards } = load('src/features/tenancy/api/queries.ts', {
    '@/lib/supabase/server-client': { createSupabaseServerClient: async () => database(tables) },
    '@/lib/r2/client': {}, '@/server/auth/guard': {}, '@/server/auth/session': {},
  });
  const cards = await getPublishedBusinessCards();
  assert.equal(cards.length, 1); assert.equal(cards[0].slug, 'real-business');
  assert.equal(cards[0].rating, ''); assert.equal(cards[0].services, 'Grooming');
  assert.equal(cards[0].priceStarts, '₱250');
  assert.deepEqual(cards[0].images.map((photo) => photo.src), ['/api/business-photos/cover', '/api/business-photos/gallery']);
});

test('empty public database returns no mock businesses; query failures propagate', async () => {
  const mocks = { '@/lib/r2/client': {}, '@/server/auth/guard': {}, '@/server/auth/session': {} };
  const empty = load('src/features/tenancy/api/queries.ts', { ...mocks, '@/lib/supabase/server-client': { createSupabaseServerClient: async () => database() } });
  assert.deepEqual(await empty.getPublishedBusinessCards(), []);
  const failure = database(); failure.from = () => ({ select() { return this; }, eq() { return this; }, async order() { return { data: null, error: { code: 'failure' } }; } });
  const failed = load('src/features/tenancy/api/queries.ts', { ...mocks, '@/lib/supabase/server-client': { createSupabaseServerClient: async () => failure } });
  await assert.rejects(failed.getPublishedBusinessCards(), /Unable to load businesses/);
});

test('image endpoint refuses private documents and missing photos', async () => {
  let signed = false;
  const { GET } = load('src/app/api/business-photos/[id]/route.ts', {
    '@/lib/supabase/server-client': { createSupabaseServerClient: async () => database({ media_assets: [{ id: photoId, category: 'identity_document', status: 'active', visibility: 'private' }] }) },
    '@/lib/r2/client': { createR2DownloadUrl: async () => { signed = true; return 'https://r2.test'; } },
  });
  assert.equal((await GET(new Request('https://aspen.test'), { params: Promise.resolve({ id: photoId }) })).status, 404);
  assert.equal(signed, false);
});

test('image endpoint resolves WebP objects uploaded before the metadata-key migration', async () => {
  const heads = [];
  const { GET } = load('src/app/api/business-photos/[id]/route.ts', {
    '@/lib/supabase/server-client': { createSupabaseServerClient: async () => database({
      media_assets: [{ id: photoId, object_key: 'businesses/example/business_gallery/legacy-photo', content_type: 'image/webp', category: 'business_gallery', status: 'active', visibility: 'public' }],
    }) },
    '@/lib/r2/client': {
      headR2Object: async (key) => { heads.push(key); if (key.endsWith('.webp')) return {}; throw new Error('Not found'); },
      createR2DownloadUrl: async (key) => `https://r2.test/${key}`,
    },
  });
  const response = await GET(new Request('https://aspen.test'), { params: Promise.resolve({ id: photoId }) });
  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), 'https://r2.test/businesses/example/business_gallery/legacy-photo.webp');
  assert.deepEqual(heads, ['businesses/example/business_gallery/legacy-photo', 'businesses/example/business_gallery/legacy-photo.webp']);
});

test('business hours save by weekday name rather than array position', async () => {
  let rows;
  const { saveBusinessHours } = load('src/features/tenancy/api/actions.ts', {
    'next/cache': { revalidatePath() {} }, '@/lib/r2/client': {},
    '@/server/auth/session': { getCurrentProfile: async () => ({ user: { id: 'owner' }, profile: { role: 'provider' } }) },
    '@/lib/supabase/server-client': { createSupabaseServerClient: async () => ({ from: () => ({ upsert: async (value) => { rows = value; return { error: null }; } }) }) },
  });
  const hours = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((day) => ({ day, open: true, openTime: '08:00', closeTime: '17:00' }));
  assert.equal((await saveBusinessHours(bid, { hours })).ok, true);
  assert.deepEqual(rows.map((row) => row.day_of_week), [1,2,3,4,5,6,0]);
  assert.equal((await saveBusinessHours(bid, { hours: Array(7).fill(hours[0]) })).ok, false);
});


test('dedicated cover upload, replacement at capacity, and removal use authorized metadata actions', async () => {
  const add = routeFixture();
  assert.equal((await add.POST(request('add_cover'))).status, 200);
  assert.equal(add.calls[0].input.p_action, 'add_cover');
  const replace = routeFixture({ photos: Array.from({length:12}, () => photo) });
  assert.equal((await replace.POST(request('replace_cover'))).status, 200);
  assert.equal(replace.calls[0].input.p_action, 'replace_cover');
  const remove = routeFixture({photos:[photo]});
  assert.equal((await remove.POST(request('remove_cover',null))).status, 200);
  assert.equal(remove.calls[0].input.p_action, 'remove_cover');
  assert.equal(remove.writes.length, 0);
});

test('stale cover edits and unauthorized cover actions cannot upload bytes', async () => {
  const stale = routeFixture({photos:[{...photo,isCover:false}]});
  for (const action of ['replace_cover','remove_cover']) assert.equal((await stale.POST(request(action))).status,409);
  assert.equal(stale.writes.length,0);
  const existing = routeFixture({photos:[photo]});
  assert.equal((await existing.POST(request('add_cover'))).status,409);
  assert.equal(existing.writes.length,0);
  const denied = routeFixture({authorized:false});
  for (const action of ['add_cover','replace_cover','remove_cover']) assert.equal((await denied.POST(request(action))).status,403);
  assert.equal(denied.writes.length,0);
});

test('explicitly cleared cover does not use a remaining gallery image on cards', async () => {
  const { getPublishedBusinessCards } = load('src/features/tenancy/api/queries.ts', {
    '@/lib/supabase/server-client': { createSupabaseServerClient: async () => database({
      businesses:[{id:bid,slug:'real',name:'Real business',status:'published',provider_type:'Clinic',cover_photo_path:null,business_services:[]}],
      media_assets:[{id:photoId,business_id:bid,object_key:'remaining',status:'active',visibility:'public',category:'business_gallery'}],
    }) }, '@/lib/r2/client': {}, '@/server/auth/guard': {}, '@/server/auth/session': {},
  });
  assert.deepEqual((await getPublishedBusinessCards())[0].images,[]);
});
