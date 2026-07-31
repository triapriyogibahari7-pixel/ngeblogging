import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-finalization-v178.js");
const css = read("src/studio-finalization-v178.css");
const recovery = read("src/studio-recovery-v150.js");
const studio = read("src/StudioNext.jsx");
const auth = read("src/lib/supabase.js");
const v177 = read("src/studio-screenshot-stability-v177.js");
const release = JSON.parse(read("public/release-v178.json"));
const audit = read("public/studio-viewport-audit-v178.html");

const menuLabels = [
  "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
  "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
];

const viewports = [
  "320,568", "360,640", "375,667", "390,844", "412,915", "430,932",
  "600,960", "768,1024", "820,1180", "1024,768", "1280,720",
  "1366,768", "1440,900", "1920,1080",
];

test("v178 loads after the established v176 and v177 authorities", () => {
  const v176Index = entry.indexOf('import "./studio-mobile-stability-v176.js"');
  const v177Index = entry.indexOf('import "./studio-screenshot-stability-v177.js"');
  const v178Index = entry.indexOf('import "./studio-finalization-v178.js"');
  assert.ok(v176Index >= 0);
  assert.ok(v177Index > v176Index);
  assert.ok(v178Index > v177Index);
  assert.match(v177, /studio-screenshot-stability-v177-20260731/);
  assert.match(runtime, /studio-finalization-v178-20260731/);
});

test("Profile is intercepted into its own accessible editor instead of opening Settings", () => {
  assert.match(recovery, /data-action="profile"/);
  assert.match(recovery, /data-action="settings"/);
  assert.match(runtime, /sn-profile-menu-v150 \[data-action="profile"\]/);
  assert.match(runtime, /event\.stopImmediatePropagation\(\)/);
  assert.match(runtime, /openProfile\(document\.querySelector\("\.sn-avatar"\)\)/);
  assert.match(runtime, /updateUserProfile\(currentUser\.id/);
  assert.match(runtime, /displayName/);
  assert.match(runtime, /bio/);
  assert.match(runtime, /website/);
  assert.match(runtime, /avatarUrl/);
  assert.match(runtime, /handleDialogKeydown/);
  assert.match(runtime, /event\.key === "Escape"/);
  assert.match(css, /\.sn-profile-layer-v178/);
  assert.match(css, /body\.sn-profile-open-v178/);
  assert.equal(release.profileSeparatedFromSettings, true);
  assert.equal(release.profileKeyboardAccessible, true);
  assert.equal(release.profilePersistsToSupabase, true);
});

test("all mandatory sidebar actions remain present", () => {
  for (const label of menuLabels) {
    assert.ok(studio.includes(`>${label}<`), `menu missing ${label}`);
  }
});

test("API Keys, Domain, Posts and Pages are bounded without deleting their real components", () => {
  assert.match(css, /\.sn-api-page/);
  assert.match(css, /\.sn-api-title>\.sn-primary/);
  assert.match(css, /\.sn-api-table/);
  assert.match(css, /\.sv124-page/);
  assert.match(css, /\.sv124-domain-item/);
  assert.match(css, /\.sn-doc-row/);
  assert.match(css, /overflow-x:clip!important/);
  assert.match(css, /min-width:0!important/);
  assert.match(css, /max-width:100%!important/);
  assert.equal(release.apiKeysViewportBounded, true);
  assert.equal(release.domainViewportBounded, true);
  assert.equal(release.postsPagesViewportBounded, true);
});

test("v177 drawer, centered mobile logo and Nara nonmodal fixes remain the active base", () => {
  assert.equal(release.naraV177Preserved, true);
  assert.equal(release.drawerV177Preserved, true);
  assert.equal(release.mobileLogoV177Preserved, true);
  assert.match(v177, /blocked-only-by-outside-backdrop/);
  assert.match(v177, /data\.naraInteractionV177|naraInteractionV177/);
  assert.match(v177, /sm177-nara-full/);
});

test("authentication remains persistent but does not claim unverified providers", () => {
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(auth, /"google"/);
  assert.match(auth, /"linkedin_oidc"/);
  assert.match(auth, /signInWithPassword/);
  assert.equal(release.auth.persistSession, true);
  assert.equal(release.auth.autoRefreshToken, true);
  assert.equal(release.auth.linkedinEndToEndVerified, false);
  assert.equal(release.auth.emailPasswordEndToEndVerified, false);
  assert.equal(release.capacity.claim, "not-claimed");
  assert.equal(release.realDeviceVerification, "required-before-100-percent-claim");
});

test("the visual audit exposes every requested viewport without fake load data", () => {
  for (const viewport of viewports) assert.ok(audit.includes(`[${viewport}]`) || audit.includes(viewport), `viewport missing ${viewport}`);
  assert.match(audit, /Profil terpisah/);
  assert.match(audit, /API Keys/);
  assert.match(audit, /Nara/);
  assert.match(audit, /bukan pengganti login provider nyata/);
});
