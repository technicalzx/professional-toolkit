/** Portable, deterministic planning kernel. No network, AI or storage side effects. */
export const PLANNER_VERSION = '1.0.0';
const idPattern = /^[a-zA-Z0-9_-]{1,40}$/;
const compareIds = (a,b) => a < b ? -1 : a > b ? 1 : 0;
const fail = message => { throw new Error(message); };
function text(value, label, max = 200) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(`${label} is required (maximum ${max} characters).`);
  return value.trim();
}
function number(value, label, min, max, integer = false) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) fail(`${label} must be ${integer ? 'an integer' : 'a number'} from ${min} to ${max}.`);
  return value;
}
function id(value, label) {
  if (typeof value !== 'string' || !idPattern.test(value)) fail(`${label} must use 1–40 letters, numbers, underscores or hyphens.`);
  return value;
}
function list(value, label, max) {
  if (!Array.isArray(value) || value.length > max) fail(`${label} must be a list with at most ${max} entries.`);
  return value;
}
function unique(values, label) {
  if (new Set(values).size !== values.length) fail(`${label} contains duplicates.`);
}

/**
 * @typedef {{id:string,title:string,hours:number,dueDay:number,dependsOn:string[],requirementIds:string[]}} Task
 * @typedef {{id:string,label:string,evidence:string}} Requirement
 * @typedef {{title:string,audience:string,days:number,hoursPerDay:number,tasks:Task[],requirements:Requirement[]}} PlanInput
 * @param {PlanInput} input
 */
export function validatePlan(input) {
  if (!input || typeof input !== 'object') fail('Supply a plan.');
  const title = text(input.title, 'Plan title');
  if (!['freelancer', 'student', 'professional'].includes(input.audience)) fail('Choose an audience.');
  const days = number(input.days, 'Planning days', 1, 90, true);
  const hoursPerDay = number(input.hoursPerDay, 'Available hours per planning day', 0.25, 12);
  const requirements = list(input.requirements, 'Requirements', 30).map(r => ({
    id: id(r?.id, 'Requirement ID'), label: text(r?.label, 'Requirement label'),
    evidence: typeof r?.evidence === 'string' && r.evidence.length <= 1000 ? r.evidence.trim() : fail('Evidence must be text of at most 1000 characters.'),
  }));
  unique(requirements.map(r => r.id), 'Requirement IDs');
  const requirementIds = new Set(requirements.map(r => r.id));
  const tasks = list(input.tasks, 'Tasks', 50).map(t => ({
    id: id(t?.id, 'Task ID'), title: text(t?.title, 'Task title'),
    hours: number(t?.hours, 'Task effort', 0.25, 500), dueDay: number(t?.dueDay, 'Task due day', 1, days, true),
    dependsOn: list(t?.dependsOn, 'Dependencies', 49).map(d => id(d, 'Dependency ID')),
    requirementIds: list(t?.requirementIds, 'Task requirement IDs', 30).map(r => id(r, 'Requirement ID')),
  }));
  if (!tasks.length) fail('Add at least one task.');
  unique(tasks.map(t => t.id), 'Task IDs');
  const byId = new Map(tasks.map(t => [t.id, t]));
  for (const t of tasks) {
    unique(t.dependsOn, `Dependencies for ${t.id}`);
    unique(t.requirementIds, `Requirements for ${t.id}`);
    for (const dependency of t.dependsOn) if (!byId.has(dependency)) fail(`Task ${t.id} references missing dependency ${dependency}.`);
    for (const requirement of t.requirementIds) if (!requirementIds.has(requirement)) fail(`Task ${t.id} references missing requirement ${requirement}.`);
  }
  const visited = new Set(), visiting = new Set(), ordered = [];
  function visit(task) {
    if (visiting.has(task.id)) fail(`Dependency cycle includes ${task.id}. Remove the circular dependency.`);
    if (visited.has(task.id)) return;
    visiting.add(task.id);
    for (const dependency of task.dependsOn) visit(byId.get(dependency));
    visiting.delete(task.id); visited.add(task.id); ordered.push(task);
  }
  tasks.forEach(visit);
  return {title, audience: input.audience, days, hoursPerDay, tasks, requirements, ordered};
}

