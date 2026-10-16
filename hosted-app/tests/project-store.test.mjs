import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {createProject,addProjectSource,linkProjectEvidence,reviseProjectSource,removeProjectSource} from '../lib/projects/engine.mjs';

const require=createRequire(import.meta.url),wranglerRequire=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare}=wranglerRequire('miniflare');

test('project account storage enforces ownership, revision concurrency and bounded private persistence',async t=>{
  const root=new URL('../',import.meta.url);
  const source=path=>fs.readFileSync(new URL(path,root),'utf8');
  const entry=`import {account,reportStore} from './lib/auth/service.mjs';
import {projectStore} from './lib/projects/store.mjs';
export default {fetch(r,e){const p=new URL(r.url).pathname;return p==='/api/account'?account(r,e.DB):p==='/api/reports'?reportStore(r,e.DB):projectStore(r,e.DB)}};`;
  const mf=new Miniflare({modules:[{type:'ESModule',path:'index.mjs',contents:entry},...['lib/auth/service.mjs','lib/projects/store.mjs','lib/projects/engine.mjs','lib/projects/evidence.mjs','lib/projects/workspace-evidence.mjs','lib/capture/snapshot.mjs','lib/toolkit/planner.mjs'].map(path=>({type:'ESModule',path,contents:source(path)}))],compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB']});
  try{
    const db=await mf.getD1Database('DB');
    for(const query of source('drizzle/0000_swift_wendigo.sql').split('--> statement-breakpoint').map(x=>x.trim()).filter(Boolean))await db.prepare(query).run();
    const call=async(data,cookie='',method=data?'POST':'GET',extra={},path='/api/projects')=>{
      const response=await mf.dispatchFetch('https://toolkit.test'+path,{method,headers:{origin:'https://toolkit.test','content-type':'application/json',cookie,...extra},...(data?{body:JSON.stringify(data)}:{})});
      return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0],headers:response.headers};
    };
    const register=async username=>call({action:'register',username,name:'Synthetic Fixture',password:'synthetic project fixture passphrase'},'','POST',{},'/api/account');
    let sequence=0;
    const fixture=(title='Client delivery')=>createProject({id:`fixture-project-${++sequence}`,title,audience:'freelancer',brief:'Build an accessible onboarding page. Include a contact form with validation. Deliver source files and setup instructions.',days:10,hoursPerDay:4,hourlyRate:50,currency:'USD'});
    const alice=await register('project-alice'),bob=await register('project-bob');
    assert.equal(alice.status,201);assert.equal(bob.status,201);
    let original,revisionTwo;

    await t.test('requires session, same origin and JSON before changing records',async()=>{
      original=fixture();
      assert.equal((await call()).status,401);
      assert.equal((await call({project:original,baseRevision:0})).status,401);
      assert.equal((await call({project:original,baseRevision:0},alice.cookie,'POST',{origin:'https://foreign.test'})).status,403);
      assert.equal((await call({project:original,baseRevision:0},alice.cookie,'POST',{'content-type':'text/plain'})).status,415);
      assert.equal((await call({project:original,baseRevision:0},alice.cookie,'POST',{'sec-fetch-site':'cross-site'})).status,403);
      assert.equal((await call({project:original},alice.cookie)).status,400);
      assert.equal((await call({project:original,baseRevision:-1},alice.cookie)).status,400);
      assert.equal((await call(null,alice.cookie,'PUT')).status,405);
      assert.equal((await call(null,alice.cookie)).body.projects.length,0);
    });

    await t.test('creates private normalized documents with a durable baseline',async()=>{
      const saved=await call({project:original,baseline:original,baseRevision:0},alice.cookie);
      assert.equal(saved.status,201);assert.equal(saved.body.revision,1);
      assert.deepEqual(saved.body.project,saved.body.baseline);
      assert.equal(saved.headers.get('cache-control'),'no-store');
      const listing=(await call(null,alice.cookie)).body.projects;
      assert.equal(listing.length,1);assert.deepEqual(listing[0],saved.body);
      assert.equal((await call(null,bob.cookie)).body.projects.length,0);
      assert.equal((await call({project:original,baseRevision:0},alice.cookie)).status,409);
      assert.equal((await call({project:original,baseRevision:0},bob.cookie)).status,409);
      assert.equal((await call({id:original.id,baseRevision:1},bob.cookie,'DELETE')).status,409);
      assert.equal((await call(null,alice.cookie)).body.projects.length,1);
    });

    await t.test('concurrent editors cannot overwrite each other with the same revision',async()=>{
      const outcomes=await Promise.all(['First editor','Second editor'].map(title=>call({project:{...original,title},baseline:original,baseRevision:1},alice.cookie)));
      assert.deepEqual(outcomes.map(x=>x.status).sort(),[200,409]);
      revisionTwo=outcomes.find(x=>x.status===200).body;
      assert.equal(revisionTwo.revision,2);assert.equal(revisionTwo.baseline.title,original.title);
      assert.deepEqual((await call(null,alice.cookie)).body.projects,[revisionTwo]);
      assert.equal((await call({project:original,baseline:original,baseRevision:1},alice.cookie)).status,409);
      assert.equal((await call({id:original.id,baseRevision:1},alice.cookie,'DELETE')).status,409);
    });

    await t.test('rejects invalid projects, foreign baselines and oversized bodies without mutation',async()=>{
      assert.equal((await call({project:{id:original.id},baseRevision:2},alice.cookie)).status,400);
      assert.equal((await call({project:original,baseline:fixture('Other project'),baseRevision:2},alice.cookie)).status,400);
      assert.equal((await call({project:original,baseline:{...original,audience:'student'},baseRevision:2},alice.cookie)).status,400);
      assert.equal((await call({project:original,baseRevision:2,padding:'x'.repeat(121000)},alice.cookie)).status,413);
      const large={...original,assumptions:Array(20).fill('Synthetic storage bound fixture '.repeat(55))};
      assert.equal((await call({project:large,baseline:large,baseRevision:2},alice.cookie)).status,413);
      assert.deepEqual((await call(null,alice.cookie)).body.projects,[revisionTwo]);
    });

    await t.test('a separate account can create and delete its own projects only',async()=>{
      const project=fixture('Another private project');
      assert.equal((await call({project,baseRevision:0},bob.cookie)).status,201);
      assert.equal((await call(null,bob.cookie)).body.projects.length,1);
      assert.equal((await call({id:project.id,baseRevision:1},bob.cookie,'DELETE')).status,200);
      assert.equal((await call(null,bob.cookie)).body.projects.length,0);
      assert.deepEqual((await call(null,alice.cookie)).body.projects,[revisionTwo]);
    });

    await t.test('source snapshots and exact evidence links round-trip privately, and redaction or deletion removes source content from project and baseline',async()=>{
      const quote='Synthetic accepted contact form requirement.';
      const snapshot={schemaVersion:1,sourceUrl:'https://example.com/source-fixture?tracking=remove#section',title:'Synthetic source fixture',text:`${quote} This fixture describes an accessible client onboarding form with documented validation and error handling.`,headings:[],captureMethod:'manual-snapshot',capturedAt:'2026-10-17T07:00:00.000Z',unexpectedMetadata:'This field must be stripped.'};
      const imported=addProjectSource(fixture('Private source evidence'),snapshot);
      const sourceId=imported.sources[0].id;
      const requirement={type:'requirement',id:imported.requirements[0].id};
      const deliverable={type:'deliverable',id:imported.deliverables[0].id};
      const linked=linkProjectEvidence(linkProjectEvidence(imported,requirement,sourceId,quote),deliverable,sourceId,quote);
      let currentRevision=0;
      try{
        const saved=await call({project:linked,baseline:linked,baseRevision:0},alice.cookie);
        assert.equal(saved.status,201);currentRevision=saved.body.revision;
        assert.equal(saved.body.project.sources[0].snapshot.sourceUrl,'https://example.com/source-fixture');
        assert.equal(saved.body.project.sources[0].snapshot.unexpectedMetadata,undefined);
        for(const value of [saved.body.project,saved.body.baseline]){
          assert.equal(value.sources[0].snapshot.text,snapshot.text);
          assert.equal(value.requirements[0].evidenceLinks[0].quote,quote);
          assert.equal(value.deliverables[0].evidenceLinks[0].quote,quote);
          assert.equal(value.requirements[0].evidenceLinks[0].sourceId,sourceId);
        }
        const listing=(await call(null,alice.cookie)).body.projects;
        assert.deepEqual(listing.find(value=>value.project.id===linked.id),saved.body);
        assert.equal(JSON.stringify((await call(null,bob.cookie)).body).includes(quote),false);
        assert.equal((await call({project:{...linked,title:'Foreign overwrite'},baseline:linked,baseRevision:1},bob.cookie)).status,409);
        assert.equal((await call({id:linked.id,baseRevision:1},bob.cookie,'DELETE')).status,409);
        assert.equal((await call(null,alice.cookie,'GET',{},'/api/reports')).body.reports.some(value=>value.cloudId===linked.id),false);
        const forged=structuredClone(linked);
        forged.requirements[0].evidenceLinks[0].sourceRevision=0;
        assert.equal((await call({project:forged,baseline:linked,baseRevision:1},alice.cookie)).status,400);
        const privateRow=await db.prepare('SELECT content FROM reports WHERE id=? AND user_id=?').bind(linked.id,alice.body.user.id).first();
        assert.deepEqual(JSON.parse(privateRow.content).project,saved.body.project);

        const oldClientProject=structuredClone(saved.body.project);
        delete oldClientProject.sources;
        for(const record of [...oldClientProject.requirements,...oldClientProject.deliverables])delete record.evidenceLinks;
        const oldClient=await call({project:oldClientProject,baseline:saved.body.baseline,baseRevision:1},alice.cookie);
        assert.equal(oldClient.status,409);assert.equal(oldClient.body.code,'PROJECT_CLIENT_OUTDATED');
        assert.deepEqual((await call(null,alice.cookie)).body.projects.find(value=>value.project.id===linked.id),saved.body);
        assert.equal((await db.prepare('SELECT content FROM reports WHERE id=? AND user_id=?').bind(linked.id,alice.body.user.id).first()).content,privateRow.content);

        // A stale client baseline must be normalized by the server, not retain redacted content.
        const redactedSnapshot={...snapshot,text:'Synthetic redacted source now contains only public requirements. It records documented validation and accessibility checks without the removed sentence.',userEdited:true};
        const redacted=reviseProjectSource(saved.body.project,sourceId,redactedSnapshot);
        const revised=await call({project:redacted,baseline:saved.body.baseline,baseRevision:1},alice.cookie);
        assert.equal(revised.status,200);currentRevision=revised.body.revision;
        assert.equal(currentRevision,2);
        for(const value of [revised.body.project,revised.body.baseline]){
          assert.equal(value.sources[0].revision,2);
          assert.equal(value.sources[0].snapshot.text,redactedSnapshot.text);
          assert.equal(value.requirements[0].evidenceLinks[0].quote,'');
          assert.equal(value.deliverables[0].evidenceLinks[0].quote,'');
        }
        const afterRedaction=await db.prepare('SELECT content FROM reports WHERE id=? AND user_id=?').bind(linked.id,alice.body.user.id).first();
        assert.equal(afterRedaction.content.includes(quote),false);
        assert.equal(afterRedaction.content.includes(snapshot.text),false);
        assert.equal(JSON.stringify(revised.body).includes(quote),false);

        const removed=await call({project:removeProjectSource(revised.body.project,sourceId),baseline:saved.body.baseline,baseRevision:2},alice.cookie);
        assert.equal(removed.status,200);currentRevision=removed.body.revision;
        assert.equal(currentRevision,3);
        for(const value of [removed.body.project,removed.body.baseline]){
          assert.deepEqual(value.sources,[]);
          assert.equal(value.requirements[0].evidenceLinks[0].quote,'');
          assert.equal(value.deliverables[0].evidenceLinks[0].quote,'');
        }
        const afterRemoval=await db.prepare('SELECT content FROM reports WHERE id=? AND user_id=?').bind(linked.id,alice.body.user.id).first();
        assert.equal(afterRemoval.content.includes(redactedSnapshot.text),false);
        assert.equal(afterRemoval.content.includes(snapshot.text),false);
        assert.equal(afterRemoval.content.includes(quote),false);
        assert.equal(afterRemoval.content.includes('"snapshot"'),false);
        assert.deepEqual((await call(null,alice.cookie)).body.projects.find(value=>value.project.id===linked.id),removed.body);
      }finally{
        if(currentRevision)assert.equal((await call({id:linked.id,baseRevision:currentRevision},alice.cookie,'DELETE')).status,200);
      }
      assert.deepEqual((await call(null,alice.cookie)).body.projects,[revisionTwo]);
    });

    await t.test('quota is atomic even when two requests race for the final slot',async()=>{
      for(let i=1;i<19;i++)assert.equal((await call({project:fixture(`Private project ${i}`),baseRevision:0},alice.cookie)).status,201);
      const outcomes=await Promise.all([19,20].map(i=>call({project:fixture(`Concurrent project ${i}`),baseRevision:0},alice.cookie)));
      assert.deepEqual(outcomes.map(x=>x.status).sort(),[201,409]);
      assert.equal(outcomes.find(x=>x.status===409).body.code,'PROJECT_LIMIT');
      assert.equal((await call(null,alice.cookie)).body.projects.length,20);
      assert.equal((await call({id:original.id,baseRevision:2},alice.cookie,'DELETE')).status,200);
      assert.equal((await call({project:fixture('Replacement project'),baseRevision:0},alice.cookie)).status,201);
    });

    await t.test('per-account mutation quota rejects saves and deletes without changing projects and bounds cleanup',async()=>{
      const before=(await call(null,alice.cookie)).body.projects;
      const selected=before[0];
      const bucket=Math.floor(Date.now()/1000/900);
      const key=createHash('sha256').update(`project-write:${alice.body.user.id}:${bucket}`).digest('hex');
      await db.prepare('INSERT INTO auth_limits (key,count,expires) VALUES (?,100,?) ON CONFLICT(key) DO UPDATE SET count=100').bind(key,(bucket+1)*900).run();
      await db.prepare("WITH RECURSIVE counters(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM counters WHERE n<205) INSERT INTO auth_limits (key,count,expires) SELECT 'expired-project-test-'||n,1,0 FROM counters").run();
      const saved=await call({project:{...selected.project,title:'Must not persist'},baseline:selected.baseline,baseRevision:selected.revision},alice.cookie);
      assert.equal(saved.status,429);assert.equal(saved.body.code,'PROJECT_RATE_LIMIT');
      assert.equal((await db.prepare("SELECT count(*) AS total FROM auth_limits WHERE key LIKE 'expired-project-test-%'").first()).total,105);
      assert.equal((await call({id:selected.project.id,baseRevision:selected.revision},alice.cookie,'DELETE')).status,429);
      assert.equal((await db.prepare("SELECT count(*) AS total FROM auth_limits WHERE key LIKE 'expired-project-test-%'").first()).total,5);
      assert.deepEqual((await call(null,alice.cookie)).body.projects,before);
      // Another account has its own independent reservation bucket.
      const independent=fixture('Independent write quota');
      assert.equal((await call({project:independent,baseRevision:0},bob.cookie)).status,201);
      assert.equal((await call({id:independent.id,baseRevision:1},bob.cookie,'DELETE')).status,200);
    });

    await t.test('expired sessions cannot read, update or delete private projects',async()=>{
      const project=fixture('Session test');
      assert.equal((await call({project,baseRevision:0},bob.cookie)).status,201);
      await db.prepare('UPDATE sessions SET expires=0 WHERE user_id=?').bind(bob.body.user.id).run();
      for(const [data,method] of [[null,'GET'],[{project,baseRevision:1},'POST'],[{id:project.id,baseRevision:1},'DELETE']])assert.equal((await call(data,bob.cookie,method)).status,401);
      const count=await db.prepare("SELECT count(*) AS total FROM reports WHERE user_id=? AND json_extract(content,'$.kind')='project-workspace'").bind(bob.body.user.id).first();
      assert.equal(count.total,1);
    });
  }finally{await mf.dispose();}
});
