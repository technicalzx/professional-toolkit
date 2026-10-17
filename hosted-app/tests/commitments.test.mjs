import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,validateProject} from '../lib/projects/engine.mjs';
import {createCapacityScenario,validateCapacityScenario,analyzeCapacityScenario,refreshCapacityReferences,serializeCapacityScenario,exportCapacityMarkdown} from '../lib/projects/commitments.mjs';

const now='2026-10-17T18:24:00.000Z',later='2026-10-17T19:24:00.000Z';
const task=(id,hours=1,dueDay=2,dependsOn=[],status='todo')=>({id,title:`Work ${id}`,hours,dueDay,dependsOn,status,requirementIds:['r1'],deliverableId:'d1'});
function project(id='project-a',tasks=[task('delivery',8)],days=2){
  const value=createProject({id,title:`Synthetic ${id}`,audience:'freelancer',brief:'Deliver reviewed project work',days,hoursPerDay:4},now);
  value.tasks=tasks;return validateProject(value);
}
const scenario=(projects,input={})=>createCapacityScenario(projects,{id:'capacity-fixture',title:'Shared commitments',days:2,hoursPerDay:4,...input},now);
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);

test('two independently feasible eight-hour projects conflict in their shared two-day capacity',()=>{
  const projects=[project('project-a'),project('project-b')],config=scenario(projects);
  const result=analyzeCapacityScenario(projects,config);
  assert.equal(result.totalDemandHours,16);assert.equal(result.totalCapacityHours,8);
  assert.equal(result.allocatedHours,8);assert.equal(result.unallocatedHours,8);assert.equal(result.hasConflicts,true);
  assert.ok(result.projects.every(value=>value.solo.hasConflicts===false&&value.solo.finishDay===2));
  assert.equal(result.projects[0].combined.hasConflicts,false);assert.equal(result.projects[1].combined.hasConflicts,true);
  assert.equal(result.newlyLateTasks.length,1);assert.equal(result.newlyLateTasks[0].projectId,'project-b');
  assert.equal(result.deadlinePressure[1].shortfallHours,8);
});

test('offset starts, releases and day-boundary preemption preserve urgent future work',()=>{
  const long=project('project-a',[task('long',8,3)],3),urgent=project('project-b',[task('urgent',1,1)],1);
  const config=scenario([long,urgent],{days:3,projects:[{projectId:long.id,startDay:1,projectUpdatedAt:now},{projectId:urgent.id,startDay:2,projectUpdatedAt:now}]});
  const result=analyzeCapacityScenario([long,urgent],config);
  assert.equal(result.hasConflicts,false);
  assert.deepEqual(result.days[0].allocations.map(value=>value.taskId),['long']);
  assert.deepEqual(result.days[1].allocations.map(value=>value.taskId),['urgent','long']);
  assert.equal(result.tasks.find(value=>value.taskId==='urgent').completionDay,2);
  assert.equal(result.projects[0].delayDays,1);
  assert.equal(result.tasks.find(value=>value.taskId==='long').completionDay,3);
});

test('downstream deadlines reach prerequisites and dependencies finish before within-day children',()=>{
  const p=project('project-a',[task('other',1,2),task('prep',1,3),task('urgent',1,1,['prep'])],3);
  const result=analyzeCapacityScenario([p],scenario([p],{days:3,hoursPerDay:2}));
  assert.deepEqual(result.days[0].allocations.map(value=>value.taskId),['prep','urgent']);
  assert.equal(result.hasConflicts,false);
  assert.equal(result.days[1].allocations[0].taskId,'other');
});

test('completed tasks satisfy prerequisites and logs never reduce open or in-progress estimates',()=>{
  const p=project('project-a',[task('done',8,1,[],'done'),task('open',3,2,['done'],'doing')]);
  p.timeEntries=[{id:'log-fixture',taskId:'open',taskTitle:'Open work',workDate:'2026-10-17',durationSeconds:7200,note:'PRIVATE_TIME_NOTE',sourceLabel:'synthetic',externalId:'entry-1',importedAt:now}];
  const result=analyzeCapacityScenario([p],scenario([p]));
  assert.equal(result.totalDemandHours,3);assert.equal(result.tasks.length,1);assert.equal(result.tasks[0].taskId,'open');
  assert.equal(result.days[0].allocatedHours,3);assert.match(result.methodology,/logged time is not subtracted/);
});

test('availability adjustments replace base hours and expose due-prefix shortfalls despite enough total capacity',()=>{
  const p=project(),config=scenario([p],{days:3,dayAdjustments:[{day:1,hours:0,reason:'PRIVATE_TIME_OFF_REASON'}]});
  const result=analyzeCapacityScenario([p],config);
  assert.equal(result.totalCapacityHours,8);assert.equal(result.totalDemandHours,8);assert.equal(result.unallocatedHours,0);
  assert.equal(result.tasks[0].completionDay,3);assert.equal(result.hasConflicts,true);
  assert.equal(result.deadlinePressure[1].shortfallHours,4);
  assert.equal(result.days[0].allocations.length,0);
});

