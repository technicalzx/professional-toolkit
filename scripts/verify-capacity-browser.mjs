// Shared-capacity acceptance uses fresh contexts and synthetic project/configuration records only.
import {createRequire} from 'node:module';
import {readFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.TOOLKIT_PLAYWRIGHT_MODULE||'playwright');
const base=process.env.TOOLKIT_PREVIEW_URL||'http://127.0.0.1:8791';
const origin=new URL(base).origin;
const output=process.env.TOOLKIT_BROWSER_OUTPUT;
if(output)await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.TOOLKIT_CHROME?{executablePath:process.env.TOOLKIT_CHROME}:{})});
let context,page,password,cleanupError,completed=false;
try{
  context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});page=await context.newPage();const errors=[];
  page.on('pageerror',failure=>errors.push(failure.message));
  const projectKey='professional-toolkit-projects-v1',capacityKey='professional-toolkit-capacity-v1';
  const scenarioTitle='Synthetic shared commitments';
  const sourceTitles=['Synthetic client commitment','Synthetic study commitment'];
  async function createProject(title,audience){
    if(audience==='student')await page.locator('.pw-audience').filter({hasText:'Students'}).click();
    await page.getByRole('button',{name:'New project',exact:true}).click();const dialog=page.getByRole('dialog');
    await dialog.getByLabel('Project name',{exact:true}).fill(title);await dialog.getByLabel('Brief · one deliverable per line',{exact:true}).fill(title==='Synthetic client commitment'?'Deliver synthetic client work':'Produce synthetic study demonstration');
    await dialog.getByRole('button',{name:'Create project',exact:true}).click();await page.getByRole('heading',{name:title,exact:true}).waitFor();
    await page.getByRole('spinbutton',{name:'Planning days',exact:true}).fill('2');
    await page.getByRole('spinbutton',{name:'Hours per day',exact:true}).fill('4');
    await page.getByRole('button',{name:'Delivery board',exact:true}).click();
    await page.getByLabel('t1_work hours',{exact:true}).fill('5');
    for(const id of ['t1_work','t1_check'])await page.getByLabel(id+' due day',{exact:true}).fill('2');
    await page.waitForFunction(({key,title})=>{try{const entry=JSON.parse(localStorage.getItem(key)||'{"projects":[]}').projects.find(entry=>entry.project.title===title);const p=entry?.project;return p?.days===2&&p.hoursPerDay===4&&p.tasks.length===2&&p.tasks.every(task=>task.dueDay===2)&&p.tasks.find(task=>task.id==='t1_work')?.hours===5;}catch{return false;}},{key:projectKey,title});
    await page.getByRole('button',{name:'All projects',exact:true}).click();
  }
  const sourceState=()=>page.evaluate(key=>JSON.stringify(JSON.parse(localStorage.getItem(key)||'{"projects":[]}').projects.map(entry=>entry.project)),projectKey);
  const storedCapacity=()=>page.evaluate(key=>localStorage.getItem(key),capacityKey);
  async function run(){await page.getByRole('button',{name:'Run shared capacity check',exact:true}).click();await page.getByRole('region',{name:'Shared capacity results',exact:true}).waitFor();}
  const metric=async label=>page.locator('.pwc-metrics > div').filter({has:page.getByText(label,{exact:true})}).locator('strong').innerText();
  async function importConfig(value,name='synthetic-capacity.json'){await page.getByLabel('Import capacity scenario JSON',{exact:true}).setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(typeof value==='string'?value:JSON.stringify(value))});}
  async function savedNotice(){await page.getByRole('status').filter({hasText:'Scenario saved on this device.'}).waitFor();}
  await page.goto(base);await page.getByRole('heading',{name:/One workspace/}).waitFor();
  await createProject(sourceTitles[0],'freelancer');await createProject(sourceTitles[1],'student');
  const unchangedSources=await sourceState();let expectedSources=unchangedSources;
  const sources=JSON.parse(unchangedSources);assert.equal(sources.length,2);assert.equal(sources.every(project=>project.tasks.some(task=>task.id==='t1_work')),true);
  await page.getByRole('button',{name:'Shared capacity',exact:true}).click();
  await page.getByRole('heading',{name:'Make room for all your work.',exact:true}).waitFor();
  const boxes=await page.locator('.pwc-check input[type=checkbox]').evaluateAll(inputs=>inputs.map(input=>({width:input.getBoundingClientRect().width,height:input.getBoundingClientRect().height,right:input.getBoundingClientRect().right,labelLeft:input.nextElementSibling.getBoundingClientRect().left})));
  assert.equal(boxes.length,2);assert.ok(boxes.every(box=>box.width===18&&box.height===18&&box.right<=box.labelLeft),'Project selection checkboxes must remain compact beside their labels.');
  await page.getByRole('textbox',{name:'Capacity scenario name',exact:true}).fill(scenarioTitle);
  await page.getByRole('spinbutton',{name:'Capacity horizon days',exact:true}).fill('999999999');
  await page.getByRole('button',{name:'Add day override',exact:true}).click();
  await page.getByRole('alert').first().waitFor();assert.equal(await page.locator('.pwc-adjustments fieldset').count(),0,'Invalid huge horizons must not allocate a day array.');
  await page.getByRole('spinbutton',{name:'Capacity horizon days',exact:true}).fill('2');
  await page.getByRole('spinbutton',{name:'Base hours per planning day',exact:true}).fill('4');
  await run();
  await page.getByRole('heading',{name:'Shared scheduling check found conflicts',exact:true}).waitFor();
  assert.equal(await metric('Open work demand'),'12 h');assert.equal(await metric('Shared capacity'),'8 h');
  assert.equal(await page.getByRole('cell',{name:/Fits alone/}).count(),2,'Each selected source project must fit by itself.');
  assert.ok(parseFloat(await metric('Unallocated work'))>0);
  const allocations=await page.getByRole('table',{name:'Daily shared allocations',exact:true}).innerText();
  for(const title of sourceTitles)assert.ok(allocations.includes(title));
  await page.getByRole('spinbutton',{name:'Base hours per planning day',exact:true}).fill('6');
  await page.getByRole('region',{name:'Shared capacity results',exact:true}).waitFor({state:'hidden'});
  await run();await page.getByRole('heading',{name:'Shared scheduling check fits the recorded capacity',exact:true}).waitFor();
  assert.equal(await metric('Unallocated work'),'0 h');
  await page.getByRole('button',{name:'Add day override',exact:true}).click();
  await page.getByRole('textbox',{name:'Day override 1 reason',exact:true}).fill('Synthetic planning break');
  await run();assert.equal(await metric('Shared capacity'),'6 h');
  await page.getByRole('heading',{name:'Shared scheduling check found conflicts',exact:true}).waitFor();
  await page.getByRole('button',{name:'Save capacity on device',exact:true}).click();await savedNotice();
  const originalStored=await storedCapacity();const workspace=JSON.parse(originalStored);assert.equal(workspace.scenarios.length,1);
  const canonical=workspace.scenarios[0];assert.equal(canonical.dayAdjustments[0].hours,0);
  assert.equal(canonical.projects.length,2);assert.equal(canonical.projects.some(ref=>'tasks' in ref||'sources' in ref||'timeEntries' in ref),false);
  await run();
  const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Download capacity Markdown',exact:true}).click();
  const markdown=await readFile(await(await downloading).path(),'utf8');assert.match(markdown,/planning|heuristic/i);assert.equal(markdown.includes('Synthetic planning break'),false,'Private day-override reasons must not enter the analysis Markdown.');
  const jsonDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Export capacity JSON',exact:true}).click();
  const exported=JSON.parse(await readFile(await(await jsonDownload).path(),'utf8'));assert.equal(exported.kind,'capacity-scenario');assert.equal('result' in exported,false);assert.equal('tasks' in exported,false);
  if(output)await page.screenshot({path:path.join(output,'capacity-shared.png'),fullPage:true});

  await importConfig({...canonical,projects:[...canonical.projects,{projectId:'missing-capacity-fixture',startDay:1,projectUpdatedAt:canonical.projects[0].projectUpdatedAt}]});
  await page.getByRole('heading',{name:'Missing project references',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Run shared capacity check',exact:true}).isDisabled(),true);
  assert.equal(await storedCapacity(),originalStored,'Loading an unsaved configuration must not overwrite saved scenarios.');
  await importConfig({...canonical,result:{totalDemandHours:999999,hasConflicts:false},tasks:['forged derived task']});
  await run();assert.equal(await metric('Open work demand'),'12 h');assert.equal(await metric('Shared capacity'),'6 h');
  await importConfig({...canonical,projects:canonical.projects.map(ref=>({...ref,projectUpdatedAt:'2020-01-01T00:00:00.000Z'}))});
  await page.getByRole('heading',{name:'Project copies changed',exact:true}).waitFor();
  await page.getByRole('button',{name:'Refresh project references',exact:true}).click();
  await page.getByRole('heading',{name:'Project copies changed',exact:true}).waitFor({state:'hidden'});
  await run();assert.equal(await metric('Open work demand'),'12 h');
  await importConfig({...canonical,days:0});await page.getByRole('alert').filter({hasText:/day/i}).first().waitFor();
  assert.equal(await page.getByRole('textbox',{name:'Capacity scenario name',exact:true}).inputValue(),scenarioTitle);
  assert.equal(await storedCapacity(),originalStored);
  await page.getByRole('textbox',{name:'Capacity scenario name',exact:true}).fill('Synthetic unsaved storage check');
  await page.evaluate(key=>{window.__capacityOriginalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(...args){if(this===localStorage&&args[0]===key)throw Error('Synthetic capacity storage failure');return window.__capacityOriginalSetItem.apply(this,args);};},capacityKey);
  try{await page.getByRole('button',{name:'Save capacity on device',exact:true}).click();await page.getByRole('alert').filter({hasText:/could not be saved/}).waitFor();assert.equal(await storedCapacity(),originalStored);assert.equal(await page.getByRole('status').filter({hasText:'Scenario saved on this device.'}).count(),0);assert.equal(await page.getByRole('textbox',{name:'Capacity scenario name',exact:true}).inputValue(),'Synthetic unsaved storage check');}
  finally{await page.evaluate(()=>{Storage.prototype.setItem=window.__capacityOriginalSetItem;delete window.__capacityOriginalSetItem;});}
  await page.getByRole('button',{name:scenarioTitle,exact:true}).click();
  for(let i=2;i<=5;i++){await page.getByRole('button',{name:'New capacity scenario',exact:true}).click();await page.getByRole('textbox',{name:'Capacity scenario name',exact:true}).fill('Synthetic extra capacity '+i);await page.getByRole('button',{name:'Save capacity on device',exact:true}).click();await savedNotice();}
  assert.equal(JSON.parse(await storedCapacity()).scenarios.length,5);
  await page.getByRole('button',{name:'New capacity scenario',exact:true}).click();await page.getByRole('textbox',{name:'Capacity scenario name',exact:true}).fill('Synthetic sixth capacity draft');
  await page.getByRole('button',{name:'Save capacity on device',exact:true}).click();await page.getByRole('alert').first().waitFor();assert.equal(JSON.parse(await storedCapacity()).scenarios.length,5);
  await page.getByRole('button',{name:scenarioTitle,exact:true}).click();
  page.once('dialog',confirmation=>confirmation.accept());await page.getByRole('button',{name:'Delete device scenario Synthetic extra capacity 5',exact:true}).click();
  assert.equal(JSON.parse(await storedCapacity()).scenarios.length,4);assert.equal(JSON.parse(await storedCapacity()).selectedId,canonical.id,'Deleting another scenario must retain the current saved selection.');
  await page.getByRole('button',{name:scenarioTitle,exact:true}).click();
  assert.equal(await sourceState(),unchangedSources,'Capacity editing must never mutate source project records.');
  await page.reload();await page.getByRole('button',{name:'Shared capacity',exact:true}).click();
  await page.waitForFunction(({key,id})=>JSON.parse(localStorage.getItem(key)||'{"selectedId":null}').selectedId===id,{key:capacityKey,id:canonical.id});
  await page.getByRole('textbox',{name:'Capacity scenario name',exact:true}).waitFor();assert.equal(await page.getByRole('textbox',{name:'Capacity scenario name',exact:true}).inputValue(),scenarioTitle);
  await run();assert.equal(await metric('Shared capacity'),'6 h');
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Shared-capacity view must fit a narrow screen.');
  await page.getByRole('spinbutton',{name:'Base hours per planning day',exact:true}).focus();await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('type')),'checkbox','Capacity controls must be reachable in order with the keyboard.');
  if(output)await page.screenshot({path:path.join(output,'capacity-mobile.png'),fullPage:true});
  if(process.env.TOOLKIT_VERIFY_ACCOUNT==='1'){
    const synthetic='Synthetic capacity acceptance '+crypto.randomUUID();
    const signin=await context.newPage();await signin.goto(base+'/account');
    const created=await signin.evaluate(async password=>(await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'register',username:'qa-'+crypto.randomUUID().slice(0,12),name:'Synthetic capacity acceptance',password})})).status,synthetic);
    assert.equal(created,201);password=synthetic;await signin.close();
    const accountOnly={...sources[0],id:'p-'+crypto.randomUUID(),title:'Synthetic account-only commitment'};
    const createdProject=await page.evaluate(async project=>(await fetch('/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project,baseline:null,baseRevision:0})})).status,accountOnly);
    assert.equal(createdProject,201);
    await page.getByRole('button',{name:'Refresh capacity account',exact:true}).click();await page.getByText(/Signed in as qa-/).waitFor();
    await importConfig({...canonical,projects:[...canonical.projects,{projectId:accountOnly.id,startDay:1,projectUpdatedAt:accountOnly.updatedAt}]});
    await page.getByRole('heading',{name:'Missing project references',exact:true}).waitFor();
    await page.evaluate(key=>{window.__capacityProjectSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(...args){if(this===localStorage&&args[0]===key)throw Error('Synthetic capacity project-load storage failure');return window.__capacityProjectSetItem.apply(this,args);};},projectKey);
    try{await page.getByRole('button',{name:'Load account project copies',exact:true}).click();await page.getByRole('alert').first().waitFor();assert.equal(await sourceState(),unchangedSources);assert.equal(await page.getByRole('status').filter({hasText:'Account project copies loaded.'}).count(),0);await page.getByRole('heading',{name:'Missing project references',exact:true}).waitFor();}
    finally{await page.evaluate(()=>{Storage.prototype.setItem=window.__capacityProjectSetItem;delete window.__capacityProjectSetItem;});}
    await page.getByRole('button',{name:'Load account project copies',exact:true}).click();
    await page.getByRole('status').filter({hasText:'Account project copies loaded.'}).waitFor();
    await page.getByRole('heading',{name:'Missing project references',exact:true}).waitFor({state:'hidden'});
    expectedSources=await sourceState();const loaded=JSON.parse(expectedSources);assert.equal(loaded.length,3);assert.equal(loaded.some(project=>project.id===accountOnly.id),true);
    for(const source of sources)assert.deepEqual(loaded.find(project=>project.id===source.id),source);
    await page.getByRole('button',{name:scenarioTitle,exact:true}).click();
    for(let i=0;i<2;i++){const saving=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/reports'&&response.request().method()==='POST');await page.getByRole('button',{name:'Save capacity account snapshot',exact:true}).click();assert.equal((await saving).status(),201);await page.getByRole('status').filter({hasText:'Private account snapshot saved.'}).waitFor();await page.getByRole('button',{name:'Save capacity account snapshot',exact:true}).waitFor({state:'visible'});}
    await page.waitForFunction(async()=>{const response=await fetch('/api/reports');const value=await response.json();return value.reports.filter(report=>report.kind==='capacity-scenario').length===2;});
    const reports=await page.evaluate(async()=>(await(await fetch('/api/reports')).json()).reports.filter(report=>report.kind==='capacity-scenario'));
    assert.equal(reports.length,2);assert.equal(reports[0].id,reports[1].id);assert.notEqual(reports[0].cloudId,reports[1].cloudId);
    for(const report of reports){assert.equal('tasks' in report,false);assert.equal('sources' in report,false);assert.equal('timeEntries' in report,false);assert.equal('result' in report,false);assert.equal(report.projects.every(ref=>Object.keys(ref).sort().join(',')==='projectId,projectUpdatedAt,startDay'),true);}
    await page.getByRole('button',{name:'Load account capacity snapshots',exact:true}).click();await page.getByRole('status').filter({hasText:'Account capacity snapshots loaded.'}).waitFor();
    await page.getByRole('button',{name:'Open account snapshot '+scenarioTitle,exact:true}).first().click();await run();
    page.once('dialog',confirmation=>confirmation.accept());await page.getByRole('button',{name:'Delete account capacity snapshot '+scenarioTitle,exact:true}).first().click();
    await page.getByRole('status').filter({hasText:'Account capacity snapshot deleted.'}).waitFor();
    assert.equal(await page.evaluate(async()=>(await(await fetch('/api/reports')).json()).reports.filter(report=>report.kind==='capacity-scenario').length),1);
  }
  assert.equal(await sourceState(),expectedSources);assert.deepEqual(errors,[]);completed=true;
}finally{
  if(password&&page)try{const status=await page.evaluate(async currentPassword=>(await fetch('/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',currentPassword})})).status,password);assert.equal(status,200,'Synthetic capacity account cleanup must succeed before PASS.');}catch(failure){cleanupError=failure;}
  if(context)await context.close();await browser.close();if(cleanupError)throw cleanupError;
}
if(completed)console.log('PASS: shared project capacity → individual/combined conflicts → overrides and resolution → canonical five-scenario storage/import/export → missing refs, storage failure, reload and mobile keyboard; source projects unchanged.');
