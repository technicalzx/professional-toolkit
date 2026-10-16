# Professional Toolkit Capture

Capture one page you choose, inspect/edit its text, and transfer a versioned JSON snapshot to your toolkit website for local or optional AI review. This developer release supports loaded LinkedIn profile pages, Upwork profiles/jobs, Fiverr profile/gig pages and other public HTTPS content. It does not use a platform API or establish permission to reuse content. Use only material you may process.

## Install

1. Extract `hosted-app/public/toolkit-capture-extension.zip`, or use this repository's `extension/` folder directly.
2. In Chrome, open `chrome://extensions`, enable Developer mode, click **Load unpacked**, and select the folder containing manifest.json.
3. Open the toolkit website. Guest capture transfer, local review and JSON export work without signing in.
4. Open the extension and enter the toolkit origin (for example `https://toolkit.example` or local `http://127.0.0.1:8790`). Transfer asks for permission for that exact origin. Optionally use **Connect account** for private saving and saved-review title sync on a backend-enabled deployment; if sign-in opens, sign in there and connect again.
5. On the source profile, expand/load sections you want included. Click the extension, then **Capture this page**. Inspect and redact the preview, enter a review request, confirm transfer and click **Open toolkit review**.
6. The website opens `/capture` with the snapshot. Run local review or explicitly consent to an operator-configured AI model. Click **Save privately to account** to sync the reviewed result. In the extension, **Sync saved review titles** retrieves up to five recent saved reviews for reopening.

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

## Build

From repository root: `python scripts/package-extension.py`. This copies the authoritative snapshot contract from `hosted-app/lib/capture/snapshot.mjs` and packages extension files into the downloadable ZIP. Rebuild after changing that contract; tests verify parity. All extension logic is packaged locally.

Chrome references: [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab), [scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting), [optional permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions), [user-data policies](https://developer.chrome.com/docs/webstore/program-policies/policies).
