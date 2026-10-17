"use client";

import { useEffect, useRef, useState } from "react";
import {
  validateProject,
  addProjectSource,
  reviseProjectSource,
  removeProjectSource,
  linkProjectEvidence,
  unlinkProjectEvidence,
  inspectProjectEvidence,
} from "../lib/projects/engine.mjs";
import "./project-evidence-panel.css";

type TargetType = "requirement" | "deliverable";
type Snapshot = {
  schemaVersion: number;
  sourceUrl: string;
  title: string;
  text: string;
  headings: string[];
  capturedAt: string;
  captureMethod: string;
  userEdited?: boolean;
};
type Source = {
  id: string;
  revision: number;
  snapshot: Snapshot;
  importedAt: string;
};
type EvidenceProject = {
  id: string;
  sources: Source[];
  requirements: { id: string; title: string }[];
  deliverables: { id: string; title: string }[];
};
type EvidenceLink = {
  targetType: TargetType;
  targetId: string;
  linkIndex: number;
  sourceId: string;
  sourceRevision: number;
  status: "linked" | "missing-source" | "stale-source" | "quote-missing";
  title?: string;
  quote?: string;
  sourceUrl?: string;
};
type Props = {
  project: unknown;
  onChange: (
    project: unknown,
    change?: { sourceId: string; action: "revise" | "remove" },
  ) => void;
};
type Editor = {
  sourceId: string;
  revision: number;
  title: string;
  sourceUrl: string;
  text: string;
};
const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "The source could not be updated. Your project has not been changed.";
const statuses: Record<EvidenceLink["status"], string> = {
  linked: "Linked excerpt",
  "missing-source": "Source removed",
  "stale-source": "Source revised — relink required",
  "quote-missing": "Excerpt unavailable — relink required",
};

