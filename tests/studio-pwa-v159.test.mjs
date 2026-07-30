import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const serviceWorker = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
const release = JSON.parse(readFileSync(new URL("../public/release-v159.json", import.meta.url), "utf8"));

test("PWA v161 rotates stale shells while preserving v159, auth and editor compatibility", () => {
  for (const marker of [
    "ngeblogging-app-v161-content-workflow-20260730",
    "content-workflow-cache-v161",
    "studio-content-workflow-v161-20260730",
    "service-worker-stale-shell-v161",
    "service-worker-activated-content-workflow-v161",
    "ngeblogging-app-v159-studio-ui-contract-20260730",
    "studio-ui-contract-cache-v159",
    "studio-ui-contract-v159-20260730",
    "ngeblogging-app-v154-production-entry-20260730",
    "production-entry-cache-v154",
    "service-worker-activated-production-entry-v154",
    "ngeblogging-app-v153-auth-production-20260730",
    "auth-production-cache-v153",
    "service-worker-activated-auth-production-v153",
    "ngeblogging-app-v151-studio-completion-20260729",
    "studio-completion-cache-v151",
    "auth-entry-v154-20260730",
  ]) assert.ok(serviceWorker.includes(marker), `service worker missing ${marker}`);

  for (const route of ["/", "/studio", "/login", "/signup", "/signin", "/auth/"]) {
    assert.ok(serviceWorker.includes(route), `PWA route missing ${route}`);
  }
  for (const mode of ["callback", "recovery", "session-expired", "callback-error"]) {
    assert.ok(serviceWorker.includes(mode), `PWA auth mode missing ${mode}`);
  }
});

test("static v159 probe remains available as a compatibility contract", () => {
  assert.equal(release.status, "ok");
  assert.equal(release.release, "2026.07.30-studio-ui-contract-v159");
  assert.equal(release.uiContract, "studio-ui-contract-v159-20260730");
  assert.deepEqual(release.responsiveFamilies, ["application", "phone", "mobile", "compact", "tablet", "desktop"]);
  assert.deepEqual(release.desktopVariants, ["laptop", "computer"]);
  for (const key of [
    "sidebarComplete", "profileDropdown", "firstSiteOnboarding", "analyticsRestored",
    "themeStudio", "naraNonmodalSmallMedium",
  ]) assert.equal(release[key], true, `${key} must be enabled`);
  assert.equal(release.legacyWhiteR4, false);
});
