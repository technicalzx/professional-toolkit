"use client";

import {useEffect,useState} from 'react';
import {comparePlans,restorePlan} from '../../lib/toolkit/planner.mjs';
import {audiences,examplePlan} from '../../lib/toolkit/workspace-catalog.mjs';
import {readAccountResponse} from '../../lib/auth/client';
import './workflows.css';

type Task={id:string;title:string;hours:number;dueDay:number;dependsOn:string[];requirementIds:string[]};
type Requirement={id:string;label:string;evidence:string};
type Plan={title:string;audience:string;days:number;hoursPerDay:number;tasks:Task[];requirements:Requirement[]};
type Comparison=ReturnType<typeof comparePlans>;
const emptyPlan=(audience='freelancer'):Plan=>({title:'',audience,days:10,hoursPerDay:3,tasks:[],requirements:[]});
const splitIds=(value:string)=>value.trim()===''?[]:value.split(',').map(v=>v.trim());
const numberValue=(value:string)=>value.trim()===''?NaN:Number(value);

export default function Workflows(){
  const [plan,setPlan]=useState<Plan>(emptyPlan);
  const [increase,setIncrease]=useState(25);
  const [result,setResult]=useState<Comparison|null>(null);
  const [message,setMessage]=useState(''),[error,setError]=useState(''),[saving,setSaving]=useState(false);
  useEffect(()=>{
    const reportId=new URLSearchParams(window.location.search).get('report');
    if(!reportId)return;
    let cancelled=false;
    fetch('/api/reports',{cache:'no-store'}).then(async response=>{
      const data=await readAccountResponse(response);
      if(!response.ok)throw Error(data.error||'Sign in to open this report.');
      const snapshot=data.reports?.find(r=>r.cloudId===reportId);
      if(!snapshot)throw Error('This report is unavailable in your account.');
      const restored=restorePlan(snapshot);
      if(!cancelled){setPlan(restored.plan);setIncrease(restored.increase);setResult(restored.result);setMessage('Opened your account plan and recalculated it. Saving creates a new snapshot.');}
    }).catch(e=>{if(!cancelled)setError(e instanceof Error?e.message:'Could not open report.');});
    return()=>{cancelled=true;};
  },[]);
  function change(next:Plan){setPlan(next);setResult(null);setError('');setMessage('');}
  function updateTask(index:number,patch:Partial<Task>){change({...plan,tasks:plan.tasks.map((t,i)=>i===index?{...t,...patch}:t)});}
  function updateRequirement(index:number,patch:Partial<Requirement>){change({...plan,requirements:plan.requirements.map((r,i)=>i===index?{...r,...patch}:r)});}
  function nextId(prefix:string,items:{id:string}[]){let n=1;while(items.some(x=>x.id===`${prefix}${n}`))n++;return `${prefix}${n}`;}
  function run(event:React.FormEvent){event.preventDefault();setError('');setMessage('');try{setResult(comparePlans(plan,increase));}catch(e){setResult(null);setError(e instanceof Error?e.message:'Check your plan.');}}
  function report(){return {kind:'workflow-plan',title:plan.title,tool:'workflow',createdAt:new Date().toISOString(),input:plan,result};}
  function download(){const url=URL.createObjectURL(new Blob([JSON.stringify(report(),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='workflow-plan.json';a.click();URL.revokeObjectURL(url);}
  async function copy(){try{await navigator.clipboard.writeText(JSON.stringify(report(),null,2));setMessage('Plan copied.');}catch{setError('Clipboard unavailable. Download JSON instead.');}}
  function saveDevice(){try{localStorage.setItem('professional-toolkit-workflow-v1',JSON.stringify({plan,increase}));setMessage('Saved one plan in this browser. Saving again replaces it.');}catch{setError('Browser storage unavailable or full. Download your plan.');}}
  function loadSnapshot(snapshot:unknown){const restored=restorePlan(snapshot);change(restored.plan);setIncrease(restored.increase);setResult(restored.result);}
  function restore(){try{const raw=localStorage.getItem('professional-toolkit-workflow-v1');if(!raw)throw Error('No saved workflow on this device.');loadSnapshot(JSON.parse(raw));setMessage('Restored and recalculated the saved plan.');}catch(e){setError(e instanceof Error?e.message:'Saved plan is invalid.');}}
  async function importFile(file:File|undefined){if(!file)return;try{if(file.size>250000)throw Error('Choose a plan JSON file smaller than 250 KB.');loadSnapshot(JSON.parse(await file.text()));setMessage('Imported the plan and recalculated it from its inputs.');}catch(e){setError(e instanceof Error?e.message:'Invalid plan JSON file.');}}
  function removeSaved(){try{localStorage.removeItem('professional-toolkit-workflow-v1');setMessage('Deleted the saved workflow from this browser.');}catch{setError('Could not access browser storage.');}}
  async function saveAccount(){setSaving(true);setError('');try{const body=JSON.stringify({report:report()});if(new TextEncoder().encode(body).length>60000)throw Error('This plan is too large for account reports. Shorten evidence notes or download JSON.');const response=await fetch('/api/reports',{method:'POST',headers:{'Content-Type':'application/json'},body});const data=await readAccountResponse(response);if(!response.ok)throw Error(data.error||'Could not save.');setMessage('Saved to your account. Open Saved reports in the main workspace to continue working on it.');}catch(e){setError(e instanceof Error?e.message:'Could not save.');}finally{setSaving(false);}}
  return <main className="workflow-shell">
    <a href="/" className="account-back">← Tools & saved reports</a>
    <header className="account-heading"><span className="eyebrow">CONNECTED WORKFLOWS / FIRST RELEASE</span><h1>Make a plan you can explain.</h1><p>Connect requirements, evidence and dependent tasks. Check available time and explore what happens when work takes longer.</p></header>
    <div className="audience-options" aria-label="Workspace audience">{audiences.map(a=><button key={a.id} type="button" aria-pressed={plan.audience===a.id} className={'card audience-option '+(plan.audience===a.id?'chosen':'')} onClick={()=>change({...plan,audience:a.id})}><strong>{a.label}</strong><span>{a.description}</span></button>)}</div>
    <p className="sync-note">Work stays in this page until you save or export. No AI provider, calendar or platform connection is used. Evidence is user-provided and unverified.</p>
    <div className="button-row"><button className="secondary" onClick={()=>{change(examplePlan(plan.audience));setMessage('Synthetic example loaded; it replaces the unsaved plan. Replace estimates and add your own evidence.');}}>Load audience example</button><button className="secondary" onClick={restore}>Restore device plan</button><button className="secondary" onClick={removeSaved}>Delete device plan</button><button className="secondary" onClick={()=>change(emptyPlan(plan.audience))}>Reset editor</button></div>
    <label className="field"><span>Reopen an exported plan (JSON, maximum 250 KB; replaces editor contents)</span><input type="file" accept=".json,application/json" onChange={e=>{void importFile(e.target.files?.[0]);e.target.value='';}}/></label>
    {message&&<p role="status" className="auth-message">{message}</p>}{error&&<p role="alert" className="auth-message auth-error">{error}</p>}
    <form onSubmit={run} className="workflow-form">
      <section className="card"><h2>1. Goal and availability</h2><label className="field"><span>Plan title</span><input required maxLength={200} value={plan.title} onChange={e=>change({...plan,title:e.target.value})}/></label>
        <div className="workflow-fields"><label className="field"><span>Planning days (1–90)</span><input type="number" required min={1} max={90} step={1} value={Number.isNaN(plan.days)?'':plan.days} onChange={e=>change({...plan,days:numberValue(e.target.value)})}/></label><label className="field"><span>Available hours each day</span><input type="number" required min={0.25} max={12} step="any" value={Number.isNaN(plan.hoursPerDay)?'':plan.hoursPerDay} onChange={e=>change({...plan,hoursPerDay:numberValue(e.target.value)})}/></label><label className="field"><span>What-if effort increase (%)</span><input type="number" required min={0} max={100} step="any" value={Number.isNaN(increase)?'':increase} onChange={e=>{setIncrease(numberValue(e.target.value));setResult(null);}}/></label></div>
        <p className="sync-note">Day 1 means your first available working day. Each day has the same capacity. Tasks may span days; time off and calendar dates are not inferred.</p>
      </section>
      <section className="card"><h2>2. Requirements and evidence</h2><p>Use requirements for client acceptance criteria, learning outcomes or delivery checks. A reference records what you supplied; it does not verify completion.</p>
        {plan.requirements.map((r,i)=><fieldset className="workflow-row" key={i}><legend>Requirement {i+1}</legend><div className="workflow-fields"><label className="field"><span>ID</span><input required maxLength={40} value={r.id} onChange={e=>updateRequirement(i,{id:e.target.value})}/></label><label className="field"><span>Requirement</span><input required maxLength={200} value={r.label} onChange={e=>updateRequirement(i,{label:e.target.value})}/></label></div><label className="field"><span>Evidence reference or note (optional)</span><textarea maxLength={1000} rows={2} value={r.evidence} onChange={e=>updateRequirement(i,{evidence:e.target.value})}/></label><button type="button" className="secondary" onClick={()=>change({...plan,requirements:plan.requirements.filter((_,n)=>n!==i)})}>Remove requirement {i+1}</button></fieldset>)}
        <button type="button" className="secondary" disabled={plan.requirements.length>=30} onClick={()=>change({...plan,requirements:[...plan.requirements,{id:nextId('r',plan.requirements),label:'',evidence:''}]})}>Add requirement</button>
      </section>
      <section className="card"><h2>3. Tasks and dependencies</h2><p>Dependencies and requirements refer to the IDs above and below, separated by commas. When removing or renaming an ID, update its references.</p>
        {!plan.tasks.length&&<p className="sync-note">Add a task or load an audience example to begin.</p>}
        {plan.tasks.map((t,i)=><fieldset className="workflow-row" key={i}><legend>Task {i+1}</legend><div className="workflow-fields"><label className="field"><span>ID</span><input required maxLength={40} value={t.id} onChange={e=>updateTask(i,{id:e.target.value})}/></label><label className="field"><span>Task</span><input required maxLength={200} value={t.title} onChange={e=>updateTask(i,{title:e.target.value})}/></label><label className="field"><span>Effort in hours</span><input type="number" required min={0.25} max={500} step="any" value={Number.isNaN(t.hours)?'':t.hours} onChange={e=>updateTask(i,{hours:numberValue(e.target.value)})}/></label><label className="field"><span>Due by end of day</span><input type="number" required min={1} max={plan.days} step={1} value={Number.isNaN(t.dueDay)?'':t.dueDay} onChange={e=>updateTask(i,{dueDay:numberValue(e.target.value)})}/></label><label className="field"><span>Depends on task IDs</span><input maxLength={2000} value={t.dependsOn.join(', ')} onChange={e=>updateTask(i,{dependsOn:splitIds(e.target.value)})}/></label><label className="field"><span>Requirement IDs</span><input maxLength={1200} value={t.requirementIds.join(', ')} onChange={e=>updateTask(i,{requirementIds:splitIds(e.target.value)})}/></label></div><button type="button" className="secondary" onClick={()=>change({...plan,tasks:plan.tasks.filter((_,n)=>n!==i)})}>Remove task {i+1}</button></fieldset>)}
        <button type="button" className="secondary" disabled={plan.tasks.length>=50} onClick={()=>change({...plan,tasks:[...plan.tasks,{id:nextId('t',plan.tasks),title:'',hours:1,dueDay:plan.days,dependsOn:[],requirementIds:[]}]})}>Add task</button>
      </section><button className="primary" type="submit">Build plan and compare scenario</button>
    </form>
    {result&&<section className="card workflow-results" aria-label="Plan results" aria-live="polite"><span className="eyebrow">DETERMINISTIC PLANNING / USER ESTIMATES</span><h2>{result.baseline.title}</h2>
      <div className="workflow-table"><table><caption>Baseline compared with {increase}% more effort</caption><thead><tr><th scope="col">Measure</th><th scope="col">Baseline</th><th scope="col">What-if</th></tr></thead><tbody><tr><th scope="row">Effort / available hours</th><td>{result.baseline.totalHours} / {result.baseline.capacityHours}</td><td>{result.scenario.totalHours} / {result.scenario.capacityHours}</td></tr><tr><th scope="row">Finishes on working day</th><td>{result.baseline.completionDay}</td><td>{result.scenario.completionDay}</td></tr><tr><th scope="row">Tasks past supplied due day</th><td>{result.baseline.lateTasks.length}</td><td>{result.scenario.lateTasks.length}</td></tr><tr><th scope="row">Hours beyond horizon</th><td>{result.baseline.overflowHours}</td><td>{result.scenario.overflowHours}</td></tr></tbody></table></div>
      <p>Dependency-only critical path: <strong>{result.baseline.criticalPath.taskIds.join(' → ')}</strong> ({result.baseline.criticalPath.hours} hours). Other tasks still consume the same person’s available time.</p>
      <h3>Baseline task order</h3><div className="workflow-table"><table><caption>One-person schedule with tasks split across working days</caption><thead><tr><th scope="col">Task</th><th scope="col">Days</th><th scope="col">Due day</th><th scope="col">Review</th></tr></thead><tbody>{result.baseline.schedule.map(t=><tr key={t.id}><th scope="row">{t.id}: {t.title}</th><td>{t.startDay}–{t.endDay}</td><td>{t.dueDay}</td><td>{t.deadlineMissed?'Past due day':'Within due day'}{t.missingEvidence.length?`; missing evidence: ${t.missingEvidence.join(', ')}`:''}</td></tr>)}</tbody></table></div>
      <details><summary>What-if task order</summary><ul>{result.scenario.schedule.map(t=><li key={t.id}>{t.title}: days {t.startDay}–{t.endDay}{t.deadlineMissed?' — past due day':''}</li>)}</ul></details>
      <h3>Evidence gaps</h3>{result.baseline.missingEvidence.length?<ul>{result.baseline.missingEvidence.map((r:{id:string;label:string})=><li key={r.id}>{r.label}: no reference supplied.</li>)}</ul>:<p>{plan.requirements.length?'Every requirement has a user-supplied reference; none is independently verified.':'No requirements supplied. Evidence coverage cannot be assessed.'}</p>}
      <h3>Recommended next steps</h3><ul>{result.baseline.nextActions.map(action=><li key={action}>{action}</li>)}</ul><h3>What changes with more effort</h3><p>{result.delta.hours} extra hours; finishes {result.delta.completionDays} working days later. Newly late tasks: {result.delta.newlyLateTasks.join(', ')||'none'}.</p><ul>{result.scenario.nextActions.map(action=><li key={action}>{action}</li>)}</ul>
      <details><summary>Method and limitations</summary><p>{result.baseline.methodology}</p></details>
      <div className="button-row report-actions"><button className="primary" onClick={saveDevice}>Save on device</button><button className="secondary" onClick={saveAccount} disabled={saving}>{saving?'Saving…':'Save to account'}</button><button className="secondary" onClick={copy}>Copy JSON</button><button className="secondary" onClick={download}>Download JSON</button></div><p className="sync-note">Account saving requires sign-in. <a href="/account">Account & security</a>. Device storage is unencrypted; avoid private client evidence on shared devices.</p>
    </section>}
  </main>;
}
