import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),wr=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=wr('miniflare');
const mf=new Miniflare({modules:true,script:readFileSync('preview-dist/_worker.js','utf8'),compatibilityDate:'2026-05-15'});
try{
 const page=await mf.dispatchFetch('https://preview.test/');assert.equal(page.status,200);const html=await page.text();assert.match(html,/Professional Toolkit/);
 const script=html.match(/src="([^"]+\.js)"/)[1];assert.equal((await mf.dispatchFetch('https://preview.test'+script)).status,200);
 const css=html.match(/href="([^"]+\.css)"/)[1];assert.equal((await mf.dispatchFetch('https://preview.test'+css)).status,200);
 assert.equal((await mf.dispatchFetch('https://preview.test/account')).status,200);
 assert.equal((await (await mf.dispatchFetch('https://preview.test/api/account')).json()).user,null);
 assert.equal((await mf.dispatchFetch('https://preview.test/api/account',{method:'POST',body:'credential-not-accepted'})).status,503);
 assert.equal((await mf.dispatchFetch('https://preview.test/missing')).status,404);
 console.log('PASS: page, JS, CSS, account route, guest API, disabled account writes, 404');
}finally{await mf.dispose()}
