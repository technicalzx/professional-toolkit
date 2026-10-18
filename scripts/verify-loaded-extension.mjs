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
let fixtureCreated=false,releaseDestination=async()=>{};
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
 const popup=await context.newPage();await popup.goto(`chrome-extension://${loaded.id}/popup.html`);await popup.getByText('Account connection & saved reviews',{exact:true}).click();await popup.getByLabel('Toolkit website origin').fill(base);
 await popup.getByRole('button',{name:'Connect account',exact:true}).click();await popup.getByText(`Connected to @${username}`,{exact:false}).waitFor();
 const source=await context.newPage();await source.route('https://www.linkedin.com/**',route=>route.fulfill({contentType:'text/html',body:'<html><head><title>Fixture profile</title></head><body><main><h1>Fixture Cloud Engineer</h1><p>I help clients build reliable cloud systems. I delivered 12 projects with an auditable testing process. SYNTHETIC_PRIVATE_MARKER Message me for a portfolio and an engineering consultation.</p><h2>SYNTHETIC_HEADING_MARKER</h2><input type="password" value="NOT_CAPTURED"></main></body></html>'}));
 await source.goto('https://www.linkedin.com/in/synthetic-extension-fixture');
 const targets=await cdp.send('Target.getTargets',{filter:[{type:'tab',exclude:false}]});const info={targetInfo:targets.targetInfos.find(t=>t.url.includes('/in/synthetic-extension-fixture'))};assert.ok(info.targetInfo,'Source tab target');await cdp.send('Extensions.triggerAction',{id:loaded.id,targetId:info.targetInfo.targetId});
 // Use the real popup capture/send controls, including native disabled inputs.
 await source.bringToFront();
 await popup.evaluate(()=>document.getElementById('capture').click());
 await popup.waitForFunction(()=>document.getElementById('text').value.includes('12 projects'));
 const capturedText=await popup.getByLabel('Review and redact captured text').inputValue();
 assert.equal(capturedText.includes('NOT_CAPTURED'),false);
 async function exported(page,name){const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name,exact:true}).click()]);return JSON.parse(await readFile(await download.path(),'utf8'));}
 const rawSnapshot=await exported(popup,'Download JSON');
 assert.ok(rawSnapshot.headings.includes('SYNTHETIC_HEADING_MARKER'),'Fixture must exercise hidden heading metadata.');
 const redact=value=>value.replaceAll('SYNTHETIC_PRIVATE_MARKER','').replaceAll('SYNTHETIC_HEADING_MARKER','');
 await popup.getByLabel('Review and redact captured text').fill(redact(capturedText));
 if(process.env.TOOLKIT_BROWSER_OUTPUT){await mkdir(process.env.TOOLKIT_BROWSER_OUTPUT,{recursive:true});await popup.setViewportSize({width:440,height:980});await popup.screenshot({path:join(process.env.TOOLKIT_BROWSER_OUTPUT,'capture-approval-popup.png'),fullPage:true});}
 const approvedExport=await exported(popup,'Download JSON');
 assert.deepEqual(approvedExport.headings,[],'Popup JSON must discard heading metadata after redaction.');
 assert.equal(JSON.stringify(approvedExport).includes('SYNTHETIC_HEADING_MARKER'),false);
 await popup.locator('#consent').check();
 await popup.getByLabel('Your review request').fill('Review cloud migration experience.');
 assert.equal(await popup.locator('#consent').isChecked(),false,'Changing the request must require fresh approval.');
 assert.equal(await popup.locator('#send').isDisabled(),true);
 await popup.locator('#consent').check();
 await popup.getByLabel('Toolkit website origin').fill(base+'/');
 assert.equal(await popup.locator('#consent').isChecked(),false,'Changing the recipient must require fresh approval.');
 assert.equal(await popup.locator('#send').isDisabled(),true);
 await popup.locator('#consent').check();
 // Delay the readiness response in this isolated popup fixture. Native Chrome
 // still captures, opens the real destination, injects and acknowledges delivery.
 await popup.evaluate(()=>{
   const original=chrome.tabs.get.bind(chrome.tabs);
   const fixture={waiting:false,resume:()=>{}};
   window.__toolkitApprovalFixture=fixture;
   chrome.tabs.get=async id=>{
     const tab=await original(id);
     if(tab.url?.includes('/capture#handoff=')&&!fixture.waiting){
       fixture.waiting=true;
       await new Promise(resolve=>{fixture.resume=resolve;});
       chrome.tabs.get=original;
     }
     return tab;
   };
 });
 releaseDestination=()=>popup.evaluate(()=>window.__toolkitApprovalFixture?.resume());
 await popup.getByRole('button',{name:'Open profile feedback',exact:true}).click();
 await popup.waitForFunction(()=>window.__toolkitApprovalFixture?.waiting);
 for(const id of ['title','text','prompt','origin','consent'])assert.equal(await popup.locator('#'+id).isDisabled(),true,id+' must stay locked while the toolkit loads.');
 assert.equal(await popup.locator('#send').isDisabled(),true);
 await releaseDestination();
 await popup.getByRole('status').filter({hasText:'Snapshot transferred'}).waitFor();
 for(const id of ['title','text','prompt','origin','consent'])assert.equal(await popup.locator('#'+id).isDisabled(),false,id+' must unlock after acknowledgement.');
 const destination=context.pages().find(p=>p.url().startsWith(base+'/capture#handoff='));assert.ok(destination,'Actual popup must open the feedback page.');
 await destination.waitForFunction(()=>document.querySelector('textarea')?.value.includes('12 projects'));
 assert.equal((await destination.locator('textarea').first().inputValue()).includes('SYNTHETIC_PRIVATE_MARKER'),false,'Only the redacted approved text must arrive.');
 const transferred=await exported(destination,'Download snapshot JSON');
 assert.deepEqual(transferred.headings,[],'Popup handoff must discard redacted headings.');
 // Import the original synthetic capture and redact again in the website editor.
 await destination.getByLabel('Import page snapshot or saved review JSON').setInputFiles({name:'synthetic-capture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(rawSnapshot))});
 const sourceEditor=destination.getByLabel('Review and redact snapshot content (80–20,000 characters)');
 await sourceEditor.waitFor();
 await destination.waitForFunction(()=>document.querySelector('textarea')?.value.includes('SYNTHETIC_HEADING_MARKER'));
 await sourceEditor.fill(redact(await sourceEditor.inputValue()));
 const websiteExport=await exported(destination,'Download snapshot JSON');
 assert.deepEqual(websiteExport.headings,[],'Website JSON must discard heading metadata after redaction.');
 assert.equal(JSON.stringify(websiteExport).includes('SYNTHETIC_HEADING_MARKER'),false);
 await destination.getByRole('button',{name:'Run local review',exact:true}).click();await destination.getByRole('button',{name:'Save privately to account'}).click();await destination.getByRole('status').filter({hasText:'Saved privately'}).waitFor();
 const savedReview=await exported(destination,'Download review JSON');
 assert.equal(JSON.stringify(savedReview).includes('SYNTHETIC_HEADING_MARKER'),false,'Reviewed/exported source must not retain redacted heading text.');
 await popup.getByRole('button',{name:'Sync saved review titles'}).click();await popup.locator('#reviews button').first().waitFor();assert.ok((await popup.locator('#reviews').innerText()).includes('Fixture Cloud Engineer'));
}finally{
 await releaseDestination();
 try{if(fixtureCreated){const cleanup=await context.newPage();await cleanup.goto(base+'/account');const status=await cleanup.evaluate(async()=>(await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',currentPassword:'synthetic extension test passphrase 2026'})})).status);assert.equal(status,200,'Own synthetic account must be deleted before PASS.');}}finally{await context.close();}
}
console.log('PASS: loaded extension actual popup capture/send, fresh request/recipient approval, delayed-transfer input locking, redacted handoff, account connection, private save and saved-title sync; own synthetic account deleted. Exact toolkit origin permission is pre-granted only in the isolated fixture; real profiles and permission prompts need owner acceptance.');
