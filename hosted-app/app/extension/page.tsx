"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Copy, Download, ExternalLink, Puzzle, ShieldCheck } from "lucide-react";
import release from "../../public/extension-release.json";
import "./extension.css";

export default function Extension() {
  const [origin, setOrigin] = useState("https://professional-toolkit.abihurairahansari.workers.dev");
  const [notice, setNotice] = useState("");
  useEffect(() => setOrigin(location.origin), []);

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${label} copied.`);
    } catch {
      setNotice(`Copy is unavailable. Select and copy the ${label.toLowerCase()} shown on this page.`);
    }
  }

  return (
    <main className="extension-page">
      <header className="extension-nav">
        <a href="/" className="extension-brand"><Puzzle size={24} aria-hidden="true" /> Professional Toolkit</a>
        <nav aria-label="Extension navigation"><a href="/">Projects</a><a href="/capture">Profile feedback <ArrowRight size={15} aria-hidden="true" /></a></nav>
      </header>

      <section className="extension-hero" aria-labelledby="extension-title">
        <div>
          <span className="extension-label">CHROME EXTENSION · OPEN SOURCE</span>
          <h1 id="extension-title">Your profile.<br />A clearer next step.</h1>
          <p className="extension-intro">Bring the profile you are viewing into Professional Toolkit. Ask for feedback, a better introduction or a clearer service offer, using the content you choose.</p>
          <div className="extension-actions">
            <a className="extension-primary" href={release.downloadUrl} download><Download size={18} aria-hidden="true" /> Download Chrome extension</a>
            <a className="extension-secondary" href={release.sourceUrl} target="_blank" rel="noopener noreferrer">View GitHub source <ExternalLink size={15} aria-hidden="true" /></a>
          </div>
          <p className="extension-release">Version {release.version} · {Math.ceil(release.sizeBytes / 1024)} KB · Desktop Chrome</p>
          <p className="extension-install-note">Download the ZIP, then follow the steps below. This developer release uses Chrome’s <strong>Load unpacked</strong> option; it is not a Chrome Web Store installer.</p>
        </div>
        <aside className="extension-flow" aria-label="How profile feedback works">
          <Puzzle size={32} aria-hidden="true" />
          <h2>From a page to a useful draft.</h2>
          <ol><li><Check size={17} aria-hidden="true" /><span>Capture a loaded profile or page.</span></li><li><Check size={17} aria-hidden="true" /><span>Inspect the text and write your request.</span></li><li><Check size={17} aria-hidden="true" /><span>Get feedback and edit the suggested rewrite.</span></li></ol>
          <p>LinkedIn · Upwork · Fiverr · Other HTTPS pages</p>
          <small>Only readable, loaded content is included. Expand the sections you want reviewed. On Fiverr, open your freelancer profile or gig, rather than the buying/client page.</small>
        </aside>
      </section>

      <section className="extension-install" aria-labelledby="extension-install-title">
        <span className="extension-label">GET STARTED</span>
        <h2 id="extension-install-title">Install in desktop Chrome</h2>
        <p>Keep the extracted folder somewhere permanent. Chrome loads the extension from that folder.</p>
        <ol className="extension-steps">
          <li><div className="extension-step-number">1</div><div><h3>Download and extract</h3><p>Download the ZIP above. Extract all files into a folder such as <strong>Professional Toolkit Extension</strong>. Open it and check that <code>manifest.json</code> is inside.</p></div></li>
          <li><div className="extension-step-number">2</div><div><h3>Load the extension</h3><p>Enter <code>chrome://extensions</code> in Chrome’s address bar. Turn on <strong>Developer mode</strong>, choose <strong>Load unpacked</strong>, and select the extracted folder containing <code>manifest.json</code>.</p><button className="extension-copy" onClick={() => copy("chrome://extensions", "Chrome extensions address")}><Copy size={14} aria-hidden="true" /> Copy Chrome extensions address</button></div></li>
          <li><div className="extension-step-number">3</div><div><h3>Pin, capture and review</h3><p>Use Chrome’s Extensions menu to pin <strong>Professional Toolkit Capture</strong>. Open a profile, expand its sections and click the extension, then <strong>Capture this page</strong>. Inspect or redact the text, enter your request, confirm transfer and choose <strong>Open profile feedback</strong>.</p><p>The website opens with your snapshot. Local checks work as a guest. For AI feedback, sign in, explicitly allow Cloudflare AI processing and choose <strong>Get AI profile feedback</strong>. Review the draft before using it; save privately when you want to keep it.</p><a href="/capture" className="extension-text-link">Open profile feedback <ArrowRight size={15} aria-hidden="true" /></a></div></li>
        </ol>
        <div className="extension-origin"><div><h3>Connect to this toolkit</h3><p>In the extension’s <strong>Account connection &amp; saved reviews</strong> section, use this website address. Connect your account for private saves and saved-review title sync.</p><code>{origin}</code></div><button className="extension-copy" onClick={() => copy(origin, "Toolkit website address")}><Copy size={15} aria-hidden="true" /> Copy website address</button></div>
        {notice && <p className="extension-status" role="status">{notice}</p>}
      </section>

      <div className="extension-detail-grid">
        <section className="extension-panel" aria-labelledby="extension-update-title"><span className="extension-label">ALREADY INSTALLED?</span><h2 id="extension-update-title">Update your extension</h2><p>Unpacked installations update manually. Compare the version on Chrome’s extensions page with <strong>{release.version}</strong> here.</p><ol><li>Finish your capture or export any unsent snapshot first.</li><li>Download and extract the latest ZIP. Replace the files inside the <strong>same installation folder</strong>.</li><li>Open <code>chrome://extensions</code>, find Professional Toolkit Capture and click <strong>Reload</strong>.</li><li>Check the version on Chrome’s extensions page. Close and reopen the popup, confirm its toolkit address, then capture again.</li></ol><p>Keep the folder path and existing installation to retain its settings. Removing and reinstalling the extension can reset them.</p><a className="extension-text-link" href="https://github.com/technicalzx/professional-toolkit/blob/main/extension/README.md" target="_blank" rel="noopener noreferrer">Setup, updates &amp; release notes <ExternalLink size={15} aria-hidden="true" /></a></section>
        <section className="extension-panel" aria-labelledby="extension-privacy-title"><ShieldCheck size={25} aria-hidden="true" /><h2 id="extension-privacy-title">You choose what leaves the page</h2><p>Page access starts with your click. The extension does not read your platform session cookies or crawl in the background. Preview and redact captured text before transfer.</p><p>Account connection is optional. Transferring a snapshot does not automatically save it or invoke AI. AI feedback requires sign-in and your explicit consent on the website.</p><p>Captures are not continuously synchronized. Each transfer is your action; generated advice needs your review and does not verify profile claims or guarantee platform rankings.</p><details><summary>Verify this download</summary><p>Compare this SHA-256 checksum with the downloaded ZIP if you need to verify its bytes.</p><code className="extension-checksum">{release.sha256}</code><button className="extension-copy" onClick={() => copy(release.sha256, "Checksum")}><Copy size={14} aria-hidden="true" /> Copy checksum</button><p><a href="/extension-release.json">Download metadata</a> · MIT licensed</p></details></section>
      </div>

      <footer className="extension-footer"><a href="/" className="extension-text-link"><ArrowLeft size={16} aria-hidden="true" /> Back to your workspace</a><p>Open source. Built for work you can improve and keep.</p></footer>
    </main>
  );
}
