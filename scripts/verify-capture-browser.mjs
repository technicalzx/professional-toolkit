// Optional browser acceptance check. Supply a Playwright module path if not installed locally.
import {createRequire} from 'node:module';
import {capturePage} from '../extension/capture-page.mjs';
import {handoffToWebsite} from '../extension/connection.mjs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.TOOLKIT_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.TOOLKIT_CHROME?{executablePath:process.env.TOOLKIT_CHROME}:{})});
try{
 const context=await browser.newContext();
 const page=await context.newPage();
 await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:`<html><head><title>Fixture profile</title></head><body><nav>PRIVATE_NAVIGATION</nav><main><h1>Fixture Cloud Engineer</h1><p>I help clients build reliable cloud systems. I delivered 12 projects and have 4 years of experience. View my portfolio and message me for more details.</p><div style="display:none">HIDDEN_SECRET</div><div style="visibility:hidden"><p>HIDDEN_ANCESTOR</p></div><form><label>FORM_SECRET<input value="PASSWORD_SECRET"></label></form><textarea>TEXTAREA_SECRET</textarea><div contenteditable>EDITABLE_SECRET</div><div role="dialog">DIALOG_SECRET</div></main><aside>PRIVATE_SIDEBAR</aside></body></html>`}));
 for(const url of ['https://www.linkedin.com/in/synthetic-fixture','https://www.fiverr.com/synthetic-fixture','https://www.upwork.com/freelancers/synthetic-fixture','https://example.com/portfolio']){
  await page.goto(url);const value=await page.evaluate(capturePage);assert.ok(value.text.includes('12 projects'));assert.equal(value.text.includes('SECRET'),false);assert.equal(value.text.includes('PRIVATE_'),false);assert.equal(value.text.includes('HIDDEN_'),false);assert.equal(value.headings[0],'Fixture Cloud Engineer');
 }
 for(const url of ['https://www.linkedin.com/messaging','https://www.upwork.com/messages','https://www.fiverr.com/inbox']){await page.goto(url);await assert.rejects(()=>page.evaluate(capturePage),/profile|messages/i);}
 await page.goto('https://toolkit.example/capture');
 await page.evaluate(()=>window.addEventListener('message',event=>{if(event.data?.type==='capture')window.postMessage({...event.data,type:'received'},location.origin);}));
 assert.equal(await page.evaluate(handoffToWebsite,{channel:'professional-toolkit.capture.v1',type:'capture',nonce:'a'.repeat(32)}),true);
 if(process.env.TOOLKIT_PREVIEW_URL){
  await page.unroute('**/*');
  const base=process.env.TOOLKIT_PREVIEW_URL;
  await page.goto(base+'/capture');await page.getByRole('heading',{name:'Review the page you can see.'}).waitFor();
  await page.getByLabel('Source page URL').fill('https://www.linkedin.com/in/synthetic-fixture');await page.getByLabel('Page/profile title').fill('Fixture Cloud Engineer');
  await page.getByLabel('Review and redact snapshot content').fill('I help clients build reliable cloud systems. I delivered 12 projects and have 4 years of experience. View my portfolio and message me for details.');
  await page.getByRole('button',{name:'Run local review',exact:true}).click();await page.getByRole('heading',{name:'Observed text checks'}).waitFor();
  await page.getByRole('button',{name:'Save privately to account'}).isDisabled().then(v=>assert.equal(v,true));
  await page.screenshot({path:process.env.TOOLKIT_SCREENSHOT||'capture-preview.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  console.log('Website local-review and narrow-screen checks passed.');
 }
 console.log('Synthetic profile extraction, privacy exclusions, private-page rejection and handoff checks passed.');
 await context.close();
}finally{await browser.close();}
