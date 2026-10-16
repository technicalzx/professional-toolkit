// Browser acceptance against an already running application. Uses synthetic data only.
import { createRequire } from "node:module";
import { readFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.TOOLKIT_PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.TOOLKIT_PREVIEW_URL || "http://127.0.0.1:8791";
const output = process.env.TOOLKIT_BROWSER_OUTPUT;
if (output) await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.TOOLKIT_CHROME
    ? { executablePath: process.env.TOOLKIT_CHROME }
    : {}),
});
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.getByRole("heading", { name: /One workspace/ }).waitFor();
  if (output)
    await page.screenshot({
      path: path.join(output, "projects-overview.png"),
      fullPage: true,
    });
  await page.getByRole("button", { name: "New project", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Project name").fill("Synthetic client portal");
  const initialBrief =
    "Build an accessible onboarding page\nDocument recovery and error cases";
  await dialog
    .getByLabel("Brief · one deliverable per line")
    .fill(initialBrief);
  await dialog
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Synthetic client portal", exact: true })
    .waitFor();
  assert.equal(
    await page.getByLabel("Requirement 1 title", { exact: true }).inputValue(),
    "Build an accessible onboarding page",
  );
  await page
    .getByLabel("Requirement 1 status", { exact: true })
    .selectOption("accepted");
  await page
    .getByRole("alert")
    .filter({ hasText: "Add an evidence note" })
    .waitFor();
  assert.equal(
    await page.getByLabel("Requirement 1 status", { exact: true }).inputValue(),
    "proposed",
  );
  await page
    .getByLabel("Requirement 1 acceptance check", { exact: true })
    .fill(
      "Keyboard-only onboarding succeeds; missing fields show actionable errors.",
    );
  await page
    .getByLabel("Requirement 1 evidence", { exact: true })
    .fill(
      "Synthetic test run: keyboard path and required-field checks passed. Artifact: demo/onboarding.html",
    );
  await page
    .getByLabel("Requirement 1 status", { exact: true })
    .selectOption("accepted");
  await page
    .getByRole("button", { name: "Delivery board", exact: true })
    .click();
  await page
    .getByLabel("d1 delivery status", { exact: true })
    .selectOption("done");
  await page
    .getByRole("alert")
    .filter({ hasText: "Add delivery evidence" })
    .waitFor();
  assert.equal(
    await page.getByLabel("d1 delivery status", { exact: true }).inputValue(),
    "todo",
  );
  await page
    .getByLabel("d1 delivery evidence", { exact: true })
    .fill("Synthetic review: onboarding demo and test results reviewed.");
  await page
    .getByLabel("d1 delivery status", { exact: true })
    .selectOption("done");
  await page.getByLabel("t1_work hours", { exact: true }).fill("5");
  await page
    .getByLabel("t1_work progress", { exact: true })
    .selectOption("done");
  await page
    .getByRole("button", { name: "Scope changes", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Record baseline", exact: true })
    .click();
  await page
    .getByLabel("Revised brief", { exact: true })
    .fill(initialBrief + "\nAdd an audit log view");
  await page
    .getByRole("button", { name: "Apply revised brief", exact: true })
    .click();
  await page
    .locator(".pw-diff-counts")
    .getByText("1", { exact: true })
    .waitFor();
  assert.match(await page.locator(".pw-impact").innerText(), /\+3 hours/);
  assert.match(
    await page.locator(".pw-panel").last().innerText(),
    /Add an audit log view/,
  );
  await page.getByRole("button", { name: "Work pack", exact: true }).click();
  const packText = await page.locator(".pw-pack-preview").innerText();
  assert.match(packText, /Synthetic client portal/);
  assert.match(packText, /demo\/onboarding/);
  assert.match(packText, /Add an audit log view/);
  const mdPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download Markdown", exact: true })
    .click();
  const md = await mdPromise;
  assert.equal(
    (await readFile(await md.path(), "utf8")).replace(/\r\n/g, "\n"),
    packText.replace(/\r\n/g, "\n"),
  );
  const jsonPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export project", exact: true })
    .click();
  const json = await jsonPromise;
  const jsonBuffer = await readFile(await json.path());
  const exported = JSON.parse(jsonBuffer);
  assert.equal(exported.project.deliverables[0].status, "done");
  assert.equal(exported.baseline.requirements.length, 2);
  assert.equal(exported.project.requirements.length, 3);
  if (output)
    await page.screenshot({
      path: path.join(output, "project-work-pack.png"),
      fullPage: true,
    });
  await page.waitForTimeout(500);
  await page.reload();
  await page.getByRole("button", { name: /Synthetic client portal/ }).click();
  await page
    .getByRole("button", { name: "Scope changes", exact: true })
    .click();
  assert.match(await page.locator(".pw-impact").innerText(), /\+3 hours/);
  await page.getByRole("button", { name: "All projects", exact: true }).click();
  page.once("dialog", (d) => d.accept());
  await page
    .getByLabel("Import project file", { exact: true })
    .setInputFiles({
      name: "synthetic-project.json",
      mimeType: "application/json",
      buffer: jsonBuffer,
    });
  await page
    .getByRole("heading", { name: "Synthetic client portal", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "All projects", exact: true }).click();
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Project name")
    .fill("Second client delivery");
  await page
    .getByRole("dialog")
    .getByLabel("Brief · one deliverable per line")
    .fill("Prepare a separate delivery package");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await page.waitForTimeout(500);
  const ids = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem("professional-toolkit-projects-v1"),
    ).projects.map((e) => e.project.id),
  );
  assert.equal(
    new Set(ids).size,
    ids.length,
    "Same-audience projects require distinct IDs",
  );
  assert.equal(ids.length, 2);
  await page.reload();
  await page.getByRole("button", { name: /Synthetic client portal/ }).click();
  assert.equal(
    await page.getByLabel("Requirement 1 status", { exact: true }).inputValue(),
    "accepted",
  );
  for (const audience of ["Students", "Professionals"]) {
    await page
      .getByRole("button", { name: "All projects", exact: true })
      .click();
    await page.locator(".pw-audience").filter({ hasText: audience }).click();
    if (
      await page
        .getByRole("button", { name: "Explore an example", exact: false })
        .count()
    )
      await page
        .getByRole("button", { name: "Explore an example", exact: false })
        .click();
    else {
      await page
        .getByRole("button", { name: "New project", exact: true })
        .click();
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      continue;
    }
    await page.getByRole("heading", { name: /Example ·/ }).waitFor();
    await page.getByRole("button", { name: "Work pack", exact: true }).click();
    const expected =
      audience === "Students"
        ? "portfolio"
        : audience === "Professionals"
          ? "handover"
          : "client";
    assert.equal(
      await page.getByLabel("Work pack format", { exact: true }).inputValue(),
      expected,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    "Project must fit narrow screens",
  );
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Profile capture" })
    .waitFor({ state: "visible" });
  if (output)
    await page.screenshot({
      path: path.join(output, "project-mobile.png"),
      fullPage: true,
    });
  await page.getByRole("button", { name: "All projects", exact: true }).click();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    "Overview must fit narrow screens",
  );
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Tools", exact: true })
    .click();
  await page.waitForURL("**/tools");
  await page
    .getByRole("heading", { name: "Pick your next step", exact: true })
    .waitFor();
  if (process.env.TOOLKIT_VERIFY_ACCOUNT === "1") {
    await page.goto(base);
    const syntheticPassword = "Synthetic acceptance " + crypto.randomUUID();
    const registered = await page.evaluate(async (password) => {
      const r = await fetch("/api/account", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "register",
          username: "qa-" + crypto.randomUUID().slice(0, 12),
          name: "Synthetic acceptance user",
          password,
        }),
      });
      return r.status;
    }, syntheticPassword);
    assert.equal(registered, 201, "Synthetic test account registration");
    await page.reload();
    await page.getByText(/Signed in as qa-/).waitFor();
    await page.getByRole("button", { name: /Synthetic client portal/ }).click();
    await page
      .getByRole("button", { name: "Save to account", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Saved to your private account" })
      .waitFor();
    const stored = await page.evaluate(async () => {
      const d = await (await fetch("/api/projects")).json();
      return {
        count: d.projects.length,
        revision: d.projects[0].revision,
        requirements: d.projects[0].project.requirements.length,
        baseline: d.projects[0].baseline.requirements.length,
      };
    });
    assert.deepEqual(stored, {
      count: 1,
      revision: 1,
      requirements: 3,
      baseline: 2,
    });
    // A confirmed local JSON replacement keeps the account revision and can be saved again.
    await page
      .getByRole("button", { name: "All projects", exact: true })
      .click();
    page.once("dialog", (d) => d.accept());
    await page
      .getByLabel("Import project file", { exact: true })
      .setInputFiles({
        name: "round-trip.json",
        mimeType: "application/json",
        buffer: jsonBuffer,
      });
    await page
      .getByRole("button", { name: "Save to account", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Saved to your private account" })
      .waitFor();
    assert.equal(
      await page.evaluate(async () => {
        const d = await (await fetch("/api/projects")).json();
        return d.projects[0].revision;
      }),
      2,
    );
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Remove from device", exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("button", { name: /Synthetic client portal/ })
        .count(),
      0,
    );
    await page
      .getByRole("button", { name: "Load account projects", exact: true })
      .click();
    await page.getByRole("button", { name: /Synthetic client portal/ }).click();
    await page
      .getByRole("button", { name: "Scope changes", exact: true })
      .click();
    assert.match(await page.locator(".pw-impact").innerText(), /\+3 hours/);
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "Delete account copy", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Account copy deleted" })
      .waitFor();
    assert.equal(
      await page.evaluate(async () => {
        const d = await (await fetch("/api/projects")).json();
        return d.projects.length;
      }),
      0,
    );
    await page
      .getByRole("heading", { name: "Synthetic client portal", exact: true })
      .waitFor();
    // Remove only this synthetic test account, which also removes its server documents.
    const removed = await page.evaluate(async (currentPassword) => {
      const r = await fetch("/api/account", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "delete", currentPassword }),
      });
      return r.status;
    }, syntheticPassword);
    assert.equal(removed, 200);
    console.log(
      "PASS: actual Worker/D1 account save, revision-preserving import, second save, device removal and cloud restore.",
    );
  }
  assert.deepEqual(errors, []);
  await context.close();
  console.log(
    "PASS: brief → evidence-gated delivery → scope impact → Markdown/JSON → reload/import; student and professional packs; mobile navigation.",
  );
} finally {
  await browser.close();
}