const round = n => Math.round(n * 100) / 100;
/** @param {PlanInput} input @param {number} effortIncreasePercent */
export function buildPlan(input, effortIncreasePercent = 0) {
  const plan = validatePlan(input);
  number(effortIncreasePercent, 'Scenario effort increase', 0, 100);
  const factor = 1 + effortIncreasePercent / 100;
  const effectiveDue = new Map(plan.tasks.map(t => [t.id, t.dueDay]));
  // An urgent dependent passes its deadline back to prerequisite work.
  for (const task of [...plan.ordered].reverse()) for (const parent of task.dependsOn) {
    effectiveDue.set(parent, Math.min(effectiveDue.get(parent), effectiveDue.get(task.id)));
  }
  const pathHours = new Map(), paths = new Map();
  for (const task of plan.ordered) {
    const parent = [...task.dependsOn].sort((a,b) => pathHours.get(b) - pathHours.get(a) || compareIds(a,b))[0];
    pathHours.set(task.id, (parent ? pathHours.get(parent) : 0) + task.hours * factor);
    paths.set(task.id, [...(parent ? paths.get(parent) : []), task.id]);
  }
  const criticalEnd = [...plan.tasks].sort((a,b) => pathHours.get(b.id) - pathHours.get(a.id) || compareIds(a.id,b.id))[0].id;
  const done = new Set(), schedule = [], dayLoads = Array(plan.days).fill(0);
  let cursor = 0;
  while (done.size < plan.tasks.length) {
    const task = plan.tasks.filter(t => !done.has(t.id) && t.dependsOn.every(d => done.has(d)))
      .sort((a,b) => effectiveDue.get(a.id) - effectiveDue.get(b.id) || a.dueDay - b.dueDay || compareIds(a.id,b.id))[0];
    const start = cursor, effort = task.hours * factor;
    cursor += effort;
    // These are working-day coordinates, not dates or calendar appointments.
    const endDay = Math.ceil((cursor - 1e-9) / plan.hoursPerDay);
    const startDay = Math.floor((start + 1e-9) / plan.hoursPerDay) + 1;
    for (let day = Math.max(1, startDay); day <= Math.min(plan.days, endDay); day++) {
      dayLoads[day - 1] += Math.max(0, Math.min(cursor, day * plan.hoursPerDay) - Math.max(start, (day - 1) * plan.hoursPerDay));
    }
    schedule.push({...task, hours: round(effort), startDay, endDay,
      deadlineMissed: cursor - task.dueDay * plan.hoursPerDay > 1e-8,
      missingEvidence: task.requirementIds.filter(r => !plan.requirements.find(x => x.id === r).evidence),
    });
    done.add(task.id);
  }
  const capacity = plan.days * plan.hoursPerDay;
  const missingEvidence = plan.requirements.filter(r => !r.evidence).map(r => ({id:r.id,label:r.label}));
  const unusedRequirements = plan.requirements.filter(r => !plan.tasks.some(t => t.requirementIds.includes(r.id))).map(r => r.id);
  const lateTasks = schedule.filter(t => t.deadlineMissed).map(t => t.id);
  const nextActions = [];
  if (lateTasks.length) nextActions.push(`Review deadlines or reduce scope for: ${lateTasks.join(', ')}. This ordering misses their supplied due days.`);
  if (cursor > capacity + 1e-8) nextActions.push(`Reduce work by ${round(cursor - capacity)} hours or add capacity beyond the ${plan.days}-day horizon.`);
  if (missingEvidence.length) nextActions.push(`Collect or review evidence for: ${missingEvidence.map(r => r.label).join(', ')}. A reference does not prove competence or completion.`);
  if (unusedRequirements.length) nextActions.push(`Link requirements ${unusedRequirements.join(', ')} to tasks so their delivery is accounted for.`);
  if (!nextActions.length) nextActions.push('Review effort estimates and evidence with the relevant person before committing to this plan.');
  return {
    kind:'workflow-plan', title:plan.title, toolVersion:PLANNER_VERSION, audience:plan.audience,
    provenance:'User-provided estimates and evidence references', effortIncreasePercent,
    totalHours:round(cursor), capacityHours:round(capacity), overflowHours:round(Math.max(0,cursor-capacity)),
    completionDay:schedule.at(-1).endDay, lateTasks, schedule,
    dailyLoad:dayLoads.map((hours,i) => ({day:i+1,hours:round(hours)})),
    criticalPath:{taskIds:paths.get(criticalEnd),hours:round(pathHours.get(criticalEnd))},
    requirements:plan.requirements, missingEvidence, unusedRequirements, nextActions,
    methodology:'One person; constant available hours per planning day; tasks can span days. Dependencies must finish first. Ready tasks sort by earliest downstream deadline, own deadline, then ID. This heuristic is not an optimal scheduler. The dependency-only critical path ignores competing work; the actual schedule includes all tasks. Evidence references are user assertions, not verified skills. No calendars, weekends, time zones, external approvals or AI are inferred.',
  };
}

/** @param {PlanInput} input @param {number} effortIncreasePercent */
export function comparePlans(input, effortIncreasePercent = 25) {
  const baseline = buildPlan(input), scenario = buildPlan(input, effortIncreasePercent);
  return {baseline,scenario,delta:{hours:round(scenario.totalHours-baseline.totalHours),
    completionDays:scenario.completionDay-baseline.completionDay,
    newlyLateTasks:scenario.lateTasks.filter(id => !baseline.lateTasks.includes(id))}};
}

/** Read our device or exported report format; never trust persisted computed results. */
export function restorePlan(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) fail('Invalid saved plan.');
  const input = snapshot.kind === 'workflow-plan' ? snapshot.input : snapshot.plan;
  const increase = snapshot.kind === 'workflow-plan' ? snapshot.result?.scenario?.effortIncreasePercent : snapshot.increase;
  const {ordered, ...plan} = validatePlan(input);
  number(increase, 'Saved scenario effort increase', 0, 100);
  return {plan,increase,result:comparePlans(plan,increase)};
}
