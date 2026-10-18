import { validateProject } from "./engine.mjs";

/** A baseline records scope, never a hidden archive of private source or time records. */
export function normalizeProjectBaseline(projectInput, baselineInput) {
  const project = validateProject(projectInput);
  if (baselineInput == null) return null;
  // Time records are current project activity, not scope. Discard them before
  // validating imported baselines so even malformed legacy time data cannot survive.
  const baseline = validateProject({ ...baselineInput, timeEntries: [] });
  if (baseline.id !== project.id || baseline.audience !== project.audience)
    throw Error("Baseline must match this project and audience.");
  const current = new Map(project.sources.map((source) => [source.id, source]));
  const changed = new Set();
  baseline.sources = baseline.sources.flatMap((source) => {
    const latest = current.get(source.id);
    if (!latest) {
      changed.add(source.id);
      return [];
    }
    if (JSON.stringify(source) !== JSON.stringify(latest)) {
      changed.add(source.id);
      return [structuredClone(latest)];
    }
    return [source];
  });
  for (const record of [...baseline.requirements, ...baseline.deliverables]) {
    record.evidenceLinks = record.evidenceLinks.map((link) => {
      const source = current.get(link.sourceId);
      return !source ||
        changed.has(link.sourceId) ||
        source.revision !== link.sourceRevision ||
        !source.snapshot.text.includes(link.quote)
        ? { ...link, quote: "" }
        : link;
    });
  }
  return validateProject(baseline);
}

/** Apply a library mutation and scrub the same source from its saved scope baseline. */
export function applyProjectEvidenceChange(entry, nextProject, change) {
  if (!entry || typeof entry !== "object")
    throw Error("A project workspace is required.");
  const prior = validateProject(entry.project),
    project = validateProject(nextProject);
  if (project.id !== prior.id || project.audience !== prior.audience)
    throw Error("Evidence changes must belong to the selected project.");
  let baseline = normalizeProjectBaseline(project, entry.baseline);
  if (change) {
    if (
      !["revise", "remove"].includes(change.action) ||
      typeof change.sourceId !== "string"
    )
      throw Error("Invalid source change.");
    const source = project.sources.find((s) => s.id === change.sourceId);
    if (change.action === "revise" && !source)
      throw Error("Revised source is unavailable.");
    if (change.action === "remove" && source)
      throw Error("Removed source is still present.");
    if (baseline) {
      baseline.sources = baseline.sources.flatMap((s) =>
        s.id !== change.sourceId
          ? [s]
          : source
            ? [structuredClone(source)]
            : [],
      );
      for (const record of [
        ...baseline.requirements,
        ...baseline.deliverables,
      ]) {
        record.evidenceLinks = record.evidenceLinks.map((link) =>
          link.sourceId === change.sourceId ? { ...link, quote: "" } : link,
        );
      }
      baseline = validateProject(baseline);
    }
  }
  return { ...entry, project, baseline, dirty: true };
}
