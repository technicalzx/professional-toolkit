import { buildPlan, validatePlan } from "../toolkit/planner.mjs";

/** Portable project records. Extraction and planning are explicit deterministic rules, not AI. */
export const PROJECT_SCHEMA_VERSION = 1;
export const MAX_PROJECT_BYTES = 300_000;
const audiences = ["freelancer", "student", "professional"];
const workStatuses = ["todo", "doing", "done"];
const requirementStatuses = ["proposed", "confirmed", "accepted"];
const round = (value) => Math.round(value * 100) / 100;
const fail = (message) => {
  throw new Error(message);
};
const record = (value, label) => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(`${label} must be an object.`);
  return value;
};
function text(value, label, max = 200, optional = false) {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (!optional && !value.trim())
  )
    fail(
      `${label} must be ${optional ? "" : "nonempty "}text of at most ${max} characters.`,
    );
  return value.trim();
}
function number(value, label, min, max, integer = false) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  )
    fail(
      `${label} must be ${integer ? "an integer" : "a number"} from ${min} to ${max}.`,
    );
  return value;
}
function id(value, label) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,40}$/.test(value))
    fail(`${label} must use 1–40 letters, numbers, underscores or hyphens.`);
  return value;
}
function list(value, label, max) {
  if (!Array.isArray(value) || value.length > max)
    fail(`${label} must contain at most ${max} entries.`);
  return value;
}
function unique(values, label) {
  if (new Set(values).size !== values.length)
    fail(`${label} contains duplicate IDs.`);
  return values;
}
function timestamp(value, label) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  )
    fail(`${label} must be a canonical ISO UTC timestamp.`);
  return value;
}
function choice(value, allowed, label) {
  if (!allowed.includes(value))
    fail(`${label} must be one of: ${allowed.join(", ")}.`);
  return value;
}
function references(value, label, max, available) {
  return unique(
    list(value, label, max).map((value) => {
      const key = id(value, label);
      if (!available.has(key)) fail(`${label} references missing ID ${key}.`);
      return key;
    }),
    label,
  );
}
const criteria = {
  freelancer:
    "Agree a concrete acceptance check with the client and attach delivery evidence.",
  student:
    "Record a reproducible demonstration, its assessment criteria, and what you learned.",
  professional:
    "Record the decision, verification result, owner and handover evidence.",
};

export const projectTemplates = [
  {
    id: "freelancer",
    title: "Client delivery and scope control",
    description:
      "Turn a client brief into tracked deliverables and review the cost of changes.",
    brief:
      "Deliver an accessible landing page with contact form\nDocument form validation and error handling\nProvide a deployment guide and client acceptance checklist",
    days: 10,
    hoursPerDay: 3,
    hourlyRate: 35,
    currency: "USD",
  },
  {
    id: "student",
    title: "Reproducible project and portfolio",
    description:
      "Plan a project, collect demonstrations and publish an honest evidence pack.",
    brief:
      "Define a research question and document the dataset source\nBuild a reproducible analysis with setup instructions\nEvaluate limitations and present findings with a demonstration",
    days: 14,
    hoursPerDay: 2,
    hourlyRate: 0,
    currency: "USD",
  },
  {
    id: "professional",
    title: "Architecture decision and handover",
    description:
      "Track a technical decision through verification and operational handover.",
    brief:
      "Compare migration options against availability and cost constraints\nValidate the chosen approach with rollback and failure tests\nDeliver an architecture decision record and operational runbook",
    days: 10,
    hoursPerDay: 4,
    hourlyRate: 0,
    currency: "USD",
  },
];

