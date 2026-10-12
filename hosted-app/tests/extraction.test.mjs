import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
const wr=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=wr('miniflare');
test('Worker parser extracts metadata and removes script/navigation',async()=>{
 const fixture='<html><head><title>Example consultant</title><meta name="description" content="Cloud services"></head><body><nav>Navigation noise</nav><h1>Cloud services</h1><p>I help clients build reliable systems. Contact me about cloud migration.</p><script>BAD_SCRIPT_TEXT</script></body></html>';
 const source=fs.readFileSync(new URL('../lib/toolkit/importer.mjs',import.meta.url),'utf8');
 const mf=new Miniflare({modules:true,script:source+'\nexport default { async fetch(){return Response.json(await extractHtml('+JSON.stringify(fixture)+'));}}',compatibilityDate:'2026-05-15'});
 try{const r=await mf.dispatchFetch('http://test.local/');const body=await r.json();assert.equal(body.title,'Example consultant');assert.equal(body.description,'Cloud services');assert.ok(body.text.includes('cloud migration'));assert.ok(!body.text.includes('BAD_SCRIPT_TEXT'));assert.ok(!body.text.includes('Navigation noise'));}finally{await mf.dispose()}
});
