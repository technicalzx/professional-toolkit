// Self-contained, local-only CI fixture for the real built Worker and Chrome UI.
// Never spread Wrangler resources or secrets into this runtime: only the built
// modules, assets and compatibility settings belong here. Review POSTs are
// intercepted by verify-capture-recovery.mjs; this Worker has no AI binding.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {readFile, readdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {isAbsolute, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const hosted = resolve(root, 'hosted-app');
const server = resolve(hosted, 'dist/server');
const client = resolve(hosted, 'dist/client');
const require = createRequire(resolve(hosted, 'package.json'));
const wranglerRequire = createRequire(require.resolve('wrangler/package.json'));
const {Miniflare, convertV4MiniflareOptions} = wranglerRequire('miniflare');
const config = JSON.parse(await readFile(resolve(server, 'wrangler.json'), 'utf8'));
// Pinned Wrangler 4.135.0 ships workerd with this newest supported date.
// This is a local regression fixture, not a production compatibility change.
// Cloudflare Preview acceptance must separately cover the generated config date.
const localRuntimeDate = '2026-09-25';
const compatibilityDate = config.compatibility_date > localRuntimeDate
  ? localRuntimeDate : config.compatibility_date;
if (compatibilityDate !== config.compatibility_date) {
  console.warn(`Local recovery fixture uses ${compatibilityDate}; generated Worker date ${config.compatibility_date} requires separate Cloudflare Preview verification.`);
}
const entry = resolve(server, config.main);
const entryRelative = relative(server, entry);
assert.ok(!isAbsolute(entryRelative) && !entryRelative.startsWith('..'), 'Built Worker entry must remain inside dist/server.');
// Miniflare 5's supported v4 adapter accepts an explicit module manifest;
// its old automatic modulesRules discovery is intentionally unsupported.
const modulePaths = (await readdir(server, {recursive: true}))
  .filter(path => /\.m?js$/.test(path))
  .map(path => resolve(server, path))
  .filter(path => path !== entry)
  .sort();
const modules = [entry, ...modulePaths].map(path => ({type: 'ESModule', path}));
const schema = await readFile(resolve(hosted, 'drizzle/0000_swift_wendigo.sql'), 'utf8');
const statements = schema.split('--> statement-breakpoint').map(sql => sql.trim()).filter(Boolean);
assert.ok(statements.length, 'The fresh local account schema must contain statements.');

const runtime = new Miniflare(convertV4MiniflareOptions({
  name: 'capture-recovery-local',
  host: '127.0.0.1',
  port: 0,
  modules,
  modulesRoot: server,
  compatibilityDate,
  compatibilityFlags: config.compatibility_flags,
  assets: {directory: client, binding: 'ASSETS', routerConfig: {has_user_worker: true}},
  d1Databases: {DB: randomUUID()},
  d1Persist: false,
  // An unexpected outbound fetch must fail locally rather than contact a provider.
  outboundService: () => new Response('External requests are disabled in the isolated recovery test.', {status: 503}),
}));
let child;
try {
  const url = await runtime.ready;
  assert.equal(url.hostname, '127.0.0.1');
  const bindings = await runtime.getBindings();
  assert.equal('AI' in bindings, false, 'The regression fixture must not bind a remote AI model.');
  const database = await runtime.getD1Database('DB');
  for (const sql of statements) await database.prepare(sql).run();
  const guest = await fetch(new URL('/api/account', url));
  assert.equal(guest.status, 200, 'The isolated full Worker must serve the real account route.');
  assert.equal((await guest.json()).user, null);

  const code = await new Promise((done, reject) => {
    child = spawn(process.execPath, [resolve(root, 'scripts/verify-capture-recovery.mjs')], {
      cwd: root,
      env: {...process.env, TOOLKIT_PREVIEW_URL: url.origin},
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (status, signal) => {
      if (signal) reject(Error(`Recovery browser check terminated with ${signal}.`));
      else done(status);
    });
  });
  assert.equal(code, 0, 'Recovery browser checks must pass.');
  for (const table of ['users', 'reports', 'sessions', 'recovery_codes']) {
    const row = await database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).first();
    assert.equal(row.count, 0, `The isolated ${table} fixture must be cleaned up.`);
  }
  console.log('PASS: complete built Worker, static assets and fresh local D1; Chrome recovery checks passed; synthetic records removed; no AI or remote bindings.');
} finally {
  if (child && child.exitCode === null && child.signalCode === null) child.kill();
  await runtime.dispose();
}
