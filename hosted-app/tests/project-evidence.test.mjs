import test from "node:test";
import assert from "node:assert/strict";
import {
  createProject,
  validateProject,
  serializeProject,
  importProject,
  exportProjectMarkdown,
  proposeBriefRevision,
  addProjectSource,
  reviseProjectSource,
  removeProjectSource,
  linkProjectEvidence,
  unlinkProjectEvidence,
  inspectProjectEvidence,
} from "../lib/projects/engine.mjs";

const now = "2026-10-17T10:00:00.000Z";
const later = "2026-10-17T11:00:00.000Z";
const quote =
  "I built an accessible contact form and tested keyboard navigation.";
const privateText =
  "PRIVATE_UNSELECTED_CORPUS_37491 should never appear in a generated work pack.";
const project = () =>
  createProject(
    {
      id: "project-evidence",
      title: "Evidence reuse",
      audience: "freelancer",
      brief: "Deliver the contact form\nPrepare a handover",
    },
    now,
  );
const snapshot = (overrides = {}) => ({
  schemaVersion: 1,
  sourceUrl: "https://example.com/profile?utm_source=tracking#details",
  title: "Contact form case study",
  text: `${quote}\n${privateText}`,
  headings: ["Case study"],
  capturedAt: now,
  captureMethod: "manual-snapshot",
  userEdited: true,
  ...overrides,
});
const withSource = () => addProjectSource(project(), snapshot(), now);
const linkedProject = () => {
  const p = withSource();
  return linkProjectEvidence(
    p,
    { type: "requirement", id: "r1" },
    p.sources[0].id,
    quote,
    now,
  );
};

test("old schema 1 records default to empty source and evidence collections", () => {
  const legacy = project();
  delete legacy.sources;
  for (const target of [...legacy.requirements, ...legacy.deliverables])
    delete target.evidenceLinks;
  const restored = importProject(JSON.stringify(legacy));
  assert.deepEqual(restored.sources, []);
  assert.ok(
    [...restored.requirements, ...restored.deliverables].every(
      (target) =>
        Array.isArray(target.evidenceLinks) &&
        target.evidenceLinks.length === 0,
    ),
  );
  assert.equal(restored.schemaVersion, 1);
});

test("one source supports requirements and deliverables across client and portfolio formats", () => {
  const original = withSource();
  const p = linkProjectEvidence(
    linkProjectEvidence(
      original,
      { type: "requirement", id: "r1" },
      original.sources[0].id,
      quote,
      now,
    ),
    { type: "deliverable", id: "d2" },
    original.sources[0].id,
    quote,
    later,
  );
  assert.equal(p.sources.length, 1);
  const links = inspectProjectEvidence(p);
  assert.deepEqual(
    links.map((link) => [link.targetType, link.targetId, link.status]),
    [
      ["requirement", "r1", "linked"],
      ["deliverable", "d2", "linked"],
    ],
  );
  assert.ok(
    links.every(
      (link) =>
        link.quote === quote &&
        link.sourceRevision === 1 &&
        link.sourceUrl === "https://example.com/profile",
    ),
  );
  for (const format of ["client", "portfolio", "handover"]) {
    const output = exportProjectMarkdown(p, format);
    assert.ok(
      output.includes(
        "Selected excerpt: I built an accessible contact form and tested keyboard navigation\\.",
      ),
    );
    assert.match(output, /source .* revision 1/);
    assert.match(output, /Captured:/);
    assert.match(
      output,
      /not ownership, truth, client approval or skill verification/,
    );
    assert.ok(!output.includes(privateText));
    assert.ok(!output.includes("utm_source"));
  }
  assert.deepEqual(inspectProjectEvidence(original), []);
});

test("new links enforce exact nonempty bounded quotes and existing targets", () => {
  const p = withSource(),
    sourceId = p.sources[0].id;
  for (const invalid of [
    "invented experience",
    "",
    " ",
    quote.toLowerCase(),
    "x".repeat(601),
    null,
  ])
    assert.throws(
      () =>
        linkProjectEvidence(
          p,
          { type: "requirement", id: "r1" },
          sourceId,
          invalid,
          now,
        ),
      /exact, nonempty/,
    );
  assert.throws(
    () =>
      linkProjectEvidence(
        p,
        { type: "task", id: "t1_work" },
        sourceId,
        quote,
        now,
      ),
    /target type/,
  );
  assert.throws(
    () =>
      linkProjectEvidence(
        p,
        { type: "requirement", id: "missing" },
        sourceId,
        quote,
        now,
      ),
    /existing requirement/,
  );
  assert.throws(
    () =>
      linkProjectEvidence(
        p,
        { type: "requirement", id: "r1" },
        "missing",
        quote,
        now,
      ),
    /existing project source/,
  );
  const linked = linkProjectEvidence(
    p,
    { type: "requirement", id: "r1" },
    sourceId,
    quote,
    now,
  );
  assert.deepEqual(
    linkProjectEvidence(
      linked,
      { type: "requirement", id: "r1" },
      sourceId,
      quote,
      later,
    ),
    linked,
  );
});

