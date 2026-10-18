# Prompt-driven profile feedback: delivery evidence

18 October 2026, Asia/Karachi. The owner's requested journey is profile capture → custom request → practical feedback and rewritten content → private save/reopen. A capture transfer plus literal checks did not satisfy it.

## Confirmed gaps and changes

The live deployment had no AI binding/model; open-ended requests therefore returned AI_NOT_CONFIGURED. Cloudflare Workers AI is now bound to the full Worker with `@cf/meta/llama-3.1-8b-instruct-fp8-fast`. The screenshot also showed a Fiverr buyer/client page (`/buying`), rather than freelancer positioning. The extension now rejects that route before reading the DOM and explains how to open Fiverr's freelancer-profile link or a public gig. The API rejects buyer-page submissions too.

The website now prioritizes **Get AI profile feedback** after the reviewed source and request. The response contains a direct answer, quoted observations and concrete improvements, an editable rewritten draft, next steps and missing information. Edits are identified as user edits, survive JSON/account save and reopen, and can be copied independently. New generated results no longer imply they are already account-saved. Existing local/AI reviews remain compatible. The extension's capture/request flow comes before account settings, and version 0.1.2 defaults to the live origin.

## Observed verification

- 147 application unit/integration tests passed; TypeScript, all five production build stages and production dependency audit passed. Focused capture checks passed again after final validation/wording changes.
- API regression rejects missing rewrites, fabricated source quotes, unsupported experience adjectives in drafts, buyer routes, over-limit UTF-8 source text, missing consent, expired/missing sessions and exhausted daily usage before calling the provider. Immutable source material is retained separately from generated/user-edited drafts. Existing private ownership checks remain.
- Real live Cloudflare inference passed two distinct requests on one synthetic profile: headline/About critique and rewrite; Fiverr gig title plus three Terraform/CI/CD service deliverables. Outputs differed, quotes matched the exact source and the provider was configured. See [synthetic output](assets/profile-feedback-synthetic.json), [desktop](assets/profile-feedback-desktop.png) and [390px mobile](assets/profile-feedback-mobile.png).
- Browser acceptance edited the generated draft, saved privately, reopened the saved report and verified the edit flag/text. Own synthetic account deletion returned 200 before PASS. An independent remote count found zero `qa-feedback-` fixture accounts; real user records were neither listed nor deleted.
- Loaded-extension live acceptance passed capture, handoff, private save and saved-title sync with the release ZIP bytes verified. The temporary fixture pre-grants only the toolkit host; actual permission prompts and the owner's authenticated vendor profiles remain owner acceptance.
- Capture/evidence regression and synthetic extraction/privacy tests passed against the live site, including 390px overflow checks. Screenshots were inspected; this is browser QA, not formal assistive-technology certification.

## Failures found rather than hidden

The initial live browser test used an exact label selector that also included a textarea's default content. Accessible textbox roles fixed the test locator; assertions were retained. The account was cleaned up and no inference occurred in that attempt.

The first configured non-fast model timed out at the bounded 25-second limit on a full review. No automatic inference retry was added. A direct synthetic probe of the fast model completed in 3.18 seconds; the final live browser requests then passed. The provider can return a structured response object as well as a JSON string, and the parser accepts either.

Model output still requires human review. A preliminary draft added unsupported seniority wording; prompts now explicitly preserve personal-project experience and the API rejects added expert/seasoned/senior/certified/award-winning labels absent from the source. Exact quotes and this narrow check do not verify every generated statement. Suggestions may be generic or require future evidence; never present a suggested testimonial, client outcome or personal project as established client work. The saved synthetic examples show practical drafts and remaining limitations, not guaranteed business results or ranking improvements.

## Usage and trust boundaries

AI is opt-in per request and requires the website session. Only selected source title/text/platform and the request go to Cloudflare; no page cookies/passwords are collected. AI input is limited to 12,000 UTF-8 source bytes, the prompt to 1,500 characters and output to 1,800 tokens. Requests reserve five per user per 15 minutes, twenty globally per 15 minutes and twenty globally per UTC day. Failed attempts count; no automatic retry or provider fallback spends additional usage. The day cap is atomic in the existing auth_limits table; no migration or new database is needed. It limits this app's use, not unrelated account use or an invoice. No paid subscription upgrade or unrelated AI provider was enabled.

Cloudflare references: [fast model](https://developers.cloudflare.com/workers-ai/models/llama-3.1-8b-instruct-fp8-fast/), [pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/). Chrome's [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab) explains the click-selected capture boundary. No upstream source was copied or extra dependency added.

Run `TOOLKIT_VERIFY_LIVE_AI=1 node scripts/verify-profile-feedback.mjs` only against the intended HTTPS deployment. It makes two real inference requests and deletes its own account. Other guest tests must not silently enable real inference. Do not capture or publish private vendor profiles as test fixtures.

## Owner acceptance

Refresh the live capture page. Replace the older unpacked extension with the new ZIP and reload it in chrome://extensions. On Fiverr, open the site's freelancer-profile link instead of the buyer page shown in the screenshot. Capture, review/redact the source, enter the desired improvement request and transfer it. On the website, consent to Cloudflare processing and click **Get AI profile feedback**. Review/edit the draft, copy it and save explicitly. A public or competitor snapshot is not identity, skill, approval or platform-rank verification.

## Published delivery

Implementation milestone: `9a85e9b`, with both CI verify jobs, all analyses, CodeQL and Pages upload green before the delivery record. Full live backend version: `fcad63a5-fb93-4a82-9d7c-1b1107fc0ea7`. The final package includes the saved-state wording clarification and current installation instructions; loaded-extension byte parity and account cleanup were checked again. The owner review remains on PR #9; no merge performed.
