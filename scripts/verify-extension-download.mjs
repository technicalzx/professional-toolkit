// Public download/install journey only: no accounts, profile data or inference.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.TOOLKIT_PLAYWRIGHT_MODULE||'playwright');
const base=process.env.TOOLKIT_PREVIEW_URL||'http://127.0.0.1:8791';
const expected=JSON.parse(await readFile(new URL('../hosted-app/public/extension-release.json',import.meta.url),'utf8'));
const expectedZip=await readFile(new URL('../hosted-app/public/toolkit-capture-extension.zip',import.meta.url));
const output=process.env.TOOLKIT_BROWSER_OUTPUT;
if(output)await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.TOOLKIT_CHROME?{executablePath:process.env.TOOLKIT_CHROME}:{})});
try{
 const context=await browser.newContext({acceptDownloads:true,permissions:['clipboard-read','clipboard-write']});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 for(const [label,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
  await page.setViewportSize({width,height});
  await page.goto(base+'/');
  await page.locator('a[href="/extension"]:visible').first().click();
  await page.getByRole('heading',{name:'Your profile. A clearer next step.'}).waitFor();
  assert.match(await page.locator('.extension-release').textContent(),new RegExp(expected.version.replaceAll('.','\\.')));
  assert.equal(await page.getByRole('link',{name:'View GitHub source'}).getAttribute('href'),expected.sourceUrl);
  await page.getByRole('heading',{name:'Install in desktop Chrome'}).waitFor();
  await page.getByRole('heading',{name:'Update your extension'}).waitFor();
  const metadataResponse=await page.request.get(base+'/extension-release.json');
  assert.equal(metadataResponse.status(),200);
  assert.deepEqual(await metadataResponse.json(),expected,'Served release metadata must match the tested release.');
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'Download Chrome extension',exact:true}).click()]);
  assert.equal(download.suggestedFilename(),'toolkit-capture-extension.zip');
  const bytes=await readFile(await download.path());
  assert.deepEqual(bytes,expectedZip,'Website must distribute the actual tested extension.');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),expected.sha256);
  assert.equal(bytes.length,expected.sizeBytes);
  await page.getByRole('button',{name:'Copy Chrome extensions address'}).click();
  await page.getByRole('status').filter({hasText:'Chrome extensions address copied.'}).waitFor();
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'chrome://extensions');
  await page.getByRole('button',{name:'Copy website address'}).click();
  await page.getByRole('status').filter({hasText:'Toolkit website address copied.'}).waitFor();
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),new URL(base).origin);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Install guide must fit the viewport.');
  if(output){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:join(output,`extension-install-${label}.png`),fullPage:true});}
  await page.goto(base+'/capture');
  const captureDownload=page.getByRole('link',{name:'Download Chrome extension',exact:true});
  assert.ok(await captureDownload.isVisible(),'Capture download must be discoverable without opening details.');
  assert.equal(await captureDownload.getAttribute('href'),expected.downloadUrl);
  await page.getByRole('link',{name:'Install, update & view source'}).click();
  await page.getByRole('heading',{name:'Install in desktop Chrome'}).waitFor();
 }
 assert.deepEqual(errors,[],'The public download journey must have no uncaught page errors.');
 await context.close();
}finally{await browser.close();}
console.log('PASS: desktop/mobile home and capture discovery, current version/source, real ZIP downloads and checksum, copy actions and installation/update guide; no user data created.');
