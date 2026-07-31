import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const studioEntry = read("src/Studio.jsx");
const studio = read("src/StudioNext.jsx");
const runtime = read("src/studio-interaction-precision-v183.js");
const css = read("src/studio-interaction-precision-v183.css");
const nara = read("src/NaraAssistant.jsx");
const backup = read("src/BackupCenter.jsx");
const device = read("src/studio-mobile-runtime-v179.js");
const session = read("src/lib/supabase.js");
const serviceWorker = read("public/sw.js");
const worker = read("cloudflare/worker-v69.mjs");
const netlify = read("scripts/write-netlify-redirects.mjs");
const release = JSON.parse(read("public/release-v183.json"));

const menus = [
  "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
  "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
];

function block(source, start, end) {
  const begin = source.indexOf(start);
  assert.ok(begin >= 0, `missing block start ${start}`);
  const finish = source.indexOf(end, begin + start.length);
  assert.ok(finish > begin, `missing block end ${end}`);
  return source.slice(begin, finish);
}

test("v183 loads after every previous Studio mobile authority", () => {
  const v181 = studioEntry.indexOf('import "./studio-mobile-hardening-v181.js"');
  const v183 = studioEntry.indexOf('import "./studio-interaction-precision-v183.js"');
  assert.ok(v181 >= 0);
  assert.ok(v183 > v181);
  assert.match(runtime, /studio-interaction-precision-v183-20260731/);
  assert.match(css, /Interaction precision v183/);
});

test("six responsive families, desktop variants, and complete sidebar remain protected", () => {
  for (const family of ["application", "phone", "mobile", "compact", "tablet", "desktop"]) {
    assert.ok(device.includes(`"${family}"`), `missing responsive family ${family}`);
  }
  for (const variant of ["laptop", "desktop", "computer"]) {
    assert.ok(device.includes(`"${variant}"`), `missing desktop variant ${variant}`);
  }
  for (const label of menus) assert.ok(studio.includes(`>${label}<`), `missing menu ${label}`);
});

test("mobile drawer remains clickable and backdrop covers only outside area", () => {
  assert.match(runtime, /main\.setAttribute\("inert", ""\)/);
  assert.match(runtime, /main\.removeAttribute\("inert"\)/);
  assert.match(runtime, /sidebar\.removeAttribute\("inert"\)/);
  assert.match(runtime, /\.sn-side\.mobile-open button/);
  assert.match(css, /--v183-drawer-width:clamp\(272px,76vw,352px\)/);
  assert.match(css, /inset:0 0 0 var\(--v183-drawer-width\)!important/);
  assert.match(css, /width:calc\(100vw - var\(--v183-drawer-width\)\)!important/);
  assert.match(css, /\.sn-side-backdrop[\s\S]*z-index:7990!important/);
  assert.match(css, /\.sn-shell>\.sn-side[\s\S]*z-index:8000!important/);
  assert.match(css, /\.sn-shell>\.sn-side\.mobile-open[\s\S]*pointer-events:auto!important/);
  assert.match(studio, /type="button" className="sn-side-backdrop"/);
});

test("mobile menu is compact below Buat Post while desktop navigation stays centered", () => {
  const mobileNav = block(css, "html[data-studio-interaction-precision-v183] .sn-side>nav {", "html[data-studio-interaction-precision-v183] .sn-side>nav>button");
  assert.match(mobileNav, /justify-content:flex-start!important/);
  assert.match(mobileNav, /gap:2px!important/);
  assert.match(mobileNav, /padding:4px 9px 8px!important/);
  assert.match(css, /flex:0 0 44px!important/);
  assert.match(css, /@media\(min-width:821px\)[\s\S]*justify-content:center!important/);
});

