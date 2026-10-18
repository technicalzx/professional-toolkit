"use client";
import { useEffect, useState } from "react";
import {
  validateSnapshot,
  validateHandoff,
  localReview,
  restoreCapturedReview,
  CAPTURE_CHANNEL,
} from "../../lib/capture/snapshot.mjs";
import { readAccountResponse } from "../../lib/auth/client";
import {
  createEvidenceDraft,
  EVIDENCE_DRAFT_KEY,
} from "../../lib/projects/evidence-handoff.mjs";
import "../workflows/workflows.css";
import "./capture.css";

type Snapshot = ReturnType<typeof validateSnapshot>;
type Report = Record<string, any>;
export default function Capture() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [prompt, setPrompt] = useState(
      "Review this profile and recommend evidence-based improvements.",
    );
  const [report, setReport] = useState<Report | null>(null),
    [user, setUser] = useState<{ username: string } | null>(null);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [consent, setConsent] = useState(false);
  const [websiteOrigin, setWebsiteOrigin] = useState("this website");
  const [source, setSource] = useState(""),
    [title, setTitle] = useState(""),
    [text, setText] = useState("");
  function load(value: unknown) {
    const next = validateSnapshot(value);
    setSnapshot(next);
    setSource(next.sourceUrl);
    setTitle(next.title);
    setText(next.text);
    setReport(null);
    setConsent(false);
    setError("");
  }
  useEffect(() => {
    let cancelled = false;
    setWebsiteOrigin(location.origin);
    fetch("/api/account", { cache: "no-store" })
      .then(readAccountResponse)
      .then((data) => {
        if (!cancelled) setUser(data.user || null);
      })
      .catch(() => {});
    const consumed = new Set<string>();
    function receive(event: MessageEvent) {
      if (
        event.source !== window ||
        event.origin !== location.origin ||
        event.data?.channel !== CAPTURE_CHANNEL ||
        event.data?.type !== "capture"
      )
        return;
      const nonce =
        new URLSearchParams(location.hash.slice(1)).get("handoff") || "";
      if (event.data.nonce !== nonce) return;
      if (consumed.has(nonce)) {
        window.postMessage(
          { channel: CAPTURE_CHANNEL, type: "received", nonce },
          location.origin,
        );
        return;
      }
      try {
        const capture = validateHandoff(event.data, nonce);
        load(capture.snapshot);
        setPrompt(capture.prompt);
        consumed.add(nonce);
        setNotice(
          "Browser snapshot received. Inspect it before review or saving. Nothing has been sent to AI or saved to your account.",
        );
        window.postMessage(
          { channel: CAPTURE_CHANNEL, type: "received", nonce },
          location.origin,
        );
      } catch (e) {
        window.postMessage(
          {
            channel: CAPTURE_CHANNEL,
            type: "received",
            nonce,
            error: e instanceof Error ? e.message : "Invalid snapshot.",
          },
          location.origin,
        );
      }
    }
    window.addEventListener("message", receive);
    const id = new URLSearchParams(location.search).get("report");
    if (id)
      fetch("/api/reports", { cache: "no-store" })
        .then(async (response) => {
          const data = await readAccountResponse(response);
          if (!response.ok)
            throw Error(data.error || "Sign in to open your saved review.");
          const saved = data.reports?.find((r) => r.cloudId === id);
          if (!saved || saved.kind !== "captured-review")
            throw Error("Saved review unavailable in this account.");
          if (!cancelled) {
            const restored = restoreCapturedReview(saved);
            load(restored.source);
            setPrompt(restored.request);
            setReport(restored);
            setNotice("Opened your saved source and review.");
          }
        })
        .catch((e) => {
          if (!cancelled) setError(e.message);
        });
    return () => {
      cancelled = true;
      window.removeEventListener("message", receive);
    };
  }, []);
  async function refreshAccount() {
    try {
      const response = await fetch("/api/account", { cache: "no-store" });
      const value = await readAccountResponse(response);
      if (!response.ok)
        throw Error(value.error || "Account service unavailable.");
      setUser(value.user || null);
      setNotice(
        value.user
          ? "Account connected. Your source stays in this editor."
          : "Sign in in the account tab, then refresh account status.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Account service unavailable.");
    }
  }
  function invalidate() {
    setReport(null);
    setConsent(false);
    setError("");
    setNotice("");
  }
  function current() {
    return validateSnapshot({
      ...snapshot,
      schemaVersion: 1,
      sourceUrl: source,
      title,
      text,
      headings: snapshot?.headings || [],
      capturedAt: snapshot?.capturedAt || new Date().toISOString(),
      captureMethod: snapshot?.captureMethod || "manual-snapshot",
      userEdited:
        !!snapshot &&
        (snapshot.userEdited ||
          text !== snapshot.text ||
          title !== snapshot.title),
    });
  }
  function reviewLocal() {
    setError("");
    try {
      const value = current();
      setSnapshot(value);
      setReport(localReview(value, prompt));
      setNotice(
        "Local review complete. Custom requests select matching excerpts; use AI review for an open-ended answer.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check the snapshot.");
    }
  }
  function useInProject() {
    try {
      const value = current();
      sessionStorage.setItem(EVIDENCE_DRAFT_KEY, createEvidenceDraft(value));
      location.assign("/?evidence=1");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Transfer failed. Download snapshot JSON and import it in a project instead.",
      );
    }
  }
  async function reviewAI() {
    setBusy(true);
    setError("");
    setReport(null);
    try {
      const value = current();
      const response = await fetch("/api/capture/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot: value, prompt, consent }),
      });
      const result = (await response.json()) as {
        error?: string;
        report?: Report;
      };
      if (!response.ok) throw Error(result.error || "AI review failed.");
      const restored = restoreCapturedReview(result.report);
      setSnapshot(value);
      setReport(restored);
      setNotice(
        "AI review complete. Check the source quotes and recommendations before saving.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI review failed.");
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!report) return;
    setBusy(true);
    setError("");
    try {
      const body = JSON.stringify({ report: { ...report, tool: "capture" } });
      if (new TextEncoder().encode(body).length > 60000)
        throw Error(
          "This review is too large for account storage. Shorten the source or download JSON.",
        );
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const result = await readAccountResponse(response);
      if (!response.ok) throw Error(result.error || "Saving failed.");
      setNotice(
        "Saved privately to your account. Find this review under Saved reports.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Saving failed.");
    } finally {
      setBusy(false);
    }
  }
  function download(value: unknown, name: string) {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = name + ".json";
    a.click();
    URL.revokeObjectURL(url);
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 150000)
        throw Error("Choose a snapshot smaller than 150 KB.");
      const data = JSON.parse(await file.text());
      if (data.kind === "captured-review") {
        const restored = restoreCapturedReview(data);
        load(restored.source);
        setPrompt(restored.request);
        setReport(restored);
      } else load(data);
      setNotice("Snapshot imported. Review the content and its source.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON snapshot.");
    }
  }
  return (
    <main className="workflow-shell">
      <a className="account-back" href="/">
        ← Workspace & saved reports
      </a>
      <header className="account-heading">
        <span className="eyebrow">PROFILE FEEDBACK & REWRITING</span>
        <h1>Get feedback that improves your profile.</h1>
        <p>
          Use the Chrome extension on your chosen page, import its JSON
          snapshot, or enter content below. LinkedIn, Upwork and Fiverr do not
          need server-side crawling for this workflow.
        </p>
        <p>
          {user
            ? `Signed in as @${user.username}`
            : "Guest: local review and JSON export are available."}{" "}
          <a href="/account" target="_blank" rel="noreferrer">
            Account & sign in
          </a>{" "}
          ·{" "}
          <button className="secondary" onClick={refreshAccount}>
            Refresh account status
          </button>
        </p>
      </header>
      <p className="capture-extension-links">
        <a className="primary account-link" href="/toolkit-capture-extension.zip" download>Download Chrome extension</a>{" "}
        <a href="/extension">Install, update &amp; view source</a>
      </p>
      <details className="card">
        <summary>Install and connect the Chrome extension</summary>
        <ol>
          <li>
            Download the{" "}
            <a href="/toolkit-capture-extension.zip">extension ZIP</a> and
            extract it into a folder.
          </li>
          <li>
            Open chrome://extensions, enable Developer mode and choose Load
            unpacked. Select the extracted folder.
          </li>
          <li>
            Open the extension. Set its toolkit origin to{" "}
            <strong>{websiteOrigin}</strong>. Click Connect account and sign in
            on the toolkit.
          </li>
          <li>
            Open your chosen profile or public page, expand the relevant
            sections, click Capture this page, review/redact the content, then
            Open profile feedback.
          </li>
        </ol>
        <p>
          This is a developer installation, not a Chrome Web Store release. The
          extension uses click-scoped page access and an optional permission for
          your chosen toolkit origin. It does not read platform session cookies
          or crawl in the background.
        </p>
      </details>
      {error && (
        <p role="alert" className="auth-message auth-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="auth-message">
          {notice}
        </p>
      )}
      <section className="card workflow-form">
        <label className="field">
          <span>Import page snapshot or saved review JSON</span>
          <input
            type="file"
            accept=".json,application/json"
            disabled={busy}
            onChange={(e) => {
              void importFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <label className="field">
          <span>Source page URL</span>
          <input
            type="url"
            value={source}
            maxLength={2048}
            disabled={busy}
            onChange={(e) => {
              setSource(e.target.value);
              setSnapshot(null);
              invalidate();
            }}
            placeholder="https://www.linkedin.com/in/your-profile"
          />
        </label>
        <label className="field">
          <span>Page/profile title</span>
          <input
            value={title}
            maxLength={200}
            disabled={busy}
            onChange={(e) => {
              setTitle(e.target.value);
              invalidate();
            }}
          />
        </label>
        <label className="field">
          <span>Review and redact snapshot content (80–20,000 characters)</span>
          <textarea
            rows={14}
            value={text}
            maxLength={20000}
            disabled={busy}
            onChange={(e) => {
              setText(e.target.value);
              invalidate();
            }}
          />
        </label>
        <label className="field">
          <span>Your review request</span>
          <textarea
            rows={3}
            value={prompt}
            maxLength={1500}
            disabled={busy}
            onChange={(e) => {
              setPrompt(e.target.value);
              invalidate();
            }}
          />
        </label>
        {snapshot && (
          <p className="sync-note">
            {snapshot.platform} · {snapshot.captureMethod}
            {snapshot.userEdited ? " · user-edited" : ""} · captured{" "}
            {snapshot.capturedAt}. {snapshot.limitations.join(" ")}
          </p>
        )}
        <div className="button-row">
          <button className="primary" disabled={busy} onClick={reviewLocal}>
            Run local review
          </button>
          <button
            className="secondary"
            disabled={busy || !text}
            onClick={() => {
              try {
                download(current(), "toolkit-page-snapshot");
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Check the snapshot.",
                );
              }
            }}
          >
            Download snapshot JSON
          </button>
          <button
            className="secondary"
            disabled={busy}
            onClick={() => {
              setSnapshot(null);
              setText("");
              setTitle("");
              setSource("");
              invalidate();
            }}
          >
            Clear content
          </button>
        </div>
        <label className="capture-consent">
          <input
            type="checkbox"
            checked={consent}
            disabled={busy}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            Allow this selected snapshot and request to be sent to the
            Cloudflare AI model to answer my request and suggest profile improvements.
          </span>
        </label>
        <button
          className="primary"
          disabled={busy || !consent || !user}
          onClick={reviewAI}
        >
          {busy ? "Processing…" : "Get AI profile feedback"}
        </button>
        <p className="sync-note">
          Sign in, review the captured text, allow AI processing above and choose Get AI profile feedback.
          You receive an answer to your request, specific improvements, a rewritten draft and next steps.
          AI accepts up to 12 KB of selected text; the shared launch limit is 20 attempts per UTC day.
          Save privately only when you choose. Basic text checks remain available without AI.
        </p>
        <section className="capture-project-transfer">
          <h2>Use this source in your work</h2>
          <p>
            After reviewing and redacting the text, add it to a project and link
            selected excerpts to requirements or deliverables. No account or AI
            is needed. The same-tab transfer expires after 15 minutes.
          </p>
          <button
            className="secondary"
            disabled={busy || !text}
            onClick={useInProject}
          >
            Use reviewed snapshot in a project
          </button>
        </section>
      </section>
      {report && (
        <section className="card workflow-results">
          <h2>{report.title}</h2>
          <p>{report.explanation}</p>
          {report.mode === "local" ? (
            <>
              <h3>Observed text checks</h3>
              {report.checks.map(
                (c: {
                  id: string;
                  label: string;
                  status: string;
                  quote: string;
                  action: string;
                }) => (
                  <article className="recommendation" key={c.id}>
                    <h3>{c.label}</h3>
                    <p>{c.status}</p>
                    {c.quote && <blockquote>{c.quote}</blockquote>}
                    <p>{c.action}</p>
                  </article>
                ),
              )}
              <h3>Excerpts relevant to your request</h3>
              {report.excerpts.length ? (
                report.excerpts.map((e: { quote: string }, i: number) => (
                  <blockquote key={i}>{e.quote}</blockquote>
                ))
              ) : (
                <p>
                  No literal matching excerpt was found. This does not establish
                  that the requested skill or fact is absent.
                </p>
              )}
            </>
          ) : (
            <>
              <h3>Answer to your request</h3>
              <p>{report.summary}</p>
              {report.improvedDraft && <section className="recommendation"><h3>Suggested profile rewrite</h3><label className="field"><span>Edit your improved draft</span><textarea rows={9} maxLength={2200} value={report.improvedDraft} onChange={e=>setReport({...report,improvedDraft:e.target.value || "[Write your revised profile here]",draftEdited:true})}/></label><button className="secondary" onClick={async()=>{try{await navigator.clipboard.writeText(report.improvedDraft);setNotice("Improved draft copied.");}catch{setError("Clipboard unavailable. Select the draft or download the review.");}}}>Copy improved draft</button><p>{report.draftEdited?"AI-generated draft with your edits. Check every claim before publishing.":"AI-generated draft. Check every claim before publishing."}</p></section>}
              {report.nextSteps?.length>0 && <section><h3>Your next steps</h3><ol>{report.nextSteps.map((step:string,i:number)=><li key={i}>{step}</li>)}</ol></section>}
              <h3>What to improve and why</h3>
              {report.findings.map(
                (
                  f: {
                    quote: string;
                    observation: string;
                    recommendation: string;
                  },
                  i: number,
                ) => (
                  <article className="recommendation" key={i}>
                    <blockquote>{f.quote}</blockquote>
                    <p>{f.observation}</p>
                    <p>{f.recommendation}</p>
                  </article>
                ),
              )}
              <h3>Missing information</h3>
              <ul>
                {report.missingInformation.map((x: string, i: number) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </>
          )}
          <div className="button-row report-actions">
            <button className="primary" onClick={save} disabled={busy || !user}>
              Save privately to account
            </button>
            <button
              className="secondary"
              onClick={() => download(report, "toolkit-captured-review")}
            >
              Download review JSON
            </button>
            <button
              className="secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    JSON.stringify(report, null, 2),
                  );
                  setNotice("Review copied.");
                } catch {
                  setError("Clipboard unavailable. Download JSON instead.");
                }
              }}
            >
              Copy review
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