export default function ProjectEvidencePanel({ project, onChange }: Props) {
  const [selectedId, setSelectedId] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [quote, setQuote] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  let model: EvidenceProject | null = null;
  let links: EvidenceLink[] = [];
  let validationError = "";
  try {
    model = validateProject(project) as unknown as EvidenceProject;
    links = inspectProjectEvidence(project) as EvidenceLink[];
  } catch (failure) {
    validationError = message(failure);
  }
  const currentRef = useRef({ project, model });
  currentRef.current = { project, model };
  const sources = model?.sources || [];
  const selected =
    sources.find((source) => source.id === selectedId) || sources[0];
  const selectedIdentity = `${model?.id || ""}:${selected?.id || ""}:${selected?.revision || 0}`;
  useEffect(() => {
    setEditor(null);
    setQuote("");
  }, [selectedIdentity]);
  const targets = [
    ...(model?.requirements || []).map((record) => ({
      ...record,
      type: "requirement" as const,
    })),
    ...(model?.deliverables || []).map((record) => ({
      ...record,
      type: "deliverable" as const,
    })),
  ];
  const target =
    targets.find((record) => `${record.type}:${record.id}` === targetValue) ||
    targets[0];
  const validQuote =
    !!selected &&
    !!quote.trim() &&
    quote.length <= 600 &&
    selected.snapshot.text.includes(quote.trim());

  function clearMessages() {
    setError("");
    setNotice("");
  }
  function choose(id: string) {
    setSelectedId(id);
    setEditor(null);
    setQuote("");
    clearMessages();
  }
  async function importFile(file?: File) {
    if (!file || !model) return;
    const projectId = model.id;
    setImporting(true);
    clearMessages();
    try {
      if (file.size > 150_000)
        throw new Error(
          "Choose a snapshot or captured-review JSON file smaller than 150 KB.",
        );
      const value: unknown = JSON.parse(await file.text());
      if (currentRef.current.model?.id !== projectId)
        throw new Error(
          "The selected project changed. Choose the JSON file again for this project.",
        );
      const next = addProjectSource(currentRef.current.project, value);
      const normalized = validateProject(next) as unknown as EvidenceProject;
      const priorIds = new Set(
        currentRef.current.model.sources.map((source) => source.id),
      );
      const added = normalized.sources.find(
        (source) => !priorIds.has(source.id),
      );
      onChange(next);
      if (added) choose(added.id);
      setNotice(
        added
          ? "Reviewed source imported. Select an exact excerpt and link it to a requirement or deliverable."
          : "This snapshot is already in the project. No duplicate source was added.",
      );
    } catch (failure) {
      setError(message(failure));
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  function linkExcerpt(event: React.FormEvent) {
    event.preventDefault();
    clearMessages();
    try {
      if (!selected || !target)
        throw new Error("Choose a source and a requirement or deliverable.");
      if (!validQuote)
        throw new Error(
          "Copy an exact excerpt from the selected source, up to 600 characters.",
        );
      onChange(
        linkProjectEvidence(
          project,
          { type: target.type, id: target.id },
          selected.id,
          quote.trim(),
        ),
      );
      setQuote("");
      setNotice(
        "Excerpt linked. It records the supplied source; it does not independently verify the claim.",
      );
    } catch (failure) {
      setError(message(failure));
    }
  }
  function editSource() {
    if (!selected) return;
    clearMessages();
    setEditor({
      sourceId: selected.id,
      revision: selected.revision,
      title: selected.snapshot.title,
      sourceUrl: selected.snapshot.sourceUrl,
      text: selected.snapshot.text,
    });
  }
  function saveRevision(event: React.FormEvent) {
    event.preventDefault();
    clearMessages();
    try {
      if (!editor) return;
      const original = sources.find((source) => source.id === editor.sourceId);
      if (!original || original.revision !== editor.revision)
        throw new Error(
          "This source changed while you were editing it. Open Edit source again.",
        );
      if (
        !window.confirm(
          "Replace this source with the edited snapshot? Previous source text is not retained. Linked excerpts are cleared and must be reviewed and linked again. Already downloaded or shared copies are unchanged.",
        )
      )
        return;
      const snapshot = {
        ...original.snapshot,
        title: editor.title,
        sourceUrl: editor.sourceUrl,
        text: editor.text,
        headings: [],
        userEdited: true,
      };
      onChange(reviseProjectSource(project, original.id, snapshot), {
        sourceId: original.id,
        action: "revise",
      });
      setEditor(null);
      setQuote("");
      setNotice(
        "Source revision saved. Previous linked excerpts are unavailable until you review and link them again.",
      );
    } catch (failure) {
      setError(message(failure));
    }
  }
  function removeSource(source: Source) {
    clearMessages();
    if (
      !window.confirm(
        `Remove “${source.snapshot.title}” and its stored content? Linked quotes are cleared; references remain as missing-source warnings. Already downloaded or shared copies are unchanged.`,
      )
    )
      return;
    try {
      onChange(removeProjectSource(project, source.id), {
        sourceId: source.id,
        action: "remove",
      });
      setSelectedId("");
      setEditor(null);
      setQuote("");
      setNotice(
        "Source content removed. Missing-source warnings remain on its linked records.",
      );
    } catch (failure) {
      setError(message(failure));
    }
  }
  function unlink(link: EvidenceLink) {
    clearMessages();
    try {
      onChange(
        unlinkProjectEvidence(
          project,
          { type: link.targetType, id: link.targetId },
          link.linkIndex,
        ),
      );
      setNotice("Evidence reference removed.");
    } catch (failure) {
      setError(message(failure));
    }
  }

  return (
    <section className="pwe-panel" aria-labelledby="pwe-heading">
      <div className="pw-section-head">
        <div>
          <h2 id="pwe-heading">Sources & linked evidence</h2>
          <p>Keep reviewed source excerpts with the work they support.</p>
        </div>
        <span className="pwe-count">{sources.length}/12 sources</span>
      </div>
      {validationError && (
        <p role="alert" className="pw-alert">
          Fix the project before editing evidence: {validationError}
        </p>
      )}
      {error && (
        <p role="alert" className="pw-alert">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="pw-notice">
          {notice}
        </p>
      )}
      <section className="pw-panel pwe-import">
        <label htmlFor="pwe-import-file">Import evidence JSON</label>
        <p>
          Choose a reviewed page snapshot or captured-review export. Only the
          source snapshot is attached; generated recommendations are not
          evidence.
        </p>
        <input
          id="pwe-import-file"
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          disabled={!model || importing || sources.length >= 12}
          onChange={(event) => {
            void importFile(event.target.files?.[0]);
          }}
        />
        <p className="pwe-note">
          Maximum 150 KB per file. Captured pages and profile ownership are
          unverified. Review and redact sensitive text before attaching it.
        </p>
      </section>
      {sources.length ? (
        <div className="pwe-layout">
          <section aria-label="Project sources" className="pwe-source-list">
            {sources.map((source) => (
              <article className="pw-panel pwe-source-card" key={source.id}>
                <button
                  className={`pwe-source-choice ${selected?.id === source.id ? "pwe-selected" : ""}`}
                  aria-pressed={selected?.id === source.id}
                  onClick={() => choose(source.id)}
                >
                  <strong>{source.snapshot.title}</strong>
                  <span>
                    Revision {source.revision} · {source.snapshot.captureMethod}
                  </span>
                </button>
                <a
                  className="pwe-source-url"
                  href={source.snapshot.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {source.snapshot.sourceUrl}
                  <span className="pwe-sr-only"> (opens in a new tab)</span>
                </a>
                <dl className="pwe-source-meta">
                  <div>
                    <dt>Captured</dt>
                    <dd>{source.snapshot.capturedAt}</dd>
                  </div>
                  <div>
                    <dt>Imported</dt>
                    <dd>{source.importedAt}</dd>
                  </div>
                </dl>
                <p className="pwe-note">
                  {source.snapshot.userEdited ? "User-edited snapshot. " : ""}
                  Content and ownership unverified.
                </p>
                <button
                  type="button"
                  className="pw-danger"
                  onClick={() => removeSource(source)}
                  aria-label={`Remove source ${source.snapshot.title}`}
                >
                  Remove source
                </button>
              </article>
            ))}
          </section>
          {selected && (
            <section
              className="pw-panel pwe-source-detail"
              aria-label="Selected source"
            >
              <label htmlFor="pwe-source-select">Evidence source</label>
              <select
                id="pwe-source-select"
                value={selected.id}
                onChange={(event) => choose(event.target.value)}
              >
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.snapshot.title} · revision {source.revision}
                  </option>
                ))}
              </select>
              <label htmlFor="pwe-source-text">Selected source text</label>
              <textarea
                id="pwe-source-text"
                readOnly
                rows={9}
                value={selected.snapshot.text}
              />
              <div className="pw-actions">
                <button
                  type="button"
                  className="pw-button"
                  onClick={editSource}
                >
                  Edit source
                </button>
                <span className="pwe-note">
                  Only the latest source revision is retained.
                </span>
              </div>
              {editor &&
                editor.sourceId === selected.id &&
                editor.revision === selected.revision && (
                  <form className="pwe-editor" onSubmit={saveRevision}>
                    <h3>Edit and redact the source</h3>
                    <p>
                      Saving creates a new revision and clears linked quotes.
                      Capture time remains the original source timestamp.
                    </p>
                    <label htmlFor="pwe-editor-title">
                      Revised source title
                    </label>
                    <input
                      id="pwe-editor-title"
                      required
                      maxLength={200}
                      value={editor.title}
                      onChange={(event) =>
                        setEditor({ ...editor, title: event.target.value })
                      }
                    />
                    <label htmlFor="pwe-editor-url">Revised source URL</label>
                    <input
                      id="pwe-editor-url"
                      required
                      type="url"
                      maxLength={2048}
                      value={editor.sourceUrl}
                      onChange={(event) =>
                        setEditor({ ...editor, sourceUrl: event.target.value })
                      }
                    />
                    <label htmlFor="pwe-editor-text">Revised source text</label>
                    <textarea
                      id="pwe-editor-text"
                      required
                      minLength={80}
                      maxLength={20000}
                      rows={9}
                      value={editor.text}
                      onChange={(event) =>
                        setEditor({ ...editor, text: event.target.value })
                      }
                    />
                    <div className="pw-actions">
                      <button className="pw-primary" type="submit">
                        Save source revision
                      </button>
                      <button
                        className="pw-button"
                        type="button"
                        onClick={() => setEditor(null)}
                      >
                        Cancel source edit
                      </button>
                    </div>
                  </form>
                )}
              <form className="pwe-link-form" onSubmit={linkExcerpt}>
                <h3>Link a source excerpt</h3>
                <p>
                  Copy a precise passage from the text above. A matching quote
                  establishes provenance, not truth.
                </p>
                <label htmlFor="pwe-quote">Source excerpt</label>
                <textarea
                  id="pwe-quote"
                  required
                  maxLength={600}
                  rows={4}
                  value={quote}
                  onChange={(event) => {
                    setQuote(event.target.value);
                    clearMessages();
                  }}
                  placeholder="Paste up to 600 characters exactly as they appear in the selected source."
                />
                <p className="pwe-note" aria-live="polite">
                  {quote
                    ? validQuote
                      ? "Exact excerpt found in this source."
                      : "This excerpt does not exactly match the selected source."
                    : "Each record can hold up to 8 linked excerpts."}
                </p>
                <label htmlFor="pwe-target">Evidence target</label>
                <select
                  id="pwe-target"
                  value={target ? `${target.type}:${target.id}` : ""}
                  onChange={(event) => setTargetValue(event.target.value)}
                >
                  <optgroup label="Requirements">
                    {targets
                      .filter((record) => record.type === "requirement")
                      .map((record) => (
                        <option
                          key={record.id}
                          value={`requirement:${record.id}`}
                        >
                          {record.id}: {record.title}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Deliverables">
                    {targets
                      .filter((record) => record.type === "deliverable")
                      .map((record) => (
                        <option
                          key={record.id}
                          value={`deliverable:${record.id}`}
                        >
                          {record.id}: {record.title}
                        </option>
                      ))}
                  </optgroup>
                </select>
                <button
                  className="pw-primary"
                  type="submit"
                  disabled={!validQuote || !target}
                >
                  Link excerpt
                </button>
              </form>
            </section>
          )}
        </div>
      ) : (
        <div className="pw-panel pwe-empty">
          <h3>No source snapshots attached yet</h3>
          <p>
            Import a snapshot JSON file, or open Profile & page capture to
            review a loaded page first.
          </p>
          <a className="pw-button" href="/capture">
            Open profile & page capture
          </a>
        </div>
      )}
      <section
        className="pw-panel pwe-links"
        aria-labelledby="pwe-links-heading"
      >
        <h3 id="pwe-links-heading">Linked excerpts</h3>
        {links.length ? (
          <ul>
            {links.map((link) => {
              const record = targets.find(
                (target) =>
                  target.type === link.targetType &&
                  target.id === link.targetId,
              );
              return (
                <li
                  key={`${link.targetType}:${link.targetId}:${link.linkIndex}`}
                >
                  <div className="pwe-link-heading">
                    <strong>
                      {link.targetType === "requirement"
                        ? "Requirement"
                        : "Deliverable"}{" "}
                      {link.targetId}: {record?.title || "Record unavailable"}
                    </strong>
                    <span
                      className={`pwe-badge ${link.status === "linked" ? "pwe-valid" : "pwe-warning"}`}
                    >
                      {statuses[link.status]}
                    </span>
                  </div>
                  <p>
                    {link.title || link.sourceId} · source revision{" "}
                    {link.sourceRevision}
                  </p>
                  {link.status === "linked" && link.quote ? (
                    <blockquote>{link.quote}</blockquote>
                  ) : (
                    <p className="pwe-note">
                      The previous quote is not retained here. Review an
                      available source and create a fresh link.
                    </p>
                  )}
                  <button
                    type="button"
                    className="pw-button"
                    onClick={() => unlink(link)}
                    aria-label={`Unlink excerpt ${link.linkIndex + 1} from ${link.targetType} ${link.targetId}`}
                  >
                    Unlink excerpt
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p>No source excerpts are linked to requirements or deliverables.</p>
        )}
      </section>
      <p className="pwe-footnote">
        Markdown work packs include linked excerpts. Project JSON, device
        storage and account saves include attached source snapshots. Review
        private details before exporting, syncing or sharing; deleting a source
        cannot retract previously exported copies.
      </p>
    </section>
  );
}
