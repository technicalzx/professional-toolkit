import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,validateProject,prepareTimeLogImport,applyTimeLogImport,parseTimeLogCsv,summarizeProjectTime,removeProjectTimeEntry,clearProjectTimeEntries,exportProjectTimeCsv,exportProjectMarkdown,serializeProject,importProject,proposeBriefRevision,buildProjectPlan} from '../lib/projects/engine.mjs';

const now='2026-10-17T10:00:00.000Z',later='2026-10-17T11:00:00.000Z';
const fixture=()=>createProject({id:'time-project',audience:'freelancer',title:'Synthetic delivery',brief:'Build the accessible form\nDocument the delivery',days:10,hoursPerDay:4},now);
const options=(overrides={})=>({sourceLabel:'synthetic-provider',durationUnit:'hours',mapping:{taskId:'Task',date:'Date',duration:'Hours',note:'Note',externalId:'External ID'},...overrides});
const csv=(rows=['t1_work,2026-10-17,1.5,User supplied record,entry-1'])=>'Task,Date,Hours,Note,External ID\n'+rows.join('\n');
const load=(input=fixture(),data=csv(),settings=options(),extra={})=>applyTimeLogImport(input,prepareTimeLogImport(input,data,settings,now),extra,later);

test('old project records normalize time entries without inventing actual work',()=>{
  const old=fixture();delete old.timeEntries;
  const restored=importProject(JSON.stringify(old));
  assert.deepEqual(restored.timeEntries,[]);
  assert.equal(restored.schemaVersion,1);
  const summary=summarizeProjectTime(restored);
  assert.equal(summary.entryCount,0);assert.equal(summary.loggedSeconds,0);assert.equal(summary.dateRange,null);
  assert.ok(summary.tasks.every(value=>value.coverage==='no-records'));
});

test('quoted CSV supports BOM, CRLF, commas, escaped quotes, multiline cells and physical row numbers',()=>{
  const data='\uFEFFTask,Date,Hours,Note,External ID\r\nt1_work,2026-10-17,1,"Verified, then said ""done""\r\nReviewed again",entry-1\r\nt1_check,2026-10-18,0.5,Second,entry-2\r\n';
  const parsed=parseTimeLogCsv(data);
  assert.deepEqual(parsed.headers,['Task','Date','Hours','Note','External ID']);
  assert.equal(parsed.rows[0].values[3],'Verified, then said "done"\nReviewed again');
  assert.deepEqual(parsed.rows.map(value=>value.rowNumber),[2,4]);
  const result=load(fixture(),data);
  assert.equal(result.addedCount,2);assert.equal(result.project.timeEntries[0].durationSeconds,3600);
  assert.equal(result.project.timeEntries[1].workDate,'2026-10-18');
});

test('explicit mapping resolves external task labels without matching titles automatically',()=>{
  const data=csv(['External task,2026-10-17,1,Entered by user,entry-1']);
  const invalid=prepareTimeLogImport(fixture(),data,options(),now);
  assert.equal(invalid.rows[0].status,'invalid');assert.match(invalid.rows[0].message,/not mapped/);
  const mapped=load(fixture(),data,options({taskMap:{'External task':'t1_work'}}));
  assert.equal(mapped.project.timeEntries[0].taskId,'t1_work');
  assert.equal(mapped.project.timeEntries[0].taskTitle,fixture().tasks[0].title);
  assert.throws(()=>prepareTimeLogImport(fixture(),data,options({mapping:{taskId:'Task',date:'Date',duration:'Date'}}),now),/only one/);
});

test('repeat external-ID imports skip across files without changing project time or IDs',()=>{
  const first=load(),before=structuredClone(first.project);
  const preview=prepareTimeLogImport(first.project,csv(),options(),later);
  assert.equal(preview.counts.duplicate,1);
  const repeat=applyTimeLogImport(first.project,preview,{},'2026-10-18T00:00:00.000Z');
  assert.equal(repeat.addedCount,0);assert.equal(repeat.skippedCount,1);
  assert.deepEqual(repeat.project,before);
  const otherSource=load(first.project,csv(),options({sourceLabel:'different-provider'}));
  assert.equal(otherSource.addedCount,1);
});

test('changed external-ID content blocks the whole import and never overwrites existing facts',()=>{
  const first=load().project,before=structuredClone(first);
  const changed=prepareTimeLogImport(first,csv(['t1_work,2026-10-17,2,User supplied record,entry-1','t1_check,2026-10-17,1,Other,entry-2']),options(),later);
  assert.equal(changed.rows[0].status,'conflict');assert.equal(changed.rows[1].status,'ready');
  assert.throws(()=>applyTimeLogImport(first,changed,{},later),/Nothing has been imported/);
  assert.deepEqual(first,before);
  const within=prepareTimeLogImport(fixture(),csv(['t1_work,2026-10-17,1,Same,id-1','t1_work,2026-10-17,2,Same,id-1']),options(),now);
  assert.equal(within.rows[1].status,'conflict');
});

