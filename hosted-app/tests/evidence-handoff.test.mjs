import test from "node:test";
import assert from "node:assert/strict";
import {
  createEvidenceDraft,
  restoreEvidenceDraft,
} from "../lib/projects/evidence-handoff.mjs";

const snapshot = {
  schemaVersion: 1,
  title: "Synthetic delivery artifact",
  sourceUrl: "https://example.com/demo?private=remove",
  text: "Synthetic project evidence: onboarding keyboard checks passed. The reviewed artifact includes a reproducible verification log and known limitations.",
  headings: [],
  capturedAt: "2026-10-17T00:00:00.000Z",
  captureMethod: "manual-snapshot",
  userEdited: true,
};

test("same-tab evidence transfer preserves reviewed content and strips unrelated private fields", () => {
  const draft = createEvidenceDraft(
    { ...snapshot, password: "DO_NOT_TRANSFER" },
    1000,
  );
  const opened = restoreEvidenceDraft(draft, 1001);
  assert.equal(opened.text, snapshot.text);
  assert.equal(opened.sourceUrl, "https://example.com/demo");
  assert.equal(opened.userEdited, true);
  assert.equal(draft.includes("DO_NOT_TRANSFER"), false);
});

test("expired, malformed, unbounded, and unsafe evidence transfers are rejected", () => {
  const draft = createEvidenceDraft(snapshot, 1000);
  assert.throws(() => restoreEvidenceDraft(draft, 901000), /expired/);
  assert.throws(() => restoreEvidenceDraft(draft, -1), /invalid/);
  assert.throws(() => restoreEvidenceDraft("{", 1000), /opened/);
  assert.throws(() => restoreEvidenceDraft("x".repeat(150001)), /large/);
  assert.throws(
    () =>
      createEvidenceDraft({ ...snapshot, sourceUrl: "javascript:alert(1)" }),
    /HTTPS/,
  );
  assert.throws(() => createEvidenceDraft(snapshot, NaN), /time/);
});