test('zero availability yields bounded unallocated work with no NaN or invented completion',()=>{
  const p=project(),result=analyzeCapacityScenario([p],scenario([p],{hoursPerDay:0}));
  assert.equal(result.finishDay,null);assert.equal(result.allocatedHours,0);assert.equal(result.unallocatedHours,8);
  assert.ok(result.days.every(day=>day.capacityHours===0&&day.remainingCapacityHours===0));
  assert.equal(JSON.stringify(result).includes('NaN'),false);
  assert.equal(result.tasks[0].startDay,null);assert.equal(result.tasks[0].completionDay,null);
});

test('a zero-capacity base can explicitly enable hours on one selected day',()=>{
  const p=project('project-a',[task('work',2)],2),result=analyzeCapacityScenario([p],scenario([p],{hoursPerDay:0,dayAdjustments:[{day:2,hours:2,reason:''}]}));
  assert.equal(result.hasConflicts,false);assert.equal(result.finishDay,2);assert.equal(result.totalCapacityHours,2);
});

test('fractional allocations conserve rounded microhours without phantom completion days',()=>{
  const p=project('project-a',[task('a',.3,1),task('b',.6,1,['a'])],1);
  const result=analyzeCapacityScenario([p],scenario([p],{days:1,hoursPerDay:.9}));
  assert.equal(result.finishDay,1);assert.equal(result.hasConflicts,false);assert.equal(result.unallocatedHours,0);
  near(result.days[0].allocations.reduce((total,value)=>total+value.hours,0),.9);
  const repeating=project('project-a',[task('work',30,90)],90);
  const precise=analyzeCapacityScenario([repeating],scenario([repeating],{days:90,hoursPerDay:1/3}));
  near(precise.days.reduce((total,day)=>total+day.allocatedHours,0),precise.allocatedHours);
  near(precise.allocatedHours+precise.unallocatedHours,precise.totalDemandHours);
  near(precise.days.reduce((total,day)=>total+day.capacityHours,0),precise.totalCapacityHours);
  near(precise.totalCapacityHours,29.99997);
});

test('project/task namespace tuples prevent identical task IDs from merging across projects',()=>{
  const a=project('project-a',[task('same',1)]),b=project('project-b',[task('same',2)]);
  const result=analyzeCapacityScenario([a,b],scenario([a,b]));
  assert.equal(result.tasks.length,2);assert.equal(result.totalDemandHours,3);assert.equal(result.projects.length,2);
  assert.equal(result.tasks.find(value=>value.projectId===a.id).allocatedHours,1);
  assert.equal(result.tasks.find(value=>value.projectId===b.id).allocatedHours,2);
});

test('missing references and partial horizons block actionably rather than hiding omitted commitments',()=>{
  const p=project(),config=scenario([p]);
  assert.throws(()=>analyzeCapacityScenario([],config),/unavailable.*Load/);
  assert.throws(()=>refreshCapacityReferences(config,[],later),/unavailable/);
  const shifted={...config,projects:[{...config.projects[0],startDay:2}]};
  assert.throws(()=>analyzeCapacityScenario([p],shifted),/beyond.*horizon/);
  assert.throws(()=>createCapacityScenario([p],{days:1},now),/exceeds.*horizon/);
  assert.throws(()=>analyzeCapacityScenario([p,p],config),/more than once/);
});

test('only selected projects are canonicalized; invalid unrelated drafts do not block analysis',()=>{
  const p=project(),config=scenario([p]);
  assert.equal(analyzeCapacityScenario([{id:'invalid-unselected'},p],config).totalDemandHours,8);
  const invalid={...p,tasks:[]};
  assert.throws(()=>analyzeCapacityScenario([invalid],config),/at least one task/);
});

test('source timestamp changes warn while analysis recomputes current data; refresh updates references only',()=>{
  const p=project(),config=scenario([p]),current=structuredClone(p);
  current.updatedAt=later;current.tasks[0].hours=9;
  const result=analyzeCapacityScenario([current],config);
  assert.equal(result.sourceWarnings.length,1);assert.equal(result.totalDemandHours,9);
  assert.equal(result.sourceWarnings[0].expectedUpdatedAt,now);assert.equal(result.sourceWarnings[0].currentUpdatedAt,later);
  const refreshed=refreshCapacityReferences(config,[current],later);
  assert.equal(refreshed.projects[0].projectUpdatedAt,later);assert.equal(refreshed.updatedAt,later);
  assert.equal(refreshed.hoursPerDay,config.hoursPerDay);assert.equal(refreshed.days,config.days);
  assert.equal(analyzeCapacityScenario([current],refreshed).sourceWarnings.length,0);
  assert.equal(config.projects[0].projectUpdatedAt,now);
});

test('empty draft configurations can be saved but never produce a false all-clear analysis',()=>{
  const draft=createCapacityScenario([],{id:'empty-draft'},now);
  assert.deepEqual(draft.projects,[]);assert.equal(draft.days,30);
  assert.deepEqual(validateCapacityScenario(JSON.parse(serializeCapacityScenario(draft))),draft);
  assert.throws(()=>analyzeCapacityScenario([],draft),/Select at least one project/);
});

