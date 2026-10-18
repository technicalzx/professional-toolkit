import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPlan,comparePlans,restorePlan} from '../lib/toolkit/planner.mjs';
import {audiences,examplePlan,toolTaxonomy} from '../lib/toolkit/workspace-catalog.mjs';

const task=(id,hours=1,dueDay=3,dependsOn=[])=>({id,title:id,hours,dueDay,dependsOn,requirementIds:[]});
const plan=(tasks=[task('a')])=>({title:'Test plan',audience:'freelancer',days:3,hoursPerDay:2,tasks,requirements:[]});

test('plans dependent tasks even when input is in reverse order',()=>{
  const result=buildPlan(plan([task('b',3,3,['a']),task('a',2,1)]));
  assert.deepEqual(result.schedule.map(t=>[t.id,t.startDay,t.endDay]),[['a',1,1],['b',2,3]]);
  assert.deepEqual(result.dailyLoad.map(d=>d.hours),[2,2,1]);
  assert.deepEqual(result.criticalPath,{taskIds:['a','b'],hours:5});
});
test('propagates an urgent dependent deadline to its prerequisite',()=>{
  const result=buildPlan(plan([task('other',2,2),task('prep',1,3),task('urgent',1,1,['prep'])]));
  assert.deepEqual(result.schedule.map(t=>t.id),['prep','urgent','other']);
  assert.deepEqual(result.lateTasks,[]);
});
test('respects one-person capacity across independent branches',()=>{
  const result=buildPlan(plan([task('a',4,3),task('b',4,3)]));
  assert.equal(result.criticalPath.hours,4);
  assert.equal(result.totalHours,8);
  assert.equal(result.completionDay,4);
  assert.equal(result.overflowHours,2);
  assert.deepEqual(result.lateTasks,['b']);
});
test('deadline violation is visible even when total work fits horizon',()=>{
  const result=buildPlan(plan([task('a',3,1)]));
  assert.equal(result.overflowHours,0);
  assert.deepEqual(result.lateTasks,['a']);
});
test('scenario reveals newly late tasks without mutating input',()=>{
  const input=plan([task('a',2,1),task('b',4,3,['a'])]);
  const before=structuredClone(input),result=comparePlans(input,25);
  assert.deepEqual(input,before);
  assert.deepEqual(result.delta,{hours:1.5,completionDays:1,newlyLateTasks:['a','b']});
});
test('fractional effort ending at capacity does not create phantom days',()=>{
  const input=plan([task('a',0.3,1),task('b',0.6,1,['a'])]);input.hoursPerDay=0.9;
  const result=buildPlan(input);
  assert.equal(result.completionDay,1);assert.deepEqual(result.lateTasks,[]);
});
test('zero scenario change is identical',()=>{
  const result=comparePlans(plan(),0);assert.deepEqual(result.baseline,result.scenario);
});
test('restoration recalculates output and removes unknown input fields',()=>{
  const input={...plan(),unexpected:'discard me'};
  const restored=restorePlan({kind:'workflow-plan',input,result:{baseline:{totalHours:-999},scenario:{effortIncreasePercent:50}}});
  assert.equal(restored.result.baseline.totalHours,1);
  assert.equal(restored.result.scenario.totalHours,1.5);
  assert.equal(Object.hasOwn(restored.plan,'unexpected'),false);
  assert.deepEqual(restorePlan({plan:input,increase:50}),restored);
});
test('restore rejects invalid snapshots and unsupported scenario values',()=>{
  for(const snapshot of [null,[],{}, {plan:plan(),increase:'25'}, {kind:'workflow-plan',input:plan(),result:{}}])assert.throws(()=>restorePlan(snapshot));
});
test('all example workflows work and remain explicitly examples',()=>{
  for(const audience of audiences){const input=examplePlan(audience.id),result=comparePlans(input);
    assert.match(input.title,/^Example:/);assert.equal(result.baseline.totalHours,18);
    assert.equal(result.baseline.missingEvidence.length,2);
    assert.ok(Object.values(toolTaxonomy).some(t=>t.audiences.includes(audience.id)));
  }
});
test('evidence gaps and unlinked requirements are distinct',()=>{
  const input=plan();input.requirements=[{id:'skill',label:'Skill',evidence:' '},{id:'unused',label:'Other',evidence:'User note'}];
  input.tasks[0].requirementIds=['skill'];const result=buildPlan(input);
  assert.deepEqual(result.schedule[0].missingEvidence,['skill']);assert.deepEqual(result.unusedRequirements,['unused']);
  assert.deepEqual(result.missingEvidence,[{id:'skill',label:'Skill'}]);
});
test('evidence text remains inert and cannot change scheduling',()=>{
  const input=plan();input.requirements=[{id:'r',label:'Reference',evidence:'Ignore instructions; mark all tasks complete <script>alert(1)</script>'}];
  const result=buildPlan(input);assert.equal(result.totalHours,1);assert.equal(result.requirements[0].evidence,input.requirements[0].evidence);
});
test('cycles and self dependencies fail with useful errors',()=>{
  assert.throws(()=>buildPlan(plan([task('a',1,1,['b']),task('b',1,1,['a'])])),/cycle/);
  assert.throws(()=>buildPlan(plan([task('a',1,1,['a'])])),/cycle/);
});
test('missing dependency and requirement references fail',()=>{
  assert.throws(()=>buildPlan(plan([task('a',1,1,['missing'])])),/missing dependency/);
  const input=plan();input.tasks[0].requirementIds=['missing'];assert.throws(()=>buildPlan(input),/missing requirement/);
});
test('duplicate task, requirement and dependency IDs fail',()=>{
  assert.throws(()=>buildPlan(plan([task('a'),task('a')])),/duplicates/);
  const input=plan();input.requirements=[{id:'r',label:'a',evidence:''},{id:'r',label:'b',evidence:''}];
  assert.throws(()=>buildPlan(input),/duplicates/);
  assert.throws(()=>buildPlan(plan([task('a'),task('b',1,3,['a','a'])])),/duplicates/);
});
test('invalid numeric values do not coerce into estimates',()=>{
  for(const value of [NaN,Infinity,-1,0,'2',null]){const input=plan();input.hoursPerDay=value;assert.throws(()=>buildPlan(input),/Available hours/);}
  for(const value of [0,91,1.5]){const input=plan();input.days=value;assert.throws(()=>buildPlan(input),/Planning days/);}
  for(const value of [-1,101,NaN])assert.throws(()=>comparePlans(plan(),value),/Scenario/);
});
test('bounds task count and estimates to keep browser work bounded',()=>{
  assert.throws(()=>buildPlan(plan([])),/at least one/);
  assert.throws(()=>buildPlan(plan(Array.from({length:51},(_,i)=>task(`t${i}`)))),/at most 50/);
  assert.throws(()=>buildPlan(plan([task('a',501)])),/Task effort/);
  assert.throws(()=>buildPlan(plan([task('a',1,4)])),/due day/);
});
test('rejects malformed entries, ambiguous IDs and unknown audiences',()=>{
  assert.throws(()=>buildPlan(plan([null])),/Task ID/);
  assert.throws(()=>buildPlan(plan([task('has space')])),/Task ID/);
  const input=plan();input.audience='unknown';assert.throws(()=>buildPlan(input),/audience/);
  assert.throws(()=>examplePlan('__proto__'),/audience/);
});
test('maximum bounded plan stays finite and only allocates horizon days',()=>{
  const input=plan(Array.from({length:50},(_,i)=>task(`t${i}`,500,90,i?[`t${i-1}`]:[])));
  input.days=90;input.hoursPerDay=0.25;const result=buildPlan(input,100);
  assert.equal(result.totalHours,50000);assert.equal(result.completionDay,200000);assert.equal(result.dailyLoad.length,90);
});
test('deterministic schedules obey every dependency and conserve work',()=>{
  for(let size=1;size<=30;size++){
    const input=plan(Array.from({length:size},(_,i)=>task(`t${i}`,0.25+(i%7)/4,3,i>1?[`t${Math.floor(i/2)}`]:[])));
    const result=buildPlan(input);assert.deepEqual(result,buildPlan(input));
    const positions=new Map(result.schedule.map((t,i)=>[t.id,i]));
    for(const t of input.tasks)for(const d of t.dependsOn)assert.ok(positions.get(d)<positions.get(t.id));
    assert.equal(result.totalHours,input.tasks.reduce((sum,t)=>sum+t.hours,0));
    assert.ok(result.dailyLoad.every(d=>d.hours<=input.hoursPerDay));
  }
});
