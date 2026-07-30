import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const release = JSON.parse(read("public/release-v161.json"));
const serviceWorker = read("public/sw.js");
const worker = read("cloudflare/worker-v69.mjs");
const netlify = read("scripts/write-netlify-redirects.mjs");
const packageJson = JSON.parse(read("package.json"));

test("static v161 probe describes real content workflow behavior", () => {
  assert.equal(release.status, "ok");
  assert.equal(release.release, "2026.07.30-studio-content-workflow-v161");
  assert.equal(release.productionAuthority, "2026.07.30-production-authority-v160");
  assert.equal(release.contentWorkflow, "studio-content-workflow-v161-20260730");
  for (const key of [
    "summaryRealCounts", "summaryUnavailableUsesDash", "postCategoryFilter", "postAuthorFilter",
    "postSorting", "previewPublishedOnly", "duplicateCreatesDraft", "pagesUseSameWorkflow",
  ]) assert.equal(release[key], true, `${key} must be enabled`);
  assert.deepEqual(release.postStatusFilters, ["draft", "review", "scheduled", "published", "archived"]);
  assert.equal(release.wordLimitCompatibility, 5000);
  assert.equal(release.legacyWhiteR4, false);
});

test("Service Worker v161 uses a new cache and never reloads authentication surfaces", () => {
  for (const marker of [
    "ngeblogging-app-v161-content-workflow-20260730",
    "content-workflow-cache-v161",
    "studio-content-workflow-v161-20260730",
    "content-workflow-v161",
    "service-worker-stale-shell-v161",
    "service-worker-activated-content-workflow-v161",
    "caches.delete",
    "includeUncontrolled: true",
    "cache: \"reload\"",
    "cache: \"no-store\"",
  ]) assert.ok(serviceWorker.includes(marker), `service worker missing ${marker}`);
  for (const route of ["/login", "/signup", "/signin", "/auth/"]) assert.ok(serviceWorker.includes(route));
  for (const mode of ["callback", "recovery", "session-expired", "callback-error"]) assert.ok(serviceWorker.includes(mode));
});

test("Cloudflare and Netlify expose the v161 release path, meta marker and header", () => {
  for (const source of [worker, netlify]) {
    for (const marker of [
      "2026.07.30-studio-content-workflow-v161",
      "/release-v161.json",
      "ngeblogging-studio-content-v161",
      "legacyWhiteR4: false",
    ]) assert.ok(source.includes(marker), `publisher missing ${marker}`);
  }
  assert.ok(worker.includes("x-ngeblogging-content-workflow"));
  assert.ok(netlify.includes("X-Ngeblogging-Content-Workflow"));
});

test("build always patches and validates the v161 React integration", () => {
  assert.equal(packageJson.scripts.predev, "node scripts/patch-studio-content-v161.mjs");
  assert.ok(packageJson.scripts.test.startsWith("node scripts/patch-studio-content-v161.mjs"));
  assert.ok(packageJson.scripts["test:production"].startsWith("node scripts/patch-studio-content-v161.mjs"));
  assert.ok(packageJson.scripts["test:production"].includes("tests/studio-content-v161.test.mjs"));
  assert.ok(packageJson.scripts["test:production"].includes("tests/studio-content-release-v161.test.mjs"));
});
