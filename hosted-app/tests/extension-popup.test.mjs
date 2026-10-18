import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const transferInputs=['title','text','prompt','origin','consent'];
const fixture={schemaVersion:1,sourceUrl:'https://www.upwork.com/freelancers/test-owner',title:'Synthetic cloud profile',text:'SYNTHETIC_PRIVATE_HEADING. I help clients build cloud systems and document reliable delivery. This synthetic profile is long enough to test transferring a review snapshot.',headings:['SYNTHETIC_PRIVATE_HEADING'],capturedAt:'2026-10-16T00:00:00.000Z',captureMethod:'browser-capture'};
let importSequence=0;
function deferred(){let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};}
async function withPopup(check,overrides={}){
 const controls=new Map(),calls=[];
 const element=id=>{if(!controls.has(id))controls.set(id,{value:'',checked:false,disabled:false,textContent:'',replaceChildren(){},append(){}});return controls.get(id);};
 const originalDocument=globalThis.document,originalChrome=globalThis.chrome;
 globalThis.document={getElementById:element};
 globalThis.chrome={
  storage:{local:{get:async()=>({}),set:async value=>{calls.push(['setting',value]);}}},
  permissions:{request:async value=>{calls.push(['permission',value]);return overrides.permission?overrides.permission(value):true;}},
  tabs:{query:async()=>[{id:1}],create:async value=>{calls.push(['create',value]);return {id:2};},get:async()=>overrides.ready?overrides.ready():({status:'complete'}),update:async(id,value)=>{calls.push(['activate',id,value]);}},
  scripting:{executeScript:async value=>{calls.push(['script',value.func.name,value.args]);if(value.func.name==='capturePage')return [{result:fixture}];if(value.func.name==='handoffToWebsite'){if(overrides.transfer)await overrides.transfer(value.args[0]);return [{result:true}];}throw Error('Guest transfer must not read account state.');}},
 };
 try{
  // Each fixture needs fresh module state and handlers, even within one Node process.
  const module=new URL('../../extension/popup.mjs',import.meta.url);module.searchParams.set('fixture',String(++importSequence));
  await import(module.href);
  await check({element,calls,capture:()=>element('capture').onclick(),approve(){element('consent').checked=true;element('consent').onchange();}});
 }finally{
  if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;
  if(originalChrome===undefined)delete globalThis.chrome;else globalThis.chrome=originalChrome;
 }
}
function handoffs(calls){return calls.filter(c=>c[0]==='script'&&c[1]==='handoffToWebsite');}
function assertUnlocked(element){for(const id of transferInputs)assert.equal(element(id).disabled,false,`${id} must unlock`);}

test('extension shows the toolkit recipient before approval without additional permissions',()=>{
 const popup=fs.readFileSync(new URL('../../extension/popup.html',import.meta.url),'utf8');
 assert.match(popup,/<a href="https:\/\/professional-toolkit\.abihurairahansari\.workers\.dev\/extension" target="_blank" rel="noopener noreferrer">Help &amp; updates<\/a>/);
 assert.equal((popup.match(/id="origin"/g)||[]).length,1);
 assert.ok(popup.indexOf('id="origin"')<popup.indexOf('id="consent"'));
 assert.ok(popup.indexOf('id="consent"')<popup.indexOf('<details>'));
 const manifest=JSON.parse(fs.readFileSync(new URL('../../extension/manifest.json',import.meta.url),'utf8'));
 assert.deepEqual(manifest.permissions,['activeTab','scripting','storage']);
 assert.equal(manifest.host_permissions,undefined);assert.equal(manifest.background,undefined);
});

test('extension transfers the approved source, request and exact origin as a guest',async()=>withPopup(async({element,calls,capture,approve})=>{
 assert.equal(element('origin').value,'https://professional-toolkit.abihurairahansari.workers.dev');
 element('origin').value='http://127.0.0.1:8790';
 await capture();
 element('title').value='Reviewed synthetic title';element('title').oninput();
 element('text').value=fixture.text+' These are approved user edits.';element('text').oninput();
 element('prompt').value='Review the supplied evidence.';element('prompt').oninput();approve();
 await element('send').onclick();
 assert.equal(handoffs(calls).length,1);
 const message=handoffs(calls)[0][2][0];
 assert.equal(message.snapshot.title,element('title').value);assert.equal(message.snapshot.text,element('text').value);assert.equal(message.snapshot.userEdited,true);assert.deepEqual(message.snapshot.headings,[]);assert.equal(message.prompt,'Review the supplied evidence.');
 assert.ok(calls.some(c=>c[0]==='create'&&c[1].url.startsWith('http://127.0.0.1:8790/capture#handoff=')));
 assert.deepEqual(calls.find(c=>c[0]==='permission')[1],{origins:['http://127.0.0.1:8790/*']});
 assert.match(element('status').textContent,/guest/);
 assert.equal(calls.filter(c=>c[0]==='script'&&c[1]==='websiteAccount').length,0);assertUnlocked(element);
}));