/** Every nonblank brief line proposes exactly one requirement; no semantic extraction is claimed. */
export function createProject(input, now = new Date().toISOString()) {
  record(input, "Project input");
  timestamp(now, "Creation time");
  const audience = choice(input.audience, audiences, "Audience");
  const brief = text(input.brief, "Brief", 20_000);
  const lines = brief
    .split(/\r?\n/)
    .map((line, index) => ({
      line: line.trim().replace(/^(?:[-*•]|\d+[.)])\s+/, ""),
      sourceLine: index + 1,
    }))
    .filter((item) => item.line);
  if (lines.length > 20)
    fail(
      "Use at most 20 nonblank brief lines; each line becomes one proposed requirement.",
    );
  const days = input.days === undefined ? 10 : input.days;
  const requirements = lines.map(({ line, sourceLine }, index) => ({
    id: `r${index + 1}`,
    title: line.slice(0, 200),
    acceptanceCriteria: criteria[audience],
    evidenceNote: "",
    status: "proposed",
    sourceLine,
  }));
  const deliverables = requirements.map((requirement, index) => ({
    id: `d${index + 1}`,
    title: requirement.title,
    requirementIds: [requirement.id],
    status: "todo",
    evidenceNote: "",
  }));
  const tasks = requirements.flatMap((requirement, index) => [
    {
      id: `t${index + 1}_work`,
      title: `Produce: ${requirement.title}`.slice(0, 200),
      hours: 2,
      dueDay: days,
      dependsOn: [],
      requirementIds: [requirement.id],
      deliverableId: `d${index + 1}`,
      status: "todo",
    },
    {
      id: `t${index + 1}_check`,
      title: `Verify: ${requirement.title}`.slice(0, 200),
      hours: 1,
      dueDay: days,
      dependsOn: [`t${index + 1}_work`],
      requirementIds: [requirement.id],
      deliverableId: `d${index + 1}`,
      status: "todo",
    },
  ]);
  return validateProject({
    kind: "toolkit-project",
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id:
      input.id === undefined ? `p-${globalThis.crypto.randomUUID()}` : input.id,
    title: input.title,
    audience,
    brief,
    days,
    hoursPerDay: input.hoursPerDay === undefined ? 3 : input.hoursPerDay,
    hourlyRate: input.hourlyRate === undefined ? 0 : input.hourlyRate,
    currency: input.currency === undefined ? "USD" : input.currency,
    createdAt: now,
    updatedAt: now,
    requirements,
    deliverables,
    tasks,
    assumptions: [
      "Rule-based proposal: each nonblank brief line is one requirement. Review it before confirming scope.",
      "Each requirement starts with a 2-hour production task and a 1-hour verification task. These are placeholders, not measured estimates.",
      "One person works a constant number of hours each planning day. Planning days do not represent a calendar.",
      "Evidence notes are user statements; this tool does not independently verify delivery or competence.",
    ],
  });
}

/** Reconcile brief lines by exact title only. Changed wording becomes removed + added scope. */
export function proposeBriefRevision(
  input,
  brief,
  now = new Date().toISOString(),
) {
  const prior = validateProject(input);
  const proposal = createProject({ ...prior, brief }, now);
  const available = new Set(
    [...prior.requirements, ...prior.deliverables, ...prior.tasks].map(
      (value) => value.id,
    ),
  );
  const allocate = (prefix) => {
    let key;
    do {
      key = `${prefix}-${globalThis.crypto.randomUUID()}`;
    } while (available.has(key));
    available.add(key);
    return key;
  };
  const used = new Set(),
    additions = [];
  const requirements = proposal.requirements.map((value) => {
    const existing = prior.requirements.find(
      (old) => !used.has(old.id) && old.title === value.title,
    );
    if (existing) {
      used.add(existing.id);
      return { ...existing, sourceLine: value.sourceLine };
    }
    const added = { ...value, id: allocate("r") };
    additions.push(added);
    return added;
  });
  const retained = new Set(requirements.map((value) => value.id));
  const deliverables = prior.deliverables
    .map((value) => ({
      ...value,
      requirementIds: value.requirementIds.filter((key) => retained.has(key)),
    }))
    .filter((value) => value.requirementIds.length);
  const deliverableIds = new Set(deliverables.map((value) => value.id));
  const tasks = prior.tasks
    .map((value) => ({
      ...value,
      requirementIds: value.requirementIds.filter((key) => retained.has(key)),
    }))
    .filter(
      (value) =>
        value.requirementIds.length && deliverableIds.has(value.deliverableId),
    );
  for (const requirement of additions) {
    const deliverableId = allocate("d"),
      workId = allocate("t"),
      checkId = allocate("t");
    deliverables.push({
      id: deliverableId,
      title: requirement.title,
      requirementIds: [requirement.id],
      status: "todo",
      evidenceNote: "",
    });
    tasks.push(
      {
        id: workId,
        title: `Produce: ${requirement.title}`.slice(0, 200),
        hours: 2,
        dueDay: prior.days,
        dependsOn: [],
        requirementIds: [requirement.id],
        deliverableId,
        status: "todo",
      },
      {
        id: checkId,
        title: `Verify: ${requirement.title}`.slice(0, 200),
        hours: 1,
        dueDay: prior.days,
        dependsOn: [workId],
        requirementIds: [requirement.id],
        deliverableId,
        status: "todo",
      },
    );
  }
  const taskIds = new Set(tasks.map((value) => value.id));
  for (const task of tasks)
    task.dependsOn = task.dependsOn.filter((key) => taskIds.has(key));
  return validateProject({
    ...prior,
    brief: proposal.brief,
    updatedAt: now,
    requirements,
    deliverables,
    tasks,
  });
}

