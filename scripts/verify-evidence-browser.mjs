// Browser acceptance with a fresh browser context and synthetic source content only.
import { createRequire } from "node:module";
import { readFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.TOOLKIT_PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.TOOLKIT_PREVIEW_URL || "http://127.0.0.1:8791";
const origin = new URL(base).origin;
const output = process.env.TOOLKIT_BROWSER_OUTPUT;
if (output) await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.TOOLKIT_CHROME
    ? { executablePath: process.env.TOOLKIT_CHROME }
    : {}),
});
let context;
let accountPassword;
let cleanupError;
let completed = false;
try {
  context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (failure) => errors.push(failure.message));
  const title = "Synthetic evidence project";
  const sourceTitle = "Synthetic reviewed onboarding source";
  const sourceUrl = "https://example.com/synthetic-proof";
  const originalQuote =
    "Synthetic proof: keyboard onboarding was tested with the published fixture.";
  const privateMarker = "SYNTHETIC_RAW_ONLY_72481";
  const originalText = `${originalQuote}\n${privateMarker}: this unrelated synthetic paragraph is not selected as evidence and must never enter the Markdown work pack.\nThe public demonstration contains setup instructions and reproducible validation steps.`;
  const newQuote =
    "Updated proof: recovery validation completed in an isolated fixture.";
  const redactedText = `${newQuote}\nThis edited snapshot records only the reviewed recovery demonstration and its documented validation procedure. It contains no previous private passage.`;

  async function projectExport() {
    const downloading = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export project", exact: true })
      .click();
    const download = await downloading;
    const text = await readFile(await download.path(), "utf8");
    return { text, value: JSON.parse(text) };
  }
  async function saveAccount() {
    const saving = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/projects" &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Save to account", exact: true })
      .click();
    const saved = await saving;
    assert.ok(saved.ok(), `Synthetic project save failed (${saved.status()}).`);
    await page
      .getByRole("button", { name: "Save to account", exact: true })
      .waitFor({ state: "visible" });
  }
  async function accountDocument() {
    return page.evaluate(async () => {
      const response = await fetch("/api/projects", { cache: "no-store" });
      if (!response.ok)
        throw Error(`Synthetic project listing failed (${response.status}).`);
      return response.json();
    });
  }
  function assertRedacted(text) {
    assert.equal(
      text.includes(privateMarker),
      false,
      "Private raw source marker must be removed.",
    );
    assert.equal(
      text.includes(originalQuote),
      false,
      "Old linked quotes must be removed from current and baseline records.",
    );
  }

  await page.goto(base + "/capture");
  await page.getByLabel("Source page URL", { exact: true }).fill(sourceUrl);
  await page
    .getByLabel("Page/profile title", { exact: true })
    .fill(sourceTitle);
  await page
    .getByLabel("Review and redact snapshot content (80–20,000 characters)", {
      exact: true,
    })
    .fill(originalText);
  await page
    .getByRole("button", { name: "Run local review", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Local review complete" })
    .waitFor();
  // Use the exported canonical snapshot again below to test real deduplication.
  const snapshotDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download snapshot JSON", exact: true })
    .click();
  const snapshotBytes = await readFile(await (await snapshotDownload).path());
  await page
    .getByRole("button", {
      name: "Use reviewed snapshot in a project",
      exact: true,
    })
    .click();
  await page.getByRole("heading", { name: /One workspace/ }).waitFor();
  await page.getByRole("region", { name: "Pending page evidence" }).waitFor();
  await page.getByRole("button", { name: "New project", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Project name", { exact: true }).fill(title);
  await dialog
    .getByLabel("Brief · one deliverable per line", { exact: true })
    .fill(
      "Deliver an accessible onboarding flow\nDocument recovery and setup instructions",
    );
  await dialog
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await page.getByRole("heading", { name: title, exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Add source to this project", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Sources & linked evidence", exact: true })
    .waitFor();
  assert.equal(
    await page.getByLabel("Selected source text", { exact: true }).inputValue(),
    originalText,
  );
  assert.equal(await page.locator(".pwe-source-card").count(), 1);
  await page.getByLabel("Import evidence JSON", { exact: true }).setInputFiles({
    name: "synthetic-reviewed-source.json",
    mimeType: "application/json",
    buffer: snapshotBytes,
  });
  await page
    .getByRole("status")
    .filter({ hasText: "already in the project" })
    .waitFor();
  assert.equal(await page.locator(".pwe-source-card").count(), 1);
  await page
    .getByLabel("Source excerpt", { exact: true })
    .fill("This invented excerpt does not occur in the snapshot.");
  assert.equal(
    await page
      .getByRole("button", { name: "Link excerpt", exact: true })
      .isDisabled(),
    true,
  );
  for (const target of ["requirement:r1", "deliverable:d1"]) {
    await page
      .getByLabel("Source excerpt", { exact: true })
      .fill(originalQuote);
    await page
      .getByLabel("Evidence target", { exact: true })
      .selectOption(target);
    await page
      .getByRole("button", { name: "Link excerpt", exact: true })
      .click();
  }
  assert.equal(await page.locator(".pwe-links blockquote").count(), 2);
  await page
    .getByRole("button", { name: "Scope changes", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Record baseline", exact: true })
    .click();

  if (process.env.TOOLKIT_VERIFY_ACCOUNT === "1") {
    const password = "Synthetic evidence acceptance " + crypto.randomUUID();
    const registered = await context.request.post(origin + "/api/account", {
      headers: { origin },
      data: {
        action: "register",
        username: "qa-" + crypto.randomUUID().slice(0, 12),
        name: "Synthetic evidence acceptance",
        password,
      },
    });
    assert.equal(
      registered.status(),
      201,
      "Synthetic test account registration.",
    );
    accountPassword = password;
    await page
      .getByRole("button", { name: "Refresh account", exact: true })
      .click();
    await page.getByText(/Signed in as qa-/).waitFor();
    await saveAccount();
    const initial = await accountDocument();
    assert.equal(initial.projects.length, 1);
    assert.equal(initial.projects[0].project.sources.length, 1);
    assert.equal(initial.projects[0].baseline.sources.length, 1);
  }

  await page.getByRole("button", { name: "Work pack", exact: true }).click();
  for (const format of ["client", "portfolio"]) {
    await page
      .getByLabel("Work pack format", { exact: true })
      .selectOption(format);
    const markdown = await page.locator(".pw-pack-preview").innerText();
    assert.match(markdown, /Synthetic proof: keyboard onboarding/);
    assert.match(markdown, /Source title:/);
    assert.match(markdown, /Captured:/);
    assert.equal(
      markdown.includes(privateMarker),
      false,
      "Unused raw source text must not enter a work pack.",
    );
  }
  await page
    .getByRole("button", { name: "Sources & evidence", exact: true })
    .click();
  if (output)
    await page.screenshot({
      path: path.join(output, "evidence-library.png"),
      fullPage: true,
    });
  await page.getByRole("button", { name: "Edit source", exact: true }).click();
  await page
    .getByLabel("Revised source text", { exact: true })
    .fill(redactedText);
  page.once("dialog", (confirmation) => confirmation.accept());
  await page
    .getByRole("button", { name: "Save source revision", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Source revision saved" })
    .waitFor();
  assert.equal(
    await page.getByLabel("Selected source text", { exact: true }).inputValue(),
    redactedText,
  );
  assert.match(
    await page.locator(".pwe-source-choice").innerText(),
    /Revision 2/,
  );
  assert.equal(await page.locator(".pwe-links blockquote").count(), 0);
  assert.equal(
    await page
      .locator(".pwe-badge")
      .filter({ hasText: /Source revised/ })
      .count(),
    2,
  );
  const redactedExport = await projectExport();
  assertRedacted(redactedExport.text);
  assert.equal(redactedExport.value.project.sources[0].revision, 2);
  assert.equal(redactedExport.value.baseline.sources[0].revision, 2);
  if (accountPassword) {
    await saveAccount();
    assertRedacted(JSON.stringify(await accountDocument()));
  }
  await page.getByLabel("Source excerpt", { exact: true }).fill(newQuote);
  await page
    .getByLabel("Evidence target", { exact: true })
    .selectOption("requirement:r1");
  await page.getByRole("button", { name: "Link excerpt", exact: true }).click();
  assert.equal(await page.locator(".pwe-links blockquote").count(), 1);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    "Evidence panel must fit a narrow viewport.",
  );
  await page.getByLabel("Source excerpt", { exact: true }).focus();
  await page.keyboard.press("Tab");
  assert.equal(
    await page
      .getByLabel("Evidence target", { exact: true })
      .evaluate((element) => element === document.activeElement),
    true,
    "Excerpt input must reach its target with the keyboard.",
  );
  if (output)
    await page.screenshot({
      path: path.join(output, "evidence-mobile.png"),
      fullPage: true,
    });
  // A failed durable write must not claim that source content has been removed.
  await page.evaluate(() => {
    window.__toolkitOriginalStorageWrite = Storage.prototype.setItem;
    Storage.prototype.setItem = function (...args) {
      if (this === localStorage)
        throw Error("Synthetic evidence storage failure");
      return window.__toolkitOriginalStorageWrite.apply(this, args);
    };
  });
  try {
    page.once("dialog", (confirmation) => confirmation.accept());
    await page
      .getByRole("button", {
        name: "Remove source " + sourceTitle,
        exact: true,
      })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Synthetic evidence storage failure" })
      .first()
      .waitFor();
    assert.equal(await page.locator(".pwe-source-card").count(), 1);
    assert.equal(
      await page
        .getByLabel("Selected source text", { exact: true })
        .inputValue(),
      redactedText,
    );
    assert.equal(
      await page
        .getByRole("status")
        .filter({ hasText: "Source content removed" })
        .count(),
      0,
    );
  } finally {
    await page.evaluate(() => {
      Storage.prototype.setItem = window.__toolkitOriginalStorageWrite;
      delete window.__toolkitOriginalStorageWrite;
    });
  }
  page.once("dialog", (confirmation) => confirmation.accept());
  await page
    .getByRole("button", { name: "Remove source " + sourceTitle, exact: true })
    .click();
  await page
    .getByRole("heading", {
      name: "No source snapshots attached yet",
      exact: true,
    })
    .waitFor();
  assert.equal(
    await page
      .locator(".pwe-badge")
      .filter({ hasText: "Source removed" })
      .count(),
    3,
  );
  const removedExport = await projectExport();
  assertRedacted(removedExport.text);
  assert.deepEqual(removedExport.value.project.sources, []);
  assert.deepEqual(removedExport.value.baseline.sources, []);
  assert.equal(removedExport.text.includes(newQuote), false);
  if (accountPassword) {
    await saveAccount();
    const saved = await accountDocument();
    const text = JSON.stringify(saved);
    assertRedacted(text);
    assert.equal(text.includes(newQuote), false);
    assert.deepEqual(saved.projects[0].project.sources, []);
    assert.deepEqual(saved.projects[0].baseline.sources, []);
  }
  await page.waitForTimeout(500);
  await page.reload();
  await page.getByRole("button", { name: new RegExp(title) }).click();
  await page
    .getByRole("button", { name: "Sources & evidence", exact: true })
    .click();
  await page
    .getByRole("heading", {
      name: "No source snapshots attached yet",
      exact: true,
    })
    .waitFor();
  const persisted = await page.evaluate(
    () => localStorage.getItem("professional-toolkit-projects-v1") || "",
  );
  assertRedacted(persisted);
  assert.equal(persisted.includes(newQuote), false);
  assert.deepEqual(errors, []);
  // An independent tab/context proves that idle expiration removes both stored and displayed draft text.
  const expiryContext = await browser.newContext();
  try {
    const expiryPage = await expiryContext.newPage();
    await expiryPage.clock.install();
    await expiryPage.goto(base + "/capture");
    await expiryPage
      .getByLabel("Source page URL", { exact: true })
      .fill("https://example.com/synthetic-expiring-proof");
    await expiryPage
      .getByLabel("Page/profile title", { exact: true })
      .fill("Synthetic expiring source");
    await expiryPage
      .getByLabel("Review and redact snapshot content (80–20,000 characters)", {
        exact: true,
      })
      .fill(
        "Synthetic expiring source contains only an isolated demonstration of a reviewed evidence transfer. This text must disappear when the fifteen-minute transfer deadline passes.",
      );
    await expiryPage
      .getByRole("button", {
        name: "Use reviewed snapshot in a project",
        exact: true,
      })
      .click();
    await expiryPage
      .getByRole("region", { name: "Pending page evidence" })
      .waitFor();
    await expiryPage.clock.fastForward(15 * 60 * 1000 + 1000);
    await expiryPage
      .getByRole("region", { name: "Pending page evidence" })
      .waitFor({ state: "hidden" });
    assert.equal(
      await expiryPage.evaluate(() =>
        sessionStorage.getItem("professional-toolkit-evidence-draft-v1"),
      ),
      null,
    );
    assert.equal(
      await expiryPage
        .getByRole("heading", {
          name: "Synthetic expiring source",
          exact: true,
        })
        .count(),
      0,
    );
  } finally {
    await expiryContext.close();
  }
  completed = true;
} finally {
  if (accountPassword && context) {
    try {
      // Chromium treats loopback as trustworthy; APIRequestContext does not send
      // its Secure session cookie over HTTP. Use the authenticated browser page.
      const cleanupPage =
        context.pages().find((page) => page.url().startsWith(origin + "/")) ||
        (await context.newPage());
      if (!cleanupPage.url().startsWith(origin + "/"))
        await cleanupPage.goto(base);
      const removed = await cleanupPage.evaluate(async (currentPassword) => {
        const response = await fetch("/api/account", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "delete", currentPassword }),
        });
        return response.status;
      }, accountPassword);
      assert.equal(removed, 200, "Synthetic evidence account cleanup.");
    } catch (failure) {
      cleanupError = failure;
    }
  }
  if (context) await context.close();
  await browser.close();
  if (cleanupError) throw cleanupError;
}
if (completed)
  console.log(
    "PASS: capture → project evidence → grounded exports → revision/removal privacy → storage failure, transfer expiry, reload and mobile keyboard flow" +
      (accountPassword ? "; isolated account round trip and cleanup." : "."),
  );
