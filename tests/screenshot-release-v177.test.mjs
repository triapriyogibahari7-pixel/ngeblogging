import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const release = JSON.parse(read("public/release-v177.json"));
const serviceWorker = read("public/sw.js");
const worker = read("cloudflare/worker-v69.mjs");
const netlify = read("scripts/write-netlify-redirects.mjs");
const audit = read("public/studio-screenshot-audit-v177.html");
const pkg = JSON.parse(read("package.json"));

const viewports = [
  "320x568", "360x640", "375x667", "390x844", "412x915", "430x932",
  "600x960", "768x1024", "820x1180", "1024x768", "1280x720", "1366x768",
  "1440x900", "1920x1080",
];

test("release v177 describes fixes without claiming untested authentication scale", () => {
  assert.equal(release.status, "ok");
  assert.equal(release.release, "screenshot-interaction-v177-20260731");
  assert.deepEqual(release.responsiveFamilies, ["application", "phone", "mobile", "compact", "tablet", "desktop"]);
  assert.deepEqual(release.desktopVariants, ["laptop", "computer"]);
  for (const key of [
    "drawerBackdropExcludesMenu", "drawerItemsClickable", "drawerMenuStartsBelowCreatePost",
    "mobileLogoSingleCenteredGlyph", "mobileTopbarReduced", "profileBounded",
    "mediaTextInflationBlocked", "naraLauncherCentered", "naraLauncherNoExternalText",
    "naraOpensSmall", "naraSmallMediumNonmodal", "naraFullscreenModalOnly",
    "naraCloseVisible", "naraCloseStopsMicrophoneAndSpeech", "authSessionPersistenceProtected",
  ]) assert.equal(release[key], true, `${key} harus aktif`);
  assert.equal(release.capacityClaim, "model-only-not-production-proof");
  assert.equal(release.googleLoginObservedInProductionLogs, false);
  assert.equal(release.linkedinLoginProven, false);
  assert.equal(release.emailPasswordLoginProven, false);
});

test("visual audit exposes all requested viewport simulations and honest device warning", () => {
  for (const viewport of viewports) {
    const [width, height] = viewport.split("x");
    assert.ok(audit.includes(`[${width},${height},`) || audit.includes(`${width} × ${height}`), `viewport hilang: ${viewport}`);
    assert.ok(release.viewports.includes(viewport), `probe viewport hilang: ${viewport}`);
  }
  for (const mode of ["Aplikasi", "Handphone", "Mobile", "Perangkat kecil", "Tablet", "Desktop", "Laptop", "Komputer"]) {
    assert.ok(audit.includes(mode), `label audit hilang: ${mode}`);
  }
  assert.match(audit, /tidak menggantikan pengujian Chrome Android, Safari iPhone, PWA dan perangkat fisik/);
  assert.match(audit, /\/studio\?viewport_audit=v177/);
});

test("PWA rotates to v177 while preserving v176 and authentication exclusions", () => {
  for (const marker of [
    "ngeblogging-app-v177-screenshot-interaction-20260731",
    "screenshot-interaction-cache-v177",
    "screenshot-interaction-v177",
    "ngeblogging-app-v176-mobile-stability-20260731",
    "mobile-stability-cache-v176",
    "mobile-stability-v176",
  ]) assert.ok(serviceWorker.includes(marker), `service worker marker hilang: ${marker}`);
  for (const authRoute of [
    'url.pathname === "/login"', 'url.pathname === "/signup"',
    'url.pathname === "/signin"', 'url.pathname.startsWith("/auth/")',
    'url.searchParams.has("code")', 'url.searchParams.has("error")',
  ]) assert.ok(serviceWorker.includes(authRoute), `perlindungan auth hilang: ${authRoute}`);
});

test("Cloudflare and Netlify publish release-v177 with no-store markers", () => {
  assert.match(worker, /SCREENSHOT_INTERACTION_RELEASE/);
  assert.match(worker, /"\/release-v177\.json"/);
  assert.match(worker, /x-ngeblogging-screenshot-interaction/);
  assert.match(worker, /ngeblogging-screenshot-interaction-v177/);
  assert.match(netlify, /SCREENSHOT_INTERACTION_RELEASE/);
  assert.match(netlify, /\/release-v177\.json/);
  assert.match(netlify, /X-Ngeblogging-Screenshot-Interaction/);
  assert.match(netlify, /ngeblogging-screenshot-interaction-v177/);
});

test("pipeline applies v177 after both v176 authorities and runs release tests", () => {
  for (const script of [pkg.scripts.predev, pkg.scripts.test, pkg.scripts["test:production"]]) {
    assert.ok(script.includes("run-patch-screenshot-v177.mjs"), "patch v177 belum masuk pipeline");
    assert.ok(script.indexOf("run-patch-mobile-stability-v176.mjs") < script.indexOf("run-patch-screenshot-v177.mjs"));
    assert.ok(script.indexOf("patch-studio-mobile-v176.mjs") < script.indexOf("run-patch-screenshot-v177.mjs"));
  }
  assert.ok(pkg.scripts["test:production"].includes("screenshot-interaction-v177.test.mjs"));
  assert.ok(pkg.scripts["test:production"].includes("screenshot-release-v177.test.mjs"));
});