/** Normalize allowed fields; reject bad references, impossible states and unbounded imports. */
export function validateProject(input) {
  record(input, "Project");
  if (
    input.kind !== "toolkit-project" ||
    input.schemaVersion !== PROJECT_SCHEMA_VERSION
  )
    fail("Unsupported project kind or schema version.");
  const project = {
    kind: "toolkit-project",
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: id(input.id, "Project ID"),
    title: text(input.title, "Project title"),
    audience: choice(input.audience, audiences, "Audience"),
    brief: text(input.brief, "Brief", 20_000),
    days: number(input.days, "Planning days", 1, 90, true),
    hoursPerDay: number(input.hoursPerDay, "Hours per planning day", 0.25, 12),
    hourlyRate: number(input.hourlyRate, "Hourly rate", 0, 100_000),
    currency: text(input.currency, "Currency", 3),
    createdAt: timestamp(input.createdAt, "Created time"),
    updatedAt: timestamp(input.updatedAt, "Updated time"),
  };
  if (!/^[A-Z]{3}$/.test(project.currency))
    fail("Currency must use three uppercase letters.");
  if (project.updatedAt < project.createdAt)
    fail("Updated time cannot precede creation time.");
  project.requirements = list(input.requirements, "Requirements", 20).map(
    (value) => {
      record(value, "Requirement");
      const result = {
        id: id(value.id, "Requirement ID"),
        title: text(value.title, "Requirement title"),
        acceptanceCriteria: text(
          value.acceptanceCriteria,
          "Acceptance criteria",
          2000,
        ),
        evidenceNote: text(value.evidenceNote, "Evidence note", 2000, true),
        status: choice(value.status, requirementStatuses, "Requirement status"),
        sourceLine: number(
          value.sourceLine,
          "Brief source line (0 for manual)",
          0,
          project.brief.split(/\r?\n/).length,
          true,
        ),
      };
      if (result.status === "accepted" && !result.evidenceNote)
        fail(`Accepted requirement ${result.id} needs an evidence note.`);
      return result;
    },
  );
  if (!project.requirements.length) fail("Add at least one requirement.");
  const requirementIds = new Set(
    unique(
      project.requirements.map((value) => value.id),
      "Requirements",
    ),
  );
  project.deliverables = list(input.deliverables, "Deliverables", 20).map(
    (value) => {
      record(value, "Deliverable");
      const result = {
        id: id(value.id, "Deliverable ID"),
        title: text(value.title, "Deliverable title"),
        requirementIds: references(
          value.requirementIds,
          "Deliverable requirements",
          20,
          requirementIds,
        ),
        status: choice(value.status, workStatuses, "Deliverable status"),
        evidenceNote: text(
          value.evidenceNote,
          "Deliverable evidence note",
          2000,
          true,
        ),
      };
      if (!result.requirementIds.length)
        fail("Link every deliverable to at least one requirement.");
      if (result.status === "done" && !result.evidenceNote)
        fail(`Done deliverable ${result.id} needs an evidence note.`);
      return result;
    },
  );
  if (!project.deliverables.length) fail("Add at least one deliverable.");
  const deliverableIds = new Set(
    unique(
      project.deliverables.map((value) => value.id),
      "Deliverables",
    ),
  );
  project.tasks = list(input.tasks, "Tasks", 40).map((value) => {
    record(value, "Task");
    return {
      id: id(value.id, "Task ID"),
      title: text(value.title, "Task title"),
      hours: value.hours,
      dueDay: value.dueDay,
      dependsOn: list(value.dependsOn, "Task dependencies", 39).map((value) =>
        id(value, "Dependency ID"),
      ),
      requirementIds: references(
        value.requirementIds,
        "Task requirements",
        20,
        requirementIds,
      ),
      deliverableId: id(value.deliverableId, "Task deliverable ID"),
      status: choice(value.status, workStatuses, "Task status"),
    };
  });
  unique(
    [
      ...requirementIds,
      ...deliverableIds,
      ...project.tasks.map((value) => value.id),
    ],
    "Project record IDs",
  );
  for (const task of project.tasks) {
    if (!deliverableIds.has(task.deliverableId))
      fail(
        `Task ${task.id} references missing deliverable ${task.deliverableId}.`,
      );
    const deliverable = project.deliverables.find(
      (value) => value.id === task.deliverableId,
    );
    if (
      !task.requirementIds.length ||
      task.requirementIds.some(
        (key) => !deliverable.requirementIds.includes(key),
      )
    )
      fail(`Task ${task.id} requirements must belong to its deliverable.`);
  }
  project.assumptions = list(input.assumptions, "Assumptions", 20).map(
    (value) => text(value, "Assumption", 2000),
  );
  // Reuse the existing bounded planner for graph validation and effort/due-day limits.
  validatePlan(plannerInput(project));
  if (
    new TextEncoder().encode(JSON.stringify(project)).length > MAX_PROJECT_BYTES
  )
    fail("Project exceeds the 300 KB limit.");
  return project;
}