test('every edited transfer input clears approval and a direct unchecked send does nothing',async()=>withPopup(async({element,calls,capture,approve})=>{
 await capture();element('prompt').value='Review the supplied evidence.';
 for(const [id,value] of [['title','New title'],['text',fixture.text+' Revised.'],['prompt','Review this revised request.'],['origin','https://toolkit.example']]){
  approve();assert.equal(element('send').disabled,false);
  element(id).value=value;element(id).oninput();
  assert.equal(element('consent').checked,false,`${id} must clear approval`);assert.equal(element('send').disabled,true);
  const before=calls.length;await element('send').onclick();assert.equal(calls.length,before,'Unchecked sends must not request permission, open tabs or transfer');
  assert.match(element('status').textContent,/Review and confirm/);assertUnlocked(element);
 }
 assert.equal(handoffs(calls).length,0);
}));

test('approved transfer inputs stay locked while a slow toolkit tab loads',async()=>{
 const started=deferred(),release=deferred();
 await withPopup(async({element,calls,capture,approve})=>{
  await capture();element('prompt').value='Review this approved request.';approve();
  const sending=element('send').onclick();
  try{
   await started.promise;
   for(const id of transferInputs)assert.equal(element(id).disabled,true,`${id} must not change during transfer`);
   assert.match(element('status').textContent,/Inputs are locked/);
   await element('send').onclick();assert.equal(calls.filter(c=>c[0]==='create').length,1,'Repeated send must not create a second transfer');
   assert.equal(handoffs(calls).length,0,'Nothing transfers before toolkit readiness');
  }finally{release.resolve();await sending;}
  assert.equal(handoffs(calls).length,1);assert.equal(handoffs(calls)[0][2][0].snapshot.text,fixture.text);assert.deepEqual(handoffs(calls)[0][2][0].snapshot.headings,fixture.headings);assert.equal(handoffs(calls)[0][2][0].prompt,'Review this approved request.');assertUnlocked(element);
 },{ready:async()=>{started.resolve();await release.promise;return {status:'complete'};}});
});

for(const failure of [
 {name:'denied destination permission',options:{permission:async()=>false},message:/permission was not granted/,attempts:0},
 {name:'a closed toolkit tab',options:{ready:async()=>{throw Error('Toolkit tab closed.');}},message:/Toolkit tab closed/,attempts:0},
 {name:'a failed website handoff',options:{transfer:async()=>{throw Error('Toolkit did not accept the snapshot.');}},message:/did not accept/,attempts:1},
])test(`transfer unlocks and retains reviewed content after ${failure.name}`,async()=>withPopup(async({element,calls,capture,approve})=>{
 await capture();element('title').value='My reviewed title';element('text').value=fixture.text+' Keep this revision.';element('prompt').value='Keep this review request.';element('origin').value='https://toolkit.example';approve();
 const before=Object.fromEntries(transferInputs.filter(id=>id!=='consent').map(id=>[id,element(id).value]));
 await element('send').onclick();
 assert.match(element('status').textContent,failure.message);assertUnlocked(element);
 for(const [id,value] of Object.entries(before))assert.equal(element(id).value,value,`${id} must survive the error`);
 assert.equal(element('consent').checked,true);assert.equal(element('send').disabled,false);assert.equal(element('download').disabled,false);
 assert.equal(handoffs(calls).length,failure.attempts);assert.equal(calls.some(c=>c[0]==='activate'),false,'Failed transfer must not claim an opened feedback page');
},failure.options));


test('a title-only edit drops original heading metadata from the approved handoff',async()=>withPopup(async({element,calls,capture,approve})=>{
 await capture();element('title').value='A reviewed title';element('title').oninput();element('prompt').value='Review the supplied evidence.';approve();
 await element('send').onclick();
 const snapshot=handoffs(calls)[0][2][0].snapshot;
 assert.equal(snapshot.text,fixture.text);assert.deepEqual(snapshot.headings,[]);assert.equal(snapshot.userEdited,true);
}));

test('redacted heading wording is absent from both the handoff and snapshot JSON download',async()=>withPopup(async({element,calls,capture,approve})=>{
 await capture();element('text').value=fixture.text.replace('SYNTHETIC_PRIVATE_HEADING. ','');element('text').oninput();element('prompt').value='Review only the redacted text.';approve();
 await element('send').onclick();
 const transferred=handoffs(calls)[0][2][0].snapshot;
 assert.equal(transferred.title,fixture.title);assert.deepEqual(transferred.headings,[]);assert.equal(JSON.stringify(transferred).includes('SYNTHETIC_PRIVATE_HEADING'),false);
 const originalCreate=URL.createObjectURL,originalRevoke=URL.revokeObjectURL,originalTimeout=globalThis.setTimeout;
 const blobs=[],downloads=[];
 globalThis.document.createElement=tag=>{assert.equal(tag,'a');return {click(){downloads.push({href:this.href,name:this.download});}};};
 URL.createObjectURL=blob=>{blobs.push(blob);return 'blob:synthetic-snapshot-export';};URL.revokeObjectURL=()=>{};
 globalThis.setTimeout=(callback,delay)=>{assert.equal(delay,5000);callback();return 0;};
 try{
  await element('download').onclick();assert.equal(blobs.length,1);assert.equal(downloads[0].name,'toolkit-page-snapshot.json');
  const exported=JSON.parse(await blobs[0].text());
  assert.deepEqual(exported,transferred);assert.equal(JSON.stringify(exported).includes('SYNTHETIC_PRIVATE_HEADING'),false);assert.equal(exported.userEdited,true);
 }finally{URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;globalThis.setTimeout=originalTimeout;}
}));
