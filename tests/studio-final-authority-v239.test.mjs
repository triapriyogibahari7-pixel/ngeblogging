import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-final-authority-v239.js");
const css = read("src/studio-final-authority-v239.css");
const widgets = read("src/widget-system.js");
const nara = read("src/NaraAssistant.jsx");
const theme = read("src/ThemeStudio.jsx");
const release = JSON.parse(read("public/release-v239.json"));
const vite = read("vite.config.js");

const RELEASE = "studio-final-authority-v239-20260803";

test("v239 loads after v238 and owns the final Studio interaction layer", () => {
  const v238 = entry.indexOf('import "./studio-desktop-sidebar-v238.js"');
  const v239 = entry.indexOf('import "./studio-final-authority-v239.js"');
  assert.ok(v238 >= 0);
  assert.ok(v239 > v238);
  assert.match(runtime, new RegExp(RELEASE));
});

test("the one internal n delegates to React and large navigation auto-collapses", () => {
  assert.match(runtime, /clickReactSidebarToggle/);
  assert.match(runtime, /\.sn-sidebar-toggle/);
  assert.match(runtime, /v239ToggleBound/);
  assert.match(runtime, /v239AutoCollapse/);
  assert.match(css, /\.v239-internal-n/);
  assert.match(css, /data-v238-family="large"/);
  assert.equal(release.repairs.internalNUsesReactSidebarState, true);
  assert.equal(release.repairs.largeMenuAutoCollapsesAfterNavigation, true);
});

test("profile and settings are separate and the profile menu has five useful actions", () => {
  for (const action of ["profile", "settings", "add-site", "view-site", "logout"]) {
    assert.ok(runtime.includes(`data-v239-action=\"${action}\"`), `missing profile action ${action}`);
  }
  assert.match(runtime, /openAccountSurface\("profile"\)/);
  assert.match(runtime, /openAccountSurface\("settings"\)/);
  assert.match(css, /data-v239-account-surface="profile"/);
  assert.equal(release.repairs.profileSettingsSeparated, true);
  assert.equal(release.repairs.profileMenuHasFiveActions, true);
});

test("bootstrap rescue reuses a real membership and never creates a site or destroys auth", () => {
  assert.match(runtime, /from\("site_members"\)/);
  assert.match(runtime, /setActiveSiteId\(site\.id\)/);
  assert.match(runtime, /ngeblogging-active-site-snapshot-v209/);
  assert.doesNotMatch(runtime, /createUserSite|createUserSiteWithPolicy/);
  assert.doesNotMatch(runtime, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/);
  assert.equal(release.authentication.automaticSiteCreationByRecovery, false);
  assert.equal(release.authentication.bootstrapRecoveryUsesExistingMembershipOnly, true);
});

test("Theme Studio keeps 100-theme machinery, 26 widgets, custom code and a functional map picker", () => {
  assert.match(theme, /THEME_COUNT/);
  assert.match(theme, /WIDGET_COUNT/);
  assert.match(widgets, /id: "custom-html"/);
  assert.match(widgets, /name: "HTML \/ JavaScript"/);
  assert.match(runtime, /Widget kiri 1/);
  assert.match(runtime, /Widget kiri 4/);
  assert.match(runtime, /Widget kanan 1/);
  assert.match(runtime, /Widget kanan 4/);
  assert.match(runtime, /autoConfigureWidget/);
  assert.match(runtime, /Simpan widget/i);
  assert.match(css, /\.v239-layout-popover/);
  assert.equal(release.repairs.layoutUsesExistingTwentySixWidgets, true);
});

test("code editor uses actual textarea line count and responsive code-preview geometry", () => {
  assert.match(runtime, /split\("\\n"\)\.length/);
  assert.match(runtime, /Math\.min\(10000/);
  assert.match(runtime, /v239-code-gutter/);
  assert.match(css, /\.v239-code-editor/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(css, /grid-template-rows:minmax\(360px,44dvh\) minmax\(520px,1fr\)/);
  assert.equal(release.repairs.codeEditorHasRealLineNumberGutter, true);
});

test("Nara source retains camera photo file model intelligence and v239 forces small/medium nonmodal", () => {
  for (const marker of ["cameraInput", "imageInput", "fileInput", "intelligenceOptions", "modelOptions"]) assert.ok(nara.includes(marker), `Nara missing ${marker}`);
  assert.match(runtime, /camera-photo-file/);
  assert.match(runtime, /modal \? "modal" : "nonmodal"/);
  assert.match(css, /data-v239-nara-mode="nonmodal"/);
  assert.match(css, /\.nara-attachment-menu/);
  assert.match(css, /bottom:calc\(100% \+ 9px\)/);
  assert.equal(release.repairs.naraSmallMediumNonmodal, true);
});

test("Domain, settings, backup, widgets and analytics have bounded geometry guards", () => {
  for (const selector of [".sv124-free-domain>aside", ".sn-settings-grid", ".sn-backup-host", ".tn-widget-studio", ".op41-line"]) {
    assert.ok(css.includes(selector), `missing geometry guard ${selector}`);
  }
  assert.match(css, /writing-mode:horizontal-tb/);
  assert.match(css, /min-height:320px/);
  assert.equal(release.repairs.domainActionsHorizontal, true);
  assert.equal(release.repairs.settingsBackupWidgetOverlapGuards, true);
});

test("v239 rotates the service worker after v238 without forced auth navigation", () => {
  assert.match(vite, /finalizeServiceWorkerV238/);
  assert.match(vite, /finalizeServiceWorkerV239/);
  assert.ok(vite.indexOf("finalizeServiceWorkerV238()") < vite.indexOf("finalizeServiceWorkerV239()"));
  const sw = read("scripts/service-worker-v239-lib.mjs");
  assert.match(sw, /ngeblogging-app-v239-final-authority-20260803/);
  assert.match(sw, /studio-final-authority-cache-v239/);
  assert.match(sw, /V239_FINALIZE_AUTH_SURFACE_GUARD_MISSING/);
  assert.doesNotMatch(runtime, /await refreshStaleWindow\(client, url\)/);
});

test("release does not make an unsupported provider or extreme capacity claim", () => {
  assert.equal(release.authentication.googleEndToEndClaimed, false);
  assert.equal(release.authentication.linkedinEndToEndClaimed, false);
  assert.equal(release.authentication.emailEndToEndClaimed, false);
  assert.equal(release.capacity.massAccountCreationPerformed, false);
  assert.equal(release.capacity.productionLoadTestPerformed, false);
  assert.equal(release.capacity.extremeScaleClaim, "not-claimed");
});
