import {validateProject} from './engine.mjs';

export const CAPACITY_SCHEMA_VERSION = 1;
export const MAX_CAPACITY_BYTES = 32_000;
const SCALE = 1_000_000;
const round = value => Math.round(value * 1e6) / 1e6;
const compare = (a,b) => a < b ? -1 : a > b ? 1 : 0;
const fail = message => { throw new Error(message); };
function object(value, label) { if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object.`); }
function text(value, label, max = 200, optional = false) {
  if (typeof value !== 'string' || value.length > max || (!optional && !value.trim())) fail(`${label} must be ${optional ? '' : 'nonempty '}text of at most ${max} characters.`);
  return value.trim();
}
function id(value, label) { if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,40}$/.test(value)) fail(`${label} must use 1–40 letters, numbers, underscores or hyphens.`); return value; }
function number(value,label,min,max,integer=false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) fail(`${label} must be ${integer ? 'an integer' : 'a number'} from ${min} to ${max}.`);
  return value;
}
function list(value,label,max) { if (!Array.isArray(value) || value.length > max) fail(`${label} must contain at most ${max} entries.`); return value; }
function timestamp(value,label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) fail(`${label} must be a canonical ISO UTC timestamp.`);
  return value;
}
function unique(values,label) { if (new Set(values).size !== values.length) fail(`${label} contain duplicate IDs or days.`); }

/** Configurations contain references and availability only, never project content or computed results. */
export function validateCapacityScenario(input) {
  object(input,'Capacity scenario');
  if (input.kind !== 'capacity-scenario' || input.schemaVersion !== CAPACITY_SCHEMA_VERSION) fail('Unsupported capacity scenario kind or schema version.');
  const scenario = {kind:'capacity-scenario',schemaVersion:CAPACITY_SCHEMA_VERSION,id:id(input.id,'Scenario ID'),title:text(input.title,'Scenario title'),days:number(input.days,'Shared planning days',1,90,true),hoursPerDay:number(input.hoursPerDay,'Shared hours per day',0,24),dayAdjustments:[],projects:[],createdAt:timestamp(input.createdAt,'Creation time'),updatedAt:timestamp(input.updatedAt,'Update time')};
  if (scenario.updatedAt < scenario.createdAt) fail('Scenario update time cannot precede creation time.');
  scenario.dayAdjustments = list(input.dayAdjustments,'Day adjustments',90).map(value => {object(value,'Day adjustment');return {day:number(value.day,'Adjusted day',1,scenario.days,true),hours:number(value.hours,'Adjusted hours',0,24),reason:text(value.reason === undefined ? '' : value.reason,'Availability reason',200,true)};}).sort((a,b)=>a.day-b.day);
  unique(scenario.dayAdjustments.map(value=>value.day),'Adjusted days');
  scenario.projects = list(input.projects,'Selected projects',20).map(value => {object(value,'Project reference');return {projectId:id(value.projectId,'Referenced project ID'),startDay:number(value.startDay,'Project start day',1,scenario.days,true),projectUpdatedAt:timestamp(value.projectUpdatedAt,'Referenced project update time')};});
  unique(scenario.projects.map(value=>value.projectId),'Selected projects');
  if (new TextEncoder().encode(JSON.stringify(scenario)).length > MAX_CAPACITY_BYTES) fail('Capacity configuration exceeds the 32 KB limit. Shorten the title or availability reasons.');
  return scenario;
}
function records(projects) { if (!Array.isArray(projects)) fail('Supply available project records as a list.'); return projects; }
function resolveSelected(projects, scenario) {
  records(projects);
  return scenario.projects.map(ref => {
    const matches = projects.filter(project => project && typeof project === 'object' && project.id === ref.projectId);
    if (!matches.length) fail(`Selected project ${ref.projectId} is unavailable. Load its device or account copy, or explicitly remove its selection.`);
    if (matches.length > 1) fail(`Available project ${ref.projectId} appears more than once. Resolve the duplicate before analysis.`);
    const project = validateProject(matches[0]);
    if (ref.startDay + project.days - 1 > scenario.days) fail(`Project ${project.id} spans shared days ${ref.startDay}–${ref.startDay + project.days - 1}, beyond this ${scenario.days}-day horizon. Extend the horizon or move its start day.`);
    return {ref,project};
  });
}

export function createCapacityScenario(projects = [], input = {}, now = new Date().toISOString()) {
  records(projects); object(input,'Scenario input'); timestamp(now,'Creation time');
  const refs = input.projects === undefined ? projects.map(project=>({projectId:project?.id,startDay:1})) : list(input.projects,'Selected projects',20);
  const known = [];
  const selected = refs.map(ref=>{
    object(ref,'Project reference');
    const matches = projects.filter(project=>project && typeof project==='object' && project.id===ref.projectId);
    if (matches.length > 1) fail(`Available project ${ref.projectId} appears more than once.`);
    const current = matches.length ? validateProject(matches[0]) : null;
    const startDay = ref.startDay === undefined ? 1 : ref.startDay;
    if (current) known.push({ref:{startDay},project:current});
    return {projectId:ref.projectId,startDay,projectUpdatedAt:ref.projectUpdatedAt === undefined ? current?.updatedAt : ref.projectUpdatedAt};
  });
  const days = input.days === undefined ? Math.max(30,...known.map(value=>value.ref.startDay + value.project.days - 1)) : input.days;
  const scenario = validateCapacityScenario({kind:'capacity-scenario',schemaVersion:CAPACITY_SCHEMA_VERSION,id:input.id === undefined ? `c-${globalThis.crypto.randomUUID()}` : input.id,title:input.title === undefined ? 'Shared capacity check' : input.title,days,hoursPerDay:input.hoursPerDay === undefined ? 4 : input.hoursPerDay,dayAdjustments:input.dayAdjustments === undefined ? [] : input.dayAdjustments,projects:selected,createdAt:now,updatedAt:now});
  for (const {ref,project} of known) if (ref.startDay + project.days - 1 > scenario.days) fail(`Project ${project.id} exceeds the shared horizon. Extend shared days or move the project start.`);
  return scenario;
}

export function refreshCapacityReferences(input, projects, now = new Date().toISOString()) {
  const scenario = validateCapacityScenario(input), selected = resolveSelected(projects,scenario);
  timestamp(now,'Reference refresh time');
  scenario.projects = selected.map(({ref,project})=>({...ref,projectUpdatedAt:project.updatedAt}));
  scenario.updatedAt = new Date(Math.max(Date.parse(now),Date.parse(scenario.updatedAt),Date.parse(scenario.createdAt))).toISOString();
  return validateCapacityScenario(scenario);
}

const key = (projectId,taskId) => JSON.stringify([projectId,taskId]);
function jobsFor(selected) {
  const jobs = [];
  for (const {ref,project} of selected) {
    const open = project.tasks.filter(task=>task.status !== 'done');
    const byId = new Map(open.map(task=>[task.id,task]));
    const ordered = [], visited = new Set();
    const visit = task => {if(visited.has(task.id))return;visited.add(task.id);for(const dependency of task.dependsOn)if(byId.has(dependency))visit(byId.get(dependency));ordered.push(task);};
    open.forEach(visit);
    const effectiveDue = new Map(open.map(task=>[task.id,ref.startDay + task.dueDay - 1]));
    for (const task of [...ordered].reverse()) for (const dependency of task.dependsOn) if(byId.has(dependency)) effectiveDue.set(dependency,Math.min(effectiveDue.get(dependency),effectiveDue.get(task.id)));
    for (const task of open) jobs.push({key:key(project.id,task.id),projectId:project.id,taskId:task.id,title:task.title,hours:task.hours,dueDay:ref.startDay + task.dueDay - 1,effectiveDue:effectiveDue.get(task.id),releaseDay:ref.startDay,dependsOn:task.dependsOn.filter(dependency=>byId.has(dependency)).map(dependency=>key(project.id,dependency))});
  }
  return jobs;
}

function schedule(inputJobs,capacities) {
  const jobs = inputJobs.map(job=>({...job,units:Math.round(job.hours*SCALE),remaining:Math.round(job.hours*SCALE),allocated:0,startDay:null,lastDay:null,completionDay:null}));
  const byKey = new Map(jobs.map(job=>[job.key,job]));
  const days = capacities.map((capacityHours,index)=>{
    const day = index + 1, allocations = [];
    const capacityUnits=Math.round(capacityHours*SCALE);
    let free = capacityUnits;
    while(free > 0) {
      const ready = jobs.filter(job=>job.remaining > 0 && job.releaseDay <= day && job.dependsOn.every(parent=>byKey.get(parent).remaining === 0)).sort((a,b)=>a.effectiveDue-b.effectiveDue || a.dueDay-b.dueDay || compare(a.projectId,b.projectId) || compare(a.taskId,b.taskId));
      if(!ready.length)break;
      const job = ready[0], hours = Math.min(free,job.remaining);
      job.startDay ??= day; job.lastDay = day; job.remaining -= hours;job.allocated += hours;free -= hours;
      if(job.remaining === 0){job.remaining=0;job.completionDay=day;}
      if(free === 0)free=0;
      allocations.push({projectId:job.projectId,taskId:job.taskId,taskTitle:job.title,hours:hours/SCALE});
    }
    return {day,capacityHours:capacityUnits/SCALE,allocatedHours:(capacityUnits-free)/SCALE,remainingCapacityHours:free/SCALE,allocations};
  });
  const tasks = jobs.map(job=>({projectId:job.projectId,taskId:job.taskId,title:job.title,hours:job.units/SCALE,dueDay:job.dueDay,releaseDay:job.releaseDay,startDay:job.startDay,completionDay:job.completionDay,allocatedHours:job.allocated/SCALE,remainingHours:job.remaining/SCALE,late:job.completionDay===null || job.completionDay>job.dueDay}));
  const lateTasks = tasks.filter(task=>task.late).map(task=>({projectId:task.projectId,taskId:task.taskId,title:task.title,dueDay:task.dueDay,completionDay:task.completionDay,remainingHours:task.remainingHours}));
  const totalDemandHours = jobs.reduce((total,job)=>total+job.units,0)/SCALE, totalCapacityHours = capacities.reduce((total,hours)=>total+Math.round(hours*SCALE),0)/SCALE;
  const allocatedHours = jobs.reduce((total,job)=>total+job.allocated,0)/SCALE, unallocatedHours = jobs.reduce((total,job)=>total+job.remaining,0)/SCALE;
  return {days,tasks,lateTasks,totalDemandHours,totalCapacityHours,allocatedHours,unallocatedHours,finishDay:jobs.some(job=>job.remaining>0)?null:Math.max(0,...jobs.map(job=>job.completionDay)),hasConflicts:lateTasks.length>0};
}
function perProject(result,projectId) {
  const tasks = result.tasks.filter(task=>task.projectId===projectId);
  return {finishDay:tasks.some(task=>task.completionDay===null)?null:Math.max(0,...tasks.map(task=>task.completionDay)),lateTaskIds:tasks.filter(task=>task.late).map(task=>task.taskId),unallocatedHours:round(tasks.reduce((total,task)=>total+task.remainingHours,0)),hasConflicts:tasks.some(task=>task.late)};
}

/** A bounded one-person, shared abstract-day heuristic. It never changes selected projects. */
export function analyzeCapacityScenario(projects,input) {
  const scenario = validateCapacityScenario(input);
  if(!scenario.projects.length)fail('Select at least one project before analyzing shared capacity.');
  const selected = resolveSelected(projects,scenario);
  const adjustments = new Map(scenario.dayAdjustments.map(value=>[value.day,value.hours]));
  const capacities = Array.from({length:scenario.days},(_,index)=>round(adjustments.has(index+1)?adjustments.get(index+1):scenario.hoursPerDay));
  const jobs = jobsFor(selected), combined = schedule(jobs,capacities);
  const sourceWarnings = selected.filter(({ref,project})=>ref.projectUpdatedAt!==project.updatedAt).map(({ref,project})=>({projectId:project.id,title:project.title,expectedUpdatedAt:ref.projectUpdatedAt,currentUpdatedAt:project.updatedAt,message:'The project changed since this scenario reference was recorded. This analysis was recomputed from the current project; review its scope and refresh references.'}));
  const summaries = selected.map(({ref,project})=>{
    const soloResult = schedule(jobs.filter(job=>job.projectId===project.id),capacities), solo = perProject(soloResult,project.id), shared = perProject(combined,project.id);
    return {projectId:project.id,title:project.title,startDay:ref.startDay,remainingHours:jobs.filter(job=>job.projectId===project.id).reduce((total,job)=>total+Math.round(job.hours*SCALE),0)/SCALE,taskCount:jobs.filter(job=>job.projectId===project.id).length,solo,combined:shared,delayDays:solo.finishDay===null || shared.finishDay===null ? null : shared.finishDay-solo.finishDay,newlyLateTaskIds:shared.lateTaskIds.filter(taskId=>!solo.lateTaskIds.includes(taskId))};
  });
  const newlyLate = new Set(summaries.flatMap(project=>project.newlyLateTaskIds.map(taskId=>key(project.projectId,taskId))));
  let cumulativeDue = 0, cumulativeCapacity = 0;
  const deadlinePressure = capacities.map((hours,index)=>{const day=index+1,dueHours=jobs.filter(job=>job.dueDay===day).reduce((total,job)=>total+round(job.hours),0);cumulativeDue+=dueHours;cumulativeCapacity+=hours;return {day,dueHours:round(dueHours),cumulativeDueHours:round(cumulativeDue),cumulativeCapacityHours:round(cumulativeCapacity),shortfallHours:round(Math.max(0,cumulativeDue-cumulativeCapacity))};});
  return {scenario,...combined,projects:summaries,sourceWarnings,newlyLateTasks:combined.lateTasks.filter(task=>newlyLate.has(key(task.projectId,task.taskId))),deadlinePressure,
    methodology:'One person shares supplied abstract day slots across every selected project. Arithmetic rounds supplied effort and daily availability to six decimal hours and schedules integer microhours, so displayed allocations conserve that precision. Each project day 1 is explicitly aligned to its selected shared start day; task due days shift by that offset. Entire project horizons must fit. Availability adjustments replace base daily hours. No calendar dates, weekdays, time zones, holidays or external availability are inferred. Completed tasks are excluded and their dependencies are treated as satisfied. Open and in-progress tasks use their full recorded estimates; logged time is not subtracted and progress may overstate remaining effort. Ready work sorts by earliest downstream deadline, own deadline, project ID and task ID; priority is reconsidered at each day boundary and when a task finishes. Work may span or pause between days. Each solo comparison uses the same availability and release day as the combined case. Results are a deterministic heuristic, not an optimal schedule or proof of general infeasibility. A positive cumulative deadline shortfall is a necessary capacity deficit for those due tasks; a zero shortfall does not prove feasibility because release dates and dependencies still matter. Inputs, accepted scope, evidence, time records and saved project baselines remain unchanged.'};
}

export function serializeCapacityScenario(input) {return JSON.stringify(validateCapacityScenario(input),null,2);}
const md = value=>String(value).replace(/[\u0000-\u001f\u007f]/g,' ').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/([\\`*_{}\[\]()#+.!|~])/g,'\\$1');

/** Recompute before export; omit availability reasons and all private project source/time corpora. */
export function exportCapacityMarkdown(projects,input) {
  const result = analyzeCapacityScenario(projects,input);
  return [`# Shared capacity review: ${md(result.scenario.title)}`,'',`Scenario ${md(result.scenario.id)} · ${result.scenario.days} supplied abstract days · base ${result.scenario.hoursPerDay} hours/day`,'',
    `Open estimated work: ${result.totalDemandHours} hours. Shared capacity: ${result.totalCapacityHours} hours. Allocated: ${result.allocatedHours} hours. Unallocated: ${result.unallocatedHours} hours.`,
    `Combined heuristic result: ${result.hasConflicts?'review late or unallocated work':'no conflict observed under supplied assumptions'}.`,'',
    '## Projects alone versus together','',...result.projects.map(project=>`- ${md(project.projectId)}: ${md(project.title)}; start shared day ${project.startDay}; ${project.remainingHours} estimated hours; alone: ${project.solo.hasConflicts?'conflict observed':'fits'}, finish ${project.solo.finishDay===null?'beyond horizon':project.solo.finishDay}; together: ${project.combined.hasConflicts?'conflict observed':'fits'}, finish ${project.combined.finishDay===null?'beyond horizon':project.combined.finishDay}; newly late tasks: ${project.newlyLateTaskIds.map(md).join(', ')||'none'}.`),'',
    '## Shared day allocations','',...result.days.map(day=>`- Day ${day.day}: ${day.allocatedHours}/${day.capacityHours} hours; ${day.allocations.map(value=>`${md(value.projectId)}/${md(value.taskId)} ${value.hours}h`).join('; ')||'no allocated work'}.`),'',
    '## Tasks requiring review','',...(result.lateTasks.length?result.lateTasks.map(task=>`- ${md(task.projectId)}/${md(task.taskId)}: ${md(task.title)}; due shared day ${task.dueDay}; completion ${task.completionDay===null?'not reached in horizon':`day ${task.completionDay}`}; ${task.remainingHours} hours unallocated.`):['No late tasks observed in this heuristic.']),'',
    '## Cumulative deadline pressure','',...result.deadlinePressure.filter(day=>day.shortfallHours>0).map(day=>`- By shared day ${day.day}, work due exceeds all supplied capacity up to that day by ${day.shortfallHours} hours. This is a necessary capacity deficit; it is not a claim of optimal scheduling.`),
    ...(result.deadlinePressure.every(day=>day.shortfallHours===0)?['No positive cumulative deficit. This does not establish feasibility under release and dependency constraints.']:[]),'',
    '## Source freshness','',...(result.sourceWarnings.length?result.sourceWarnings.map(warning=>`- ${md(warning.projectId)}: ${md(warning.message)}`):['Selected project update references match current records.']),'',
    '## Assumptions and limitations','',md(result.methodology),'','Availability reasons, source snapshots, selected evidence excerpts and raw time notes are omitted. Configuration JSON contains reviewed availability reasons and project references; it contains no copies of project content. Review titles and identifiers before sharing.',''].join('\n');
}
