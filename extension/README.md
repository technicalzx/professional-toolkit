# Professional Toolkit Capture

Capture one page you choose, inspect/edit its text, and transfer a versioned JSON snapshot to your toolkit website for local or optional AI review. This developer release supports loaded LinkedIn profile pages, Upwork profiles/jobs, Fiverr profile/gig pages and other public HTTPS content. It does not use a platform API or establish permission to reuse content. Use only material you may process.

## Install

1. Open the [Chrome extension installation guide](https://professional-toolkit.abihurairahansari.workers.dev/extension), download the ZIP and extract it, or use the [repository's extension folder](https://github.com/technicalzx/professional-toolkit/tree/main/extension) directly. The guide shows the downloadable version, size and SHA-256 checksum from its release metadata.
2. In Chrome, open `chrome://extensions`, enable Developer mode, click **Load unpacked**, and select the folder containing manifest.json.
3. Open [the live toolkit](https://professional-toolkit.abihurairahansari.workers.dev). Guest capture transfer, local review and JSON export work without signing in.
4. The extension defaults to `https://professional-toolkit.abihurairahansari.workers.dev`. Open it and confirm this origin, or enter another toolkit origin (for example `https://toolkit.example` or local `http://127.0.0.1:8790`). Transfer asks for permission for that exact origin. Optionally use **Connect account** for private saving and saved-review title sync on a backend-enabled deployment; if sign-in opens, sign in there and connect again.
5. On the source profile, expand/load sections you want included. Click the extension, then **Capture this page**. Inspect and redact the preview, enter a review request, confirm transfer and click **Open profile feedback**.
6. The website opens `/capture` with the snapshot. On the live site, explicitly allow Cloudflare AI processing and click **Get AI profile feedback** for the requested critique, editable rewrite and next steps. Basic local checks remain available. Click **Save privately to account** to sync the reviewed result. In the extension, **Sync saved review titles** retrieves up to five recent saved reviews for reopening.

Snapshots are not continuously synchronized. Each capture is a user action. Transfer does not automatically save or invoke AI. Account connection and title sync are optional and use the website's current session; the extension stores neither credentials nor account tokens. A different website account session sees that account's own reviews. Reopening an AI result checks its source quotes; it does not prove the observation is true.

## Privacy and permissions

- `activeTab` grants temporary access after invoking the extension. `scripting` reads the selected page and delivers the approved snapshot. `storage` remembers only the chosen toolkit origin.
- No install-time host grants, background service worker, automatic content scripts, cookie permission, history permission, remote code or background crawling.
- The optional HTTPS wildcard in the manifest allows a user-owned toolkit deployment. Runtime permission requests name only the chosen toolkit origin. Local HTTP is restricted to localhost/127.0.0.1 development. Disconnect removes granted host permissions and the stored origin.
- Source capture reads text nodes from the main content area when available, excluding forms, inputs, editable content, scripts, navigation, hidden elements and dialogs. It does not read passwords, cookies, browser storage, network traffic or platform APIs. DOM structure can vary; inspect the preview for unrelated visible content.
- Snapshot and prompt remain in popup memory until explicit transfer/download. Closing the popup discards them. No analytics or telemetry is included. URL query strings/fragments are removed.
- Transferred content enters the selected website's page memory. Account saving uses that website's existing private reports API and limits. AI use sends only the selected snapshot/request to the server-configured provider after explicit consent; provider retention/usage terms apply. Website account deletion removes account reports through the existing cascade.
- Own and competitor captures are both unverified snapshots. No platform rankings, earnings or ownership verification is claimed. Source timestamps describe capture time, not platform freshness.

The nonce in a handoff identifies one transfer; it is not an authentication credential. The website treats every handoff as untrusted input and grants it no authority to save, spend or invoke AI. Account cookies remain HttpOnly in the website browser context. No cookies/passwords enter a message, URL or extension storage.

## Limits and release status

Maximum 20,000 captured characters and 30 headings; only loaded content in the top document is read. Cross-origin iframes, shadow DOM, unloaded sections and virtualized content may be absent. Messages/settings/payment pages are intentionally rejected. Capture does not bypass platform access controls or publisher restrictions. A URL alone still cannot provide private data.

This is an unpacked developer release, not a Chrome Web Store listing or platform-endorsed integration. Store publication needs final metadata/icons/privacy disclosure and review. Real authenticated LinkedIn/Upwork/Fiverr accounts require manual acceptance testing by their owner; automated tests use synthetic content.

## Update an installed copy

Chrome does not automatically update an unpacked extension. Check the [installation guide](https://professional-toolkit.abihurairahansari.workers.dev/extension) for the published version, then download and extract the new ZIP. Replace the files in the same folder you originally loaded, open `chrome://extensions`, and click **Reload** on Professional Toolkit Capture. Close and reopen any existing extension popup. Confirm the extension version matches the guide. The website can change independently; a website update does not require replacing unchanged extension files.

If you load from a Git checkout instead, update the checkout and click **Reload**. Keep using the same folder to retain that extension's Chrome settings. Review permission changes before installing an updated release.

## Build

From repository root: `python scripts/package-extension.py`. This copies the authoritative snapshot contract from `hosted-app/lib/capture/snapshot.mjs` and the repository's MIT license, then writes `hosted-app/public/toolkit-capture-extension.zip` and `hosted-app/public/extension-release.json`. Only the explicit release file inventory is included. The ZIP contains its README and license, uses canonical LF text and fixed file metadata, and is byte-for-byte reproducible across Windows and Linux checkouts. All extension logic is packaged locally.

Run `python scripts/package-extension.py --check` to verify that the download, copied shared sources and release metadata match the source. Run `python -m unittest discover -s tests -v` for release parity, checksum, deterministic packaging and stale artifact checks. Rebuild after changing any packaged file; commit the ZIP and metadata together with that change. The release version comes from `extension/manifest.json`: bump it for extension behavior or permission changes, rather than website-only or packaging-only changes.

Chrome references: [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab), [scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting), [optional permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions), [user-data policies](https://developer.chrome.com/docs/webstore/program-policies/policies).

Version 0.1.2 rejects Fiverr buyer/client routes such as `/buying` with guidance to open the freelancer-profile link or a public gig. The capture/request flow comes first; connection settings and saved reviews are under **Account connection & saved reviews**. AI feedback has a shared launch cap of 20 attempts per UTC day and a 12 KB reviewed-source limit.

Version 0.1.3 adds **Help & updates** in the popup, linking to the live installation/update guide. It adds no permissions or automatic requests. Release downloads now include versioned public checksum metadata and reproducible packaging checks.
