import type { validateSnapshot } from "../capture/snapshot.mjs";

export type Audience = "freelancer" | "student" | "professional";
export type WorkStatus = "todo" | "doing" | "done";
export type EvidenceLink = {
  sourceId: string;
  sourceRevision: number;
  quote: string;
};
export type ProjectSource = {
  id: string;
  revision: number;
  snapshot: ReturnType<typeof validateSnapshot>;
  importedAt: string;
};
export type Requirement = {
  id: string;
  title: string;
  acceptanceCriteria: string;
  evidenceNote: string;
  evidenceLinks: EvidenceLink[];
  status: "proposed" | "confirmed" | "accepted";
  sourceLine: number;
};
export type Deliverable = {
  id: string;
  title: string;
  requirementIds: string[];
  status: WorkStatus;
  evidenceNote: string;
  evidenceLinks: EvidenceLink[];
};
export type Task = {
  id: string;
  title: string;
  hours: number;
  dueDay: number;
  dependsOn: string[];
  requirementIds: string[];
  deliverableId: string;
  status: WorkStatus;
};
/** Canonical output of validateProject; legacy optional evidence fields are normalized here. */
export type Project = {
  kind: "toolkit-project";
  schemaVersion: 1;
  id: string;
  title: string;
  audience: Audience;
  brief: string;
  days: number;
  hoursPerDay: number;
  hourlyRate: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  sources: ProjectSource[];
  requirements: Requirement[];
  deliverables: Deliverable[];
  tasks: Task[];
  assumptions: string[];
};