function plannerInput(project) {
  return {
    title: project.title,
    audience: project.audience,
    days: project.days,
    hoursPerDay: project.hoursPerDay,
    tasks: project.tasks,
    requirements: project.requirements.map((value) => ({
      id: value.id,
      label: value.title,
      evidence: value.evidenceNote.slice(0, 1000),
    })),
  };
}

/** Entire scope schedule, with remaining effort reported separately from original commitments. */
export function buildProjectPlan(input) {
  const project = validateProject(input);
  const plan = buildPlan(plannerInput(project));
  const remainingHours = round(
    project.tasks
      .filter((value) => value.status !== "done")
      .reduce((total, task) => total + task.hours, 0),
  );
  return {
    ...plan,
    budget: round(plan.totalHours * project.hourlyRate),
    currency: project.currency,
    hourlyRate: project.hourlyRate,
    remainingHours,
    remainingBudget: round(remainingHours * project.hourlyRate),
    unconfirmedRequirements: project.requirements
      .filter((value) => value.status === "proposed")
      .map((value) => value.id),
    unlinkedRequirements: project.requirements
      .filter(
        (value) =>
          !project.deliverables.some((deliverable) =>
            deliverable.requirementIds.includes(value.id),
          ),
      )
      .map((value) => value.id),
  };
}

