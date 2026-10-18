import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),wr=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare,convertV4MiniflareOptions}=wr('miniflare');
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:readFileSync('preview-dist/_worker.js','utf8'),compatibilityDate:'2026-05-15'}));
try{
 const page=await mf.dispatchFetch('https://preview.test/');assert.equal(page.status,200);const html=await page.text();assert.match(html,/Professional Toolkit/);
 const script=html.match(/src="([^"]+\.js)"/)[1];assert.equal((await mf.dispatchFetch('https://preview.test'+script)).status,200);
 const css=html.match(/href="([^"]+\.css)"/)[1];assert.equal((await mf.dispatchFetch('https://preview.test'+css)).status,200);
 for(const route of ['/tools','/capture','/capture/','/extension','/extension/','/workflows','/account'])assert.equal((await mf.dispatchFetch('https://preview.test'+route)).status,200,route);
 const extension=await mf.dispatchFetch('https://preview.test/toolkit-capture-extension.zip');
 assert.equal(extension.status,200);assert.equal(extension.headers.get('content-type'),'application/zip');
 const bytes=Buffer.from(await extension.arrayBuffer());
 assert.deepEqual(bytes,readFileSync('public/toolkit-capture-extension.zip'));
 const metadata=await (await mf.dispatchFetch('https://preview.test/extension-release.json')).json();
 assert.equal(metadata.sha256,createHash('sha256').update(bytes).digest('hex'));
 assert.equal(metadata.sizeBytes,bytes.length);
 assert.equal((await (await mf.dispatchFetch('https://preview.test/api/account')).json()).user,null);
 assert.equal((await mf.dispatchFetch('https://preview.test/api/account',{method:'POST',body:'credential-not-accepted'})).status,503);
 assert.equal((await mf.dispatchFetch('https://preview.test/missing')).status,404);
 assert.equal((await mf.dispatchFetch('https://preview.test/constructor')).status,404);
 console.log('PASS: page, JS, CSS, tools/capture/extension/workflows/account routes, exact extension bytes and release checksum, guest API, disabled account writes, 404');
}finally{await mf.dispose()}
