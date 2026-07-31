import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-mobile-stability-v176.js");
const css = read("src/studio-mobile-stability-v176.css");
const patcher = read("scripts/patch-studio-mobile-v176.mjs");
const recovery = read("src/studio-recovery-v150.js");
const studio = read("src/StudioNext.jsx");

const menuLabels = [
  "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
  "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
];

test("v176 authority loads after every previous Studio layer", () => {
  assert.match(entry, /studio-mobile-stability-v176\.js/);
  assert.ok(entry.lastIndexOf("studio-mobile-stability-v176.js") > entry.lastIndexOf("studio-continuity-v152.css"));
  assert.match(runtime, /studio-mobile-stability-v176-20260731/);
  assert.match(css, /Studio mobile stability v176/);
});

test("mobile drawer stays clickable and never leaves the whole Studio inert", () => {
  assert.match(runtime, /main\.removeAttribute\("inert"\)/);
  assert.doesNotMatch(runtime, /main\.setAttribute\("inert"/);
  assert.match(runtime, /closeMobileDrawer/);
  assert.match(runtime, /nav button,\.sn-account-footer button,\.sn-new/);
  assert.match(css, /z-index:1890!important/);
  assert.match(css, /z-index:1900!important/);
  assert.match(css, /justify-content:flex-start!important/);
  assert.match(css, /overflow-y:auto!important/);
  assert.match(css, /body\.sm176-drawer-open/);
});

test("mobile n logo is centered in a fixed square instead of drifting", () => {
  for (const selector of [".sn-logo-mark", ".sn-mobile-menu-mark", ".sn-sidebar-toggle"]) {
    assert.ok(css.includes(selector), `missing ${selector}`);
  }
  assert.match(css, /align-items:center!important/);
  assert.match(css, /justify-content:center!important/);
  assert.match(css, /place-items:center!important/);
  assert.match(css, /overflow:hidden!important/);
});

test("profile menu shows registered name and provides a real avatar upload", () => {
  for (const marker of [
    "loadIdentity", "user_metadata?.full_name", "display_name,avatar_url", "sm176-profile-name",
    "Ganti avatar", "squareAvatarBlob", "site-public-media", "profiles",
  ]) assert.ok(runtime.includes(marker), `profile marker missing ${marker}`);
  assert.match(css, /sm176-profile-head/);
  assert.match(css, /sm176-profile-avatar/);
  assert.match(css, /width:min\(320px,calc\(100vw - 20px\)\)!important/);
});

test("Nara launcher and all three window sizes are stable and nonmodal until full screen", () => {
  assert.match(runtime, /forceSmallNara/);
  assert.match(runtime, /dataset\.naraInteractionV176/);
  assert.match(runtime, /full \? "modal" : "nonmodal"/);
  assert.match(runtime, /aria-modal/);
  assert.match(css, /\.nara-floating-button/);
  assert.match(css, /width:56px!important/);
  assert.match(css, /\.nara-floating-button>b[\s\S]*display:none!important/);
  assert.match(css, /data-nara-interaction-v176="nonmodal"/);
  assert.match(css, /pointer-events:none!important/);
  for (const size of ["small", "medium", "full"]) assert.ok(css.includes(`data-nara-size="${size}"`), `Nara ${size} missing`);
  assert.match(css, /animation:none!important/);
  assert.match(css, /transition:none!important/);
});

test("Media, Posts Pages search, and add-site modal receive bounded mobile geometry", () => {
  assert.match(css, /\.sn-upload-zone/);
  assert.match(css, /min-height:220px!important/);
  assert.match(css, /\.sn-upload-zone h3/);
  assert.match(css, /\.sc161-content-toolbar/);
  assert.match(css, /\.sc161-search/);
  assert.match(css, /\.sn-site-manager>header/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) 42px!important/);
  assert.match(css, /\.sn-domain-input/);
});

test("onboarding session check is single-flight and throttled instead of running for every DOM mutation", () => {
  assert.match(patcher, /onboardingCheckPromise/);
  assert.match(patcher, /onboardingCheckedAt/);
  assert.match(patcher, /30_000/);
  assert.match(patcher, /onboardingResolvedUser/);
  assert.match(recovery, /ONBOARDING_CHECK_RELEASE/);
  assert.match(recovery, /onboarding-check-v176/);
});

test("all six-mode Studio menus and previous Members fallback remain protected", () => {
  for (const label of menuLabels) assert.ok(studio.includes(`>${label}<`), `missing ${label}`);
  assert.match(studio, /MembersPanelV176/);
  assert.match(studio, /function MembersView/);
  assert.match(patcher, /PATCH_V176_MEMBERS_FALLBACK_MISSING/);
});

test("v176 stylesheet blocks remain balanced", () => {
  assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length);
});
