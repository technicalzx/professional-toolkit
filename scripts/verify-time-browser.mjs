// Synthetic browser acceptance for the mapped CSV time-log workflow.
import {createRequire} from 'node:module';
import {readFile, mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
const require = createRequire(import.meta.url);
const {chromium} = require(process.env.TOOLKIT_PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TOOLKIT_PREVIEW_URL || 'http://127.0.0.1:8791';
const origin = new URL(base).origin;
const output = process.env.TOOLKIT_BROWSER_OUTPUT;
if (output) await mkdir(output, {recursive: true});
const browser = await chromium.launch({headless: true, ...(process.env.TOOLKIT_CHROME ? {executablePath: process.env.TOOLKIT_CHROME} : {})});
let context;
let page;
let accountPassword;
let cleanupError;
let completed = false;
try {
  context = await browser.newContext({viewport: {width: 1440, height: 1000}, acceptDownloads: true});
  page = await context.newPage();
  const errors = [];
  page.on('pageerror', failure => errors.push(failure.message));
  const title = 'Synthetic time comparison';
  const brief = 'Deliver accessible onboarding\nDocument recovery and setup';
  const initialCsv = 'task,date,duration,id,note\nDiscovery,2026-10-17,1.5,clock-001,"=SUM(1,2)"\nReview,2026-10-17,0.5,clock-002,Reviewed validation';
  const noIdCsv = 'task,date,duration,id,note\nDiscovery,2026-10-18,15,,No external ID sample';
  const ledger = () => page.evaluate(projectTitle => {
    const stored = JSON.parse(localStorage.getItem('professional-toolkit-projects-v1') || '{"projects":[]}');
    return stored.projects.find(entry => entry.project.title === projectTitle)?.project;
  }, title);
  const count = async label => Number(await page.locator('.pwt-counts > div').filter({has: page.getByText(label, {exact: true})}).locator('dd').innerText());
  async function csvInput(csv, unit = 'hours', fromFile = false) {
    if (fromFile) await page.getByLabel('Time CSV file', {exact: true}).setInputFiles({name: 'synthetic-time.csv', mimeType: 'text/csv', buffer: Buffer.from(csv)});
    else { await page.getByRole('textbox', {name: 'Paste time CSV', exact: true}).fill(csv); await page.getByRole('button', {name: 'Read CSV columns', exact: true}).click(); }
    await page.getByRole('textbox', {name: 'Time source label', exact: true}).fill('synthetic-provider-account');
    for (const [label, column] of [['CSV task column', 'task'], ['CSV date column', 'date'], ['CSV duration column', 'duration'], ['CSV external ID column', 'id'], ['CSV note column', 'note']]) await page.getByRole('combobox', {name: label, exact: true}).selectOption(column);
    await page.getByRole('combobox', {name: 'Duration unit', exact: true}).selectOption(unit);
    if (await page.getByRole('combobox', {name: 'Map CSV task Discovery', exact: true}).count()) await page.getByRole('combobox', {name: 'Map CSV task Discovery', exact: true}).selectOption('t1_work');
    if (await page.getByRole('combobox', {name: 'Map CSV task Review', exact: true}).count()) await page.getByRole('combobox', {name: 'Map CSV task Review', exact: true}).selectOption('t1_check');
    await page.getByRole('button', {name: 'Preview time import', exact: true}).click();
    await page.getByRole('heading', {name: 'Review time import', exact: true}).waitFor();
  }
  async function apply() { await page.getByRole('button', {name: 'Import reviewed time', exact: true}).click(); await page.getByRole('status').filter({hasText: 'time entries added'}).waitFor(); }
  async function saveAccount() {
    const saving = page.waitForResponse(response => new URL(response.url()).pathname === '/api/projects' && response.request().method() === 'POST');
    await page.getByRole('button', {name: 'Save to account', exact: true}).click(); assert.ok((await saving).ok());
  }
  await page.goto(base);
  await page.getByRole('heading', {name: /One workspace/}).waitFor();
  await page.getByRole('button', {name: 'New project', exact: true}).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Project name', {exact: true}).fill(title);
  await dialog.getByLabel('Brief · one deliverable per line', {exact: true}).fill(brief);
  await dialog.getByRole('button', {name: 'Create project', exact: true}).click();
  await page.getByRole('heading', {name: title, exact: true}).waitFor();
  await page.getByRole('button', {name: 'Time & actuals', exact: true}).click();
  assert.equal(await page.getByRole('cell', {name: 'Unknown (no logs)', exact: true}).count(), 4, 'Tasks without time records must not report fabricated actual variance.');
  await csvInput(initialCsv, 'hours', true);
  assert.equal(await count('Ready'), 2);
  assert.equal((await ledger()).timeEntries.length, 0, 'Preview must not mutate saved records.');
  await apply();
  let project = await ledger();
  assert.equal(project.timeEntries.length, 2);
  assert.equal(project.timeEntries.reduce((sum, entry) => sum + entry.durationSeconds, 0), 7200);
  assert.equal(project.tasks.every(task => task.status === 'todo'), true, 'Import cannot complete tasks.');
  await page.getByRole('button', {name: 'Preview time import', exact: true}).click();
  assert.equal(await count('Exact duplicates'), 2);
  await apply(); assert.equal((await ledger()).timeEntries.length, 2);

  await csvInput('task,date,duration,id,note\nDiscovery,2026-02-30,-5,bad-date,Invalid row');
  assert.equal(await count('Invalid rows'), 1);
  assert.equal(await page.getByRole('button', {name: 'Import reviewed time', exact: true}).isDisabled(), true);
  await csvInput('task,date,duration,id,note\nDiscovery,2026-10-17,2.5,clock-001,Changed existing ID');
  assert.equal(await count('ID conflicts'), 1);
  assert.equal(await page.getByRole('button', {name: 'Import reviewed time', exact: true}).isDisabled(), true);
  assert.equal((await ledger()).timeEntries.length, 2);

  await csvInput('task,date,duration,id,note\nDiscovery,2026-10-18,0.25,clock-003,New verified source row');
  await page.evaluate(() => {
    window.__toolkitOriginalTimeStorageWrite = Storage.prototype.setItem;
    Storage.prototype.setItem = function (...args) { if (this === localStorage) throw Error('Synthetic time storage failure'); return window.__toolkitOriginalTimeStorageWrite.apply(this, args); };
  });
  try {
    await page.getByRole('button', {name: 'Import reviewed time', exact: true}).click();
    await page.getByRole('alert').filter({hasText: 'Synthetic time storage failure'}).first().waitFor();
    assert.equal((await ledger()).timeEntries.length, 2);
    await page.getByRole('heading', {name: 'Review time import', exact: true}).waitFor();
    assert.equal(await page.getByRole('status').filter({hasText: 'time entries added'}).count(), 0);
  } finally { await page.evaluate(() => { Storage.prototype.setItem = window.__toolkitOriginalTimeStorageWrite; delete window.__toolkitOriginalTimeStorageWrite; }); }
  await apply(); assert.equal((await ledger()).timeEntries.length, 3);
  await csvInput(noIdCsv, 'minutes'); assert.equal(await count('Ready'), 1); await apply();
  assert.equal((await ledger()).timeEntries.length, 4);
  await page.getByRole('button', {name: 'Preview time import', exact: true}).click();
  assert.equal(await count('Possible duplicates'), 1);
  assert.equal(await page.getByLabel('Include possible duplicates without external IDs after reviewing their source records', {exact: true}).isChecked(), false);
  await apply(); assert.equal((await ledger()).timeEntries.length, 4);
  await page.getByRole('button', {name: 'Preview time import', exact: true}).click();
  await page.getByLabel('Include possible duplicates without external IDs after reviewing their source records', {exact: true}).check();
  await apply(); assert.equal((await ledger()).timeEntries.length, 5);
  if (output) await page.screenshot({path: path.join(output, 'time-actuals.png'), fullPage: true});

  const csvDownload = page.waitForEvent('download'); await page.getByRole('button', {name: 'Download time CSV', exact: true}).click();
  const csvText = await readFile(await (await csvDownload).path(), 'utf8');
  assert.match(csvText, /"duration"/); assert.match(csvText, /'=SUM/); assert.equal(/(?:^|,)"?=SUM/m.test(csvText), false);
  await page.getByRole('button', {name: 'Scope changes', exact: true}).click();
  await page.getByRole('button', {name: 'Record baseline', exact: true}).click();
  await page.getByRole('button', {name: 'Work pack', exact: true}).click();
  const pack = await page.locator('.pw-pack-preview').innerText();
  assert.match(pack, /recorded|logged/i); assert.match(pack, /2026/); assert.match(pack, /User-supplied time source:/);
  const exporting = page.waitForEvent('download'); await page.getByRole('button', {name: 'Export project', exact: true}).click();
  const json = JSON.parse(await readFile(await (await exporting).path(), 'utf8'));
  assert.equal(json.project.timeEntries.length, 5);
  assert.equal((json.baseline.timeEntries || []).length, 0, 'Scope baseline must not archive private time records.');
  if (process.env.TOOLKIT_VERIFY_ACCOUNT === '1') {
    const password = 'Synthetic time acceptance ' + crypto.randomUUID();
    const created = await context.request.post(origin + '/api/account', {headers: {origin}, data: {action: 'register', username: 'qa-' + crypto.randomUUID().slice(0, 12), name: 'Synthetic time acceptance', password}});
    assert.equal(created.status(), 201); accountPassword = password;
    await page.getByRole('button', {name: 'Refresh account', exact: true}).click(); await page.getByText(/Signed in as qa-/).waitFor();
    await saveAccount();
    const stored = await page.evaluate(async () => (await (await fetch('/api/projects')).json()).projects[0]);
    assert.equal(stored.project.timeEntries.length, 5); assert.equal((stored.baseline.timeEntries || []).length, 0);
  }
  await page.waitForTimeout(500); await page.reload(); await page.getByRole('button', {name: new RegExp(title)}).click();
  await page.getByRole('button', {name: 'Time & actuals', exact: true}).click();
  assert.equal((await ledger()).timeEntries.length, 5);
  await page.setViewportSize({width: 390, height: 844});
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Time panel must fit a narrow screen.');
  await page.getByRole('textbox', {name: 'Paste time CSV', exact: true}).fill('task,date,duration,id,note\nDiscovery,2026-10-18,1:15:30,hms-001,Clock format');
  await page.getByRole('textbox', {name: 'Paste time CSV', exact: true}).focus(); await page.keyboard.press('Tab');
  assert.equal(await page.getByRole('button', {name: 'Read CSV columns', exact: true}).evaluate(element => element === document.activeElement), true);
  await csvInput('task,date,duration,id,note\nDiscovery,2026-10-18,1:15:30,hms-001,Clock format', 'hms');
  assert.equal(await count('Ready'), 1); await apply();
  assert.equal((await ledger()).timeEntries.find(entry => entry.externalId === 'hms-001').durationSeconds, 4530);
  if (output) await page.screenshot({path: path.join(output, 'time-mobile.png'), fullPage: true});
  await page.getByRole('button', {name: 'Scope changes', exact: true}).click();
  await page.getByLabel('Revised brief', {exact: true}).fill('Document recovery and setup');
  await page.getByRole('button', {name: 'Apply revised brief', exact: true}).click();
  await page.getByRole('button', {name: 'Time & actuals', exact: true}).click();
  assert.equal((await ledger()).timeEntries.length, 6, 'Scope removal must retain recorded activity.');
  await page.getByText(/refer to tasks no longer in the current scope/).waitFor();
  page.once('dialog', confirmation => confirmation.accept()); await page.getByRole('button', {name: 'Remove time entry 1', exact: true}).click();
  assert.equal((await ledger()).timeEntries.length, 5);
  page.once('dialog', confirmation => confirmation.accept()); await page.getByRole('button', {name: 'Clear time logs', exact: true}).click();
  assert.equal((await ledger()).timeEntries.length, 0);
  if (accountPassword) { await saveAccount(); assert.equal(await page.evaluate(async () => (await (await fetch('/api/projects')).json()).projects[0].project.timeEntries.length), 0); }
  assert.deepEqual(errors, []);
  completed = true;
} finally {
  if (accountPassword && page) try { const status = await page.evaluate(async currentPassword => { const response = await fetch('/api/account', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'delete', currentPassword})}); return response.status; }, accountPassword); assert.equal(status, 200, 'Synthetic time account cleanup must succeed before reporting PASS.'); } catch (failure) { cleanupError = failure; }
  if (context) await context.close(); await browser.close(); if (cleanupError) throw cleanupError;
}
if (completed) console.log('PASS: mapped time CSV → exact/possible duplicate and conflict checks → atomic storage → safe CSV/Markdown/JSON → reload, orphan retention, deletion and mobile keyboard flow.');