test("untrusted stale, missing and unmatched links remain warnings without exported quote text", () => {
  const p = withSource(),
    sourceId = p.sources[0].id;
  p.requirements[0].evidenceLinks = [
    { sourceId, sourceRevision: 2, quote: "STALE_FORGED_QUOTE_1234" },
    {
      sourceId: "deleted-source",
      sourceRevision: 1,
      quote: "MISSING_FORGED_QUOTE_1234",
    },
    { sourceId, sourceRevision: 1, quote: "UNMATCHED_FORGED_QUOTE_1234" },
    { sourceId, sourceRevision: 1, quote: "" },
  ];
  const restored = importProject(serializeProject(p)),
    rows = inspectProjectEvidence(restored);
  assert.deepEqual(
    rows.map((row) => row.status),
    ["stale-source", "missing-source", "quote-missing", "quote-missing"],
  );
  assert.ok(rows.every((row) => !Object.hasOwn(row, "quote")));
  for (const format of ["client", "portfolio"]) {
    const output = exportProjectMarkdown(restored, format);
    assert.match(output, /Evidence warning/);
    for (const link of p.requirements[0].evidenceLinks)
      if (link.quote) assert.ok(!output.includes(link.quote));
  }
});

test("canonical snapshot dedup strips tracking and unknown review fields", () => {
  const p = addProjectSource(
    project(),
    { ...snapshot(), credentials: "discard-me", platform: "forged-platform" },
    now,
  );
  const duplicate = addProjectSource(
    p,
    snapshot({ sourceUrl: "https://example.com/profile?token=discarded#new" }),
    later,
  );
  assert.deepEqual(duplicate, p);
  assert.equal(p.sources[0].snapshot.platform, "website");
  assert.equal(p.sources[0].snapshot.sourceUrl, "https://example.com/profile");
  assert.ok(!serializeProject(p).includes("discard-me"));
  const review = {
    kind: "captured-review",
    mode: "local",
    source: snapshot(),
    request: "Review",
    checks: ["untrusted-derived-claim"],
    summary: "SECRET_DERIVED_CLAIM",
  };
  assert.deepEqual(addProjectSource(p, review, later), p);
  assert.ok(!serializeProject(p).includes("SECRET_DERIVED_CLAIM"));
});

test("invalid snapshot locators and forged AI review quotations are rejected before import", () => {
  for (const url of [
    "http://example.com/profile",
    "https://name:password@example.com/profile",
    "https://127.0.0.1/profile",
    "https://localhost/profile",
    "https://example.com:8443/profile",
    "javascript:alert(1)",
  ])
    assert.throws(() =>
      addProjectSource(project(), snapshot({ sourceUrl: url }), now),
    );
  assert.throws(
    () =>
      addProjectSource(
        project(),
        {
          kind: "captured-review",
          mode: "ai",
          source: snapshot(),
          request: "Review",
          summary: "Claim",
          findings: [
            {
              quote: "invented",
              observation: "Claim",
              recommendation: "Advice",
            },
          ],
          missingInformation: [],
        },
        now,
      ),
    /absent from its source/,
  );
});

test("revising a source drops its old corpus and all cached quotes across multiple linked entities", () => {
  let p = linkedProject();
  const sourceId = p.sources[0].id;
  p = linkProjectEvidence(
    p,
    { type: "requirement", id: "r1" },
    sourceId,
    privateText,
    now,
  );
  p = linkProjectEvidence(
    p,
    { type: "deliverable", id: "d1" },
    sourceId,
    quote,
    now,
  );
  const prior = structuredClone(p);
  const revised = reviseProjectSource(
    p,
    sourceId,
    snapshot({
      title: "Redacted source",
      text: "Replacement source content contains only approved public information. No previous material remains in the stored source.",
    }),
    later,
  );
  assert.deepEqual(p, prior);
  assert.equal(revised.sources[0].revision, 2);
  assert.equal(revised.sources[0].importedAt, later);
  assert.ok(
    [...revised.requirements, ...revised.deliverables]
      .flatMap((target) => target.evidenceLinks)
      .every((link) => link.quote === ""),
  );
  assert.deepEqual(
    inspectProjectEvidence(revised).map((link) => link.status),
    ["stale-source", "stale-source", "stale-source"],
  );
  const json = serializeProject(revised);
  assert.ok(!json.includes(quote));
  assert.ok(!json.includes(privateText));
  const linkedAgain = linkProjectEvidence(
    revised,
    { type: "requirement", id: "r1" },
    sourceId,
    "Replacement source content",
    later,
  );
  assert.equal(
    inspectProjectEvidence(linkedAgain).at(-1).status,
    "stale-source",
  );
  assert.ok(
    inspectProjectEvidence(linkedAgain).some(
      (link) => link.status === "linked" && link.sourceRevision === 2,
    ),
  );
});

