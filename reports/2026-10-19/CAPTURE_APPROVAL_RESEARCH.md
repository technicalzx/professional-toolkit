# Capture approval and redaction: research decision

19 October 2026, Asia/Karachi. Scope: repair the existing extension-to-website review journey. Remote verified as `https://github.com/technicalzx/professional-toolkit.git`. This record separates reproduced behavior, the chosen repair and remaining acceptance.

## Existing product and practical problem

The current application already connects projects, scope revisions, source excerpts, time-log imports, shared capacity and reusable work packs. Capture already supports reviewed snapshots, a custom request, consented profile feedback, editable generated drafts and private account saves. The Chrome extension already captures a user-selected rendered page, transfers it to a chosen toolkit origin and offers JSON export. See [the implemented workspace](../../hosted-app/docs/PRODUCT_WORKSPACE.md) and [profile-feedback evidence](../2026-10-18/PROFILE_FEEDBACK.md). Rebuilding these capabilities or adding another isolated calculator would not address this failure.

A person reviewing their professional profile must be able to trust that the text they approve is the text transferred. The reproduced popup allowed its title, text, request, destination and approval controls to change while an asynchronous transfer was pending. The transfer had already taken a snapshot of the earlier values, so a visible late redaction could fail to affect the payload. Separately, request/destination edits did not consistently require renewed approval. This is a mismatch between the user's current review and the approved transfer, not a need for broader platform access.

A second reproduced path retained original `headings` metadata after the visible title/body had been edited. JSON download, handoff or a later website save could therefore preserve wording removed from the visible editor. The same metadata issue existed in the website capture editor. Hidden original headings must not defeat a person's redaction.

## Primary-source comparison and decisions

| Source, maintenance and reuse | Relevant behavior | Decision for this architecture |
|---|---|---|
| [Chrome permissions API](https://developer.chrome.com/docs/extensions/reference/api/permissions), current first-party API documentation | Optional host access can be requested for the required origin from a user gesture; denied access must be handled. Permission approval concerns browser capabilities, not approval of changing profile content. | Retain the existing click-based optional-origin request and explicit transfer approval. Show the recipient beside that approval and require it again when content, request or origin changes. No additional permission is necessary. |
| [Chrome activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab), current first-party extension documentation | User invocation grants temporary access to the current tab rather than permanent access to every platform page. | Keep `activeTab` capture and existing account handoff. Adapt the capture/approval state in this repository; do not add background collection or provider-account automation. |
| [MDN disabled attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/disabled), maintained web-platform reference | Disabled form controls cannot be edited or focused through normal interaction while disabled. | Lock the five transfer inputs for the existing busy operation, restore them on both success and failure, and retain reviewed text for recovery. This makes the editor agree with the already selected payload during asynchronous work. |

These are reference patterns adapted to the repository's own implementation, not copied upstream software. There is no third-party source integration or new software-license obligation. The repository remains MIT licensed; existing notices remain intact. Browser/HTML APIs add no runtime dependency, provider, schema or database migration.

## Ranked slice

| Candidate | User value / effort / architectural fit | Decision |
|---|---|---|
| Capture approval and complete redaction | High / small / direct fit with the existing popup, snapshot contract and capture editor | **Adopt now.** Fix the reproduced trust failure before adding capture features. |
| Preserve an edited feedback draft through a failed AI retry, including 429/502/504 | Medium / small-to-medium / same capture application | **Next candidate.** Reproduce the exact retry and draft transitions before implementation; distinguish the existing generated result from a failed new attempt. |
| Default favicon 404 and workflow prefetch follow-up | Lower immediate value than capture privacy / small for an explicit existing icon, unknown for prefetch / existing asset pipeline | **Defer this run.** Favicon failure is reproduced. The earlier workflow-prefetch 404's cause remains unverified; do not assume asset retention, change caching or add automatic reload without stable request evidence. |

## Chosen compatibility boundaries and verification state

The repair locks `title`, `text`, `prompt`, `origin` and `consent` while work is pending; edits to the four editable transfer values clear approval. The recipient origin remains visible beside the transfer decision. Both popup and website drop original heading metadata when title or body differs from the captured snapshot, while unchanged snapshots retain their existing headings and schema. Extension behavior is versioned as **0.1.4**. Required/optional permissions, provider contracts and saved-record schema stay compatible.

At this record's creation, the run has observed **19 focused checks**, **161 application Node tests** and **TypeScript checking** passing. Those results establish the covered local behavior; they do not establish loaded-Chrome acceptance, final pushed-SHA CI, merge status, a production release or Chrome Web Store publication. Reproducible ZIP/source parity, actual loaded-extension capture/approval/failure recovery, desktop/mobile website checks and exact-head CI must be recorded with their observed results before completion. Only isolated synthetic profile content and owned test fixtures may be used; no real platform account or private saved profile is needed.