test('ID-less same-day identical sessions require explicit possible-duplicate inclusion',()=>{
  const settings=options({mapping:{taskId:'Task',date:'Date',duration:'Hours',note:'Note'}});
  const data=csv(['t1_work,2026-10-17,1,Same,','t1_work,2026-10-17,1,Same,']);
  const preview=prepareTimeLogImport(fixture(),data,settings,now);
  assert.deepEqual(preview.rows.map(value=>value.status),['ready','possible-duplicate']);
  const normal=applyTimeLogImport(fixture(),preview,{},later);
  assert.equal(normal.addedCount,1);assert.equal(normal.skippedCount,1);
  const explicit=applyTimeLogImport(fixture(),preview,{includePossibleDuplicates:true},later);
  assert.equal(explicit.addedCount,2);assert.equal(explicit.project.timeEntries.length,2);
  assert.equal(prepareTimeLogImport(normal.project,data,settings,later).counts.possibleDuplicate,2);
  assert.throws(()=>applyTimeLogImport(fixture(),preview,{includePossibleDuplicates:'true'},later),/explicit/);
});

test('duration units preserve seconds and do not guess locale numbers or time zones',()=>{
  for(const [unit,value,seconds] of [['hours','0.333333',1200],['minutes','1.5',90],['hms','2:03:04',7384],['hms','24:00:00',86400]]){
    const output=load(fixture(),csv([`t1_work,2024-02-29,${value},Note,entry-1`]),options({durationUnit:unit}));
    assert.equal(output.project.timeEntries[0].durationSeconds,seconds);assert.equal(output.project.timeEntries[0].workDate,'2024-02-29');
  }
  for(const [unit,value] of [['hours','-1'],['hours','1e3'],['hours','Infinity'],['minutes','0'],['hours','25'],['hms','24:00:01'],['hms','1:60:00'],['hms','1:2:03']]){
    const preview=prepareTimeLogImport(fixture(),csv([`t1_work,2026-10-17,${value},Note,id-1`]),options({durationUnit:unit}),now);
    assert.equal(preview.counts.invalid,1);
  }
  for(const badDate of ['2025-02-29','2026-02-31','17/10/2026','2026-10-17T10:00:00Z','2026-13-01'])assert.equal(prepareTimeLogImport(fixture(),csv([`t1_work,${badDate},1,Note,id-1`]),options(),now).counts.invalid,1);
});

test('invalid row feedback and malformed CSV never produce a partial application',()=>{
  const p=fixture(),before=structuredClone(p);
  const preview=prepareTimeLogImport(p,csv(['t1_work,2026-10-17,1,Good,id-1','unknown-task,2026-10-17,1,Bad,id-2']),options(),now);
  assert.equal(preview.rows[1].rowNumber,3);assert.match(preview.rows[1].message,/unknown-task/);
  assert.throws(()=>applyTimeLogImport(p,preview),/Nothing has been imported/);assert.deepEqual(p,before);
  for(const malformed of ['Task,task\nx,y','Task,Date\n"unfinished','Task,Date\nabc"x",y','Task,Date\n"ok"extra,y'])assert.throws(()=>parseTimeLogCsv(malformed));
  const mismatch=prepareTimeLogImport(p,csv(['t1_work,2026-10-17,1']),options(),now);
  assert.equal(mismatch.counts.invalid,1);assert.match(mismatch.rows[0].message,/Expected 5 columns/);
});

test('stale previews recheck external identity, tasks, and entry collisions before applying',()=>{
  const p=fixture(),preview=prepareTimeLogImport(p,csv(),options(),now),saved=applyTimeLogImport(p,preview,{},later).project;
  assert.equal(applyTimeLogImport(saved,preview,{},later).addedCount,0);
  const conflict=structuredClone(saved);conflict.timeEntries[0].durationSeconds=1;
  assert.throws(()=>applyTimeLogImport(conflict,preview),/different task/);
  const removed=proposeBriefRevision(p,'Document the delivery',later);
  assert.throws(()=>applyTimeLogImport(removed,preview),/mapped task was removed/);
  assert.throws(()=>applyTimeLogImport({...p,id:'different-project'},preview),/for this project/);
  const forged=structuredClone(preview);forged.rows[0].entry.durationSeconds=-100;
  assert.throws(()=>applyTimeLogImport(p,forged),/duration/);
});

