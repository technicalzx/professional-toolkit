import test from 'node:test';
import assert from 'node:assert/strict';

test('extension transfers an approved capture as a guest without reading account state',async()=>{
 const controls=new Map(),calls=[];
 const element=id=>{if(!controls.has(id))controls.set(id,{value:'',checked:false,disabled:false,textContent:'',replaceChildren(){},append(){}});return controls.get(id);};
 const originalDocument=globalThis.document,originalChrome=globalThis.chrome;
 globalThis.document={getElementById:element};
 const fixture={schemaVersion:1,sourceUrl:'https://www.upwork.com/freelancers/test-owner',title:'Synthetic cloud profile',text:'I help clients build cloud systems and document reliable delivery. This synthetic profile is long enough to test transferring a review snapshot.',headings:[],capturedAt:'2026-10-16T00:00:00.000Z',captureMethod:'browser-capture'};
 globalThis.chrome={
  storage:{local:{get:async()=>({}),set:async value=>{calls.push(['setting',value]);}}},
  permissions:{request:async value=>{calls.push(['permission',value]);return true;}},
  tabs:{query:async()=>[{id:1}],create:async value=>{calls.push(['create',value]);return {id:2};},get:async()=>({status:'complete'}),update:async(id,value)=>{calls.push(['activate',id,value]);}},
  scripting:{executeScript:async value=>{calls.push(['script',value.func.name,value.args]);if(value.func.name==='capturePage')return [{result:fixture}];if(value.func.name==='handoffToWebsite')return [{result:true}];throw Error('Guest transfer must not read account state.');}},
 };
 try{
  await import('../../extension/popup.mjs');
  assert.equal(element('origin').value,'https://professional-toolkit.abihurairahansari.workers.dev');
  element('origin').value='http://127.0.0.1:8790';
  await element('capture').onclick();
  element('prompt').value='Review the supplied evidence.';element('consent').checked=true;
  await element('send').onclick();
  assert.equal(calls.filter(c=>c[0]==='script'&&c[1]==='handoffToWebsite').length,1);
  assert.ok(calls.some(c=>c[0]==='create'&&c[1].url.startsWith('http://127.0.0.1:8790/capture#handoff=')));
  assert.match(element('status').textContent,/guest/);
  assert.equal(calls.filter(c=>c[0]==='script'&&c[1]==='websiteAccount').length,0);
 }finally{globalThis.document=originalDocument;globalThis.chrome=originalChrome;}
});