test("mobile n icon is centered, high contrast, and never disappears into its background", () => {
  assert.match(css, /place-items:center!important/);
  assert.match(css, /transform:translate\(-50%,-53%\)!important/);
  assert.match(css, /color:#2465d6!important/);
  assert.match(css, /background:#fff!important/);
  assert.match(css, /font:900 31px\/1 Arial,sans-serif!important/);
});

test("Post and Page mobile editor cannot collapse text into one character per line", () => {
  assert.match(css, /grid-template-columns:48px minmax\(0,1fr\)!important/);
  assert.match(css, /\.ce-titlebar \*[\s\S]*overflow-wrap:normal!important/);
  assert.match(css, /\.ce-file \*[\s\S]*word-break:normal!important/);
  assert.match(css, /\.ce-file input[\s\S]*white-space:nowrap!important/);
  assert.match(css, /\.ce-file small[\s\S]*text-overflow:ellipsis!important/);
  assert.match(css, /\.ce-tabs[\s\S]*overflow-x:auto!important/);
  assert.match(css, /\.ce-ribbon[\s\S]*overflow-x:auto!important/);
  assert.match(css, /\.ce-paper[\s\S]*width:100%!important/);
});

test("Nara small and medium are nonmodal, bounded, closable, and stable", () => {
  assert.match(nara, /aria-modal=\{size === "full"\}/);
  assert.doesNotMatch(nara, /aria-modal="true"/);
  assert.match(nara, /hidden=\{size !== "full"\}/);
  assert.match(nara, /inert=\{size !== "full" \? "" : undefined\}/);
  assert.match(nara, /nara-close-v177 nara-close-v183/);
  assert.match(runtime, /data\.naraInteractionV183 = full \? "modal" : "nonmodal"/);
  assert.match(css, /data-nara-interaction-v183="nonmodal"[\s\S]*pointer-events:none!important/);
  assert.match(css, /data-nara-size="small"[\s\S]*width:min\(370px,calc\(100vw - 20px\)\)!important/);
  assert.match(css, /data-nara-size="medium"[\s\S]*width:min\(640px,calc\(100vw - 12px\)\)!important/);
  assert.match(css, /data-nara-size="full"[\s\S]*width:100vw!important/);
  assert.match(css, /nara-close-v183[\s\S]*visibility:visible!important/);
  assert.match(css, /\.nara-floating-button[\s\S]*animation:none!important/);
  assert.match(css, /\.nara-floating-button>b[\s\S]*display:none!important/);
});

test("profile, settings, and logout remain separate and transient network errors do not sign users out", () => {
  assert.match(studio, /aria-label="Buka menu profil" aria-haspopup="menu"/);
  assert.match(runtime, /profile-settings-logout-separated/);
  for (const label of ["Profil", "Pengaturan", "Keluar"]) {
    assert.ok(read("src/studio-mobile-runtime-v179.js").includes(`<span>${label}</span>`));
  }
  assert.match(session, /persistSession:\s*true/);
  assert.match(session, /autoRefreshToken:\s*true/);
  assert.match(runtime, /persist-until-explicit-logout/);
  assert.match(runtime, /autoRetryV183/);
  assert.match(backup, /Koneksi cadangan terputus sementara/);
  assert.doesNotMatch(backup, /setMessage\(error\.message \|\| "Cadangan belum dapat dibuat/);
});

test("service worker and deployment probes rotate to v183 without forced auth navigation", () => {
  for (const marker of [
    "ngeblogging-app-v183-interaction-precision-20260731",
    "interaction-precision-cache-v183",
    "studio-interaction-precision-v183-20260731",
    "NGE_BLOGGING_UPDATE_AVAILABLE_V183",
  ]) assert.ok(serviceWorker.includes(marker), `service worker missing ${marker}`);
  assert.doesNotMatch(serviceWorker, /await refreshStaleWindow\(client, url\);/);
  for (const route of ["/login", "/signup", "/signin", "/auth/"]) assert.ok(serviceWorker.includes(route));
  assert.ok(worker.includes('"/release-v183.json"'));
  assert.ok(worker.includes("STUDIO_INTERACTION_RELEASE"));
  assert.ok(netlify.includes("X-Ngeblogging-Studio-Interaction"));
  assert.ok(netlify.includes("/release-v183.json"));
});

test("static v183 probe describes the screenshot fixes without claiming credential load testing", () => {
  assert.equal(release.status, "ok");
  assert.equal(release.uiAuthority, "studio-interaction-precision-v183-20260731");
  for (const field of [
    "drawerClickable", "drawerBackdropOutsideOnly", "mobileMenuCompact", "mobileLogoCentered",
    "editorMobileNoCharacterWrap", "naraSmallMediumNonmodal", "naraCloseAlwaysVisible",
    "naraLauncherCentered", "profileSettingsSeparated", "sessionPersistsUntilExplicitLogout",
    "rawFailedToFetchHidden", "legacyFeaturesPreserved",
  ]) assert.equal(release[field], true, `${field} must be true`);
  assert.deepEqual(release.responsiveFamilies, ["application", "phone", "mobile", "compact", "tablet", "desktop"]);
});
