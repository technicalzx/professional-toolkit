import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {comparePlans,restorePlan} from '../lib/toolkit/planner.mjs';
import {examplePlan} from '../lib/toolkit/workspace-catalog.mjs';
import {createCapacityScenario} from '../lib/projects/commitments.mjs';
import {makeCapacityAccountReport,parseCapacityAccountReports} from '../lib/projects/capacity-storage.mjs';
const require=createRequire(import.meta.url),wr=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare,convertV4MiniflareOptions}=wr('miniflare');
const pass='a unique long passphrase 2026';
test('first-party authentication and private reports in the Worker/D1 runtime',async t=>{
 const source=fs.readFileSync(new URL('../lib/auth/service.mjs',import.meta.url),'utf8');
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:source+'\nexport default {fetch(r,e){if(new URL(r.url).pathname==="/api/import")return authorizeImport(r,e.DB).then(x=>x||Response.json({ok:true}));return new URL(r.url).pathname==="/api/reports"?reportStore(r,e.DB):account(r,e.DB)}}',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB']}));
 try{
 const db=await mf.getD1Database('DB');
 const sql=fs.readFileSync(new URL('../drizzle/0000_swift_wendigo.sql',import.meta.url),'utf8');
 for(const q of sql.split('--> statement-breakpoint').map(x=>x.trim()).filter(Boolean))await db.prepare(q).run();
 let ip=1;
 async function call(data,cookie='',path='/api/account',method=data?'POST':'GET',extra={}){
  const r=await mf.dispatchFetch('https://toolkit.test'+path,{method,headers:{origin:'https://toolkit.test','content-type':'application/json','cf-connecting-ip':`192.0.2.${ip++}`,cookie,...extra},...(data?{body:JSON.stringify(data)}:{})});
  return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]||'',headers:r.headers};
 }
 let alice,bob,codes,second;
 await t.test('rejects cross-origin, malformed and weak registrations',async()=>{
  assert.equal((await call({action:'register'},'',undefined,undefined,{origin:'https://evil.test'})).status,403);
  assert.equal((await call({action:'register',username:'alice',name:'Alice',password:'short'})).status,400);
  assert.equal((await call({action:'register',username:'../alice',name:'Alice',password:pass})).status,400);
  assert.equal((await call({action:'register',username:'alice',name:'Alice',password:pass},'',undefined,undefined,{'content-type':'text/plain'})).status,415);
 });
 await t.test('registers with secure cookie and only hashed stored credentials',async()=>{
  alice=await call({action:'register',username:'Alice',name:'Alice',password:pass});assert.equal(alice.status,201);codes=alice.body.recoveryCodes;assert.equal(codes.length,6);
  for(const flag of ['HttpOnly','Secure','SameSite=Strict','Path=/','Max-Age=604800'])assert.ok(alice.headers.get('set-cookie').includes(flag));
  assert.match(alice.cookie,/^__Host-toolkit_session=/);assert.equal(alice.body.user.username,'alice');assert.ok(!alice.body.user.password);
  const row=await db.prepare('SELECT password FROM users WHERE username=?').bind('alice').first();assert.ok(row.password.startsWith('scrypt$32768$8$3$'));assert.ok(!row.password.includes(pass));
  const recovery=await db.prepare('SELECT hash FROM recovery_codes').all();assert.ok(recovery.results.every(r=>!codes.includes(r.hash)));
  const session=await db.prepare('SELECT hash FROM sessions').first();assert.notEqual(session.hash,alice.cookie.split('=')[1]);
 });
 await t.test('handles login, duplicates, profile and missing sessions',async()=>{
  assert.equal((await call()).body.user,null);
  assert.equal((await call({action:'register',username:'alice',name:'Alice',password:pass})).status,409);
  assert.equal((await call({action:'login',username:'alice',password:'wrong'})).status,401);
  assert.equal((await call({action:'login',username:'unknown',password:'wrong'})).body.error,'Username or password is incorrect.');
  second=await call({action:'login',username:'ALICE',password:pass});assert.equal(second.status,200);assert.notEqual(second.cookie,alice.cookie);
  assert.equal((await call({action:'profile',name:'New Alice'},alice.cookie)).body.user.name,'New Alice');
 });
 await t.test('isolates reports, prevents foreign deletes and rejects oversized bodies',async()=>{
  bob=await call({action:'register',username:'bob',name:'Bob',password:pass});assert.equal(bob.status,201);
  assert.equal((await call(null,'','/api/reports')).status,401);
  const saved=await call({report:{title:'Private work',kind:'audit',text:'Private detail'}},alice.cookie,'/api/reports');assert.equal(saved.status,201);
  assert.equal((await call(null,bob.cookie,'/api/reports')).body.reports.length,0);
  await call({id:saved.body.id},bob.cookie,'/api/reports','DELETE');
  assert.equal((await call(null,alice.cookie,'/api/reports')).body.reports.length,1);
  assert.equal((await call({report:{title:'Large',kind:'audit',text:'x'.repeat(70000)}},alice.cookie,'/api/reports')).status,413);
 });
 await t.test('workflow snapshots round-trip privately and reopen from inputs',async()=>{
  const input=examplePlan('student');
  const report={title:input.title,kind:'workflow-plan',tool:'workflow',input,result:comparePlans(input,25)};
  const saved=await call({report},alice.cookie,'/api/reports');assert.equal(saved.status,201);
  const aliceReports=(await call(null,alice.cookie,'/api/reports')).body.reports;
  const snapshot=aliceReports.find(r=>r.cloudId===saved.body.id);assert.ok(snapshot);
  assert.equal(restorePlan(snapshot).result.baseline.totalHours,18);
  assert.ok(!(await call(null,bob.cookie,'/api/reports')).body.reports.some(r=>r.cloudId===saved.body.id));
  await call({id:saved.body.id},bob.cookie,'/api/reports','DELETE');
  assert.ok((await call(null,alice.cookie,'/api/reports')).body.reports.some(r=>r.cloudId===saved.body.id));
  await call({id:saved.body.id},alice.cookie,'/api/reports','DELETE');
  assert.ok(!(await call(null,alice.cookie,'/api/reports')).body.reports.some(r=>r.cloudId===saved.body.id));
 });
 await t.test('capacity snapshots use private immutable reports without changing other tool readers',async()=>{
  const iso='2026-10-17T10:00:00.000Z';
  const config=createCapacityScenario([],{id:'c-account-fixture',title:'Private capacity fixture',days:2,hoursPerDay:4,projects:[{projectId:'private-project-reference',startDay:1,projectUpdatedAt:iso}]},iso);
  const report=makeCapacityAccountReport({...config,derived:{privateSource:'MUST_NOT_RETAIN'}});
  const ids=[];
  try{
   for(let i=0;i<2;i++){const saved=await call({report},alice.cookie,'/api/reports');assert.equal(saved.status,201);ids.push(saved.body.id);}
   assert.notEqual(ids[0],ids[1]);
   const input=examplePlan('student');const workflow=await call({report:{title:input.title,kind:'workflow-plan',tool:'workflow',input,result:comparePlans(input,25)}},alice.cookie,'/api/reports');assert.equal(workflow.status,201);ids.push(workflow.body.id);
   const response=(await call(null,alice.cookie,'/api/reports')).body;
   const parsed=parseCapacityAccountReports(response);assert.equal(parsed.snapshots.length,2);assert.equal(parsed.invalidCount,0);assert.deepEqual(parsed.snapshots[0].scenario,config);
   assert.equal(JSON.stringify(parsed).includes('MUST_NOT_RETAIN'),false);
   assert.equal(restorePlan(response.reports.find(r=>r.cloudId===workflow.body.id)).result.baseline.totalHours,18);
   assert.ok(response.reports.some(r=>r.kind==='audit'&&r.title==='Private work'));
   assert.equal(parseCapacityAccountReports((await call(null,bob.cookie,'/api/reports')).body).snapshots.length,0);
   await call({id:ids[0]},bob.cookie,'/api/reports','DELETE');
   assert.equal(parseCapacityAccountReports((await call(null,alice.cookie,'/api/reports')).body).snapshots.length,2);
   await call({id:ids[0]},alice.cookie,'/api/reports','DELETE');
   assert.equal(parseCapacityAccountReports((await call(null,alice.cookie,'/api/reports')).body).snapshots.length,1);
  }finally{for(const id of ids)await call({id},alice.cookie,'/api/reports','DELETE');}
 });
 await t.test('generic reports cannot list, forge or delete managed projects, and quotas remain separate',async()=>{
  const managedId=crypto.randomUUID(),fixtureIds=Array.from({length:48},()=>crypto.randomUUID());
  let addedReport;
  try{
   await db.prepare('INSERT INTO reports (id,user_id,content,created) VALUES (?,?,?,?)').bind(managedId,alice.body.user.id,JSON.stringify({kind:'project-workspace',revision:1,project:{id:managedId,title:'Protected synthetic project'},baseline:null}),1).run();
   const listing=(await call(null,alice.cookie,'/api/reports')).body.reports;
   assert.equal(listing.some(r=>r.cloudId===managedId),false);
   assert.equal((await call({report:{title:'Forged document',kind:'project-workspace',project:{id:managedId},revision:999}},alice.cookie,'/api/reports')).status,400);
   assert.equal((await call({id:managedId},alice.cookie,'/api/reports','DELETE')).status,409);
   assert.equal((await call({id:managedId},bob.cookie,'/api/reports','DELETE')).status,200);
   assert.equal(JSON.parse((await db.prepare('SELECT content FROM reports WHERE id=?').bind(managedId).first()).content).revision,1);
   // Alice already owns one ordinary report. Projects must not consume its remaining 49 slots.
   await db.batch(fixtureIds.map(id=>db.prepare('INSERT INTO reports (id,user_id,content,created) VALUES (?,?,?,?)').bind(id,alice.body.user.id,JSON.stringify({kind:'audit',title:'Synthetic quota fixture'}),1)));
   const saved=await call({report:{title:'Final ordinary report slot',kind:'audit'}},alice.cookie,'/api/reports');
   assert.equal(saved.status,201);addedReport=saved.body.id;
   assert.equal((await call(null,alice.cookie,'/api/reports')).body.reports.length,50);
   assert.equal((await call({report:{title:'Beyond ordinary report quota',kind:'audit'}},alice.cookie,'/api/reports')).status,409);
  }finally{
   await db.batch([managedId,...fixtureIds,...(addedReport?[addedReport]:[])].map(id=>db.prepare('DELETE FROM reports WHERE id=? AND user_id=?').bind(id,alice.body.user.id)));
  }
 });
 await t.test('revokes all sessions on password change',async()=>{
  assert.equal((await call({action:'password',currentPassword:'wrong',password:pass+'new'},alice.cookie)).status,401);
  assert.equal((await call({action:'password',currentPassword:pass,password:pass+'new'},alice.cookie)).status,200);
  assert.equal((await call(null,alice.cookie)).body.user,null);assert.equal((await call(null,second.cookie)).body.user,null);
  assert.equal((await call({action:'login',username:'alice',password:pass})).status,401);
 });
 await t.test('recovery is single-use, invalidates sessions and permits a fresh login',async()=>{
  second=await call({action:'login',username:'alice',password:pass+'new'});assert.equal(second.status,200);
  assert.equal((await call({action:'recover',username:'alice',code:codes[0],password:pass+'reset'})).status,200);
  assert.equal((await call(null,second.cookie)).body.user,null);
  assert.equal((await call({action:'recover',username:'alice',code:codes[0],password:pass+'reset'})).status,401);
  alice=await call({action:'login',username:'alice',password:pass+'reset'});assert.equal(alice.status,200);
  assert.equal((await call(null,alice.cookie)).body.recoveryCodesRemaining,5);
 });
 await t.test('rotates codes with password confirmation and logs out current session',async()=>{
  const r=await call({action:'recovery-codes',currentPassword:pass+'reset'},alice.cookie);assert.equal(r.status,200);assert.equal(r.body.recoveryCodes.length,6);
  const old=await db.prepare('SELECT count(*) AS n FROM recovery_codes WHERE user_id=?').bind(alice.body.user.id).first();assert.equal(old.n,6);
  assert.equal((await call({action:'logout'},alice.cookie)).status,200);assert.equal((await call(null,alice.cookie)).body.user,null);
 });
 await t.test('enforces expiry and account deletion cascades',async()=>{
  await db.prepare('UPDATE sessions SET expires=0 WHERE user_id=?').bind(bob.body.user.id).run();assert.equal((await call(null,bob.cookie)).body.user,null);
  bob=await call({action:'login',username:'bob',password:pass});
  await call({report:{title:'Bob report',kind:'audit'}},bob.cookie,'/api/reports');
  assert.equal((await call({action:'delete',currentPassword:'wrong'},bob.cookie)).status,401);
  assert.equal((await call({action:'delete',currentPassword:pass},bob.cookie)).status,200);
  assert.equal((await call(null,bob.cookie)).body.user,null);
  for(const table of ['sessions','recovery_codes','reports'])assert.equal((await db.prepare(`SELECT count(*) AS n FROM ${table} WHERE user_id=?`).bind(bob.body.user.id).first()).n,0);
 });
 await t.test('concurrent recovery cannot reuse a code and logout-all revokes fresh sessions',async()=>{
  const registered=await call({action:'register',username:'race-user',name:'Race',password:pass});
  const input={action:'recover',username:'race-user',code:registered.body.recoveryCodes[0],password:pass+'race'};
  const outcomes=await Promise.all([call(input),call(input)]);
  assert.equal(outcomes.filter(r=>r.status===200).length,1);
  assert.ok(outcomes.every(r=>[200,401,409].includes(r.status)));
  const one=await call({action:'login',username:'race-user',password:pass+'race'});
  const two=await call({action:'login',username:'race-user',password:pass+'race'});
  assert.equal((await call({action:'logout-all'},one.cookie)).status,200);
  assert.equal((await call(null,one.cookie)).body.user,null);
  assert.equal((await call(null,two.cookie)).body.user,null);
 });
 await t.test('import requires a session and reserves user/global quotas before network work',async()=>{
  assert.equal((await call({url:'https://example.com'},'','/api/import')).status,401);
  const u=await call({action:'register',username:'import-user',name:'Importer',password:pass});
  for(let i=0;i<5;i++)assert.equal((await call({url:'https://example.com'},u.cookie,'/api/import')).status,200);
  assert.equal((await call({url:'https://example.com'},u.cookie,'/api/import')).status,429);
  const key=createHash('sha256').update('import-global:'+Math.floor(Date.now()/1000/900)).digest('hex');
  await db.prepare('UPDATE auth_limits SET count=100 WHERE key=?').bind(key).run();
  const other=await call({action:'register',username:'second-import',name:'Other',password:pass});
  assert.equal((await call({url:'https://example.com'},other.cookie,'/api/import')).status,429);
 });
 await t.test('persistent account rate limit works across different IPs',async()=>{
  for(let i=0;i<12;i++)assert.equal((await call({action:'login',username:'rate-test',password:'wrong'})).status,401);
  assert.equal((await call({action:'login',username:'rate-test',password:'wrong'})).status,429);
 });
 }finally{await mf.dispose()}
});
