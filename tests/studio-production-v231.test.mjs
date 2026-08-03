import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, WIDGET_COUNT } from "../src/widget-system.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-production-v231.js");
const css = read("src/studio-production-v231.css");
const patch = read("scripts/patch-production-v231.mjs");
const chain = read("scripts/patch-service-worker-v179.mjs");
const auth = read("src/lib/supabase.js");
const nara = read("src/NaraAssistant.jsx");
const analytics = read("src/studio-analytics-v41.js");
const worker = read("public/sw.js");
const release = JSON.parse(read("public/release-v231.json"));

const viewports = [
  "320x568", "360x640", "375x667", "390x844", "412x915", "430x932",
  "600x960", "768x1024", "820x1180", "1024x768", "1280x720", "1366x768",
  "1440x900", "1920x1080",
];

test("v231 loads after v230 and is chained into the production patch run", () => {
  assert.match(entry, /studio-production-v230\.js/);
  assert.match(entry, /studio-production-v231\.js/);
  assert.ok(entry.indexOf("studio-production-v230.js") < entry.indexOf("studio-production-v231.js"));
  assert.match(chain, /patch-production-v230\.mjs/);
  assert.match(chain, /patch-production-v231\.mjs/);
  assert.ok(chain.indexOf("patch-production-v230.mjs") < chain.indexOf("patch-production-v231.mjs"));
});

test("sidebar has one n authority, tight menu stack and separate desktop/mobile behavior", () => {
  assert.match(runtime, /single-internal-n/);
  assert.match(runtime, /tight-under-create/);
  assert.match(runtime, /hideDuplicateSidebarControls/);
  assert.match(runtime, /bindInternalLogo/);
  assert.match(runtime, /v227-sidebar-fab/);
  assert.match(runtime, /sn-side-close/);
  assert.match(css, /data-v231-family="large"[\s\S]*\.sn-sidebar-toggle[\s\S]*display:none!important/);
  assert.match(css, /data-v231-family="small"[\s\S]*#ngeblogging-studio-sidebar\.sn-side[\s\S]*translateX\(-105%\)/);
  assert.match(css, /data-v231-menu-stack="tight-under-create"[\s\S]*justify-content:flex-start!important/);
  assert.doesNotMatch(css, /#ngeblogging-studio-sidebar>nav[^}]*justify-content:center!important/);
});

test("the green Theme map keeps the screenshot blueprint with four left and four right slots", () => {
  assert.match(runtime, /green-reference-interactive/);
  for (const slot of [
    "top-left-1", "top-right-1", "top-left-2", "top-right-2", "before-content",
    "sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4",
    "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4",
    "after-content", "bottom-left-1", "bottom-right-1", "bottom-left-2", "bottom-right-2",
    "bottom-left-3", "bottom-right-3",
  ]) assert.ok(css.includes(`.${slot}`), `missing final map geometry for ${slot}`);
  assert.match(css, /\.content-main\{grid-column:4\/10!important;grid-row:6\/10!important/);
  assert.match(runtime, /Klik untuk mengatur widget/);
});

test("Theme code editor uses real sequential gutters and responsive editor-preview geometry", () => {
  assert.match(runtime, /MAX_CODE_LINES = 10000/);
  assert.match(runtime, /Array\.from\(\{ length: shown \}, \(_, index\) => String\(index \+ 1\)\)\.join\("\\n"\)/);
  assert.match(runtime, /real-lines-up-to-10000/);
  assert.match(css, /code-left-preview-right/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)!important/);
  assert.match(css, /preview-top-code-bottom/);
  assert.match(css, /\.v222-code-line-gutter,.v231-code-line-gutter/);
  assert.doesNotMatch(runtime, /textContent\s*=\s*["'`]1-10000/);
});

test("100 themes and 26 real widgets including custom HTML remain intact", () => {
  assert.equal(THEME_COUNT, 100);
  assert.equal(BUILT_IN_THEMES.length, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size, 100);
  assert.equal(WIDGET_COUNT, 26);
  assert.equal(BUILT_IN_WIDGETS.length, 26);
  assert.equal(BUILT_IN_WIDGETS.at(-1)?.id, "custom-html");
});

test("Nara keeps camera photo file microphone model intelligence and stable small-medium-full geometry", () => {
  for (const marker of ["Kamera", "Foto", "File teks", "Pertanyaan suara", "Tingkat kecerdasan", "Model Nara", '"small", "medium", "full"']) {
    assert.ok(nara.includes(marker), `Nara source missing ${marker}`);
  }
  assert.match(runtime, /camera-photo-file-visible/);
  assert.match(runtime, /nonmodal/);
  assert.match(css, /nara-assistant-shell\[data-v231-nara-size="small"\]\[data-v231-nara-family="large"\]/);
  assert.match(css, /height:clamp\(460px,60dvh,620px\)!important/);
  assert.match(css, /nara-attachment-menu\[data-v231-attachment-menu\][\s\S]*bottom:calc\(100% \+ 8px\)!important/);
  assert.match(css, /nara-composer-tools[\s\S]*grid-template-columns:44px 44px minmax\(92px,1fr\) minmax\(108px,1fr\) 44px!important/);
});

test("Domain and Analytics keep real functionality while only geometry is changed", () => {
  assert.match(runtime, /responsive-actions/);
  assert.match(css, /data-v231-domain-action="true"[\s\S]*width:100%!important/);
  assert.match(analytics, /get_site_analytics_dashboard/);
  assert.match(runtime, /large-detail/);
  assert.match(css, /min-height:320px!important/);
});

test("auth session persistence remains non-destructive and v231 rotates the active service-worker cache", () => {
  assert.match(auth, /persistSession: true/);
  assert.match(auth, /autoRefreshToken: true/);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
  assert.match(patch, /ACTIVE_VERSION_V231/);
  assert.match(patch, /ACTIVE_CACHE_RELEASE_V231/);
  assert.match(worker, /ngeblogging-app-v231-sidebar-theme-nara-final-20260803/);
  assert.match(worker, /sidebar-theme-nara-final-cache-v231/);
  assert.doesNotMatch(worker, /await refreshStaleWindow\(client, url\);/);
});

test("release contract covers the requested viewport matrix without fake capacity or provider-login claims", () => {
  assert.equal(release.release, "studio-production-v231-sidebar-theme-nara-final-20260803");
  for (const viewport of viewports) assert.ok(release.validation.viewportMatrix.includes(viewport), viewport);
  assert.equal(release.preserved.themeCount, 100);
  assert.equal(release.preserved.widgetCount, 26);
  assert.equal(release.authentication.googleEndToEndVerifiedByThisRelease, false);
  assert.equal(release.authentication.linkedinEndToEndVerifiedByThisRelease, false);
  assert.equal(release.authentication.emailPasswordEndToEndVerifiedByThisRelease, false);
  assert.match(release.validation.capacity, /No 900-million-user claim/i);
});
