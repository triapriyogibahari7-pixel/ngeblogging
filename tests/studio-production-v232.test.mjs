import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, WIDGET_COUNT } from "../src/widget-system.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-production-v232.js");
const css = read("src/studio-production-v232.css");
const patch = read("scripts/patch-production-v232.mjs");
const chain = read("scripts/patch-service-worker-v179.mjs");
const next = read("src/StudioNext.jsx");
const gate = read("src/StudioOnboardingGate.jsx");
const nara = read("src/NaraAssistant.jsx");
const theme = read("src/ThemeStudio.jsx");
const widgets = read("src/widget-system.js");
const auth = read("src/lib/supabase.js");
const worker = read("public/sw.js");
const release = JSON.parse(read("public/release-v232.json"));

const viewports = [
  "320x568", "360x640", "375x667", "390x844", "412x915", "430x932",
  "600x960", "768x1024", "820x1180", "1024x768", "1280x720", "1366x768",
  "1440x900", "1920x1080",
];

test("v232 is chained after v231 and rotates the active shell without forced reload", () => {
  assert.match(entry, /studio-production-v231\.js/);
  assert.match(entry, /studio-production-v232\.js/);
  assert.ok(entry.indexOf("studio-production-v231.js") < entry.indexOf("studio-production-v232.js"));
  assert.match(chain, /patch-production-v231\.mjs/);
  assert.match(chain, /patch-production-v232\.mjs/);
  assert.ok(chain.indexOf("patch-production-v231.mjs") < chain.indexOf("patch-production-v232.mjs"));
  assert.match(worker, /ngeblogging-app-v232-react-sidebar-theme-nara-auth-20260803/);
  assert.match(worker, /react-sidebar-theme-nara-auth-cache-v232/);
  assert.doesNotMatch(worker, /await refreshStaleWindow\(client, url\);/);
});

test("sidebar has one n per state, React-backed toggle, persistence and automatic desktop collapse", () => {
  assert.match(runtime, /removeDuplicateSidebarControls/);
  assert.match(runtime, /bindSidebarAutoCollapse/);
  assert.match(runtime, /SIDEBAR_STORAGE_KEY/);
  assert.match(next, /ngeblogging-studio-sidebar-open-v232/);
  assert.match(next, /className="sn-logo-mark" onClick=\{toggleSidebar\}/);
  assert.match(next, /currentStudioDeviceMode\(\) === "large"\) setSidebar\(false\)/);
  assert.match(css, /data-v232-family="large"[\s\S]*\.sn-side\.collapsed[\s\S]*width:72px!important/);
  assert.match(css, /data-v232-family="small"[\s\S]*translateX\(-105%\)/);
  assert.match(css, /data-v232-menu-stack[\s\S]*justify-content:flex-start!important/);
});

test("profile dropdown has five actions and separates profile from site settings", () => {
  assert.match(runtime, /five-action-dropdown/);
  for (const label of ["Profil", "Situs saya", "Pengaturan", "Cadangan", "Keluar"]) assert.ok(runtime.includes(label), label);
  assert.match(runtime, /profile-only/);
  assert.match(runtime, /settings-only/);
  assert.match(runtime, /aria-haspopup/);
});

test("startup keeps valid local sessions and known-site snapshots during transient transport errors", () => {
  assert.match(gate, /ACTIVE_SITE_SNAPSHOT_V232/);
  assert.match(gate, /local-session-fallback-v232/);
  assert.match(gate, /cached-site-v232/);
  assert.match(gate, /getVerifiedSession\(\)/);
  assert.doesNotMatch(gate, /getVerifiedSession\(\{ force: true \}\)/);
  assert.match(auth, /persistSession: true/);
  assert.match(auth, /autoRefreshToken: true/);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});

test("Theme Studio exposes HTML CSS JavaScript, real numbered editor geometry and 4+4 sidebar slots", () => {
  assert.match(theme, /data-v222-code-tab="html"/);
  assert.match(theme, /data-v222-code-tab="css"/);
  assert.match(theme, /data-v222-code-tab="javascript"/);
  assert.match(runtime, /v232-code-line-gutter/);
  assert.match(runtime, /Array\.from\(\{ length: lineCount \}/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)!important/);
  assert.match(css, /tn-code-preview-pane\{order:1!important/);
  for (const slot of ["sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4", "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4"]) {
    assert.ok(theme.includes(slot), slot);
    assert.ok(widgets.includes(slot), `widget system missing ${slot}`);
  }
  assert.match(theme, /HTML \/ JavaScript tetap tersedia sebagai widget terakhir/);
});

test("100 themes and 26 widgets including custom HTML JavaScript remain present", () => {
  assert.equal(THEME_COUNT, 100);
  assert.equal(BUILT_IN_THEMES.length, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((item) => item.id)).size, 100);
  assert.equal(WIDGET_COUNT, 26);
  assert.equal(BUILT_IN_WIDGETS.length, 26);
  assert.equal(BUILT_IN_WIDGETS.at(-1)?.id, "custom-html");
});

test("Nara small and medium are non-modal and the plus menu retains camera photo file model and intelligence", () => {
  assert.match(nara, /aria-modal=\{size === "full"\}/);
  assert.match(nara, /size === "full" && <button className="nara-assistant-backdrop"/);
  assert.match(nara, /setAttachmentMenu\(false\)/);
  for (const marker of ["Kamera", "Foto", "File teks", "Tingkat kecerdasan", "Model Nara"]) assert.ok(nara.includes(marker), marker);
  assert.match(css, /nara-assistant-shell\[data-nara-size="small"\]/);
  assert.match(css, /nara-assistant-shell\[data-nara-size="medium"\]/);
  assert.match(css, /nara-attachment-menu[\s\S]*bottom:calc\(100% \+ 8px\)!important/);
  assert.match(css, /nara-composer-tools[\s\S]*grid-template-columns:40px 40px/);
});

test("v232 release contract covers requested device sizes without unverified provider or capacity claims", () => {
  assert.equal(release.release, "studio-production-v232-react-sidebar-theme-nara-auth-20260803");
  for (const viewport of viewports) assert.ok(release.validation.viewportMatrix.includes(viewport), viewport);
  assert.equal(release.preserved.themeCount, 100);
  assert.equal(release.preserved.widgetCount, 26);
  assert.equal(release.authentication.googleEndToEndVerifiedByThisRelease, false);
  assert.equal(release.authentication.linkedinEndToEndVerifiedByThisRelease, false);
  assert.equal(release.authentication.emailPasswordEndToEndVerifiedByThisRelease, false);
  assert.match(release.validation.capacity, /No billion-user claim/i);
  assert.match(patch, /ACTIVE_VERSION_V232/);
  assert.match(patch, /ACTIVE_CACHE_RELEASE_V232/);
});