test("removing a source leaves repairable tombstones but neither source content nor selected quotes", () => {
  let p = linkedProject();
  const sourceId = p.sources[0].id;
  p = linkProjectEvidence(
    p,
    { type: "requirement", id: "r1" },
    sourceId,
    privateText,
    now,
  );
  const removed = removeProjectSource(p, sourceId, later);
  assert.equal(removed.sources.length, 0);
  assert.equal(removed.requirements[0].evidenceLinks.length, 2);
  assert.ok(
    inspectProjectEvidence(removed).every(
      (link) => link.status === "missing-source",
    ),
  );
  assert.ok(
    removed.requirements[0].evidenceLinks.every((link) => link.quote === ""),
  );
  const json = serializeProject(removed);
  assert.ok(!json.includes(quote));
  assert.ok(!json.includes(privateText));
  assert.match(exportProjectMarkdown(removed), /missing-source/);
  const unlinked = unlinkProjectEvidence(
    removed,
    { type: "requirement", id: "r1" },
    0,
    later,
  );
  assert.equal(unlinked.requirements[0].evidenceLinks.length, 1);
  assert.throws(
    () =>
      unlinkProjectEvidence(
        unlinked,
        { type: "requirement", id: "r1" },
        1,
        later,
      ),
    /link index/,
  );
});

test("new brief revisions retain sources and exact-match links without creating inferred support", () => {
  const p = linkedProject();
  const revised = proposeBriefRevision(
    p,
    "Prepare a handover\nDeliver the contact form\nWrite a new report",
    later,
  );
  assert.deepEqual(revised.sources, p.sources);
  assert.deepEqual(
    revised.requirements.find((value) => value.id === "r1").evidenceLinks,
    p.requirements[0].evidenceLinks,
  );
  assert.equal(revised.requirements.at(-1).evidenceLinks.length, 0);
  assert.equal(inspectProjectEvidence(revised).length, 1);
});

test("source counts, link counts, identities, revisions and byte budgets remain bounded", () => {
  let p = project();
  for (let index = 0; index < 12; index++)
    p = addProjectSource(
      p,
      snapshot({
        title: `Source ${index}`,
        sourceUrl: `https://example.com/${index}`,
      }),
      now,
    );
  assert.throws(
    () =>
      addProjectSource(
        p,
        snapshot({ sourceUrl: "https://example.com/13" }),
        now,
      ),
    /at most 12/,
  );
  let linked = p;
  for (let index = 0; index < 8; index++)
    linked = linkProjectEvidence(
      linked,
      { type: "requirement", id: "r1" },
      p.sources[index].id,
      quote,
      now,
    );
  assert.throws(
    () =>
      linkProjectEvidence(
        linked,
        { type: "requirement", id: "r1" },
        p.sources[8].id,
        quote,
        now,
      ),
    /at most 8/,
  );
  const invalid = structuredClone(p);
  invalid.sources[0].id = "r1";
  assert.throws(() => validateProject(invalid), /duplicate/);
  for (const value of [0, -1, 1.5, "1", Number.MAX_SAFE_INTEGER + 1]) {
    const bad = structuredClone(p);
    bad.sources[0].revision = value;
    assert.throws(() => validateProject(bad), /positive safe integer/);
  }
  const duplicate = structuredClone(p);
  duplicate.sources[1].id = duplicate.sources[0].id;
  assert.throws(() => validateProject(duplicate), /duplicates/);
  const huge = project();
  huge.sources = Array.from({ length: 12 }, (_, index) => ({
    ...p.sources[index],
    snapshot: snapshot({ text: "界".repeat(20000) }),
  }));
  assert.throws(() => validateProject(huge), /300 KB/);
});

test("monotonic mutation times tolerate future-dated imported records and dedup is idempotent", () => {
  const p = project();
  p.createdAt = "2030-01-01T00:00:00.000Z";
  p.updatedAt = "2030-01-02T00:00:00.000Z";
  const added = addProjectSource(p, snapshot(), now);
  assert.equal(added.updatedAt, p.updatedAt);
  assert.equal(added.sources[0].importedAt, p.updatedAt);
  const linked = linkProjectEvidence(
    added,
    { type: "requirement", id: "r1" },
    added.sources[0].id,
    quote,
    now,
  );
  assert.equal(linked.updatedAt, p.updatedAt);
  assert.deepEqual(addProjectSource(linked, snapshot(), later), linked);
  assert.throws(
    () => addProjectSource(project(), snapshot(), "bad-date"),
    /canonical ISO/,
  );
});

test("source HTML and Markdown stay inert in both exported document types", () => {
  const unsafe = '<img src=x onerror="alert(1)"> [Click](https://example.com)';
  let p = addProjectSource(
    project(),
    snapshot({
      title: "<script>malicious title</script>",
      text: `${unsafe}\n${quote}`,
    }),
    now,
  );
  p = linkProjectEvidence(
    p,
    { type: "requirement", id: "r1" },
    p.sources[0].id,
    unsafe,
    now,
  );
  for (const format of ["client", "portfolio"]) {
    const output = exportProjectMarkdown(p, format);
    assert.ok(!output.includes("<img"));
    assert.ok(!output.includes("<script>"));
    assert.ok(!output.includes("[Click]("));
    assert.ok(output.includes("&lt;img"));
  }
});
