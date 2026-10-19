// Real browser regression using only an isolated loopback backend and synthetic data.
// The AI endpoint is intercepted below; this script never requests model inference.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir, readFile} from 'node:fs/promises';
import {join} from 'node:path';

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.TOOLKIT_PLAYWRIGHT_MODULE || 'playwright');
const configured = process.env.TOOLKIT_PREVIEW_URL;
if (!configured) throw Error('Set TOOLKIT_PREVIEW_URL to a fresh isolated local backend.');
const target = new URL(configured);
if (target.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname)) {
  throw Error('Draft recovery verification is restricted to an isolated loopback backend. No live inference or account data is used.');
}
const base = target.origin;
const output = process.env.TOOLKIT_BROWSER_OUTPUT;
if (output) await mkdir(output, {recursive: true});
const fixturePassword = 'synthetic capture recovery passphrase 2026';
const fixtureSource = {
  schemaVersion: 1,
  sourceUrl: 'https://example.org/synthetic-cloud-profile',
  title: 'Synthetic cloud profile recovery fixture',
  text: 'I help clients build reliable cloud systems. I delivered 12 projects with an auditable testing process. Message me for a portfolio and an engineering consultation.',
  headings: ['Synthetic cloud profile recovery fixture'],
  capturedAt: new Date().toISOString(),
  captureMethod: 'manual-snapshot',
  userEdited: false,
};
function aiFixture(source = fixtureSource, request = 'Improve this synthetic cloud profile using only the captured evidence.') {
  return {
    kind: 'captured-review', mode: 'ai', source, request,
    summary: 'Synthetic browser response for recovery verification; no model was called.',
    findings: [{quote: 'I delivered 12 projects with an auditable testing process.', observation: 'The source supplies a project count.', recommendation: 'Link a truthful project example without inventing an outcome.'}],
    missingInformation: ['A supporting project artifact is not supplied.'],
    improvedDraft: 'Synthetic initial generated draft: I help clients build reliable cloud systems and explain my testing process.',
    nextSteps: ['Add an appropriate public project artifact.'],
    model: 'Synthetic intercepted browser fixture; not inference',
    createdAt: new Date().toISOString(),
  };
}
function deferred() {
  let resolve;
  const promise = new Promise(done => {resolve = done;});
  return {promise, resolve};
}
async function started(active) {
  let timer;
  try {
    await Promise.race([active.started.promise, new Promise((resolve, reject) => {timer = setTimeout(() => reject(Error('The expected intercepted review request did not start.')), 10000);})]);
  } finally {clearTimeout(timer);}
}
async function exported(page) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', {name: 'Download review JSON', exact: true}).click(),
  ]);
  return JSON.parse(await readFile(await download.path(), 'utf8'));
}
async function assertDraft(page, expected) {
  assert.equal(await page.getByLabel('Edit your improved draft').inputValue(), expected);
  const report = await exported(page);
  assert.equal(report.improvedDraft, expected, 'Downloaded review must preserve the visible edited draft.');
  assert.equal(report.draftEdited, true, 'User edits must remain distinguished from the generated draft.');
  assert.equal(report.mode, 'ai');
  return report;
}
const browser = await chromium.launch({headless: true, ...(process.env.TOOLKIT_CHROME ? {executablePath: process.env.TOOLKIT_CHROME} : {})});
const context = await browser.newContext({acceptDownloads: true});
let fixtureCreated = false, pending = null, requests = 0;
const errors = [], unexpectedRequests = [];
try {
  // Every review POST is held or fulfilled here, including unexpected retries.
  // Account and private-report operations still use the real isolated backend.
  await context.route(base + '/api/capture/review', async route => {
    assert.equal(route.request().method(), 'POST');
    requests++;
    const active = pending;
    if (!active) {
      unexpectedRequests.push('Unrequested review attempt');
      await route.fulfill({status: 503, contentType: 'application/json', body: JSON.stringify({error: 'Unexpected synthetic test request blocked.'})});
      return;
    }
    active.payload = route.request().postDataJSON();
    active.started.resolve();
    const response = await active.release.promise;
    if (response.network) await route.abort('failed');
    else await route.fulfill({status: response.status, contentType: 'application/json', body: JSON.stringify(response.body)});
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/capture');
  const username = 'recovery-' + Date.now().toString(36);
  const registration = await page.evaluate(async ({username, password}) => {
    const response = await fetch('/api/account', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'register', username, name: 'Synthetic capture recovery fixture', password})});
    return response.status;
  }, {username, password: fixturePassword});
  assert.equal(registration, 201, 'Create only this run\'s synthetic local account.');
  fixtureCreated = true;
  for (const [label, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
    await page.setViewportSize({width, height});
    await page.goto(base + '/capture');
    await page.getByText('Signed in as @' + username, {exact: false}).waitFor();
    await page.getByLabel('Import page snapshot or saved review JSON').setInputFiles({name: 'synthetic-recovery-review.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(aiFixture()))});
    const draft = page.getByLabel('Edit your improved draft');
    await draft.waitFor();
    let edited = `Synthetic ${label} user revision: I explain the testing process for my 12 completed cloud projects. Keep this unsaved sentence.`;
    await draft.fill(edited);
    const initial = await assertDraft(page, edited);
    const consent = page.getByRole('checkbox');
    await consent.check();
    for (const [caseIndex, failure] of [
      {status: 429, body: {error: 'Synthetic 429: review limit reached.'}},
      {status: 502, body: {error: 'Synthetic 502: review service unavailable.'}},
      {status: 504, body: {error: 'Synthetic 504: review timed out.'}},
      {network: true},
      {status: 200, body: {report: {...aiFixture(), findings: [{quote: 'Absent synthetic quote', observation: 'Invalid fixture response', recommendation: 'Reject this response.'}]}}},
    ].entries()) {
      const before = requests;
      const active = {started: deferred(), release: deferred()};
      pending = active;
      await page.getByRole('button', {name: 'Get AI profile feedback', exact: true}).click();
      await started(active);
      assert.equal(requests, before + 1, 'Each explicit action must issue exactly one request.');
      assert.equal(active.payload.consent, true);
      assert.equal(active.payload.prompt, initial.request);
      assert.equal(active.payload.snapshot.text, fixtureSource.text);
      assert.equal(await draft.inputValue(), edited, 'Previous edited result stays visible while a replacement is pending.');
      assert.equal(await draft.isDisabled(), true, 'The pending replacement cannot silently overwrite concurrent draft edits.');
      assert.equal(await page.getByLabel('Import page snapshot or saved review JSON').isDisabled(), true);
      assert.equal(await page.getByLabel('Your review request').isDisabled(), true);
      assert.equal(await page.getByLabel('Review and redact snapshot content (80–20,000 characters)').isDisabled(), true);
      await page.getByText('Generating replacement feedback. Your previous review and draft are kept below until a new review succeeds.', {exact: true}).waitFor();
      if (caseIndex === 0) {
        await assertDraft(page, edited); // Export remains a recovery path even while pending.
        const nonce = 'b'.repeat(32);
        const ack = await page.evaluate(async ({nonce, source}) => {
          history.replaceState(null, '', '#handoff=' + nonce);
          return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {window.removeEventListener('message', receive); reject(Error('Missing blocked-handoff acknowledgement.'));}, 5000);
            function receive(event) {
              if (event.source === window && event.origin === location.origin && event.data?.channel === 'professional-toolkit.capture.v1' && event.data.type === 'received' && event.data.nonce === nonce) {
                clearTimeout(timer); window.removeEventListener('message', receive); resolve(event.data);
              }
            }
            window.addEventListener('message', receive);
            window.postMessage({channel: 'professional-toolkit.capture.v1', type: 'capture', nonce, snapshot: {...source, title: 'Blocked synthetic handoff'}, prompt: 'Blocked synthetic handoff request'}, location.origin);
          });
        }, {nonce, source: fixtureSource});
        assert.ok(typeof ack.error === 'string' && ack.error.length > 0, 'A handoff during replacement must return a retryable error.');
        assert.equal(await page.getByLabel('Page/profile title', {exact: true}).inputValue(), fixtureSource.title);
      }
      active.release.resolve(failure);
      await page.getByRole('alert').filter({hasText: 'Your previous review and draft are unchanged.'}).waitFor();
      assert.equal(await draft.isDisabled(), false, 'Failure must unlock the retained draft.');
      assert.equal(await page.getByRole('button', {name: 'Save privately to account', exact: true}).isEnabled(), true);
      assert.equal(requests, before + 1, 'Failures must not create automatic inference retries.');
      const recovered = await assertDraft(page, edited);
      assert.deepEqual(recovered, initial, 'A failed attempt must preserve the complete report, source evidence, request and user edits.');
      pending = null;
      if (failure.status === 504 && output) await page.screenshot({path: join(output, `capture-recovery-failure-${label}.png`), fullPage: true});
    }
    // Native editing, then persistence and a fresh page restore exercise actual recovery.
    edited += ' This edit was made after the failed attempts.';
    await draft.fill(edited);
    await draft.focus();
    assert.equal(await draft.evaluate(element => document.activeElement === element), true);
    await assertDraft(page, edited);
    await page.getByRole('button', {name: 'Save privately to account', exact: true}).click();
    await page.getByRole('status').filter({hasText: 'Saved privately to your account.'}).waitFor();
    const saved = await page.evaluate(async expected => {
      const response = await fetch('/api/reports', {cache: 'no-store'});
      if (!response.ok) throw Error('Synthetic saved report lookup failed.');
      return (await response.json()).reports.find(report => report.improvedDraft === expected);
    }, edited);
    assert.ok(saved?.cloudId, 'Private persistence must contain the exact retained user draft.');
    assert.equal(saved.draftEdited, true);
    await page.goto(base + '/capture?report=' + encodeURIComponent(saved.cloudId));
    await page.getByRole('status').filter({hasText: 'Opened your saved source and review.'}).waitFor();
    await assertDraft(page, edited);
    await consent.check();
    const beforeSuccess = requests;
    const active = {started: deferred(), release: deferred()};
    pending = active;
    await page.getByRole('button', {name: 'Get AI profile feedback', exact: true}).click();
    await started(active);
    assert.equal(await draft.inputValue(), edited);
    const replacement = {...aiFixture(active.payload.snapshot, active.payload.prompt), summary: 'Synthetic successful replacement response; no inference.', improvedDraft: `Synthetic ${label} successful replacement draft.`};
    active.release.resolve({status: 200, body: {report: replacement}});
    await page.getByRole('status').filter({hasText: 'AI review complete.'}).waitFor();
    assert.equal(await draft.inputValue(), replacement.improvedDraft, 'Only a validated successful result replaces the old review.');
    assert.equal((await exported(page)).draftEdited, false);
    assert.equal(requests, beforeSuccess + 1);
    pending = null;
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Recovery UI must fit desktop and mobile viewports.');
    if (output) await page.screenshot({path: join(output, `capture-recovery-success-${label}.png`), fullPage: true});
    // Existing redaction behavior remains intentional: a changed source cannot
    // leave an older private source invisibly exportable in a stale report.
    await page.getByLabel('Review and redact snapshot content (80–20,000 characters)').fill(fixtureSource.text.replace('12 projects', 'auditable projects'));
    assert.equal(await draft.count(), 0, 'Source redaction must invalidate the old review rather than retaining hidden original text.');
    assert.equal(await page.getByRole('button', {name: 'Download review JSON', exact: true}).count(), 0);
    assert.equal(await consent.isChecked(), false, 'Changed source requires fresh AI consent.');
  }
  assert.deepEqual(unexpectedRequests, [], 'No unrequested AI attempts are allowed.');
  assert.deepEqual(errors, [], 'Recovery must not cause uncaught page errors.');
  assert.equal(requests, 12, 'Five failure cases and one success are explicit per viewport.');
} finally {
  try {
    pending?.release.resolve({status: 503, body: {error: 'Synthetic fixture cleanup.'}});
  } finally {
    try {
      if (fixtureCreated) {
        const cleanup = await context.newPage();
        await cleanup.goto(base + '/account');
        const status = await cleanup.evaluate(async password => (await fetch('/api/account', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'delete', currentPassword: password})})).status, fixturePassword);
        assert.equal(status, 200, 'Delete only this run\'s synthetic account before PASS.');
        const guest = await cleanup.evaluate(async () => (await (await fetch('/api/account', {cache: 'no-store'})).json()).user);
        assert.ok(!guest, 'The deleted synthetic account must no longer be authenticated.');
      }
    } finally {
      await context.close();
      await browser.close();
    }
  }
}
console.log('PASS: actual Chrome desktop/mobile retained edited AI drafts during 429/502/504/network/invalid-response failures, pending controls and handoff lock, JSON export, private save/reopen and successful replacement; exactly 12 intercepted requests, no inference, own synthetic account deleted.');



