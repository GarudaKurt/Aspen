/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Execute the real component handlers with a minimal hook/JSX harness. No
// network or React internals: persisted actions and upload failures are injected.
function fixture({ failPhoto = '', failPublish = false, canManage = true } = {}) {
  const slots = []; let cursor = 0;
  const calls = []; let failingPhoto = failPhoto;
  const jsx = (type, props) => ({ type, props });
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], (next) => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }];
    },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useMemo(fn) { return fn(); },
  };
  const mocks = {
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    '@/features/tenancy/api/actions': {
      saveBusinessService: async (businessId, data) => { calls.push(['save', data]); return { ok: true, id: data.id ?? 'saved-service' }; },
      saveServicePhotoOrder: async (id, ids) => { calls.push(['order', ids]); return { ok: true, id }; },
      deleteServiceMedia: async (id, ids) => { calls.push(['deletePhotos', ids]); return { ok: true, id }; },
      setBusinessServiceStatus: async (data) => { calls.push(['publish', data]); return failPublish ? { ok: false, error: 'Business restricted.' } : { ok: true, id: data.serviceId }; },
    },
    '@/features/business-photos/upload-client': {
      uploadServicePhoto: async (file, id, onProgress, uploadId) => {
        calls.push(['upload', file.name, uploadId]);
        if (file.name === failingPhoto) throw new Error('Storage disconnected');
        onProgress(100);
        return { id: `asset-${file.name}`, url: `https://images.example/${file.name}` };
      },
      cancelPhotoUpload: async () => {},
    },
  };
  function load(file) {
    const filename = path.resolve(file);
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const mod = { exports: {} };
    const localRequire = (name) => {
      if (mocks[name]) return mocks[name];
      if (name.startsWith('@/components/') || name.startsWith('./service-')) {
        return new Proxy({}, { get: (_, key) => key });
      }
      if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`);
      if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), `${name}.ts`));
      return require(name);
    };
    new Function('require','module','exports',output)(localRequire,mod,mod.exports);
    return mod.exports;
  }
  const { ServicesView } = load('src/features/tenant-dashboard/components/services-view.tsx');
  const render = () => { cursor = 0; return ServicesView({ initialServices: [], businessId: 'business', canManage }); };
  function find(node, type) {
    if (!node || typeof node !== 'object') return null;
    if (node.type === type) return node.props;
    for (const child of [node.props?.children].flat(Infinity)) {
      const result = find(child, type); if (result) return result;
    }
    return null;
  }
  const form = () => find(render(), 'ServiceFormSheet');
  return { calls, form, render, find, recover: () => { failingPhoto = ''; } };
}
const draft = (status = 'Active') => ({ title: 'Grooming', category: 'Grooming', description: 'Full groom', price: '500', duration: '60 min', status,
  photos: ['blob:a','blob:b'], photoAssetIds: [null,null], photoFilePreviews: ['blob:a','blob:b'], photoFiles: [{ name: 'a.png' },{ name: 'b.png' }] });

test('Publish saves a private draft, uploads and orders photos, then publishes', async () => {
  const f = fixture();
  await f.form().onSave(draft());
  assert.equal(f.calls[0][0], 'save');
  assert.equal(f.calls[0][1].status, 'Draft');
  assert.equal(f.calls.at(-1)[0], 'publish');
  assert.deepEqual(f.calls.find(([kind]) => kind === 'order')[1], ['asset-a.png','asset-b.png']);
  assert.equal(f.form().saveError, '');
});

test('partial photo failures remain private; retry reuses the service and skips completed photos', async () => {
  const f = fixture({ failPhoto: 'b.png' });
  await f.form().onSave(draft());
  assert.equal(f.calls.some(([kind]) => kind === 'publish'), false);
  assert.match(f.form().saveError, /still need uploading/);
  const previousId = f.calls.find(([kind, name]) => kind === 'upload' && name === 'b.png')[2];
  f.recover();
  await f.form().onSave(draft(), 'blob:b');
  assert.equal(f.calls.filter(([kind, name]) => kind === 'upload' && name === 'a.png').length, 1);
  assert.equal(f.calls.filter(([kind, name]) => kind === 'upload' && name === 'b.png')[1][2], previousId);
  assert.equal(f.calls.filter(([kind]) => kind === 'save')[1][1].id, 'saved-service');
  assert.equal(f.calls.at(-1)[0], 'publish');
});

test('saving a draft and previewing never publish; denied publication keeps a saved draft', async () => {
  const f = fixture();
  f.form().onPreview(draft('Draft'));
  assert.deepEqual(f.find(f.render(), 'ServicePreviewSheet').service.photos, ['blob:a','blob:b']);
  assert.equal(f.calls.length, 0);
  await f.form().onSave(draft('Draft'));
  assert.equal(f.calls.some(([kind]) => kind === 'publish'), false);
  const denied = fixture({ failPublish: true });
  await denied.form().onSave(draft());
  assert.equal(denied.form().saveError, 'Business restricted.');
  assert.equal(denied.calls[0][1].status, 'Draft');
});

test('unapproved frontend cannot initiate saving through the form handler', async () => {
  const f = fixture({ canManage: false });
  await f.form().onSave(draft());
  assert.equal(f.calls.length, 0);
});
