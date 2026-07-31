import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-mobile-runtime-v179.js");
const css = read("src/studio-mobile-runtime-v179.css");
const naraCss = read("src/studio-mobile-nara-v179.css");
const studio = read("src/StudioNext.jsx");
const editor = read("src/ContentEditor.jsx");
const release = JSON.parse(read("public/release-v179.json"));

const mandatoryMenu = [
  "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
  "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
];

test("v179 loads after v176, v177 and v178 without replacing the Studio entry", () => {
  const v176 = entry.indexOf('import "./studio-mobile-stability-v176.js"');
  const v177 = entry.indexOf('import "./studio-screenshot-stability-v177.js"');
  const v178 = entry.indexOf('import "./studio-finalization-v178.js"');
  const v179 = entry.indexOf('import "./studio-mobile-runtime-v179.js"');
  assert.ok(v176 >= 0);
  assert.ok(v177 > v176);
  assert.ok(v178 > v177);
  assert.ok(v179 > v178);
  assert.match(runtime, /studio-mobile-runtime-v179-20260731/);
  assert.equal(release.legacyFeaturesPreserved, true);
});

test("six responsive families and desktop variants are explicit", () => {
  for (const family of ["application", "phone", "mobile", "compact", "tablet", "desktop"]) {
    assert.ok(runtime.includes(`"${family}"`), `missing responsive family ${family}`);
  }
  for (const variant of ["laptop", "desktop", "computer"]) {
    assert.ok(runtime.includes(`"${variant}"`), `missing desktop variant ${variant}`);
  }
  assert.deepEqual(release.responsiveFamilies, ["application", "phone", "mobile", "compact", "tablet", "desktop"]);
});

test("all mandatory sidebar actions remain in the React-owned navigation", () => {
  for (const label of mandatoryMenu) {
    assert.ok(studio.includes(`>${label}<`), `menu missing ${label}`);
  }
  assert.match(css, /\.sn-side>nav/);
  assert.match(css, /\.sn-side>\.sn-account-footer/);
  assert.match(css, /--v179-drawer-width/);
  assert.match(css, /inset:0 0 0 var\(--v179-drawer-width\)/);
  assert.match(runtime, /removeAttribute\(sidebar, "inert"\)/);
  assert.equal(release.repairs.drawerClickable, true);
  assert.equal(release.repairs.drawerBackdropOutsideOnly, true);
});

test("mobile logo and account menu remain visible, centered and separated", () => {
  assert.match(css, /\.sn-mobile-menu-mark strong/);
  assert.match(css, /color:#2868d7!important/);
  assert.match(css, /place-items:center!important/);
  for (const action of ["profile", "settings", "logout"]) {
    assert.match(runtime, new RegExp(`data-action=\\"${action}\\"`));
  }
  assert.match(runtime, /openProfile\(trigger\)/);
  assert.match(runtime, /sidebarAction\("Pengaturan"\)/);
  assert.match(runtime, /sidebarAction\("Keluar"\)/);
  assert.equal(release.repairs.profileSettingsLogoutSeparated, true);
});

test("Nara small and medium are nonmodal while full screen alone is modal", () => {
  assert.match(runtime, /full \? "modal" : "nonmodal"/);
  assert.match(naraCss, /data-nara-interaction-v179="nonmodal"/);
  assert.match(naraCss, /pointer-events:none!important/);
  assert.match(naraCss, /data-nara-size="small"/);
  assert.match(naraCss, /data-nara-size="medium"/);
  assert.match(naraCss, /data-nara-size="full"/);
  assert.match(naraCss, /button\[aria-label\*="Tutup" i\]/);
  assert.equal(release.repairs.naraSmallMediumNonmodal, true);
  assert.equal(release.repairs.naraFullModal, true);
  assert.equal(release.repairs.naraCloseAlwaysVisible, true);
});

test("Post and Page editor mobile layout cannot use the broken desktop geometry", () => {
  assert.match(editor, /className="ce-titlebar"/);
  assert.match(editor, /className="ce-tabs"/);
  assert.match(editor, /className="ce-ribbon"/);
  assert.match(editor, /className="ce-paper"/);
  assert.match(editor, /className="ce-sidebar"/);
  assert.match(css, /grid-template-areas:"back file" "actions actions"/);
  assert.match(css, /\.ce-tabs[\s\S]*overflow-x:auto!important/);
  assert.match(css, /\.ce-ribbon[\s\S]*overflow-x:auto!important/);
  assert.match(css, /\.ce-paper[\s\S]*width:100%!important/);
  assert.match(css, /\.ce-paper table[\s\S]*overflow-x:auto!important/);
  assert.equal(release.repairs.contentEditorMobileReflow, true);
});

test("operational pages get bounded mobile reflow instead of placeholders", () => {
  for (const selector of [".sn-api-page", ".sv124-page", ".mv176-page", ".sv124-toggle-row", ".sn-settings-grid"]) {
    assert.ok(css.includes(selector), `missing geometry guard ${selector}`);
  }
  assert.match(css, /\.sn-api-metrics/);
  assert.match(css, /\.sv124-metrics-grid/);
  assert.match(css, /\.mv176-list>article/);
  assert.equal(release.repairs.apiKeysMobileReflow, true);
  assert.equal(release.repairs.domainMobileReflow, true);
  assert.equal(release.repairs.commentsMobileReflow, true);
  assert.equal(release.repairs.membersMobileReflow, true);
});

test("loading watchdog gives a retry state and never logs the user out", () => {
  assert.match(runtime, /markLoadingStalled/);
  assert.match(runtime, /Pemuatan melewati batas waktu/);
  assert.match(runtime, /Sesi tetap dipertahankan/);
  assert.match(runtime, /v179-loading-retry/);
  assert.doesNotMatch(runtime, /signOut\s*\(/);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(/);
  assert.equal(release.repairs.loadingWatchdog, true);
  assert.equal(release.repairs.sessionPreservedOnLoadingFailure, true);
});

test("release makes no unsupported login or mass-capacity claim", () => {
  assert.equal(release.fakeStatisticsAdded, false);
  assert.equal(release.authentication.googleEndToEndVerifiedByThisRelease, false);
  assert.equal(release.authentication.linkedinEndToEndVerifiedByThisRelease, false);
  assert.equal(release.authentication.emailPasswordEndToEndVerifiedByThisRelease, false);
  assert.equal(release.capacity.productionLoadTestPerformed, false);
  assert.equal(release.capacity.massAccountCreationPerformed, false);
  assert.equal(release.capacity.claim, "not-claimed");
  assert.equal(release.realDeviceVerification, "required-before-100-percent-claim");
});
