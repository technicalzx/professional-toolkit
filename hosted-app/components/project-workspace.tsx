"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  FolderOpen,
  FileText,
  Download,
  Upload,
  Cloud,
  LayoutGrid,
  Link2,
  Settings2,
  Trash2,
  CheckCircle2,
  Clock3,
  GitCompareArrows,
} from "lucide-react";
import {
  createProject,
  validateProject,
  proposeBriefRevision,
  buildProjectPlan,
  compareScope,
  exportProjectMarkdown,
  importProject,
  projectTemplates,
  addProjectSource,
} from "../lib/projects/engine.mjs";
import ProjectEvidencePanel from "./project-evidence-panel";
import ProjectTimePanel from "./project-time-panel";
import CapacityWorkspace from "./capacity-workspace";
import {
  applyProjectEvidenceChange,
  normalizeProjectBaseline,
} from "../lib/projects/workspace-evidence.mjs";
import {
  restoreEvidenceDraft,
  EVIDENCE_DRAFT_KEY,
} from "../lib/projects/evidence-handoff.mjs";
import "./project-workspace.css";
import type {
  Audience,
  WorkStatus as Status,
  Requirement,
  Project,
} from "../lib/projects/types";

type Entry = {
  project: Project;
  baseline: Project | null;
  revision: number;
  cloudOwner?: string;
  dirty: boolean;
};
type Account = { id: string; username: string };
type ApiResponse = {
  user?: Account | null;
  projects?: Entry[];
  project?: Project;
  baseline?: Project | null;
  revision?: number;
  error?: string | { message?: string };
  message?: string;
};
const key = "professional-toolkit-projects-v1";
const accountDeviceFailurePrefix = "The account copy was saved, but device storage failed:";
const labels: Record<Audience, string> = {
  freelancer: "Freelancers",
  student: "Students",
  professional: "Professionals",
};
const descriptions: Record<Audience, string> = {
  freelancer: "Agree the scope. Deliver with evidence. Handle changes.",
  student: "Build a project. Record your learning. Show your work.",
  professional: "Compare decisions. Verify delivery. Prepare a handover.",
};
function canonical(p: unknown): Project {
  return validateProject(p);
}
function normalize(raw: unknown): Entry {
  if (!raw || typeof raw !== "object")
    throw new Error("Invalid project record.");
  const r = raw as Entry;
  const project = canonical(r.project);
  const baseline = normalizeProjectBaseline(
    project,
    r.baseline,
  ) as unknown as Project | null;
  if (
    baseline &&
    (baseline.id !== project.id || baseline.audience !== project.audience)
  )
    throw new Error("Baseline must match this project and audience.");
  return {
    project,
    baseline,
    revision:
      Number.isSafeInteger(r.revision) && r.revision >= 0 ? r.revision : 0,
    cloudOwner: typeof r.cloudOwner === "string" ? r.cloudOwner : undefined,
    dirty: r.dirty !== false,
  };
}
function download(name: string, body: string, type = "text/plain") {
  const u = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
function err(e: unknown) {
  return e instanceof Error
    ? e.message
    : "Something went wrong. Your device copy is retained.";
}
async function response(r: Response): Promise<ApiResponse> {
  let d: ApiResponse;
  try {
    d = (await r.json()) as ApiResponse;
    if (!d || typeof d !== "object") throw new Error();
  } catch {
    throw new Error(
      "The account service is unavailable. You can keep working on this device.",
    );
  }
  if (!r.ok)
    throw new Error(
      typeof d.error === "string"
        ? d.error
        : d.error?.message ||
          d.message ||
          `Account request failed (${r.status}).`,
    );
  return d;
}

export default function ProjectWorkspace() {
  const [entries, setEntries] = useState<Entry[]>([]),
    [selected, setSelected] = useState<string | null>(null),
    [audience, setAudience] = useState<Audience>("freelancer");
  const [ready, setReady] = useState(false),
    [blocked, setBlocked] = useState(false),
    [saved, setSaved] = useState("Starting device storage…");
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [tab, setTab] = useState("scope"),
    [creating, setCreating] = useState(false),
    [title, setTitle] = useState(""),
    [brief, setBrief] = useState(""),
    [revisionBrief, setRevisionBrief] = useState("");
  const [format, setFormat] = useState("client"),
    [account, setAccount] = useState<Account | null>(null),
    [busy, setBusy] = useState(false);
  const [showCapacity, setShowCapacity] = useState(false);
  const capacityProjects = useMemo(() => entries.map((entry) => entry.project), [entries]);
  const importRef = useRef<HTMLInputElement>(null);
  const [evidenceDraft, setEvidenceDraft] = useState<ReturnType<
    typeof restoreEvidenceDraft
  > | null>(null);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const entry = entries.find((x) => x.project.id === selected),
    p = entry?.project;
  let plan: ReturnType<typeof buildProjectPlan> | null = null,
    validationError = "";
  if (p)
    try {
      plan = buildProjectPlan(p);
    } catch (e) {
      validationError = err(e);
    }
  let diff: ReturnType<typeof compareScope> | null = null;
  if (p && entry?.baseline && !validationError)
    try {
      diff = compareScope(entry.baseline, p);
    } catch (e) {
      validationError = err(e);
    }
  let pack = "";
  if (p && !validationError)
    try {
      pack = exportProjectMarkdown(p, format);
    } catch (e) {
      validationError = err(e);
    }
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw);
        if (
          data.version !== 1 ||
          !Array.isArray(data.projects) ||
          data.projects.length > 20
        )
          throw new Error("Unrecognized workspace data.");
        const restored = data.projects.map(normalize);
        if (
          new Set(restored.map((v: Entry) => v.project.id)).size !==
          restored.length
        )
          throw new Error("Duplicate project IDs.");
        setEntries(restored);
      }
    } catch (e) {
      setBlocked(true);
      setError(
        `Device data could not be opened: ${err(e)} Export the original data before resetting storage.`,
      );
    }
    setReady(true);
    try {
      const draft = sessionStorage.getItem(EVIDENCE_DRAFT_KEY);
      if (draft) setEvidenceDraft(restoreEvidenceDraft(draft));
    } catch (e) {
      try {
        sessionStorage.removeItem(EVIDENCE_DRAFT_KEY);
      } catch {}
      setError(err(e));
    }
    refreshAccount();
  }, []);
  useEffect(() => {
    if (!ready || blocked) return;
    const timer = setTimeout(() => {
      try {
        const valid = entries.map(normalize);
        localStorage.setItem(
          key,
          JSON.stringify({ version: 1, projects: valid }),
        );
        setSaved("Saved on this device");
        setError((current) => current.startsWith(accountDeviceFailurePrefix) ? "" : current);
      } catch (e) {
        setSaved((current) => current === "Account saved; device copy is not saved" ? current : "Current edits are not saved");
        setError((current) => current.startsWith(accountDeviceFailurePrefix) ? current : err(e));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [entries, ready, blocked]);
  useEffect(() => {
    if (!evidenceDraft) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function checkExpiry() {
      if (timer) clearTimeout(timer);
      try {
        const raw = sessionStorage.getItem(EVIDENCE_DRAFT_KEY);
        if (!raw) {
          setEvidenceDraft(null);
          return;
        }
        restoreEvidenceDraft(raw);
        timer = setTimeout(
          checkExpiry,
          Math.max(1, JSON.parse(raw).expiresAt - Date.now()),
        );
      } catch {
        try {
          sessionStorage.removeItem(EVIDENCE_DRAFT_KEY);
        } catch {}
        setEvidenceDraft(null);
        setNotice(
          "The page-evidence transfer expired. Return to capture or import its JSON if you still need it.",
        );
      }
    }
    const onVisible = () => {
      if (document.visibilityState === "visible") checkExpiry();
    };
    checkExpiry();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [evidenceDraft]);
  async function refreshAccount() {
    try {
      const d = await response(
        await fetch("/api/account", { cache: "no-store" }),
      );
      setAccount(d.user || null);
    } catch {
      setAccount(null);
    }
  }
  function open(e: Entry) {
    setShowCapacity(false);
    setSelected(e.project.id);
    setAudience(e.project.audience);
    setTab("scope");
    setRevisionBrief(e.project.brief);
    setFormat(
      e.project.audience === "student"
        ? "portfolio"
        : e.project.audience === "professional"
          ? "handover"
          : "client",
    );
    setError("");
    setNotice("");
  }
  function update(change: (draft: Project) => void) {
    if (!p) return;
    setError("");
    setNotice("");
    setSaved("Saving on this device…");
    setEntries((list) =>
      list.map((e) => {
        if (e.project.id !== p.id) return e;
        const draft = structuredClone(e.project);
        change(draft);
        draft.updatedAt = new Date(
          Math.max(
            Date.now(),
            Date.parse(draft.createdAt),
            Date.parse(draft.updatedAt) + 1,
          ),
        ).toISOString();
        return { ...e, project: draft, dirty: true };
      }),
    );
  }
  function add(example = false) {
    try {
      if (entries.length >= 20)
        throw new Error(
          "This workspace holds 20 projects. Export and remove a project first.",
        );
      const template = projectTemplates.find((t) => t.id === audience)!;
      const project = canonical(
        createProject({
          ...template,
          id: undefined,
          audience,
          title: example ? `Example · ${template.title}` : title,
          brief: example ? template.brief : brief,
        }),
      );
      const e = { project, baseline: null, revision: 0, dirty: true };
      setEntries((list) => [e, ...list]);
      setCreating(false);
      setTitle("");
      setBrief("");
      open(e);
    } catch (e) {
      setError(err(e));
    }
  }
  function changeEvidence(
    next: unknown,
    change?: { sourceId: string; action: "revise" | "remove" },
  ) {
    try {
      const project = canonical(next);
      const current = entriesRef.current.find(
        (e) => e.project.id === project.id,
      );
      if (!current || selectedRef.current !== project.id)
        throw Error(
          "The selected project changed. Open it again before editing evidence.",
        );
      const changed = applyProjectEvidenceChange(
        current,
        project,
        change,
      ) as Entry;
      const list = entriesRef.current.map((e) =>
        e.project.id === changed.project.id ? changed : e,
      );
      localStorage.setItem(
        key,
        JSON.stringify({ version: 1, projects: list.map(normalize) }),
      );
      setEntries(list);
      setError("");
      setSaved("Saved on this device");
      setNotice(
        change
          ? "Source changed in this project and its saved scope baseline. Save to account to update its copy. Independently written notes and previously downloaded files are unchanged."
          : "Evidence updated on this device. Save to account to sync it.",
      );
    } catch (e) {
      setError(err(e));
      throw e;
    }
  }
  function changeTime(next: unknown): boolean {
    try {
      if (blocked) throw Error("Device storage is unavailable. Export your data before making changes.");
      const project = canonical(next);
      const current = entriesRef.current.find((e) => e.project.id === project.id);
      if (!current || selectedRef.current !== project.id)
        throw Error("The selected project changed. Open it again before editing time logs.");
      const changed = normalize({ ...current, project, dirty: true });
      const list = entriesRef.current.map((e) => e.project.id === project.id ? changed : e);
      // Persist the complete candidate before publishing success or changing the UI.
      localStorage.setItem(key, JSON.stringify({ version: 1, projects: list.map(normalize) }));
      entriesRef.current = list;
      setEntries(list);
      setError("");
      setSaved("Saved on this device");
      setNotice("Time logs updated on this device. Save to account to sync that copy.");
      return true;
    } catch (e) {
      setError(err(e));
      throw e;
    }
  }
  function addTransferredEvidence() {
    if (!entry || !evidenceDraft || blocked) return;
    try {
      // Re-check the expiry at the point of use; loading the page does not extend it.
      const stored = sessionStorage.getItem(EVIDENCE_DRAFT_KEY);
      if (!stored)
        throw Error(
          "Evidence transfer unavailable. Return to capture or import JSON.",
        );
      const reviewed = restoreEvidenceDraft(stored);
      const next = applyProjectEvidenceChange(
        entry,
        addProjectSource(entry.project, reviewed),
      ) as Entry;
      const list = entriesRef.current.map((e) =>
        e.project.id === entry.project.id ? next : e,
      );
      // Retain the transfer if browser persistence fails, so navigating here cannot lose it.
      localStorage.setItem(
        key,
        JSON.stringify({ version: 1, projects: list.map(normalize) }),
      );
      setEntries(list);
      setTab("evidence");
      setSaved("Saved on this device");
      sessionStorage.removeItem(EVIDENCE_DRAFT_KEY);
      setEvidenceDraft(null);
      setError("");
      setNotice(
        "Reviewed snapshot added to project sources. Choose an exact excerpt to link it to the work.",
      );
    } catch (e) {
      setError(err(e));
    }
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 650000)
        throw new Error("Project file must be under 650 KB.");
      const parsed = JSON.parse(await file.text());
      const e = normalize(
        parsed.workspaceVersion === 1
          ? {
              project: parsed.project,
              baseline: parsed.baseline,
              revision: 0,
              dirty: true,
            }
          : {
              project: importProject(JSON.stringify(parsed)),
              baseline: null,
              revision: 0,
              dirty: true,
            },
      );
      const exists = entries.some((x) => x.project.id === e.project.id);
      if (
        exists &&
        !confirm("Replace this device project with the imported copy?")
      )
        return;
      if (!exists && entries.length >= 20)
        throw new Error(
          "Export and remove a project before importing another.",
        );
      const prior = entries.find((x) => x.project.id === e.project.id);
      const imported = {
        ...e,
        revision: prior?.revision || 0,
        cloudOwner: prior?.cloudOwner,
        dirty: true,
      };
      setEntries((list) => [
        imported,
        ...list.filter((x) => x.project.id !== e.project.id),
      ]);
      open(imported);
      setNotice("Imported an editable project.");
    } catch (e) {
      setError(err(e));
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  }
  async function sync() {
    if (!p || !entry || !account) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const project = canonical(p);
      const sentEntry = JSON.stringify(entry);
      const d = await response(
        await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project,
            baseline: entry.baseline,
            baseRevision: entry.cloudOwner === account.id ? entry.revision : 0,
          }),
        }),
      );
      const normalized = normalize({
        ...d,
        cloudOwner: account.id,
        dirty: false,
      });
      const merged = entriesRef.current.map((e) =>
        e.project.id !== p.id
          ? e
          : JSON.stringify(e) === sentEntry
            ? normalized
            : {
                ...e,
                revision: normalized.revision,
                cloudOwner: account.id,
                dirty: true,
              },
      );
      try {
        // Account revision/ownership must survive a reload before success is shown.
        localStorage.setItem(
          key,
          JSON.stringify({ version: 1, projects: merged.map(normalize) }),
        );
      } catch (failure) {
        // The remote commit already happened. Retain its revision in memory so
        // retrying a device save cannot send a stale baseRevision or lose edits.
        entriesRef.current = merged;
        setEntries(merged);
        setSaved("Account saved; device copy is not saved");
        throw Error(`${accountDeviceFailurePrefix} ${err(failure)} Export your current device edits before reloading.`);
      }
      entriesRef.current = merged;
      setEntries(merged);
      setSaved("Saved on this device");
      setNotice(
        "Saved to your private account. Device edits made during the save remain unsynced.",
      );
    } catch (e) {
      setError(
        `${err(e)} Device edits are retained. If another device changed this project, export your edits before loading the account copy.`,
      );
    } finally {
      setBusy(false);
    }
  }
  async function loadCloud() {
    setBusy(true);
    setError("");
    try {
      const session = await response(await fetch("/api/account", { cache: "no-store" }));
      const owner = session.user;
      setAccount(owner || null);
      if (!owner || typeof owner.id !== "string") throw Error("Sign in before loading account project copies.");
      const d = await response(
        await fetch("/api/projects", { cache: "no-store" }),
      );
      if (!Array.isArray(d.projects))
        throw new Error("Invalid account response.");
      let merged = [...entriesRef.current];
      for (const raw of d.projects) {
        const cloud = normalize({
          ...raw,
          cloudOwner: owner.id,
          dirty: false,
        });
        const local = merged.find((x) => x.project.id === cloud.project.id);
        if (
          local?.dirty &&
          !confirm(
            `Replace device edits to “${local.project.title}” with the account copy? Export first if you need both.`,
          )
        )
          continue;
        if (!local && merged.length >= 20)
          throw new Error(
            "Device limit reached. Export and remove a project before loading more.",
          );
        merged = [
          ...merged.filter((x) => x.project.id !== cloud.project.id),
          cloud,
        ];
      }
      // Loading referenced projects is a durability barrier for capacity plans too.
      localStorage.setItem(key, JSON.stringify({ version: 1, projects: merged.map(normalize) }));
      entriesRef.current = merged;
      setEntries(merged);
      setSaved("Saved on this device");
      setNotice("Loaded account projects.");
      return true;
    } catch (e) {
      setError(err(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function deleteCloud() {
    if (!p || !entry || !account || entry.cloudOwner !== account.id) return;
    if (
      !confirm(
        "Delete this project from your private account? The device copy will be kept.",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await response(
        await fetch("/api/projects", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: p.id, baseRevision: entry.revision }),
        }),
      );
      setEntries((list) =>
        list.map((e) =>
          e.project.id === p.id
            ? { ...e, cloudOwner: undefined, revision: 0, dirty: true }
            : e,
        ),
      );
      setNotice("Account copy deleted. Your device copy is retained.");
    } catch (e) {
      setError(err(e));
    } finally {
      setBusy(false);
    }
  }
  function baseline() {
    if (!p) return;
    try {
      const valid = canonical(p);
      if (
        entry?.baseline &&
        !confirm("Replace the recorded baseline with the current scope?")
      )
        return;
      setEntries((list) =>
        list.map((e) =>
          e.project.id === p.id
            ? { ...e, baseline: normalizeProjectBaseline(valid, valid) as Project, dirty: true }
            : e,
        ),
      );
      setRevisionBrief(p.brief);
      setNotice(
        "Baseline recorded. Edit the brief or project details to compare scope.",
      );
    } catch (e) {
      setError(err(e));
    }
  }
  function revise() {
    if (!p) return;
    try {
      const revised = canonical(
        proposeBriefRevision(
          p,
          revisionBrief,
          new Date(Math.max(Date.now(), Date.parse(p.createdAt))).toISOString(),
        ),
      );
      setEntries((list) =>
        list.map((e) =>
          e.project.id === p.id ? { ...e, project: revised, dirty: true } : e,
        ),
      );
      setNotice(
        "Brief revision applied. Matching lines retain their work and evidence; changed wording creates new scope.",
      );
    } catch (e) {
      setError(err(e));
    }
  }
  function evidenceRequirement(r: Requirement, value: string) {
    update((d) => {
      const x = d.requirements.find((x) => x.id === r.id)!;
      x.evidenceNote = value;
      if (!value.trim() && x.status === "accepted") x.status = "confirmed";
    });
  }
  const displayed = entries.filter((e) => e.project.audience === audience);
  return (
    <div className="pw-app">
      <aside className="pw-sidebar">
        <a className="pw-brand" href="/">
          <span className="pw-brand-mark">
            P<span>✦</span>
          </span>
          <span>
            Professional<span>Toolkit</span>
          </span>
        </a>
        <span className="pw-sidebar-label">YOUR WORKSPACE</span>
        <nav aria-label="Main navigation">
          <a className="pw-active" href="/">
            <LayoutGrid size={18} />
            Projects
          </a>
          <a href="/capture">
            <Link2 size={18} />
            Profile & page capture
          </a>
          <a href="/extension">
            <Download size={18} />
            Chrome extension
          </a>
          <a href="/tools">
            <Settings2 size={18} />
            Supporting tools
          </a>
          <a href="/account">
            <Cloud size={18} />
            Account & sync
          </a>
        </nav>
        <div className="pw-side-note">
          <span className="pw-online" /> Local first, yours to keep
          <p>Work without signing in. Export your data whenever you need it.</p>
          <a
            href="https://github.com/technicalzx/professional-toolkit"
            target="_blank"
            rel="noreferrer"
          >
            Open source on GitHub ↗
          </a>
        </div>
      </aside>
      <div className="pw-main">
        <header className="pw-topbar">
          <span>
            Workspace <span className="pw-slash">/</span>{" "}
            {showCapacity ? "Shared capacity" : p ? "Project" : "Overview"}
          </span>
          <div>
            <span className="pw-save-state">
              {blocked ? "Storage needs attention" : saved}
            </span>
            <a
              href="/account"
              target="_blank"
              rel="noreferrer"
              className="pw-avatar"
              title="Account"
            >
              {account ? account.username.slice(0, 2).toUpperCase() : "YOU"}
            </a>
          </div>
        </header>
        <main className="pw-content">
          <nav className="pw-mobile-nav" aria-label="Mobile navigation">
            <a href="/">Projects</a>
            <a href="/capture">Profile capture</a>
            <a href="/extension">Extension</a>
            <a href="/tools">Tools</a>
            <a href="/account">Account</a>
          </nav>
          {error && (
            <div role="alert" className="pw-alert">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                ×
              </button>
            </div>
          )}
          {notice && (
            <div role="status" className="pw-notice">
              {notice}
            </div>
          )}
          {blocked && (
            <section className="pw-panel">
              <h2>Recover your device data</h2>
              <p>Your stored copy has not been overwritten.</p>
              <button
                className="pw-button"
                onClick={() => {
                  try {
                    download(
                      "toolkit-device-recovery.json",
                      localStorage.getItem(key) || "{}",
                      "application/json",
                    );
                  } catch (e) {
                    setError(err(e));
                  }
                }}
              >
                Download original data
              </button>
              <button
                className="pw-button"
                onClick={() => {
                  if (
                    confirm(
                      "Reset unreadable device storage? Download your original data first.",
                    )
                  ) {
                    setEntries([]);
                    setBlocked(false);
                    setError("");
                  }
                }}
              >
                Reset storage
              </button>
            </section>
          )}
          {evidenceDraft && (
            <section
              className="pw-panel pw-evidence-transfer"
              aria-label="Pending page evidence"
            >
              <div>
                <span className="pw-eyebrow">REVIEWED PAGE SNAPSHOT</span>
                <h2>{evidenceDraft.title}</h2>
                <p>
                  {p
                    ? "Add this snapshot to the selected project, then choose the excerpts you want to use."
                    : "Open an existing project or create a project to reuse this source. The transfer expires after 15 minutes."}
                </p>
              </div>
              <div className="pw-actions">
                <button
                  className="pw-primary"
                  disabled={!p || blocked || !!validationError}
                  onClick={addTransferredEvidence}
                >
                  Add source to this project
                </button>
                <button
                  className="pw-button"
                  onClick={() => {
                    try {
                      sessionStorage.removeItem(EVIDENCE_DRAFT_KEY);
                      setEvidenceDraft(null);
                    } catch (e) {
                      setError(err(e));
                    }
                  }}
                >
                  Discard transfer
                </button>
              </div>
            </section>
          )}
          {showCapacity ? (
            <CapacityWorkspace
              projects={capacityProjects}
              account={account}
              onBack={() => setShowCapacity(false)}
              onLoadProjects={async () => {
                if (!(await loadCloud())) throw Error("Account project copies could not be loaded. Review the workspace error and try again.");
              }}
            />
          ) : !p ? (
            <>
              <section className="pw-heading">
                <div>
                  <div className="pw-eyebrow">
                    LESS TOOL SWITCHING. MORE FINISHED WORK.
                  </div>
                  <h1>
                    One workspace.
                    <br />
                    <span>From brief to delivery.</span>
                  </h1>
                  <p>
                    Define what matters, turn it into a plan, and keep the
                    evidence
                    <br className="pw-desktop" /> with the work. For your next
                    client, project, or team.
                  </p>
                </div>
                <div className="pw-actions">
                <button
                  className="pw-button"
                  disabled={!ready || blocked}
                  onClick={() => { setSelected(null); setShowCapacity(true); setError(""); setNotice(""); }}
                >
                  <Clock3 size={18} /> Shared capacity
                </button>
                <button
                  className="pw-primary"
                  disabled={!ready || blocked}
                  onClick={() => {
                    setCreating(true);
                    setError("");
                  }}
                >
                  <Plus size={18} />
                  New project
                </button>
                </div>
              </section>
              <section
                className="pw-audience-grid"
                aria-label="Choose your workspace"
              >
                {(["freelancer", "student", "professional"] as Audience[]).map(
                  (a, i) => (
                    <button
                      className={`pw-audience ${audience === a ? "pw-chosen" : ""}`}
                      key={a}
                      onClick={() => setAudience(a)}
                      aria-pressed={audience === a}
                    >
                      <span className="pw-card-index">0{i + 1}</span>
                      <span className="pw-audience-title">
                        {labels[a]}
                        <ArrowRight size={18} />
                      </span>
                      <span>{descriptions[a]}</span>
                      <span className="pw-card-foot">
                        {i === 0
                          ? "Client delivery · Scope changes"
                          : i === 1
                            ? "Project evidence · Portfolio"
                            : "Decision records · Handover"}
                      </span>
                    </button>
                  ),
                )}
              </section>
              <div className="pw-section-head">
                <div>
                  <h2>
                    Your projects{" "}
                    <span className="pw-count">{displayed.length}</span>
                  </h2>
                  <p>A clear next step for every piece of work.</p>
                </div>
                <div className="pw-actions">
                  <input
                    ref={importRef}
                    type="file"
                    accept=".json,application/json"
                    aria-label="Import project file"
                    hidden
                    onChange={(e) => importFile(e.target.files?.[0])}
                  />
                  <button
                    className="pw-button"
                    disabled={blocked}
                    onClick={() => importRef.current?.click()}
                  >
                    <Upload size={15} />
                    Import JSON
                  </button>
                </div>
              </div>
              {displayed.length ? (
                <div className="pw-project-grid">
                  {displayed.map((e) => (
                    <button
                      className="pw-project-card"
                      key={e.project.id}
                      onClick={() => open(e)}
                    >
                      <div>
                        <span className="pw-project-icon">
                          <FolderOpen size={21} />
                        </span>
                        <span className="pw-tag">
                          {labels[e.project.audience]}
                        </span>
                      </div>
                      <h3>{e.project.title}</h3>
                      <p>
                        {e.project.requirements.length} requirements ·{" "}
                        {
                          e.project.deliverables.filter(
                            (d) => d.status === "done",
                          ).length
                        }
                        /{e.project.deliverables.length} delivered
                      </p>
                      <div className="pw-progress">
                        <span
                          style={{
                            width: `${(e.project.deliverables.filter((d) => d.status === "done").length / Math.max(1, e.project.deliverables.length)) * 100}%`,
                          }}
                        />
                      </div>
                      <div className="pw-project-footer">
                        <span>
                          {e.cloudOwner
                            ? e.dirty
                              ? "Device edits · sync pending"
                              : "Account copy saved"
                            : "On this device"}
                        </span>
                        <ArrowRight size={17} />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <section className="pw-empty">
                  <span className="pw-empty-icon">
                    <FolderOpen size={29} />
                  </span>
                  <h3>Your next project starts here.</h3>
                  <p>
                    Bring a brief, a research question, or a decision to make.
                    <br />
                    We’ll give you a place to turn it into finished work.
                  </p>
                  <div className="pw-actions">
                    <button
                      className="pw-primary"
                      disabled={!ready || blocked}
                      onClick={() => setCreating(true)}
                    >
                      <Plus size={16} />
                      Create a project
                    </button>
                    <button
                      className="pw-button"
                      disabled={!ready || blocked}
                      onClick={() => add(true)}
                    >
                      Explore an example <ArrowRight size={15} />
                    </button>
                  </div>
                </section>
              )}
              <section className="pw-workflow-strip">
                <div>
                  <span>01</span>
                  <h3>Define the scope</h3>
                  <p>Review requirements and acceptance checks.</p>
                </div>
                <div>
                  <span>02</span>
                  <h3>Deliver with evidence</h3>
                  <p>Track tasks and record what was verified.</p>
                </div>
                <div>
                  <span>03</span>
                  <h3>Keep a useful record</h3>
                  <p>Compare changes and export a work pack.</p>
                </div>
              </section>
            </>
          ) : (
            <>
              <button className="pw-back" onClick={() => setSelected(null)}>
                <ArrowLeft size={16} />
                All projects
              </button>
              <section className="pw-project-heading">
                <div>
                  <span className="pw-eyebrow">
                    {labels[p.audience]} / PROJECT WORKSPACE
                  </span>
                  <h1>{p.title}</h1>
                  <p>Keep the scope, the work, and its evidence together.</p>
                </div>
                <div className="pw-actions">
                  <button
                    className="pw-button"
                    disabled={!!validationError}
                    onClick={() =>
                      download(
                        `${p.id}.json`,
                        JSON.stringify(
                          {
                            workspaceVersion: 1,
                            project: canonical(p),
                            baseline: entry?.baseline,
                          },
                          null,
                          2,
                        ),
                        "application/json",
                      )
                    }
                  >
                    <Download size={16} />
                    Export project
                  </button>
                  <button
                    className="pw-primary"
                    disabled={!account || busy || !!validationError}
                    onClick={sync}
                  >
                    <Cloud size={16} />
                    {busy ? "Working…" : "Save to account"}
                  </button>
                </div>
              </section>
              {validationError && (
                <div role="alert" className="pw-alert">
                  {validationError} The last valid device copy is retained. Fix
                  these edits to save.
                </div>
              )}
              <section className="pw-metrics">
                <div>
                  <span>DELIVERABLES</span>
                  <strong>
                    {p.deliverables.filter((d) => d.status === "done").length}
                    <small> / {p.deliverables.length}</small>
                  </strong>
                  <p>Evidence required to finish</p>
                </div>
                <div>
                  <span>REMAINING WORK</span>
                  <strong>
                    {plan?.remainingHours ?? "—"}
                    <small> hours</small>
                  </strong>
                  <p>Your editable task estimates</p>
                </div>
                <div>
                  <span>PLANNING CAPACITY</span>
                  <strong>
                    {p.days * p.hoursPerDay}
                    <small> hours</small>
                  </strong>
                  <p>
                    {p.days} days × {p.hoursPerDay} hours
                  </p>
                </div>
                <div>
                  <span>ESTIMATED LABOR</span>
                  <strong>
                    {p.hourlyRate
                      ? `${p.currency} ${plan?.budget ?? "—"}`
                      : "Unpriced"}
                  </strong>
                  <p>Excludes expenses and fees</p>
                </div>
              </section>
              <nav className="pw-tabs" aria-label="Project sections">
                {[
                  ["scope", "Scope & requirements", FileText],
                  ["work", "Delivery board", LayoutGrid],
                  ["time", "Time & actuals", Clock3],
                  ["evidence", "Sources & evidence", Link2],
                  ["changes", "Scope changes", GitCompareArrows],
                  ["pack", "Work pack", Download],
                ].map(([id, label, Icon]) => {
                  const I = Icon as typeof FileText;
                  return (
                    <button
                      key={String(id)}
                      aria-current={tab === id ? "page" : undefined}
                      onClick={() => {
                        setTab(String(id));
                        if (id === "changes") setRevisionBrief(p.brief);
                      }}
                      className={tab === id ? "pw-tab-selected" : ""}
                    >
                      <I size={16} />
                      {String(label)}
                    </button>
                  );
                })}
              </nav>
              {tab === "time" && (
                <ProjectTimePanel key={p.id} project={p} baseline={entry.baseline} revision={entry.revision} onChange={changeTime} />
              )}
              {tab === "evidence" && (
                <ProjectEvidencePanel project={p} onChange={changeEvidence} />
              )}
              {tab === "scope" && (
                <div className="pw-detail-grid">
                  <section>
                    <div className="pw-section-head">
                      <div>
                        <h2>Make the scope clear</h2>
                        <p>
                          Review each proposed requirement before you commit.
                        </p>
                      </div>
                    </div>
                    {p.requirements.map((r, i) => (
                      <article className="pw-panel pw-requirement" key={r.id}>
                        <div className="pw-row">
                          <span className="pw-number">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <label className="pw-grow">
                            Requirement {i + 1}
                            <input
                              aria-label={`Requirement ${i + 1} title`}
                              value={r.title}
                              maxLength={200}
                              onChange={(e) =>
                                update((d) => {
                                  d.requirements[i].title = e.target.value;
                                })
                              }
                            />
                          </label>
                          <select
                            aria-label={`Requirement ${i + 1} status`}
                            value={r.status}
                            onChange={(e) => {
                              if (
                                e.target.value === "accepted" &&
                                !r.evidenceNote.trim()
                              ) {
                                setError(
                                  "Add an evidence note before accepting this requirement.",
                                );
                                return;
                              }
                              update((d) => {
                                d.requirements[i].status = e.target
                                  .value as Requirement["status"];
                              });
                            }}
                          >
                            <option value="proposed">Proposed</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="accepted">Accepted</option>
                          </select>
                        </div>
                        <label>
                          Acceptance check
                          <textarea
                            value={r.acceptanceCriteria}
                            maxLength={2000}
                            aria-label={`Requirement ${i + 1} acceptance check`}
                            onChange={(e) =>
                              update((d) => {
                                d.requirements[i].acceptanceCriteria =
                                  e.target.value;
                              })
                            }
                          />
                        </label>
                        <label>
                          Evidence note
                          <textarea
                            value={r.evidenceNote}
                            maxLength={2000}
                            placeholder="What was demonstrated? Include an artifact path, result, or review note."
                            aria-label={`Requirement ${i + 1} evidence`}
                            onChange={(e) =>
                              evidenceRequirement(r, e.target.value)
                            }
                          />
                        </label>
                        <span className="pw-muted">
                          {r.id} · Proposed from brief line {r.sourceLine}.
                          Evidence is recorded by you.
                        </span>
                      </article>
                    ))}
                  </section>
                  <aside>
                    <section className="pw-panel pw-settings">
                      <h2>Project context</h2>
                      <label>
                        Project name
                        <input
                          value={p.title}
                          maxLength={160}
                          onChange={(e) =>
                            update((d) => {
                              d.title = e.target.value;
                            })
                          }
                        />
                      </label>
                      <div className="pw-input-grid">
                        <label>
                          Planning days
                          <input
                            type="number"
                            min={1}
                            max={90}
                            value={p.days}
                            onChange={(e) =>
                              update((d) => {
                                d.days = Number(e.target.value);
                              })
                            }
                          />
                        </label>
                        <label>
                          Hours per day
                          <input
                            type="number"
                            min={0.25}
                            max={12}
                            step={0.25}
                            value={p.hoursPerDay}
                            onChange={(e) =>
                              update((d) => {
                                d.hoursPerDay = Number(e.target.value);
                              })
                            }
                          />
                        </label>
                        <label>
                          Hourly rate
                          <input
                            type="number"
                            min={0}
                            max={100000}
                            value={p.hourlyRate}
                            onChange={(e) =>
                              update((d) => {
                                d.hourlyRate = Number(e.target.value);
                              })
                            }
                          />
                        </label>
                        <label>
                          Currency
                          <input
                            value={p.currency}
                            maxLength={3}
                            onChange={(e) =>
                              update((d) => {
                                d.currency = e.target.value.toUpperCase();
                              })
                            }
                          />
                        </label>
                      </div>
                      <h3>Original / current brief</h3>
                      <p className="pw-brief">{p.brief}</p>
                      <button
                        className="pw-button"
                        onClick={() => {
                          setTab("changes");
                          setRevisionBrief(p.brief);
                        }}
                      >
                        Revise scope <ArrowRight size={15} />
                      </button>
                    </section>
                    <section className="pw-panel pw-method">
                      <span className="pw-eyebrow">HOW THIS WORKS</span>
                      <h3>You make the decisions.</h3>
                      <p>
                        Each brief line becomes one proposed requirement, a
                        deliverable, and two starter tasks. These are editable
                        placeholders. Review the checks and estimates before
                        using the plan.
                      </p>
                    </section>
                  </aside>
                </div>
              )}
              {tab === "work" && (
                <>
                  <div className="pw-section-head">
                    <div>
                      <h2>Deliver, verify, record</h2>
                      <p>
                        Moving a task does not automatically accept a
                        requirement.
                      </p>
                    </div>
                  </div>
                  <section className="pw-board">
                    {(["todo", "doing", "done"] as Status[]).map((status) => (
                      <div className="pw-board-column" key={status}>
                        <h3>
                          <span className={`pw-status-dot pw-${status}`} />
                          {status === "todo"
                            ? "To do"
                            : status === "doing"
                              ? "In progress"
                              : "Delivered"}
                          <span className="pw-count">
                            {
                              p.deliverables.filter((d) => d.status === status)
                                .length
                            }
                          </span>
                        </h3>
                        {p.deliverables
                          .filter((d) => d.status === status)
                          .map((d) => (
                            <article className="pw-deliverable" key={d.id}>
                              <span className="pw-muted">
                                {d.id} · {d.requirementIds.join(", ")}
                              </span>
                              <label className="pw-deliverable-title">
                                Deliverable
                                <input
                                  aria-label={`${d.id} title`}
                                  value={d.title}
                                  maxLength={200}
                                  onChange={(e) =>
                                    update((p) => {
                                      p.deliverables.find(
                                        (x) => x.id === d.id,
                                      )!.title = e.target.value;
                                    })
                                  }
                                />
                              </label>
                              <label>
                                Delivery evidence
                                <textarea
                                  aria-label={`${d.id} delivery evidence`}
                                  value={d.evidenceNote}
                                  maxLength={2000}
                                  placeholder="Record the artifact and verification result."
                                  onChange={(e) =>
                                    update((p) => {
                                      const item = p.deliverables.find(
                                        (x) => x.id === d.id,
                                      )!;
                                      item.evidenceNote = e.target.value;
                                      if (
                                        !e.target.value.trim() &&
                                        item.status === "done"
                                      )
                                        item.status = "doing";
                                    })
                                  }
                                />
                              </label>
                              <select
                                aria-label={`${d.id} delivery status`}
                                value={d.status}
                                onChange={(e) => {
                                  if (
                                    e.target.value === "done" &&
                                    !d.evidenceNote.trim()
                                  ) {
                                    setError(
                                      "Add delivery evidence before marking a deliverable done.",
                                    );
                                    return;
                                  }
                                  update((p) => {
                                    p.deliverables.find(
                                      (x) => x.id === d.id,
                                    )!.status = e.target.value as Status;
                                  });
                                }}
                              >
                                <option value="todo">To do</option>
                                <option value="doing">In progress</option>
                                <option value="done">Delivered</option>
                              </select>
                            </article>
                          ))}
                      </div>
                    ))}
                  </section>
                  <section className="pw-panel">
                    <div className="pw-section-head">
                      <div>
                        <h2>Task plan</h2>
                        <p>
                          Edit estimates, deadlines and dependencies. The plan
                          checks cycles and available capacity.
                        </p>
                      </div>
                    </div>
                    <div className="pw-table-wrap">
                      <table className="pw-task-table">
                        <thead>
                          <tr>
                            <th>Task / requirement</th>
                            <th>Hours</th>
                            <th>Due day</th>
                            <th>Depends on IDs</th>
                            <th>Progress</th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.tasks.map((t, i) => (
                            <tr key={t.id}>
                              <td>
                                <input
                                  aria-label={`${t.id} title`}
                                  value={t.title}
                                  maxLength={200}
                                  onChange={(e) =>
                                    update((d) => {
                                      d.tasks[i].title = e.target.value;
                                    })
                                  }
                                />
                                <span>
                                  {t.id} · {t.requirementIds.join(", ")} →{" "}
                                  {t.deliverableId}
                                </span>
                              </td>
                              <td>
                                <input
                                  aria-label={`${t.id} hours`}
                                  type="number"
                                  min={0.25}
                                  max={500}
                                  step={0.25}
                                  value={t.hours}
                                  onChange={(e) =>
                                    update((d) => {
                                      d.tasks[i].hours = Number(e.target.value);
                                    })
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  aria-label={`${t.id} due day`}
                                  type="number"
                                  min={1}
                                  max={90}
                                  value={t.dueDay}
                                  onChange={(e) =>
                                    update((d) => {
                                      d.tasks[i].dueDay = Number(
                                        e.target.value,
                                      );
                                    })
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  aria-label={`${t.id} dependencies`}
                                  value={t.dependsOn.join(",")}
                                  placeholder="t1_work"
                                  onChange={(e) =>
                                    update((d) => {
                                      d.tasks[i].dependsOn = e.target.value
                                        ? e.target.value
                                            .split(",")
                                            .map((x) => x.trim())
                                        : [];
                                    })
                                  }
                                />
                              </td>
                              <td>
                                <select
                                  aria-label={`${t.id} progress`}
                                  value={t.status}
                                  onChange={(e) =>
                                    update((d) => {
                                      d.tasks[i].status = e.target
                                        .value as Status;
                                    })
                                  }
                                >
                                  <option value="todo">To do</option>
                                  <option value="doing">In progress</option>
                                  <option value="done">Done</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {plan && (
                      <div className="pw-plan-result">
                        <Clock3 size={18} />
                        <div>
                          <strong>
                            {plan.overflowHours
                              ? `${plan.overflowHours} hours beyond capacity`
                              : "Work fits the planning capacity"}
                          </strong>
                          <p>
                            {plan.totalHours} estimated hours · completion on
                            planning day {plan.completionDay} ·{" "}
                            {plan.lateTasks.length} tasks past their due day.
                            Single-person dependency scheduling; no calendar or
                            availability integration.
                          </p>
                        </div>
                      </div>
                    )}
                  </section>
                </>
              )}
              {tab === "changes" && (
                <div className="pw-detail-grid">
                  <section className="pw-panel">
                    <span className="pw-eyebrow">CHANGE CONTROL</span>
                    <h2>Know what changed before agreeing.</h2>
                    <p>
                      Record a baseline, then apply a revised brief. Exact
                      matching lines retain their tasks and evidence. Changed
                      wording counts as removed and added scope.
                    </p>
                    <button
                      className="pw-button"
                      disabled={!!validationError}
                      onClick={baseline}
                    >
                      <CheckCircle2 size={16} />
                      {entry?.baseline ? "Replace baseline" : "Record baseline"}
                    </button>
                    <label className="pw-revised-label">
                      Revised brief · one requirement per line
                      <textarea
                        aria-label="Revised brief"
                        rows={9}
                        maxLength={20000}
                        value={revisionBrief}
                        onChange={(e) => setRevisionBrief(e.target.value)}
                      />
                    </label>
                    <button
                      className="pw-primary"
                      disabled={!!validationError}
                      onClick={revise}
                    >
                      Apply revised brief <ArrowRight size={16} />
                    </button>
                  </section>
                  <section className="pw-panel">
                    <h2>Impact against baseline</h2>
                    {diff ? (
                      <>
                        <div className="pw-diff-counts">
                          <div>
                            <strong>{diff.addedRequirements.length}</strong>
                            <span>Added</span>
                          </div>
                          <div>
                            <strong>{diff.removedRequirements.length}</strong>
                            <span>Removed</span>
                          </div>
                          <div>
                            <strong>{diff.changedRequirements.length}</strong>
                            <span>Changed</span>
                          </div>
                        </div>
                        <dl className="pw-impact">
                          <div>
                            <dt>Estimated work change</dt>
                            <dd>
                              {diff.deltas.hours > 0 ? "+" : ""}
                              {diff.deltas.hours} hours
                            </dd>
                          </div>
                          <div>
                            <dt>Labor estimate change</dt>
                            <dd>
                              {diff.deltas.budget === null
                                ? "Not comparable"
                                : `${p.currency} ${diff.deltas.budget > 0 ? "+" : ""}${diff.deltas.budget}`}
                            </dd>
                          </div>
                          <div>
                            <dt>Completion change</dt>
                            <dd>
                              {diff.deltas.completionDays > 0 ? "+" : ""}
                              {diff.deltas.completionDays} planning days
                            </dd>
                          </div>
                        </dl>
                        <h3>Affected work</h3>
                        <p className="pw-break">
                          Deliverables:{" "}
                          {diff.affectedDeliverables.join(", ") || "None"}
                          <br />
                          Tasks and downstream dependencies:{" "}
                          {diff.affectedTasks.join(", ") || "None"}
                        </p>
                        {diff.addedRequirements.length > 0 && (
                          <>
                            <h3>Added requirements</h3>
                            <ul>
                              {diff.addedRequirements.map((r: Requirement) => (
                                <li key={r.id}>{r.title}</li>
                              ))}
                            </ul>
                          </>
                        )}
                        {diff.removedRequirements.length > 0 && (
                          <>
                            <h3>Removed requirements</h3>
                            <ul>
                              {diff.removedRequirements.map(
                                (r: Requirement) => (
                                  <li key={r.id}>{r.title}</li>
                                ),
                              )}
                            </ul>
                          </>
                        )}
                        <p className="pw-muted">
                          Impact is computed from recorded estimates and
                          dependency links. New work starts with placeholder
                          estimates; review them before quoting.
                        </p>
                      </>
                    ) : (
                      <div className="pw-small-empty">
                        <GitCompareArrows size={28} />
                        <p>
                          Record a baseline to compare future scope and planning
                          changes.
                        </p>
                      </div>
                    )}
                  </section>
                </div>
              )}
              {tab === "pack" && (
                <section className="pw-panel">
                  <div className="pw-section-head">
                    <div>
                      <h2>A work pack you can use</h2>
                      <p>
                        Export your recorded scope, progress, evidence,
                        assumptions and estimates.
                      </p>
                    </div>
                    <div className="pw-actions">
                      <select
                        aria-label="Work pack format"
                        value={format}
                        onChange={(e) => setFormat(e.target.value)}
                      >
                        <option value="client">Client delivery</option>
                        <option value="portfolio">Student portfolio</option>
                        <option value="handover">Professional handover</option>
                      </select>
                      <button
                        className="pw-button"
                        disabled={!pack}
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(pack);
                            setNotice("Work pack copied.");
                          } catch {
                            setError(
                              "Clipboard unavailable. Download the Markdown file instead.",
                            );
                          }
                        }}
                      >
                        Copy
                      </button>
                      <button
                        className="pw-primary"
                        disabled={!pack}
                        onClick={() =>
                          download(
                            `${p.id}-${format}.md`,
                            pack,
                            "text/markdown",
                          )
                        }
                      >
                        <Download size={16} />
                        Download Markdown
                      </button>
                    </div>
                  </div>
                  <pre className="pw-pack-preview">
                    {pack ||
                      "Fix the project validation errors to generate an export."}
                  </pre>
                </section>
              )}
              <footer className="pw-project-bottom">
                <span>
                  {entry?.cloudOwner
                    ? entry.dirty
                      ? "Device edits have not been saved to your account."
                      : "Account copy saved."
                    : "Device copy only. Export a backup or sign in to sync."}
                </span>
                <div className="pw-actions">
                  {entry?.cloudOwner === account?.id && entry?.revision > 0 && (
                    <button
                      className="pw-danger"
                      disabled={busy}
                      onClick={deleteCloud}
                    >
                      <Cloud size={14} />
                      Delete account copy
                    </button>
                  )}
                  <button
                    className="pw-danger"
                    onClick={() => {
                      if (
                        confirm(
                          "Remove this project from this device? Export a copy first. An account copy is retained.",
                        )
                      ) {
                        setEntries((list) =>
                          list.filter((e) => e.project.id !== p.id),
                        );
                        setSelected(null);
                      }
                    }}
                  >
                    <Trash2 size={14} />
                    Remove from device
                  </button>
                </div>
              </footer>
            </>
          )}
          <section className="pw-account-bar">
            <div>
              <Cloud size={19} />
              <div>
                <strong>
                  {account
                    ? `Signed in as ${account.username}`
                    : "Your work, on your terms."}
                </strong>
                <p>
                  {account
                    ? "Save a selected project explicitly, or load private account copies."
                    : "Device saves work without an account. Sign in for private cross-device storage."}
                </p>
              </div>
            </div>
            <div className="pw-actions">
              {account && (
                <button
                  className="pw-button"
                  disabled={busy}
                  onClick={loadCloud}
                >
                  Load account projects
                </button>
              )}
              <button
                className="pw-button"
                onClick={() => {
                  refreshAccount();
                  setNotice("Account status refreshed.");
                }}
              >
                Refresh account
              </button>
              <a
                className="pw-button"
                href="/account"
                target="_blank"
                rel="noreferrer"
              >
                {account ? "Manage account" : "Sign in"}
                <ArrowRight size={14} />
              </a>
            </div>
          </section>
          <footer className="pw-footer">
            <span>
              Professional Toolkit · Open source, built around your work.
            </span>
            <span>Data stays on this device until you choose to sync.</span>
          </footer>
        </main>
      </div>
      {creating && (
        <div className="pw-modal-backdrop">
          <section
            className="pw-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pw-create-title"
          >
            <span className="pw-eyebrow">{labels[audience]} WORKSPACE</span>
            <h2 id="pw-create-title">Start with the work.</h2>
            <p>
              Give the project a name and list its deliverables. Each nonblank
              line becomes a proposed requirement you can review.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                add();
              }}
            >
              <label>
                Project name
                <input
                  autoFocus
                  required
                  maxLength={160}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Customer portal launch"
                />
              </label>
              <label>
                Brief · one deliverable per line
                <textarea
                  required
                  rows={7}
                  maxLength={20000}
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder={
                    "Build an accessible customer sign-in flow\nVerify recovery and error cases\nPrepare the deployment and handover guide"
                  }
                />
              </label>
              <p className="pw-muted">
                Up to 20 lines. Starter tasks use placeholder estimates; you
                will review them.
              </p>
              <div className="pw-actions">
                <button
                  type="button"
                  className="pw-button"
                  onClick={() => setCreating(false)}
                >
                  Cancel
                </button>
                <button className="pw-primary" type="submit">
                  Create project <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
