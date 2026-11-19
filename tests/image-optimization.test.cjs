/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const ts = require('typescript');
const cache = new Map();
function load(filename) {
  filename = path.resolve(filename);
  if (cache.has(filename)) return cache.get(filename);
  const compiled = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop:true } }).outputText;
  new Function('require','module','exports',code)((name)=> {
    if(name==='server-only') return {};
    if(name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`);
    if(name.startsWith('.')) return load(path.resolve(path.dirname(filename),`${name}.ts`));
    return require(name);
  },compiled,compiled.exports);
  cache.set(filename,compiled.exports); return compiled.exports;
}
const { optimizeBusinessImage } = load('src/features/business-photos/optimize.ts');
async function compare(source, name, type) {
  const result = await optimizeBusinessImage(source,name,type);
  const original = await sharp(source).autoOrient().ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const final = await sharp(result.bytes).autoOrient().ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.deepEqual(final.info,original.info);
  // WebP may discard RGB hidden behind fully transparent pixels; these have
  // no visible contribution. Alpha and every visible colour channel must match.
  for (let i=0;i<original.data.length;i++) {
    if (i%4!==3 && original.data[Math.floor(i/4)*4+3]===0) continue;
    assert.equal(final.data[i],original.data[i],`Visible pixel channel ${i}`);
  }
  assert.ok(result.bytes.length<=source.length);
  console.log(JSON.stringify({name,originalBytes:source.length,candidateBytes:result.candidateBytes,finalBytes:result.bytes.length,savedPercent:Number((100*(1-result.bytes.length/source.length)).toFixed(2)),format:result.contentType}));
  return result;
}
test('real business photos and logo retain decoded pixels and dimensions',async()=>{
  for(const file of ['public/img/mock/image_4.png','public/img/logo/logo.png']) {
    const source=fs.readFileSync(file);
    await compare(source,path.basename(file),'image/png');
    for(const extension of ['jpg','jpeg']) {
      const jpeg=await sharp(source).jpeg({quality:95}).toBuffer();
      await compare(jpeg,`photo.${extension}`,'image/jpeg');
    }
  }
});
test('transparent and EXIF-oriented images preserve their appearance',async()=>{
  const image=sharp({create:{width:900,height:600,channels:4,background:{r:10,g:150,b:80,alpha:0.5}}});
  await compare(await image.clone().png().toBuffer(),'alpha.png','image/png');
  await compare(await image.clone().removeAlpha().jpeg().withMetadata({orientation:6}).toBuffer(),'rotated.jpg','image/jpeg');
});
test('tiny original wins when WebP is larger; existing WebP is unchanged',async()=>{
  const png=await sharp({create:{width:1,height:1,channels:3,background:'red'}}).png().toBuffer();
  const result=await compare(png,'tiny.png','image/png');
  assert.equal(result.contentType,'image/png');
  const webp=await sharp(png).webp().toBuffer();
  assert.deepEqual((await optimizeBusinessImage(webp,'existing.webp','image/webp')).bytes,webp);
});
test('invalid signatures, corrupt data and excessive pixel dimensions are rejected',async()=>{
  await assert.rejects(optimizeBusinessImage(Buffer.from('<script>bad</script>'),'bad.png','image/png'));
  await assert.rejects(optimizeBusinessImage(Buffer.from([137,80,78,71,13,10,26,10]),'bad.png','image/png'));
  const large=await sharp({create:{width:5000,height:5000,channels:3,background:'white'}}).png().toBuffer();
  await assert.rejects(optimizeBusinessImage(large,'large.png','image/png'));
});
