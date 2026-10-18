import test from "node:test";
import assert from "node:assert/strict";
import {
  createProject,
  addProjectSource,
  linkProjectEvidence,
  reviseProjectSource,
  removeProjectSource,
  inspectProjectEvidence,
} from "../lib/projects/engine.mjs";
import {
  applyProjectEvidenceChange,
  normalizeProjectBaseline,
} from "../lib/projects/workspace-evidence.mjs";

const snapshot = {
  schemaVersion: 1,
  title: "Synthetic verification log",
  sourceUrl: "https://example.com/verification",
  text: "SYNTHETIC_PRIVATE_CONTENT. Keyboard-only onboarding checks passed. This synthetic record includes the original verification steps and its known limitations.",
  headings: [],
  capturedAt: "2026-10-17T00:00:00.000Z",
  captureMethod: "manual-snapshot",
  userEdited: true,
};
function fixture() {
  let project = createProject({
    title: "Synthetic evidence project",
    audience: "freelancer",
    brief: "Verify the onboarding experience",
  });
  project = addProjectSource(project, snapshot);
  const sourceId = project.sources[0].id;
  for (const type of ["requirement", "deliverable"])
    project = linkProjectEvidence(
      project,
      { type, id: type === "requirement" ? "r1" : "d1" },
      sourceId,
      "SYNTHETIC_PRIVATE_CONTENT.",
    );
  return {
    entry: {
      project,
      baseline: structuredClone(project),
      revision: 7,
      cloudOwner: "synthetic-owner",
      dirty: false,
    },
    sourceId,
  };
}

test("source redaction scrubs the scope baseline and pinned excerpts without mutating previous records", () => {
  const { entry, sourceId } = fixture();
  const redacted = {
    ...snapshot,
    text: "Reviewed public summary. Keyboard-only onboarding checks passed. This synthetic artifact records verification steps and limitations without private content.",
  };
  const next = applyProjectEvidenceChange(
    entry,
    reviseProjectSource(entry.project, sourceId, redacted),
    { sourceId, action: "revise" },
  );
  assert.equal(
    JSON.stringify(next).includes("SYNTHETIC_PRIVATE_CONTENT"),
    false,
  );
  assert.equal(next.baseline.sources[0].revision, 2);
  assert.equal(next.revision, 7);
  assert.equal(next.cloudOwner, "synthetic-owner");
  assert.equal(next.dirty, true);
  assert.equal(
    inspectProjectEvidence(next.project).every(
      (link) => link.status === "stale-source" && !("quote" in link),
    ),
    true,
  );
  assert.equal(entry.project.sources[0].snapshot.text, snapshot.text);
  assert.equal(entry.dirty, false);
});

test("removal purges baseline content while keeping visible repairable missing-source references", () => {
  const { entry, sourceId } = fixture();
  const next = applyProjectEvidenceChange(
    entry,
    removeProjectSource(entry.project, sourceId),
    { sourceId, action: "remove" },
  );
  assert.equal(next.project.sources.length, 0);
  assert.equal(next.baseline.sources.length, 0);
  assert.equal(
    JSON.stringify(next).includes("SYNTHETIC_PRIVATE_CONTENT"),
    false,
  );
  assert.equal(inspectProjectEvidence(next.project).length, 2);
  assert.equal(
    inspectProjectEvidence(next.baseline).every(
      (link) => link.status === "missing-source",
    ),
    true,
  );
});

test("source workspace changes reject foreign projects, baselines and contradictory mutations", () => {
  const { entry, sourceId } = fixture();
  assert.throws(
    () =>
      applyProjectEvidenceChange(entry, {
        ...entry.project,
        id: "foreign-project",
      }),
    /selected project/,
  );
  assert.throws(
    () =>
      applyProjectEvidenceChange(
        { ...entry, baseline: { ...entry.baseline, audience: "student" } },
        entry.project,
      ),
    /Baseline/,
  );
  assert.throws(
    () =>
      applyProjectEvidenceChange(entry, entry.project, {
        sourceId,
        action: "remove",
      }),
    /still present/,
  );
  assert.throws(
    () =>
      applyProjectEvidenceChange(entry, entry.project, {
        sourceId: "not-present",
        action: "revise",
      }),
    /unavailable/,
  );
});

test("imported baselines cannot retain revised, removed or forged same-revision source content", () => {
  const { entry, sourceId } = fixture();
  const redacted = {
    ...snapshot,
    text: "Reviewed public summary. Keyboard-only onboarding checks passed. This synthetic artifact records verification steps and limitations without private content.",
  };
  const revised = reviseProjectSource(entry.project, sourceId, redacted);
  assert.equal(
    JSON.stringify(normalizeProjectBaseline(revised, entry.baseline)).includes(
      "SYNTHETIC_PRIVATE_CONTENT",
    ),
    false,
  );
  assert.equal(
    JSON.stringify(
      normalizeProjectBaseline(
        removeProjectSource(entry.project, sourceId),
        entry.baseline,
      ),
    ).includes("SYNTHETIC_PRIVATE_CONTENT"),
    false,
  );
  const forged = structuredClone(revised);
  forged.sources[0].revision = 1;
  const reconciled = normalizeProjectBaseline(forged, entry.baseline);
  assert.equal(
    JSON.stringify(reconciled).includes("SYNTHETIC_PRIVATE_CONTENT"),
    false,
  );
  assert.equal(
    reconciled.requirements[0].title,
    entry.baseline.requirements[0].title,
  );
  const dangling = structuredClone(entry.baseline);
  dangling.sources = [];
  assert.equal(
    JSON.stringify(normalizeProjectBaseline(revised, dangling)).includes(
      "SYNTHETIC_PRIVATE_CONTENT",
    ),
    false,
  );
});


test("scope baselines discard time records on import and evidence changes without mutating current logs", () => {
  const { entry } = fixture();
  const timeEntry = {
    id: "l-scope-fixture", taskId: entry.project.tasks[0].id,
    taskTitle: entry.project.tasks[0].title, workDate: "2026-10-17",
    durationSeconds: 3600, note: "SYNTHETIC_TIME_PRIVATE_NOTE",
    sourceLabel: "synthetic-provider", externalId: "scope-log-1",
    importedAt: "2026-10-17T10:00:00.000Z",
  };
  const recorded = { ...entry.project, timeEntries: [timeEntry] };
  const baselineInput = structuredClone(recorded);
  const baseline = normalizeProjectBaseline(recorded, baselineInput);
  assert.deepEqual(baseline.timeEntries, []);
  assert.equal(JSON.stringify(baseline).includes(timeEntry.note), false);
  assert.equal(baseline.sources[0].snapshot.text, recorded.sources[0].snapshot.text);
  assert.equal(baseline.requirements[0].evidenceLinks[0].quote, recorded.requirements[0].evidenceLinks[0].quote);
  assert.deepEqual(baselineInput.timeEntries, [timeEntry]);
  assert.deepEqual(recorded.timeEntries, [timeEntry]);
  const malformed = normalizeProjectBaseline(recorded, {
    ...entry.baseline, timeEntries: { privateLegacyArchive: timeEntry.note },
  });
  assert.deepEqual(malformed.timeEntries, []);
  assert.equal(JSON.stringify(malformed).includes(timeEntry.note), false);
  const changed = applyProjectEvidenceChange(
    { ...entry, project: recorded, baseline: baselineInput }, recorded,
  );
  assert.deepEqual(changed.project.timeEntries, [timeEntry]);
  assert.deepEqual(changed.baseline.timeEntries, []);
  assert.equal(normalizeProjectBaseline(recorded, null), null);
});
