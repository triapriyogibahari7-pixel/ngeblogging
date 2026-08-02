import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, LAYOUT_AREAS, WIDGET_COUNT } from "../src/widget-system.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const studio = read("src/StudioNext.jsx");
const runtime = read("src/studio-production-v214.js");
const css = read("src/studio-production-v214.css");
const device = read("src/studio-device-mode-v140.js");
const theme = read("src/ThemeStudio.jsx");
const nara = read("src/NaraAssistant.jsx");
const auth = read("src/lib/supabase.js");
const publicSite = read("src/PublicSiteNext.jsx");
const sw = read("public/sw.js");
const production = read("wrangler.production.jsonc");
const chain = read("scripts/patch-service-worker-v179.mjs");
const patch = read("scripts/patch-production-v214.mjs");
const release = JSON.parse(read("public/release-v214.json"));

const RELEASE = "studio-production-v214-20260802";
const MODES = ["application", "phone", "mobile", "compact", "tablet", "desktop"];

test("v214 is final authority after v213", () => {
  assert.match(entry, /studio-production-v213\.js/);
  assert.match(entry, /studio-production-v214\.js/);
  assert.ok(entry.indexOf("studio-production-v214.js") > entry.indexOf("studio-production-v213.js"));
  assert.ok(chain.indexOf("patch-production-v214.mjs") > chain.indexOf("patch-production-v213.mjs"));
  assert.match(runtime, new RegExp(RELEASE));
});

test("six responsive modes and desktop laptop computer variants remain explicit", () => {
  for (const mode of MODES) {
    assert.ok(device.includes(`"${mode}"`), `device detector missing ${mode}`);
    assert.ok(runtime.includes(`"${mode}"`), `v214 runtime missing ${mode}`);
    assert.ok(css.includes(`data-studio-v214-mode="${mode}"`), `v214 CSS missing ${mode}`);
  }
  assert.match(device, /return "laptop"/);
  assert.match(device, /return "computer"/);
  assert.match(css, /data-studio-v214-variant="laptop"/);
  assert.match(css, /data-studio-v214-variant="computer"/);
});

test("phone application mobile compact maps do not use a desktop map squeezed into a tiny viewport", () => {
  assert.match(css, /data-studio-v214-mode="phone"[\s\S]*display:flex/);
  assert.match(css, /data-studio-v214-mode="application"[\s\S]*display:flex/);
  assert.match(css, /data-studio-v214-mode="mobile"[\s\S]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /data-studio-v214-mode="compact"[\s\S]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /"content-main content-main"/);
  assert.match(runtime, /v214LockedContent/);
  assert.match(runtime, /stopImmediatePropagation/);
});

test("four left and four right widget areas stay real while main Post Page is not a widget", () => {
  for (const id of [
    "sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4",
    "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4",
  ]) assert.ok(LAYOUT_AREAS.some((area) => area.id === id), `missing real layout area ${id}`);
  assert.equal(WIDGET_COUNT, 26);
  assert.ok(BUILT_IN_WIDGETS.some((widget) => widget.id === "custom-html"));
  assert.match(runtime, /Konten utama Post\/Page — bukan slot widget/);
});

test("profile dropdown contains Profile Settings Logout and profile is separated from site settings", () => {
  assert.match(studio, /sn-profile-menu-wrap/);
  assert.match(studio, /sn-profile-menu/);
  assert.match(studio, /<span>Profil<\/span>/);
  assert.match(studio, /<span>Pengaturan<\/span>/);
  assert.match(studio, /<span>Keluar<\/span>/);
  assert.match(studio, /chooseView\("profile"\)/);
  assert.match(studio, /chooseView\("settings"\)/);
  assert.match(studio, /function ProfileView/);
  assert.match(studio, /function SiteSettingsView/);
  assert.match(studio, /title="Profil"/);
  assert.match(studio, /title="Pengaturan"/);
  assert.doesNotMatch(studio, /title="Profil & pengaturan"/);
});

test("logout remains explicit and no v214 authority clears session storage", () => {
  assert.match(studio, /className="danger" onClick=\{\(\) => \{ setProfileMenu\(false\); onExit\(\); \}\}/);
  assert.match(studio, /sn-account-logout-v135" onClick=\{onExit\}/);
  assert.doesNotMatch(runtime, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/);
  assert.doesNotMatch(patch, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/);
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
});

test("mobile drawer remains overlay navigation without blur-lock or permanent main shift", () => {
  assert.match(css, /data-studio-v214-layout="small"[\s\S]*\.sn-main[\s\S]*margin-left:0/);
  assert.match(css, /\.sn-side-backdrop[\s\S]*background:transparent/);
  assert.match(css, /backdrop-filter:none/);
  assert.match(css, /#ngeblogging-studio-sidebar\.mobile-open[\s\S]*height:100dvh/);
  assert.match(runtime, /main\.removeAttribute\("inert"\)/);
});

test("sidebar identity menu and footer are preserved and centered", () => {
  for (const label of ["Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik", "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar"]) {
    assert.ok(studio.includes(label), `sidebar missing ${label}`);
  }
  assert.match(studio, /sn-logo-mark/);
  assert.match(studio, /Ngeblogging/);
  assert.match(css, /#ngeblogging-studio-sidebar > nav[\s\S]*justify-content:center/);
  assert.match(css, /sn-account-footer[\s\S]*margin-top:auto/);
});

test("Theme Nara analytics and 100-theme contracts remain preserved", () => {
  assert.equal(THEME_COUNT, 100);
  assert.equal(BUILT_IN_THEMES.length, 100);
  assert.match(theme, /PREVIEW LANGSUNG/);
  assert.match(theme, /HTML/);
  assert.match(theme, /CSS/);
  assert.match(theme, /JavaScript/);
  assert.match(nara, /aria-controls="nara-attachment-menu-v211"/);
  for (const label of ["Kamera", "Foto", "File teks", "Nara Mini", "Nara Writer", "Nara Vision", "Nara Max", "Instan", "Sedang", "Tinggi", "Maksimal"]) assert.ok(nara.includes(label), label);
  assert.match(publicSite, /PUBLIC_SITE_SINGLE_RENDER_V209/);
});

test("v214 rotates PWA cache and preserves factual production metadata", () => {
  assert.match(sw, /STUDIO_PRODUCTION_RELEASE_V214/);
  assert.match(sw, /ngeblogging-app-v214-six-mode-profile-layout-20260802/);
  assert.match(sw, /six-mode-profile-layout-cache-v214/);
  assert.match(sw, /ngeblogging-app-v213-analytics-layout-20260802/);
  assert.doesNotMatch(sw, /await refreshStaleWindow\(client, url\);/);
  assert.match(production, /studio-production-v214-20260802/);
  assert.equal(release.release, RELEASE);
  assert.deepEqual(release.responsiveModes, MODES);
  assert.equal(release.preserved.themeCount, 100);
  assert.equal(release.preserved.widgetCount, 26);
  assert.equal(release.preserved.postPageWordLimit, 5000);
  assert.equal(release.repairs.profileDropdown, true);
  assert.equal(release.repairs.profileSeparatedFromSiteSettings, true);
  assert.equal(release.validation.fakeAnalytics, false);
  assert.equal(release.validation.massCapacityClaimed, false);
  assert.equal(release.validation.allOAuthProvidersEndToEndProven, false);
});
