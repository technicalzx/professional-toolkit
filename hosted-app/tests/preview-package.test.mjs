import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

test('preview packaging serves every application route, preserves binary bytes and is repeatable',async()=>{
 const folder=mkdtempSync(join(tmpdir(),'toolkit-preview-'));
 try{
  const output=join(folder,'preview-dist');mkdirSync(output);mkdirSync(join(output,'assets'));
  writeFileSync(join(output,'index.html'),'<html>Toolkit fixture</html>');
  writeFileSync(join(output,'assets','fixture.js'),'export const fixture=true;');
  const zip=Buffer.from([0x50,0x4b,0x03,0x04,0,0xff,0x80,0x01]);writeFileSync(join(output,'toolkit-capture-extension.zip'),zip);
  const pack=()=>{const result=spawnSync(process.execPath,[fileURLToPath(new URL('../preview/pack-worker.mjs',import.meta.url))],{cwd:folder,encoding:'utf8'});assert.equal(result.status,0,result.stderr);return readFileSync(join(output,'_worker.js'),'utf8');};
  const source=pack();assert.equal(pack(),source,'Repacking must not include the generated Worker.');
  const worker=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
  const get=(path,options)=>worker.fetch(new Request('https://preview.test'+path,options));
  for(const path of ['/','/tools','/capture','/capture/','/extension','/extension/','/workflows','/account']){const response=get(path);assert.equal(response.status,200,path);assert.equal(await response.text(),'<html>Toolkit fixture</html>');}
  const asset=get('/assets/fixture.js');assert.equal(await asset.text(),'export const fixture=true;');assert.match(asset.headers.get('cache-control'),/immutable/);
  const download=get('/toolkit-capture-extension.zip');assert.equal(download.headers.get('content-type'),'application/zip');assert.deepEqual(Buffer.from(await download.arrayBuffer()),zip);
  const etag=download.headers.get('etag');assert.equal(get('/toolkit-capture-extension.zip',{headers:{'If-None-Match':etag}}).status,304);
  assert.equal(await get('/capture',{method:'HEAD'}).text(),'');
  assert.equal(get('/capture',{method:'POST'}).status,405);
  assert.equal(get('/api/projects',{method:'POST'}).status,503);
  assert.equal((await get('/api/account').json()).user,null);
  for(const path of ['/missing','/constructor','/__proto__'])assert.equal(get(path).status,404);
 }finally{rmSync(folder,{recursive:true,force:true});}
});
