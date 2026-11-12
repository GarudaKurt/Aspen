/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');
const sharp = require('sharp');
function load(filename, mocks = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  new Function('require', 'module', 'exports', code)((name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name === 'server-only') return {};
    if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`, mocks);
    if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), `${name}.ts`), mocks);
    return require(name);
  }, module, module.exports);
  return module.exports;
}
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ownerId = uid(1), businessId = uid(2), serviceId = uid(3);
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const tickets = load('src/features/business-photos/upload-ticket.ts');
const oldSigningSecret = process.env.R2_SECRET_ACCESS_KEY;
process.env.R2_SECRET_ACCESS_KEY = 'test-only-not-a-real-storage-credential';
test.after(() => { if (oldSigningSecret === undefined) delete process.env.R2_SECRET_ACCESS_KEY; else process.env.R2_SECRET_ACCESS_KEY = oldSigningSecret; });

function fixture({ authorized = true, own = true, lostCommitResponse = false, quotaError = false } = {}) {
  const rows = new Map(), final = new Map(), staging = new Map();
  const events = []; let writes = 0, commits = 0;
  const supabase = {
    from(table) {
      const filters = {};
      let changes;
      const apply = () => {
        const row=rows.get(filters.id);
        if (!row || Object.entries(filters).some(([key,value])=>row[key]!==value)) return null;
        if (changes) Object.assign(row,changes);
        return row;
      };
      return {
        select() { return this; }, eq(k,v) { filters[k]=v; return this; },
        update(value) { changes=value;return this; }, in(){return this;},
        async maybeSingle() {
          if (table === 'businesses') return { data: own ? { id: businessId, slug:'fixture-business', cover_photo_path: null } : null };
          if (table === 'business_services') return { data: { business_id: businessId } };
          return { data: apply() };
        },
        async single() { return { data: { cover_photo_path: null } }; },
        then(resolve){return Promise.resolve({data:apply(),error:null}).then(resolve);},
      };
    },
    async rpc(name, args) {
      events.push(name);
      if (name === 'consume_photo_upload_quota') return { error: quotaError ? { message:'Upload rate limit reached' } : null };
      if (name === 'reserve_photo_upload') {
        const ticket = { id:args.p_id, ownerId, kind:args.p_kind, targetId:args.p_target_id, type:args.p_content_type };
        if (!rows.has(args.p_id)) rows.set(args.p_id, { id:args.p_id, owner_id:ownerId, object_key:tickets.photoObjectKey(ticket), status:'pending', upload_sha256:args.p_sha256,
          byte_size:args.p_byte_size, content_type:args.p_content_type, upload_action:args.p_action, upload_photo_id:args.p_photo_id });
        return { data:rows.get(args.p_id).status, error:null };
      }
      if (name === 'finish_photo_upload') {
        const row = rows.get(args.p_id);
        if (row.status !== 'active') { row.status='active'; commits++; }
        if (lostCommitResponse) { lostCommitResponse=false; return { error: { code:'', message:'connection lost' } }; }
        return { data:null, error:null };
      }
      if (name === 'cancel_photo_upload') {
        const row=rows.get(args.p_id);if(row?.status==='pending'){row.status='failed';return {data:[row],error:null};}
        return {data:[],error:null};
      }
      throw new Error(`Unexpected RPC ${name}`);
    },
  };
  const r2 = {
    createPhotoStagingUrl: async (key) => `https://private-r2.test/${key}`,
    finalizedPhotoMatches: async (key, size, hash) => {
      const entry = final.get(key); if (!entry) return false;
      assert.equal(entry.bytes.length,size); assert.equal(entry.hash,hash); return true;
    },
    readStagedPhoto: async (key,size) => { const bytes=staging.get(key); if (!bytes || bytes.length !== size) throw new Error('Unexpected object size'); return bytes; },
    putValidatedPhoto: async (key,bytes,type,hash) => { writes++; final.set(key,{bytes:Buffer.from(bytes),type,hash}); },
    deleteStagedPhoto: async (key) => staging.delete(key), deleteR2Object: async (key) => final.delete(key),
    getR2PublicUrl: () => undefined, createR2DownloadUrl: async (key) => `https://photos.test/${key}`,
  };
  const route=load('src/app/api/photo-uploads/route.ts', {
    'next/cache': { revalidatePath() {} }, '@/lib/r2/client':r2,
    '@/server/auth/session': { getCurrentProfile: async () => authorized ? { user:{id:ownerId,email_confirmed_at:'yes'},profile:{role:'provider'} } : null },
    '@/lib/supabase/server-client': { createSupabaseServerClient:async()=>supabase },
    '@/features/business-photos/server': { businessPhotos: async () => [...rows.values()].filter(r=>r.status==='active').map(r=>({id:r.id,name:'photo.png',isCover:false,url:`/api/business-photos/${r.id}`})) },
  });
  const post=(body,origin='https://aspen.test')=>route.POST(new Request('https://aspen.test/api/photo-uploads',{method:'POST',headers:{'Content-Type':'application/json',origin},body:JSON.stringify(body)}));
  const init=(bytes, options={})=>post({operation:'init',uploadId:uid(4),kind:'service',targetId:serviceId,action:'add',name:'photo.png',type:'image/png',size:bytes.length,sha256:digest(bytes),...options});
  return { post,init,rows,final,staging,events,get writes(){return writes;},get commits(){return commits;} };
}
async function begin(f,bytes,options) {
  const response=await f.init(bytes,options); assert.equal(response.status,200,await response.clone().text());
  const result=await response.json(); const ticket=tickets.verifyPhotoTicket(result.ticket);
  f.staging.set(tickets.photoStagingKey(ticket),bytes);
  return result;
}
const smallImage=()=>sharp({create:{width:60,height:40,channels:3,background:'#3c6355'}}).png().toBuffer();

