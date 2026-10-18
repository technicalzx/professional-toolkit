import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateSnapshot,validateHandoff,localReview,restoreCapturedReview,CAPTURE_CHANNEL} from '../lib/capture/snapshot.mjs';
import {toolkitOrigin} from '../../extension/connection.mjs';
export const captureFixture=()=>({schemaVersion:1,sourceUrl:'https://www.linkedin.com/in/test-fixture?tracking=redacted#section',title:'Example cloud engineer',text:'I help clients build reliable cloud systems. I have delivered 12 projects over 4 years. View my portfolio and message me to discuss cloud migration requirements. These are synthetic test facts only.',headings:['Cloud engineering'],capturedAt:'2026-10-16T08:00:00.000Z',captureMethod:'browser-capture'});
test('snapshot strips URL tracking, unknown properties and forged platform labels',()=>{
 const value=validateSnapshot({...captureFixture(),cookies:'do not retain',platform:'fiverr'});
 assert.equal(value.sourceUrl,'https://www.linkedin.com/in/test-fixture');assert.equal(value.platform,'linkedin');assert.equal('cookies' in value,false);
});
test('synthetic owner and competitor profile locator shapes support snapshots without fetches',()=>{
 for(const sourceUrl of ['https://www.linkedin.com/in/test-owner','https://www.fiverr.com/test-owner','https://www.fiverr.com/test-competitor','https://www.upwork.com/freelancers/test-owner','https://www.upwork.com/freelancers/test-competitor'])assert.ok(validateSnapshot({...captureFixture(),sourceUrl}).platform!=='website');
});
test('snapshot rejects unsafe URLs, unknown schemas and malformed fields',()=>{
 for(const sourceUrl of ['javascript:alert(1)','http://example.com','https://user:password@example.com','https://127.0.0.1','https://example.com:8080'])assert.throws(()=>validateSnapshot({...captureFixture(),sourceUrl}));
 for(const patch of [{schemaVersion:2},{text:'short'},{text:'x'.repeat(20001)},{capturedAt:'invalid'},{headings:Array(31).fill('heading')},{captureMethod:'live-api'}])assert.throws(()=>validateSnapshot({...captureFixture(),...patch}));
});
test('handoff requires channel, nonce and validated payload',()=>{
 const nonce='a'.repeat(32),message={channel:CAPTURE_CHANNEL,type:'capture',nonce,snapshot:captureFixture(),prompt:'Review cloud migration experience.'};
 assert.equal(validateHandoff(message,nonce).snapshot.platform,'linkedin');
 for(const patch of [{nonce:'b'.repeat(32)},{channel:'other'},{type:'save'},{prompt:'x'.repeat(1501)}])assert.throws(()=>validateHandoff({...message,...patch},nonce));
 assert.throws(()=>validateHandoff(message,''));
});
test('local review has source-grounded checks and request-specific excerpt lookup',()=>{
 const review=localReview(captureFixture(),'cloud migration');assert.equal(review.mode,'local');assert.equal(review.checks.length,3);assert.ok(review.excerpts.length);
 assert.ok(review.checks.every(c=>!c.quote||review.source.text.includes(c.quote)));assert.match(review.explanation,/not observed|No platform/i);
 assert.equal('score' in review,false);assert.equal('earnings' in review,false);
});
test('saved reviews recalculate local checks and reject fabricated AI citations',()=>{
 const review=localReview(captureFixture(),'cloud');assert.deepEqual(restoreCapturedReview({...review,checks:['forged']}).checks,review.checks);
 const ai={kind:'captured-review',mode:'ai',source:captureFixture(),request:'cloud',summary:'A review.',findings:[{quote:'I help clients build reliable cloud systems.',observation:'A service statement is present.',recommendation:'Explain the intended client.'}],missingInformation:['A project artifact.']};
 assert.equal(restoreCapturedReview(ai).findings.length,1);
 assert.throws(()=>restoreCapturedReview({...ai,findings:[{...ai.findings[0],quote:'invented'}]}));
});
test('toolkit destinations require HTTPS or explicit loopback development origins',()=>{
 assert.equal(toolkitOrigin('https://toolkit.example/'),'https://toolkit.example');assert.equal(toolkitOrigin('http://127.0.0.1:8787'),'http://127.0.0.1:8787');
 for(const url of ['http://example.com','https://user:secret@example.com','https://example.com/path','https://example.com?token=x','file:///tmp/a'])assert.throws(()=>toolkitOrigin(url));
});
test('extension package has least-privilege manifest and identical snapshot contract',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('../../extension/manifest.json',import.meta.url),'utf8'));
 assert.equal(manifest.manifest_version,3);assert.deepEqual(manifest.permissions,['activeTab','scripting','storage']);assert.equal(manifest.host_permissions,undefined);assert.equal(manifest.content_scripts,undefined);
 assert.equal(fs.readFileSync(new URL('../../extension/snapshot.mjs',import.meta.url),'utf8'),fs.readFileSync(new URL('../lib/capture/snapshot.mjs',import.meta.url),'utf8'));
});


test('Fiverr buyer pages are rejected before reading DOM content',async()=>{
 const {capturePage}=await import('../../extension/capture-page.mjs');const previous=globalThis.location;
 try{globalThis.location={href:'https://www.fiverr.com/synthetic-fixture/buying?source=profile'};assert.throws(()=>capturePage(),/buyer\/client profile.*freelancer profile/);}
 finally{if(previous===undefined)delete globalThis.location;else globalThis.location=previous;}
});
test('AI drafts and next steps survive restoration; old reviews remain compatible',()=>{
 const source={schemaVersion:1,sourceUrl:'https://www.fiverr.com/synthetic-profile',title:'Synthetic profile',text:'I build reliable cloud infrastructure and document delivery. My portfolio contains cloud deployment examples and testing notes.',headings:[],capturedAt:'2026-10-18T00:00:00.000Z',captureMethod:'browser-capture'};
 const report={kind:'captured-review',mode:'ai',source,request:'Rewrite my headline.',summary:'Clarify your specialization.',findings:[{quote:'I build reliable cloud infrastructure',observation:'Your offer is broad.',recommendation:'Name the infrastructure specialty.'}],missingInformation:[],improvedDraft:'Cloud infrastructure builder | Documented deployments',nextSteps:['Add one truthful specialist example.']};
 const restored=restoreCapturedReview(JSON.parse(JSON.stringify(report)));assert.equal(restored.improvedDraft,report.improvedDraft);assert.deepEqual(restored.nextSteps,report.nextSteps);
 assert.throws(()=>restoreCapturedReview({...report,improvedDraft:'x'.repeat(2201)}));assert.throws(()=>restoreCapturedReview({...report,nextSteps:['x'.repeat(351)]}));
 const old={...report};delete old.improvedDraft;delete old.nextSteps;assert.equal(restoreCapturedReview(old).mode,'ai');
});
