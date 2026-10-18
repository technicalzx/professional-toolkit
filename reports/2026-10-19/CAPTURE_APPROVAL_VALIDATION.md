# Capture approval and redaction: observed verification

19 October 2026, Asia/Karachi. [PR #13](https://github.com/technicalzx/professional-toolkit/pull/13). Behavior/package milestone: [1ee972f](https://github.com/technicalzx/professional-toolkit/commit/1ee972f5b951f62d4bc7770db406afd4fb42ecff). This record distinguishes source/Preview acceptance from production publication.

## Processing and recovery

A deferred toolkit-readiness fixture using the original popup reproduced the problem: after send began, controls still accepted a redaction while the queued payload contained the earlier text. The repair freezes the five transfer controls while busy; all title/text/request/destination edits require renewed approval. The destination is visible before approval. Permission rejection, closed-tab and handoff errors preserve the reviewed inputs and restore controls. Nineteen focused popup/capture checks pass, including all three failure paths and duplicate-send prevention.

Independent review also found that original headings could retain text removed from the visible source. Both editors now drop headings after a title/body edit. Unchanged captures preserve metadata. Blob JSON export, handoff and website snapshot/review export checks verify that a synthetic heading marker cannot survive redaction. No schema or saved-data migration is required.

## Local verification

- Final full application suite: 161/161 Node tests. Python 10/10, TypeScript, production dependency audit (zero findings), five-stage backend build, client preview build/package/runtime checks and extension source/ZIP/metadata parity pass.
- Local backend: fresh isolated D1 schema/state, no remote D1 or AI binding. The local binary required QA-only compatibility date 2026-09-25; the actual generated release config stayed 2026-10-12. It was not silently treated as exact platform parity.
- Installed Chrome passed actual popup activeTab capture, origin/request approval invalidation, native input disabling during a held readiness response, redacted JSON export and real website handoff/acknowledgement. The website imported the original synthetic snapshot, redacted it again, exported snapshot/review JSON, saved privately and synced the saved title. The owned disposable account was deleted before PASS.
- The earlier harness bypassed popup send controls; this run replaces that gap with real controls. Only the toolkit-origin permission and one readiness response are controlled in the isolated fixture. The readiness hold does not stub capture, processing, storage or acknowledgement. The follow-up cleanup guard always attempts account deletion and context closure even if the popup disappears during release.
- Desktop 1440 and mobile 390 website checks passed real ZIP download, release version/source/checksum, copy actions, guide navigation and viewport fit. Synthetic screenshots: [popup](assets/capture-approval-popup.png), [desktop guide](assets/extension-install-desktop.png), [mobile guide](assets/extension-install-mobile.png).

## Full Cloudflare Preview

[Build a9ffbd57](https://dash.cloudflare.com/260e7e381c392d5ffe0946eb3ac10fc5/workers/services/view/professional-toolkit/production/previews/fix-capture-transfer-approval/builds/a9ffbd57-6332-41c5-b974-7d5aac7dc825) succeeded on `1ee972f`. Its metadata verified root `hosted-app`, build `pnpm run build:cloudflare`, deploy `pnpm run deploy:preview`, and separate Preview D1 `857997b1-ddc7-499a-b4ec-4519b2860437`.

The [branch Preview](https://fix-capture-transfer-approval-professional-toolkit.abihurairahansari.workers.dev) deployed version `5a29c172-9f9b-458b-8d3f-cd6075e81ebf`, tag `1ee972f`, real compatibility date 2026-10-12 and configured AI/model binding. Startup was 10 ms; this is not browser or request latency. Actual loaded-extension acceptance and desktop/mobile download checks passed again against this deployment. The script deleted only its own synthetic account; a subsequent read-only aggregate verified Preview users=0, reports=0 and sessions=0. No real provider session/profile, customer saved content or AI inference was used.

Release 0.1.4 is 32,688 bytes, SHA-256 `c8e47f28c7f4eced9d0620bdbe32595e380cf84e41de3b0f4291f533b09bfa88`. The served Preview archive exactly matched the tested source package. All seven GitHub/Cloudflare checks on `1ee972f` passed. Final follow-up checks and mergeability must still be verified against the exact final pushed SHA; this earlier success does not prove a later head passed.

## Production monitoring and release boundary

Production home, capture, extension guide, guest account endpoint, metadata and ZIP returned 200. Existing favicon.ico returned 404. Current live ZIP remains 0.1.3, 31,486 bytes, SHA-256 `08b09aa690432222c1df45a6313bdef42ebccc100da93e17ca48b1e03afeb67a`, matching the production deployment record. A bounded 30-minute sanitized aggregate returned eight info-level events and no error-level aggregate; this is a limited indexed sample, not a claim of error-free hosting or continuous observation. No private log bodies or saved records were retrieved.

The production deployment was read back at 100% version `f5b88a6f-6720-4b5e-bbbd-077ba097241a`. This run does not publish new production code or ZIP; separate owner release approval is required. Real vendor layouts and native optional-permission prompts remain owner acceptance. This is an unpacked extension with manual Reload, not a Chrome Web Store or automatic-update release.

Next product slice: preserve edited profile feedback through failed AI regeneration. The unrelated existing braces development-tooling advisory remains [issue #12](https://github.com/technicalzx/professional-toolkit/issues/12); no audit gate or release-age policy was weakened.