/** Stable IDs represent correspondence; no fuzzy matching or semantic interpretation. */
export function compareScope(baselineInput, revisedInput) {
  const baseline = validateProject(baselineInput),
    revised = validateProject(revisedInput);
  if (baseline.id !== revised.id || baseline.audience !== revised.audience)
    fail("Compare revisions of the same project and audience.");
  const before = new Map(
    baseline.requirements.map((value) => [value.id, value]),
  );
  const after = new Map(revised.requirements.map((value) => [value.id, value]));
  const addedRequirements = revised.requirements.filter(
    (value) => !before.has(value.id),
  );
  const removedRequirements = baseline.requirements.filter(
    (value) => !after.has(value.id),
  );
  const scopeFields = ["title", "acceptanceCriteria"];
  const changedRequirements = revised.requirements
    .filter((value) => before.has(value.id))
    .flatMap((value) => {
      const prior = before.get(value.id),
        fields = scopeFields.filter((field) => prior[field] !== value[field]);
      return fields.length
        ? [{ id: value.id, before: prior, after: value, fields }]
        : [];
    });
  const changedRequirementIds = new Set(
    [...addedRequirements, ...removedRequirements, ...changedRequirements].map(
      (value) => value.id,
    ),
  );
  const affectedDeliverables = new Set();
  const oldDeliverables = new Map(
    baseline.deliverables.map((value) => [value.id, value]),
  );
  const newDeliverables = new Map(
    revised.deliverables.map((value) => [value.id, value]),
  );
  for (const value of [...baseline.deliverables, ...revised.deliverables]) {
    const old = oldDeliverables.get(value.id),
      current = newDeliverables.get(value.id);
    if (
      value.requirementIds.some((key) => changedRequirementIds.has(key)) ||
      !old ||
      !current ||
      old.title !== current.title ||
      JSON.stringify([...old.requirementIds].sort()) !==
        JSON.stringify([...current.requirementIds].sort())
    )
      affectedDeliverables.add(value.id);
  }
  const affectedTasks = new Set();
  const oldTasks = new Map(baseline.tasks.map((value) => [value.id, value]));
  const newTasks = new Map(revised.tasks.map((value) => [value.id, value]));
  const taskScope = (value) =>
    JSON.stringify([
      value.title,
      value.hours,
      value.dueDay,
      [...value.dependsOn].sort(),
      [...value.requirementIds].sort(),
      value.deliverableId,
    ]);
  for (const value of [...baseline.tasks, ...revised.tasks]) {
    const old = oldTasks.get(value.id),
      current = newTasks.get(value.id);
    if (
      value.requirementIds.some((key) => changedRequirementIds.has(key)) ||
      affectedDeliverables.has(value.deliverableId) ||
      !old ||
      !current ||
      taskScope(old) !== taskScope(current)
    )
      affectedTasks.add(value.id);
  }
  // Propagate through both graphs so removed dependencies cannot conceal their consequences.
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const task of [...baseline.tasks, ...revised.tasks])
      if (
        !affectedTasks.has(task.id) &&
        task.dependsOn.some((key) => affectedTasks.has(key))
      ) {
        affectedTasks.add(task.id);
        expanded = true;
      }
  }
  for (const task of [...baseline.tasks, ...revised.tasks])
    if (affectedTasks.has(task.id))
      affectedDeliverables.add(task.deliverableId);
  const originalPlan = buildProjectPlan(baseline),
    revisedPlan = buildProjectPlan(revised);
  const deltas = {
    hours: round(revisedPlan.totalHours - originalPlan.totalHours),
    budget:
      baseline.currency === revised.currency
        ? round(revisedPlan.budget - originalPlan.budget)
        : null,
    capacityHours: round(
      revisedPlan.capacityHours - originalPlan.capacityHours,
    ),
    overflowHours: round(
      revisedPlan.overflowHours - originalPlan.overflowHours,
    ),
    completionDays: revisedPlan.completionDay - originalPlan.completionDay,
  };
  return {
    addedRequirements,
    removedRequirements,
    changedRequirements,
    affectedDeliverables: [...affectedDeliverables].sort(),
    affectedTasks: [...affectedTasks].sort(),
    deltas,
    baseline: originalPlan,
    revised: revisedPlan,
    currencyChanged: baseline.currency !== revised.currency,
    budgetComparable: baseline.currency === revised.currency,
    methodology:
      "Exact stable-ID and field comparison. Scope changes propagate through linked deliverables and downstream dependencies. Evidence/status edits are progress updates, not scope changes. Budget is estimated effort × supplied hourly rate; no taxes, market pricing or actual spend are inferred.",
  };
}

