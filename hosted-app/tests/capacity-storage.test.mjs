import test from 'node:test';
import assert from 'node:assert/strict';
import {createCapacityScenario} from '../lib/projects/commitments.mjs';
import {CAPACITY_STORAGE_KEY,restoreCapacityWorkspace,persistCapacityWorkspace,makeCapacityAccountReport,parseCapacityAccountReports} from '../lib/projects/capacity-storage.mjs';
const iso='2026-10-17T10:00:00.000Z';
const fixture=(id='c-fixture')=>createCapacityScenario([],{id,title:'Synthetic capacity',days:2,hoursPerDay:4,projects:[{projectId:'p-fixture',startDay:1,projectUpdatedAt:iso}]},iso);

test('capacity device round trip retains configuration references and strips private and computed copies',()=>{
  const dirty={...fixture(),analysis:{score:999},projectBodies:[{privateNote:'PRIVATE_CORPUS'}],sources:['PRIVATE_CORPUS'],timeEntries:['PRIVATE_CORPUS']};
  let serialized;const writes=[];const storage={setItem(key,value){writes.push(key);serialized=value;}};
  const saved=persistCapacityWorkspace(storage,[dirty],dirty.id);
  assert.deepEqual(writes,[CAPACITY_STORAGE_KEY]);assert.equal(serialized.includes('PRIVATE_CORPUS'),false);assert.equal(serialized.includes('score'),false);
  assert.deepEqual(restoreCapacityWorkspace(serialized),saved);assert.equal(saved.scenarios[0].projects[0].projectId,'p-fixture');
  assert.deepEqual(restoreCapacityWorkspace(null),{version:1,scenarios:[],selectedId:null});
  assert.equal(dirty.sources[0],'PRIVATE_CORPUS');
});
test('capacity workspace rejects corrupt versions, duplicate IDs, unknown selection and excess scenarios',()=>{
  const scenario=fixture();
  for(const value of ['not JSON','null',JSON.stringify({version:2,scenarios:[],selectedId:null}),JSON.stringify({version:1,scenarios:[scenario,scenario],selectedId:scenario.id}),JSON.stringify({version:1,scenarios:[scenario],selectedId:'missing'}),'x'.repeat(200001)])assert.throws(()=>restoreCapacityWorkspace(value));
  assert.throws(()=>persistCapacityWorkspace({setItem(){assert.fail('Must validate before writing');}},Array.from({length:6},(_,i)=>fixture('c-'+i)),null),/5/);
});
test('quota failures preserve the old value and invalid edits never attempt storage writes',()=>{
  const prior=JSON.stringify({version:1,scenarios:[fixture()],selectedId:'c-fixture'});let current=prior,calls=0;
  const storage={setItem(){calls++;throw Error('QuotaExceededError');},removeItem(){assert.fail('Never remove prior data');}};
  assert.throws(()=>persistCapacityWorkspace(storage,[fixture('c-new')],'c-new'),/Existing data was kept/);assert.equal(current,prior);assert.equal(calls,1);
  assert.throws(()=>persistCapacityWorkspace(storage,[{...fixture(),days:0}],'c-fixture'));assert.equal(calls,1);
});
test('capacity account snapshots stay immutable and independent versions may share a scenario ID',()=>{
  const scenario=fixture();const report=makeCapacityAccountReport({...scenario,result:{privateText:'DROP_ME'}});assert.deepEqual(report,scenario);
  const parsed=parseCapacityAccountReports({reports:[{kind:'audit',title:'Other tool'}, {...report,cloudId:'snapshot-one',savedAt:1},{...report,cloudId:'snapshot-two',savedAt:2}]});
  assert.equal(parsed.snapshots.length,2);assert.equal(parsed.invalidCount,0);assert.equal(JSON.stringify(parsed).includes('DROP_ME'),false);assert.equal(parsed.snapshots[0].scenario.cloudId,undefined);
});
test('capacity account parsing counts invalid matching records and bounds metadata, rows and total size',()=>{
  const good={...fixture(),cloudId:'snapshot-one',savedAt:1};
  const parsed=parseCapacityAccountReports({reports:[good,{...good},{...good,cloudId:'bad id'},{...good,cloudId:'bad-version',schemaVersion:2},{...good,cloudId:'bad-date',savedAt:-1},{kind:'workflow-plan'}]});
  assert.equal(parsed.snapshots.length,1);assert.equal(parsed.invalidCount,4);
  for(const response of [null,{}, {reports:Array(51).fill({kind:'audit'})},{reports:[],padding:'x'.repeat(3400001)}])assert.throws(()=>parseCapacityAccountReports(response));
});
