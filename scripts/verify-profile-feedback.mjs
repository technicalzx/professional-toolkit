// Opt-in live inference acceptance; uses only this run's synthetic account and profile.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.TOOLKIT_PLAYWRIGHT_MODULE||'playwright');
const base=process.env.TOOLKIT_PREVIEW_URL;
if(process.env.TOOLKIT_VERIFY_LIVE_AI!=='1'||!base||new URL(base).protocol!=='https:')throw Error('Explicit live AI verification and the intended HTTPS test deployment are required. Two bounded inference requests will be made.');
const output=process.env.TOOLKIT_BROWSER_OUTPUT;
if(output)await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.TOOLKIT_CHROME?{executablePath:process.env.TOOLKIT_CHROME}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage();
page.setDefaultTimeout(45000);
const password='Synthetic feedback '+crypto.randomUUID();let created=false,passed=false;const results=[];
const text='I help small businesses automate cloud infrastructure using Terraform and GitHub Actions. My services include infrastructure as code, CI/CD pipeline setup, Docker deployments and documented handover. I have completed three personal cloud deployment projects and published configuration examples in my portfolio. I explain deployment decisions and include a verification checklist. Message me with your infrastructure requirements to discuss a project.';
try{
 await page.goto(base+'/capture');
 const registration=await page.evaluate(async password=>{const r=await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'register',username:'qa-feedback-'+crypto.randomUUID().slice(0,8),name:'Synthetic profile feedback',password})});return r.status;},password);assert.equal(registration,201);created=true;await page.reload();
 await page.getByText(/Signed in as @qa-feedback-/).waitFor();
 await page.getByLabel('Source page URL',{exact:true}).fill('https://www.fiverr.com/synthetic-cloud-profile');
 await page.getByLabel('Page/profile title',{exact:true}).fill('Synthetic Cloud Builder');
 await page.getByLabel('Review and redact snapshot content (80–20,000 characters)',{exact:true}).fill(text);
 async function review(prompt){
  await page.getByRole('textbox',{name:/^Your review request/}).fill(prompt);
  await page.getByRole('checkbox',{name:/Cloudflare AI model/}).check();
  const ready=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/capture/review'&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Get AI profile feedback',exact:true}).click();
  const response=await ready,result=await response.json();assert.equal(response.status(),200,JSON.stringify(result));
  const report=result.report;assert.equal(report.mode,'ai');assert.equal(report.model,'@cf/meta/llama-3.1-8b-instruct-fp8-fast');assert.equal(report.request,prompt);assert.equal(report.source.text,text);
  assert.ok(report.summary.length>30);assert.ok(report.improvedDraft.length>40);assert.ok(!/\b(expert|seasoned|senior|certified)\b/i.test(report.improvedDraft),'Do not upgrade three personal projects into unsupported seniority.');assert.ok(report.nextSteps.length>=1);assert.ok(report.findings.length>=1);assert.ok(report.findings.every(f=>text.includes(f.quote)));
  await page.getByRole('heading',{name:'Suggested profile rewrite',exact:true}).waitFor();assert.equal(await page.getByRole('textbox',{name:/^Edit your improved draft/}).inputValue(),report.improvedDraft);
  results.push(report);return report;
 }
 const first=await review('Critique my positioning for small-business DevOps clients. Rewrite my headline and About section using only my supplied facts. Give practical next steps.');
 const edited=first.improvedDraft+' [Synthetic owner edit]';await page.getByRole('textbox',{name:/^Edit your improved draft/}).fill(edited);
 const saving=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/reports'&&r.request().method()==='POST');await page.getByRole('button',{name:'Save privately to account',exact:true}).click();assert.equal((await saving).status(),201);
 const saved=await page.evaluate(async()=>(await(await fetch('/api/reports')).json()).reports.find(r=>r.kind==='captured-review'));assert.equal(saved.improvedDraft,edited);assert.equal(saved.draftEdited,true);
 await page.goto(base+'/capture?report='+encodeURIComponent(saved.cloudId));await page.getByRole('textbox',{name:/^Edit your improved draft/}).waitFor();assert.equal(await page.getByRole('textbox',{name:/^Edit your improved draft/}).inputValue(),edited);
 const second=await review('Write a concise Fiverr gig title and three service deliverables for Terraform and CI/CD automation, using only my supplied facts.');assert.notEqual(second.improvedDraft,first.improvedDraft);assert.notEqual(second.summary,first.summary);
 if(output){await page.screenshot({path:path.join(output,'profile-feedback-desktop.png'),fullPage:true});await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(output,'profile-feedback-mobile.png'),fullPage:true});await writeFile(path.join(output,'profile-feedback-synthetic.json'),JSON.stringify({reports:results,editedDraftRestored:true},null,2));}
 passed=true;
}finally{
 try{if(created){const status=await page.evaluate(async password=>(await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',currentPassword:password})})).status,password);assert.equal(status,200,'Own synthetic account cleanup must pass before acceptance.');}}finally{await context.close();await browser.close();}
}
if(passed)console.log('PASS: two distinct live Cloudflare AI profile requests, exact source quotes, editable rewrite, next steps, private save/reopen, desktop/mobile and synthetic account deletion.');
