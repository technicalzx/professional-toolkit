// Isolated acceptance fixture: pre-grants only the local toolkit host in a TEMP copy.
// Production manifest remains optional-permission-only; real permission prompts need manual QA.
import {createRequire} from 'node:module';
import {mkdtemp,cp,readFile,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.TOOLKIT_PLAYWRIGHT_MODULE||'playwright');
const base=process.env.TOOLKIT_PREVIEW_URL;if(!base)throw Error('Set TOOLKIT_PREVIEW_URL to an isolated local preview.');
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname)&&!(process.env.TOOLKIT_VERIFY_LIVE_EXTENSION==='1'&&new URL(base).protocol==='https:'))throw Error('Live verification requires explicit TOOLKIT_VERIFY_LIVE_EXTENSION=1 and HTTPS. Use only the intended test deployment.');
const scratch=await mkdtemp(join(tmpdir(),'toolkit-extension-test-')),extension=join(scratch,'extension');
await cp(new URL('../extension/',import.meta.url),extension,{recursive:true});
const manifest=JSON.parse(await readFile(join(extension,'manifest.json'),'utf8'));manifest.host_permissions=[new URL(base).origin+'/*'];await writeFile(join(extension,'manifest.json'),JSON.stringify(manifest));
let fixtureCreated=false;
const context=await chromium.launchPersistentContext(join(scratch,'profile'),{...(process.env.TOOLKIT_CHROME?{executablePath:process.env.TOOLKIT_CHROME}:{channel:'chromium'}),headless:true,ignoreDefaultArgs:['--disable-extensions'],args:['--enable-unsafe-extension-debugging']});
try{
 const page=await context.newPage();
 await page.goto(base+'/capture');
 if(process.env.TOOLKIT_VERIFY_LIVE_EXTENSION==='1'){const bytes=await page.evaluate(async()=>{const r=await fetch('/toolkit-capture-extension.zip');if(!r.ok)throw Error('Extension download failed.');return Array.from(new Uint8Array(await r.arrayBuffer()));});assert.deepEqual(Buffer.from(bytes),await readFile(new URL('../hosted-app/public/toolkit-capture-extension.zip',import.meta.url)),'Live extension download must match the tested release package byte for byte.');}
 const username='fixture-'+Date.now().toString(36);
 const registration=await page.evaluate(async username=>{const r=await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'register',username,name:'Synthetic extension fixture',password:'synthetic extension test passphrase 2026'})});return {status:r.status};},username);
 assert.equal(registration.status,201);fixtureCreated=true;
 const account=await page.evaluate(async()=>{const r=await fetch('/api/account');return (await r.json()).user?.username;});assert.equal(account,username,'Browser session cookie must work');
 const browser=context.browser(),cdp=await browser.newBrowserCDPSession();
 await cdp.send('Extensions.loadUnpacked',{path:extension});const {extensions}=await cdp.send('Extensions.getExtensions');const loaded=extensions.find(e=>e.name==='Professional Toolkit Capture');assert.ok(loaded,'Packaged extension must load');
 const popup=await context.newPage();await popup.goto(`chrome-extension://${loaded.id}/popup.html`);await popup.getByLabel('Toolkit website origin').fill(base);
 await popup.getByRole('button',{name:'Connect account',exact:true}).click();await popup.getByText(`Connected to @${username}`,{exact:false}).waitFor();
 const source=await context.newPage();await source.route('https://www.linkedin.com/**',route=>route.fulfill({contentType:'text/html',body:'<html><head><title>Fixture profile</title></head><body><main><h1>Fixture Cloud Engineer</h1><p>I help clients build reliable cloud systems. I delivered 12 projects with an auditable testing process. Message me for a portfolio and an engineering consultation.</p><input type="password" value="NOT_CAPTURED"></main></body></html>'}));
 await source.goto('https://www.linkedin.com/in/synthetic-extension-fixture');
 const targets=await cdp.send('Target.getTargets',{filter:[{type:'tab',exclude:false}]});const info={targetInfo:targets.targetInfos.find(t=>t.url.includes('/in/synthetic-extension-fixture'))};assert.ok(info.targetInfo,'Source tab target');await cdp.send('Extensions.triggerAction',{id:loaded.id,targetId:info.targetInfo.targetId});
 // The action grants activeTab. Exercise the actual serialized extractor through Chrome scripting.
 const captured=await popup.evaluate(async({targetId})=>{
   const tabs=await chrome.tabs.query({});const tab=tabs.find(t=>t.url?.includes('/in/synthetic-extension-fixture'));if(!tab)throw Error('Source tab unavailable');
   const module=await import(chrome.runtime.getURL('capture-page.mjs'));
   const [result]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:module.capturePage});return result.result;
 },{targetId:info.targetInfo.targetId});
 assert.equal(captured.text.includes('NOT_CAPTURED'),false);assert.ok(captured.text.includes('12 projects'));
 // Deliver via the same packaged bridge function, with browser cookies staying on the website.
 const nonce='a'.repeat(32),destination=await context.newPage();await destination.goto(base+'/capture#handoff='+nonce);
 const destId=await popup.evaluate(async base=>(await chrome.tabs.query({url:base+'/*'})).find(t=>t.url?.includes('#handoff='))?.id,base);assert.ok(destId);
 await popup.evaluate(async({destId,snapshot,nonce})=>{const module=await import(chrome.runtime.getURL('connection.mjs'));await chrome.scripting.executeScript({target:{tabId:destId},world:'MAIN',func:module.handoffToWebsite,args:[{channel:'professional-toolkit.capture.v1',type:'capture',nonce,snapshot,prompt:'Review cloud migration experience.'}]});},{destId,snapshot:captured,nonce});
 
 await destination.waitForFunction(()=>document.querySelector('textarea')?.value.includes('12 projects'));
 await destination.getByRole('button',{name:'Run local review',exact:true}).click();await destination.getByRole('button',{name:'Save privately to account'}).click();await destination.getByRole('status').filter({hasText:'Saved privately'}).waitFor();
 await popup.getByRole('button',{name:'Sync saved review titles'}).click();await popup.locator('#reviews button').first().waitFor();assert.ok((await popup.locator('#reviews').innerText()).includes('Fixture Cloud Engineer'));
}finally{
 try{if(fixtureCreated){const cleanup=await context.newPage();await cleanup.goto(base+'/account');const status=await cleanup.evaluate(async()=>(await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',currentPassword:'synthetic extension test passphrase 2026'})})).status);assert.equal(status,200,'Own synthetic account must be deleted before PASS.');}}finally{await context.close();}
}
console.log('PASS: loaded extension account connection, activeTab capture, packaged handoff, private save and saved-title sync; own synthetic account deleted. Exact toolkit origin permission is pre-granted only in the isolated fixture; real profiles and permission prompts need owner acceptance.');