test('scope revisions preserve orphaned actual work while remaining estimates stay separate',()=>{
  const p=load().project;
  const initial=summarizeProjectTime(p),plan=buildProjectPlan(p);
  assert.equal(initial.loggedHours,1.5);assert.equal(initial.tasks[0].varianceHours,-0.5);
  assert.equal(initial.tasks[0].coverage,'partial');assert.equal(plan.remainingHours,6);
  assert.equal(initial.tasks[1].varianceHours,null);
  assert.match(exportProjectMarkdown(p),/recorded variance unknown \(no time records\)/);
  const revised=proposeBriefRevision(p,'Document the delivery',later),summary=summarizeProjectTime(revised);
  assert.equal(summary.loggedHours,1.5);assert.equal(summary.orphanedEntryCount,1);assert.equal(summary.orphanedHours,1.5);
  assert.equal(revised.timeEntries[0].taskTitle,p.timeEntries[0].taskTitle);
  assert.ok(summary.tasks.every(value=>value.loggedHours===0));
  assert.match(exportProjectMarkdown(revised),/Orphaned work: 1.5 hours/);
});

test('JSON retains exact canonical notes while Markdown exports aggregates and CSV neutralizes formulas',()=>{
  const data=csv(['t1_work,2026-10-17,1,=HYPERLINK(""https://example.com""),entry-1']);
  // Build the formula as a correctly quoted CSV cell.
  const safeInput='Task,Date,Hours,Note,External ID\nt1_work,2026-10-17,1,"=HYPERLINK(""https://example.com"")",entry-1';
  const p=load(fixture(),safeInput).project;p.tasks[0].title='<script>unsafe</script>';
  const restored=importProject(serializeProject(p));assert.equal(restored.timeEntries[0].note,'=HYPERLINK("https://example.com")');
  const exported=exportProjectTimeCsv(restored),rows=parseTimeLogCsv(exported);
  assert.equal(rows.rows[0].values[5],'\'=HYPERLINK("https://example.com")');
  assert.equal(rows.rows[0].values[4],'1:00:00');
  for(const format of ['client','portfolio','handover']){const pack=exportProjectMarkdown(restored,format);assert.match(pack,/Recorded time: 1 hours in 1 entries/);assert.ok(!pack.includes('=HYPERLINK'));assert.ok(!pack.includes('<script>'));assert.match(pack,/Missing logs do not prove zero effort/);}
});

test('limits, safe identifiers, strict dates and external uniqueness apply to JSON restoration too',()=>{
  const p=load().project,record=p.timeEntries[0];
  const max={...p,timeEntries:Array.from({length:200},(_,index)=>({...record,id:`entry-${index}`,externalId:`external-${index}`}))};
  assert.equal(validateProject(max).timeEntries.length,200);
  assert.throws(()=>validateProject({...max,timeEntries:[...max.timeEntries,{...record,id:'extra',externalId:'extra'}]}),/at most 200/);
  assert.throws(()=>prepareTimeLogImport(fixture(),csv(Array(201).fill('t1_work,2026-10-17,1,note,')),options(),now),/200 data rows/);
  assert.throws(()=>parseTimeLogCsv('x'.repeat(200001)),/200 KB/);
  assert.throws(()=>parseTimeLogCsv('界'.repeat(70000)),/200 KB/);
  for(const patch of [{id:'../escape'},{durationSeconds:1.5},{durationSeconds:86401},{workDate:'2026-02-31'},{note:'x'.repeat(401)},{sourceLabel:'x'.repeat(81)},{externalId:'x'.repeat(101)},{importedAt:'2026-10-17'}])assert.throws(()=>validateProject({...p,timeEntries:[{...record,...patch}]}));
  assert.throws(()=>validateProject({...p,timeEntries:[record,{...record,id:'another-id'}]}),/External time-entry IDs/);
  assert.throws(()=>validateProject({...p,timeEntries:[{...record,id:'r1'}]}),/duplicate/);
});

test('removal, clearing and future timestamps preserve unrelated data with explicit no-op behavior',()=>{
  const p=load().project,before=structuredClone(p);
  const removed=removeProjectTimeEntry(p,p.timeEntries[0].id,later);assert.equal(removed.timeEntries.length,0);assert.deepEqual(p,before);
  assert.throws(()=>removeProjectTimeEntry(p,'missing',later),/existing time entry/);
  assert.deepEqual(clearProjectTimeEntries(removed,now),removed);
  assert.equal(clearProjectTimeEntries(p,later).timeEntries.length,0);
  const future=fixture();future.createdAt='2030-01-01T00:00:00.000Z';future.updatedAt='2030-01-02T00:00:00.000Z';
  const imported=load(future).project;assert.equal(imported.updatedAt,future.updatedAt);assert.equal(imported.timeEntries[0].importedAt,future.updatedAt);
});