export function serializeProject(project) {
  return JSON.stringify(validateProject(project), null, 2);
}

export function importProject(json) {
  if (
    typeof json !== "string" ||
    json.length > MAX_PROJECT_BYTES ||
    new TextEncoder().encode(json).length > MAX_PROJECT_BYTES
  )
    fail("Import a JSON project smaller than 300 KB.");
  let value;
  try {
    value = JSON.parse(json);
  } catch {
    fail("Project JSON is malformed.");
  }
  return validateProject(value);
}

// Keep user-controlled text inert in rendered Markdown (including HTML, headings and links).
const md = (value) =>
  String(value)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/([\\`*_{}\[\]()#+.!|~])/g, "\\$1");

export function exportProjectMarkdown(input, format = "handover") {
  choice(format, ["handover", "client", "portfolio"], "Export format");
  const project = validateProject(input),
    plan = buildProjectPlan(project);
  const labels = {
    handover: "Project handover",
    client: "Client scope and delivery review",
    portfolio: "Project evidence portfolio",
  };
  const lines = [
    `# ${labels[format]}: ${md(project.title)}`,
    "",
    `Project: ${md(project.id)} · ${project.audience} · record updated ${project.updatedAt}`,
    "",
    "## Recorded facts and user statements",
    "",
    "The following are user-supplied records, not independently verified outcomes. Proposed requirements have not been confirmed.",
    "",
    ...project.requirements.flatMap((value) => [
      `### ${md(value.id)}: ${md(value.title)}`,
      `Status: ${value.status}. Acceptance: ${md(value.acceptanceCriteria)}`,
      value.evidenceNote
        ? `User evidence note: ${md(value.evidenceNote)}`
        : "Missing evidence: no supporting note has been recorded.",
      "",
    ]),
    "## Deliverables",
    "",
    ...project.deliverables.map(
      (value) =>
        `- ${md(value.title)} [${value.status}]; requirements: ${value.requirementIds.join(", ")}; ${value.evidenceNote ? `user evidence: ${md(value.evidenceNote)}` : "evidence missing"}.`,
    ),
    "",
    "## Plan and estimates",
    "",
    `Total scope: ${plan.totalHours} hours. Remaining task effort: ${plan.remainingHours} hours. Capacity: ${plan.capacityHours} hours. Overflow: ${plan.overflowHours} hours.`,
    `Estimated effort budget: ${plan.budget} ${project.currency}, using ${project.hourlyRate} ${project.currency}/hour. This is not actual expenditure or an agreed quote.`,
    "",
    ...project.tasks.map(
      (value) =>
        `- ${md(value.id)}: ${md(value.title)} [${value.status}], ${value.hours}h, due planning day ${value.dueDay}, dependencies: ${value.dependsOn.join(", ") || "none"}.`,
    ),
    "",
    "## Assumptions and method",
    "",
    ...project.assumptions.map((value) => `- ${md(value)}`),
    `- ${md(plan.methodology)}`,
    "",
    "## Missing evidence and open decisions",
    "",
    ...project.requirements
      .filter((value) => !value.evidenceNote || value.status === "proposed")
      .map(
        (value) =>
          `- ${md(value.id)}: ${!value.evidenceNote ? "collect supporting evidence; " : ""}${value.status === "proposed" ? "review and confirm requirement." : "confirm acceptance against the recorded criteria."}`,
      ),
    ...plan.unlinkedRequirements.map(
      (key) => `- ${md(key)} has no linked deliverable.`,
    ),
    ...plan.nextActions.map((value) => `- ${md(value)}`),
    "",
    "Completion status and evidence notes are manual records. No client approval, skill mastery, revenue gain or external verification is inferred.",
    "",
  ];
  if (format === "portfolio")
    lines.splice(
      4,
      0,
      "Publication draft: review private names, links and project details before sharing. No demonstrated business outcome is inferred.",
      "",
    );
  if (format === "client")
    lines.splice(
      4,
      0,
      "Review draft: acceptance and commercial agreement must be confirmed by the parties.",
      "",
    );
  return lines.join("\n");
}
