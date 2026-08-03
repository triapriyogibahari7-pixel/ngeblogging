import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-react-safe-v240.js");
const css = read("src/studio-react-safe-v240.css");
const v239 = read("src/studio-final-authority-v239.js");
const widgets = read("src/widget-system.js");
const release = JSON.parse(read("public/release-v240.json"));
const vite = read("vite.config.js");

const RELEASE = "studio-react-safe-v240-20260803";

test("v240 preguard executes before v239 while its CSS remains the final override", () => {
  const v238Index = entry.indexOf('import "./studio-desktop-sidebar-v238.js"');
  const v240Index = entry.indexOf('import "./studio-react-safe-v240.js"');
  const v239Index = entry.indexOf('import "./studio-final-authority-v239.js"');
  const v240CssIndex = entry.indexOf('import "./studio-react-safe-v240.css"');
  assert.ok(v238Index >= 0);
  assert.ok(v240Index > v238Index);
  assert.ok(v239Index > v240Index);
  assert.ok(v240CssIndex > v239Index);
  assert.match(runtime, new RegExp(RELEASE));
});

test("v240 prevents v239 from replacing React-owned layout and code nodes", () => {
  assert.match(runtime, /preemptUnsafeV239DomRewrites/);
  assert.match(runtime, /dataset\.v239LayoutMap = V239_RELEASE/);
  assert.match(runtime, /dataset\.v239CodeEditor = V239_RELEASE/);
  assert.doesNotMatch(runtime, /canvas\.innerHTML\s*=/);
  assert.doesNotMatch(runtime, /textarea\.parentNode\.insertBefore/);
  assert.doesNotMatch(runtime, /append\([^\n]*textarea/);
  assert.match(v239, /if \(canvas\.dataset\.v239LayoutMap === RELEASE\) return/);
  assert.match(v239, /if \(textarea\.dataset\.v239CodeEditor === RELEASE\) return/);
  assert.equal(release.repairs.reactLightDomPreserved, true);
  assert.equal(release.repairs.codeTextareaNeverReparented, true);
});

test("layout map lives in Shadow DOM and keeps four left plus four right real assignment slots", () => {
  assert.match(runtime, /attachShadow\(\{ mode: "open" \}\)/);
  for (const marker of ["Widget kiri 1", "Widget kiri 4", "Widget kanan 1", "Widget kanan 4", "Konten utama"]) {
    assert.ok(runtime.includes(marker), `missing layout marker ${marker}`);
  }
  assert.match(runtime, /event\.stopPropagation\(\)/);
  assert.match(runtime, /configureWidget/);
  assert.match(runtime, /dispatchEvent\(new Event\("change", \{ bubbles: true \}\)\)/);
  assert.match(runtime, /simpan widget/i);
  assert.match(widgets, /id: "custom-html"/);
  assert.equal(release.repairs.layoutWidgetCountPreserved, 26);
});

test("line numbers are a body portal derived from actual code lines up to ten thousand", () => {
  assert.match(runtime, /v240-code-gutter-portal/);
  assert.match(runtime, /split\("\\n"\)\.length/);
  assert.match(runtime, /Math\.min\(10000/);
  assert.match(css, /textarea\[data-v240-line-numbers="true"\]/);
  assert.match(css, /\.v240-code-gutter-portal/);
  assert.equal(release.repairs.lineNumbersReflectActualLines, true);
  assert.equal(release.repairs.lineNumberMaximum, 10000);
});

test("small widget popup stays bounded and real Widget Studio is hidden only during assignment", () => {
  assert.match(css, /\.v240-widget-popover/);
  assert.match(css, /max-height:calc\(100dvh - 24px\)/);
  assert.match(css, /data-v240-widget-autoconfigure="true"/);
  assert.match(runtime, /document\.querySelector\("\.tn-layout-studio-header button"\)\?\.click\(\)/);
});

test("settings bridge is bound once and reuses v239 five-action account menu", () => {
  assert.match(runtime, /v240SettingsBridgeBound/);
  assert.match(runtime, /data-v239-action="settings"/);
  assert.match(css, /data-v240-settings-bridge="running"/);
});

test("v240 service worker finalizer runs last and remains session-safe", () => {
  assert.match(vite, /finalizeServiceWorkerV237/);
  assert.match(vite, /finalizeServiceWorkerV238/);
  assert.match(vite, /finalizeServiceWorkerV239/);
  assert.match(vite, /finalizeServiceWorkerV240/);
  assert.ok(vite.indexOf("finalizeServiceWorkerV239()") < vite.indexOf("finalizeServiceWorkerV240()"));
  const sw = read("scripts/service-worker-v240-lib.mjs");
  assert.match(sw, /ngeblogging-app-v240-react-safe-20260803/);
  assert.match(sw, /studio-react-safe-cache-v240/);
  assert.match(sw, /V240_AUTH_SURFACE_GUARD_MISSING/);
  assert.doesNotMatch(runtime, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/);
});

test("release makes no unsupported auth-provider or extreme-scale claim", () => {
  assert.equal(release.claims.googleOAuthEndToEnd, false);
  assert.equal(release.claims.linkedinOAuthEndToEnd, false);
  assert.equal(release.claims.emailPasswordEndToEnd, false);
  assert.equal(release.claims.extremeScaleLoadTest, false);
});
