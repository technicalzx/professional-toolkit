import { validateSnapshot } from "../capture/snapshot.mjs";

export const EVIDENCE_DRAFT_KEY = "professional-toolkit-evidence-draft-v1";
const TTL = 15 * 60 * 1000;
const MAX_BYTES = 150000;

/** A same-tab, short-lived transfer. No account, remote fetch, or AI call is involved. */
export function createEvidenceDraft(snapshot, now = Date.now()) {
  if (!Number.isFinite(now)) throw Error("Invalid transfer time.");
  return JSON.stringify({
    kind: "project-evidence-draft",
    version: 1,
    expiresAt: now + TTL,
    snapshot: validateSnapshot(snapshot),
  });
}

export function restoreEvidenceDraft(json, now = Date.now()) {
  if (
    typeof json !== "string" ||
    new TextEncoder().encode(json).length > MAX_BYTES
  )
    throw Error(
      "Evidence transfer is too large. Import the snapshot JSON instead.",
    );
  if (!Number.isFinite(now)) throw Error("Invalid transfer time.");
  let value;
  try {
    value = JSON.parse(json);
  } catch {
    throw Error("Evidence transfer could not be opened.");
  }
  if (
    !value ||
    value.kind !== "project-evidence-draft" ||
    value.version !== 1 ||
    !Number.isFinite(value.expiresAt) ||
    value.expiresAt <= now ||
    value.expiresAt > now + TTL
  )
    throw Error(
      "Evidence transfer expired or is invalid. Return to capture or import the snapshot JSON.",
    );
  return validateSnapshot(value.snapshot);
}
