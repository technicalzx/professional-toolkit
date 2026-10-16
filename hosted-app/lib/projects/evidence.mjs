import {
  validateSnapshot,
  restoreCapturedReview,
} from "../capture/snapshot.mjs";

export const MAX_PROJECT_SOURCES = 12;
export const MAX_EVIDENCE_LINKS = 8;
export const MAX_EVIDENCE_QUOTE = 600;

function record(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${name} must be an object.`);
}
function identifier(value, name) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,40}$/.test(value))
    throw new Error(
      `${name} must use 1–40 letters, numbers, underscores or hyphens.`,
    );
  return value;
}
function revision(value) {
  if (!Number.isSafeInteger(value) || value < 1)
    throw new Error("Source revision must be a positive safe integer.");
  return value;
}
export function evidenceTimestamp(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  )
    throw new Error(
      "Source import time must be a canonical ISO UTC timestamp.",
    );
  return value;
}

/** Strip derived review output and unknown snapshot fields; never fetch a locator. */
export function canonicalSourceSnapshot(value) {
  record(value, "Source snapshot");
  const source =
    value.kind === "captured-review"
      ? restoreCapturedReview(value).source
      : value;
  const snapshot = validateSnapshot(source);
  return {
    ...snapshot,
    capturedAt: new Date(snapshot.capturedAt).toISOString(),
  };
}

export function validateProjectSources(value = []) {
  if (!Array.isArray(value) || value.length > MAX_PROJECT_SOURCES)
    throw new Error(
      `A project supports at most ${MAX_PROJECT_SOURCES} sources.`,
    );
  const sources = value.map((source) => {
    record(source, "Project source");
    return {
      id: identifier(source.id, "Source ID"),
      revision: revision(source.revision),
      snapshot: canonicalSourceSnapshot(source.snapshot),
      importedAt: evidenceTimestamp(source.importedAt),
    };
  });
  if (new Set(sources.map((source) => source.id)).size !== sources.length)
    throw new Error("Project source IDs contain duplicates.");
  return sources;
}

/** Broken imported references remain visible, but are never silently treated as support. */
export function validateEvidenceLinks(value = []) {
  if (!Array.isArray(value) || value.length > MAX_EVIDENCE_LINKS)
    throw new Error(
      `Each requirement or deliverable supports at most ${MAX_EVIDENCE_LINKS} evidence links.`,
    );
  const links = value.map((link) => {
    record(link, "Evidence link");
    if (
      typeof link.quote !== "string" ||
      link.quote.length > MAX_EVIDENCE_QUOTE
    )
      throw new Error(
        `Evidence quote must be text of at most ${MAX_EVIDENCE_QUOTE} characters.`,
      );
    return {
      sourceId: identifier(link.sourceId, "Evidence source ID"),
      sourceRevision: revision(link.sourceRevision),
      quote: link.quote,
    };
  });
  return links;
}

/** Requires a normalized project. Invalid reference text is deliberately omitted from results. */
export function inspectEvidence(project) {
  const sources = new Map(project.sources.map((source) => [source.id, source]));
  return [
    ["requirement", project.requirements],
    ["deliverable", project.deliverables],
  ].flatMap(([targetType, records]) =>
    records.flatMap((target) =>
      target.evidenceLinks.map((link, linkIndex) => {
        const source = sources.get(link.sourceId);
        const status = !source
          ? "missing-source"
          : source.revision !== link.sourceRevision
            ? "stale-source"
            : !link.quote.trim() || !source.snapshot.text.includes(link.quote)
              ? "quote-missing"
              : "linked";
        return {
          targetType,
          targetId: target.id,
          linkIndex,
          sourceId: link.sourceId,
          sourceRevision: link.sourceRevision,
          status,
          ...(source ? { title: source.snapshot.title } : {}),
          ...(status === "linked"
            ? {
                quote: link.quote,
                sourceUrl: source.snapshot.sourceUrl,
                capturedAt: source.snapshot.capturedAt,
                captureMethod: source.snapshot.captureMethod,
              }
            : {}),
        };
      }),
    ),
  );
}
