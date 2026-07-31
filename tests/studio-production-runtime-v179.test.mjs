import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("v179 is part of development and production build chains", () => {
  const packageJson = JSON.parse(read("package.json"));
  for (const name of ["predev", "test", "test:production", "verify:v179"]) {
    const command = packageJson.scripts[name] || "";
    assert.match(command, /patch-production-studio-v179\.mjs/);
    assert.match(command, /patch-production-runtime-v179\.mjs/);
    assert.match(command, /patch-v179-compat\.mjs/);
  }
});

test("Studio entry loads the last runtime authority", () => {
  const entry = read("src/Studio.jsx");
  assert.match(entry, /studio-production-stability-v179\.js/);
  assert.match(entry, /studio-mobile-panels-v179\.js/);
  assert.match(entry, /studio-runtime-authority-v179\.js/);
  assert.ok(entry.indexOf("studio-runtime-authority-v179.js") > entry.indexOf("studio-finalization-v178.js"));
});

test("authenticated users never receive fake starter documents", () => {
  const studio = read("src/StudioNext.jsx");
  assert.match(studio, /function loadLocalDocs\(allowStarter = true\)/);
  assert.match(studio, /useState\(\(\) => loadLocalDocs\(!user\?\.id\)\)/);
  assert.match(studio, /studio-bootstrap-resilient-v179/);
  assert.match(studio, /ACTIVE_SITE_SNAPSHOT_V179/);
  assert.match(studio, /listUserSites\(user\.id\)/);
  assert.doesNotMatch(studio, /Promise\.all\(\[getOrCreatePrimarySite\(user\), listUserSites/);
});

test("transient membership failures retain the session and open degraded Studio", () => {
  const gate = read("src/StudioOnboardingGate.jsx");
  assert.match(gate, /getVerifiedSession\(\{ force: attempt > 0 \}\)/);
  assert.match(gate, /setPhase\("degraded"\)/);
  assert.match(gate, /phase === "ready" \|\| phase === "degraded"/);
  assert.match(gate, /first-site-retry-v179/);
});

test("operational panels cannot spin forever without an active site", () => {
  const domain = read("src/DomainPanelV124.jsx");
  const comments = read("src/CommentsPanelV124.jsx");
  assert.match(domain, /if \(!site\?\.id\) \{ setLoading\(false\); setError/);
  assert.match(comments, /if \(!site\?\.id \|\| !supabase\) \{ setLoading\(false\); setError/);
});

test("mobile drawer stays above a light non-blurring backdrop", () => {
  const css = read("src/studio-runtime-authority-v179.css");
  assert.match(css, /\.sn-side-backdrop[\s\S]*z-index:2090!important/);
  assert.match(css, /#ngeblogging-studio-sidebar\.mobile-open[\s\S]*z-index:2100!important/);
  assert.match(css, /background:rgba\(15,31,54,\.14\)!important/);
  assert.match(css, /backdrop-filter:none!important/);
  assert.match(css, /width:min\(78vw,320px\)!important/);
});

test("editor mobile layout is one full-width column with scrollable tools", () => {
  const css = read("src/studio-runtime-authority-v179.css");
  assert.match(css, /\.ce-workspace[\s\S]*grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(css, /\.ce-paper[\s\S]*width:100%!important/);
  assert.match(css, /\.ce-ribbon[\s\S]*overflow-x:auto!important/);
  assert.match(css, /\.ce-sidebar[\s\S]*position:static!important/);
  assert.match(css, /\.ce-titlebar[\s\S]*grid-template-columns:44px minmax\(0,1fr\) auto!important/);
});

test("Nara small and medium are non-modal and full remains modal", () => {
  const component = read("src/NaraAssistant.jsx");
  const runtime = read("src/studio-runtime-authority-v179.js");
  const css = read("src/studio-runtime-authority-v179.css");
  assert.match(component, /aria-modal=\{size === "full"\}/);
  assert.match(component, /hidden=\{size !== "full"\}/);
  assert.match(runtime, /data\.runtimeModeV179|dataset\.runtimeModeV179/);
  assert.match(css, /data-runtime-mode-v179="nonmodal"[\s\S]*pointer-events:none!important/);
  assert.match(css, /data-runtime-mode-v179="modal"[\s\S]*pointer-events:auto!important/);
});

test("service worker rotates to runtime authority cache", () => {
  const sw = read("public/sw.js");
  assert.match(sw, /ngeblogging-app-v179-runtime-authority-20260731/);
  assert.match(sw, /runtime-authority-cache-v179/);
});