test('real image larger than 4 MiB uploads through metadata-only API and preserves exact bytes', async()=>{
  const bytes=await sharp(crypto.randomBytes(1500*1200*3),{raw:{width:1500,height:1200,channels:3}}).png().toBuffer();
  assert.ok(bytes.length>4*1024*1024);
  const f=fixture(), initialized=await begin(f,bytes);
  const payload={operation:'complete',ticket:initialized.ticket}; assert.ok(JSON.stringify(payload).length<4096);
  const response=await f.post(payload); assert.equal(response.status,200,await response.clone().text());
  const {asset}=await response.json(); assert.equal(asset.byteSize,bytes.length);
  assert.deepEqual(f.final.get(asset.objectKey).bytes,bytes); assert.equal(f.commits,1);
});

test('original PNG, JPG, JPEG and WebP pass real decoding and business gallery association', async()=>{
  for (const [format,extension,type] of [['png','png','image/png'],['jpeg','jpg','image/jpeg'],['jpeg','jpeg','image/jpeg'],['webp','webp','image/webp']]) {
    const bytes=await sharp({create:{width:70,height:50,channels:3,background:'#3c6355'}})[format]().toBuffer();
    const f=fixture(), initialized=await begin(f,bytes,{name:`photo.${extension}`,type,kind:'business',targetId:businessId});
    const response=await f.post({operation:'complete',ticket:initialized.ticket});
    assert.equal(response.status,200,await response.clone().text()); assert.equal((await response.json()).photos.length,1);
    assert.deepEqual([...f.final.values()][0].bytes,bytes);
  }
});

test('invalid extensions, MIME types and size are rejected before issuing upload URLs', async()=>{
  for (const overrides of [{name:'photo.svg'},{type:'text/html'},{size:21*1024*1024},{size:0}]) {
    const f=fixture(), response=await f.init(await smallImage(),overrides); assert.equal(response.status,400); assert.equal(f.rows.size,0);
  }
});

test('disguised files, corrupt images, and changed content never reach final R2 storage', async()=>{
  for (const bytes of [Buffer.from('<script>malicious</script>'),Buffer.from([137,80,78,71,13,10,26,10])]) {
    const f=fixture(), initialized=await begin(f,bytes);
    assert.equal((await f.post({operation:'complete',ticket:initialized.ticket})).status,400); assert.equal(f.writes,0); assert.equal(f.commits,0);
    assert.equal(f.rows.get(uid(4)).status,'failed'); assert.equal(f.staging.size,0);
  }
  const f=fixture(), bytes=await smallImage(), initialized=await begin(f,bytes);
  f.staging.set(tickets.photoStagingKey(tickets.verifyPhotoTicket(initialized.ticket)),Buffer.alloc(bytes.length));
  assert.equal((await f.post({operation:'complete',ticket:initialized.ticket})).status,400); assert.equal(f.writes,0);
});

test('unauthenticated, wrong owner and cross-origin requests are denied before storage',async()=>{
  const bytes=await smallImage();
  for(const options of [{authorized:false},{own:false}]) { const f=fixture(options); assert.equal((await f.init(bytes)).status,403); assert.equal(f.rows.size,0); }
  assert.equal((await fixture().post({},'https://attacker.test')).status,403);
});

test('tickets reject tampering, expiration and changed owner; completion checks DB reservation',async()=>{
  const f=fixture(),initialized=await begin(f,await smallImage()),payload=tickets.verifyPhotoTicket(initialized.ticket);
  for (const ticket of [initialized.ticket+'x',tickets.signPhotoTicket({...payload,expires:Date.now()-1}),tickets.signPhotoTicket({...payload,ownerId:uid(55)})]) {
    const response=await f.post({operation:'complete',ticket}); assert.ok([400,403].includes(response.status));
  }
  f.rows.get(payload.id).upload_sha256='a'.repeat(64);
  assert.equal((await f.post({operation:'complete',ticket:initialized.ticket})).status,409); assert.equal(f.writes,0);
});