test('maximum 20 projects and 800 tasks remain separate, bounded and deterministic',()=>{
  const projects=Array.from({length:20},(_,p)=>project(`project-${String(p).padStart(2,'0')}`,Array.from({length:40},(_,t)=>task(`task-${t}`,.25,90)),90));
  const config=scenario(projects,{days:90,hoursPerDay:24}),before=structuredClone(projects);
  const first=analyzeCapacityScenario(projects,config),second=analyzeCapacityScenario([...projects].reverse(),config);
  assert.equal(first.tasks.length,800);assert.equal(first.totalDemandHours,200);assert.equal(first.hasConflicts,false);
  assert.deepEqual(first,second);assert.deepEqual(projects,before);
  assert.throws(()=>createCapacityScenario([...projects,project('extra')],{},now),/at most 20/);
});

test('validation bounds identities, availability, revisions and source references',()=>{
  const p=project(),config=scenario([p]);
  for(const patch of [{schemaVersion:2},{id:'../escape'},{days:0},{days:91},{days:1.5},{hoursPerDay:-1},{hoursPerDay:25},{hoursPerDay:'4'},{hoursPerDay:NaN},{updatedAt:'2026-10-16T18:24:00.000Z'}])assert.throws(()=>validateCapacityScenario({...config,...patch}));
  assert.throws(()=>validateCapacityScenario({...config,dayAdjustments:[{day:1,hours:0,reason:''},{day:1,hours:2,reason:''}]}),/duplicate/);
  assert.throws(()=>validateCapacityScenario({...config,dayAdjustments:[{day:3,hours:1,reason:''}]}),/Adjusted day/);
  assert.throws(()=>validateCapacityScenario({...config,dayAdjustments:[{day:1,hours:1,reason:'x'.repeat(201)}]}),/200/);
  assert.throws(()=>validateCapacityScenario({...config,projects:[...config.projects,...config.projects]}),/duplicate/);
  assert.throws(()=>validateCapacityScenario({...config,projects:[{...config.projects[0],projectUpdatedAt:'2026-02-31T00:00:00.000Z'}]}),/canonical/);
  const oversized={...config,days:90,dayAdjustments:Array.from({length:90},(_,i)=>({day:i+1,hours:0,reason:'界'.repeat(200)}))};
  assert.throws(()=>validateCapacityScenario(oversized),/32 KB/);
});

test('configuration export strips project corpora and computed results while retaining reviewed reasons',()=>{
  const p=project(),config=scenario([p],{dayAdjustments:[{day:1,hours:4,reason:'Reviewed private appointment'}]});
  const output=serializeCapacityScenario({...config,analysis:{forged:true},sourceSnapshot:'PRIVATE_SOURCE_CORPUS',project:p});
  assert.ok(!output.includes('PRIVATE_SOURCE_CORPUS'));assert.ok(!output.includes('forged'));assert.ok(!output.includes('Deliver reviewed project work'));
  assert.ok(output.includes('Reviewed private appointment'));
  assert.deepEqual(JSON.parse(output),config);
});

test('Markdown recomputes results and keeps text inert without evidence, time notes or availability reasons',()=>{
  const p=project();p.title='<script>project()</script> [Click](https://example.com)';p.tasks[0].title='<img src=x onerror=bad()> Task';
  p.requirements[0].evidenceNote='PRIVATE_EVIDENCE_NOTE';
  p.timeEntries=[{id:'time-fixture',taskId:p.tasks[0].id,taskTitle:'Past work',workDate:'2026-10-17',durationSeconds:1,note:'PRIVATE_TIME_CORPUS',sourceLabel:'synthetic',externalId:'log-1',importedAt:now}];
  const config=scenario([p],{title:'<svg onload=bad()> Capacity',dayAdjustments:[{day:1,hours:0,reason:'PRIVATE_AVAILABILITY_REASON'}]});
  const before=structuredClone({p,config}),output=exportCapacityMarkdown([p],{...config,totalDemandHours:-999});
  assert.match(output,/Open estimated work: 8 hours/);assert.ok(!output.includes('<script>'));assert.ok(!output.includes('<img'));assert.ok(!output.includes('<svg'));
  assert.ok(!output.includes('[Click]('));assert.ok(output.includes('&lt;script&gt;'));
  for(const secret of ['PRIVATE_EVIDENCE_NOTE','PRIVATE_TIME_CORPUS','PRIVATE_AVAILABILITY_REASON'])assert.ok(!output.includes(secret));
  assert.match(output,/not an optimal schedule/);assert.match(output,/No calendar dates/);assert.deepEqual({p,config},before);
});

test('all-completed projects have no demand, no late work and no invented future completion',()=>{
  const p=project('project-a',[task('completed',8,1,[],'done')]),result=analyzeCapacityScenario([p],scenario([p],{hoursPerDay:0}));
  assert.equal(result.totalDemandHours,0);assert.equal(result.unallocatedHours,0);assert.equal(result.finishDay,0);assert.equal(result.hasConflicts,false);
  assert.equal(result.projects[0].solo.finishDay,0);assert.deepEqual(result.lateTasks,[]);
});