test('lost commit response and completion retries do not duplicate or overwrite images',async()=>{
  const f=fixture({lostCommitResponse:true}),bytes=await smallImage(),initialized=await begin(f,bytes);
  assert.equal((await f.post({operation:'complete',ticket:initialized.ticket})).status,503);
  const retry=await (await f.init(bytes)).json(); assert.equal(retry.uploaded,true);
  assert.equal((await f.post({operation:'complete',ticket:retry.ticket})).status,200);
  assert.equal((await f.post({operation:'complete',ticket:retry.ticket})).status,200);
  assert.equal(f.writes,1); assert.equal(f.commits,1);
});

test('validation quota rejection does not read or publish images',async()=>{
  const f=fixture({quotaError:true}),initialized=await begin(f,await smallImage());
  assert.equal((await f.post({operation:'complete',ticket:initialized.ticket})).status,429); assert.equal(f.writes,0);
});

test('discarding a pending upload releases its slot without cancelling a committed photo',async()=>{
  const f=fixture();await begin(f,await smallImage());
  assert.equal((await f.post({operation:'cancel',uploadId:uid(4)})).status,200);
  assert.equal(f.rows.get(uid(4)).status,'failed');assert.equal(f.staging.size,0);
  const active=fixture(),initialized=await begin(active,await smallImage());
  assert.equal((await active.post({operation:'complete',ticket:initialized.ticket})).status,200);
  assert.equal((await active.post({operation:'cancel',uploadId:uid(4)})).status,200);
  assert.equal(active.rows.get(uid(4)).status,'active');assert.equal(active.final.size,1);
});

test('presigned staging URL binds content length and type and never uses final bucket',async()=>{
  const vars={R2_ACCOUNT_ID:'fixture',R2_ENDPOINT:'https://fixture.r2.cloudflarestorage.com',R2_BUCKET_NAME:'final-fixture',R2_UPLOAD_BUCKET_NAME:'private-fixture',R2_ACCESS_KEY_ID:'fixture-key'};
  const previous=Object.fromEntries(Object.keys(vars).map(k=>[k,process.env[k]]));Object.assign(process.env,vars);
  try {
    const r2=load('src/lib/r2/client.ts');
    const url=new URL(await r2.createPhotoStagingUrl('pending/photo','image/png',6*1024*1024));
    const signed=url.searchParams.get('X-Amz-SignedHeaders');
    assert.ok(signed.includes('content-length'));assert.ok(signed.includes('content-type'));
    assert.ok(url.hostname.startsWith('private-fixture.') || url.pathname.includes('private-fixture'));assert.equal(url.searchParams.get('X-Amz-Expires'),'600');
    assert.equal(url.searchParams.has('x-amz-checksum-crc32'),false);
    process.env.R2_UPLOAD_BUCKET_NAME='final-fixture';await assert.rejects(r2.createPhotoStagingUrl('pending/photo','image/png',10),/separate private/);
  } finally {for(const [k,v]of Object.entries(previous)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});

test('queue has at most two workers, continues after failure, and retries only selected failures',async()=>{
  const {runUploadQueue}=load('src/features/business-photos/upload-queue.ts');
  let active=0,max=0; const calls=[];
  const worker=async(n)=>{calls.push(n); active++; max=Math.max(max,active); await new Promise(r=>setTimeout(r,5)); active--; if(n===2)throw new Error('offline');};
  const result=await runUploadQueue([1,2,3,4],worker,20);
  assert.equal(max,2); assert.equal(result.filter(r=>r.status==='fulfilled').length,3); assert.deepEqual(calls,[1,2,3,4]);
  await runUploadQueue([1,2,3,4].filter((_,i)=>result[i].status==='rejected'),async n=>calls.push(n));
  assert.deepEqual(calls,[1,2,3,4,2]);
});

test('browser sends original bytes to R2 and only small JSON to Next.js',async(t)=>{
  const f=fixture(),bytes=await smallImage(),file=new File([bytes],'photo.png',{type:'image/png'});
  const requests=[],progress=[];
  t.mock.method(globalThis,'fetch',async(url,options)=>{ assert.equal(url,'/api/photo-uploads'); assert.ok(options.body.length<8192); requests.push(JSON.parse(options.body)); return f.post(JSON.parse(options.body)); });
  const original=globalThis.XMLHttpRequest;
  globalThis.XMLHttpRequest=class {
    upload={}; open(method,url){assert.equal(method,'PUT');this.url=url;} setRequestHeader(name,value){assert.equal(name,'Content-Type');assert.equal(value,'image/png');}
    async send(body){ assert.equal(body,file); f.staging.set(new URL(this.url).pathname.slice(1),Buffer.from(await body.arrayBuffer()));this.upload.onprogress({lengthComputable:true,loaded:body.size,total:body.size});this.status=200;this.onload(); }
  };
  try {
    const {uploadServicePhoto}=load('src/features/business-photos/upload-client.ts');
    const asset=await uploadServicePhoto(file,serviceId,n=>progress.push(n),uid(4));
    assert.equal(asset.id,uid(4)); assert.deepEqual(requests.map(r=>r.operation),['init','complete']); assert.equal(progress.at(-1),100);
    await uploadServicePhoto(file,serviceId,undefined,uid(4)); assert.equal(f.writes,1);
  } finally {globalThis.XMLHttpRequest=original;}
});
