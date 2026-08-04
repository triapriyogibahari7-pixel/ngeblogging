import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const runtime = read("src/studio-native-authority-v250.js");
const css = read("src/studio-native-authority-v250.css");
const rescue = read("src/studio-sidebar-rescue-v251.js");
const rescueCss = read("src/studio-sidebar-rescue-v251.css");
const entry = read("src/Studio.jsx");
const auth = read("src/lib/supabase.js");
const authReadiness = read("src/auth-readiness-bridge.js");
const provider = read("src/auth-provider-gateway-v250.js");
const activator = read("scripts/activate-studio-native-v250.mjs");
const swRotate = read("scripts/service-worker-v250-rotate.mjs");
const studio = read("src/StudioNext.jsx");
const nara = read("src/NaraAssistant.jsx");
const theme = read("src/ThemeStudio.jsx");
const widgets = read("src/widget-system.js");
const vite = read("vite.config.js");

test("v250 activation retires competing shell owners after historical regressions", () => {
  for (const retired of [
    "studio-stable-shell-v244.js",
    "studio-shell-controller-v147.js",
    "studio-production-v235.js",
    "studio-visual-stability-v241.js",
    "studio-shell-rescue-v242.js",
    "studio-sidebar-brand-v246.js",
    "studio-stable-shell-v244-final.css",
    "studio-sidebar-brand-v246.css",
    "studio-screenshot-lock-v247.css",
    "studio-final-visual-v249.css",
    "studio-final-visual-v249-hotfix.css",
  ]) assert.ok(activator.includes(retired), `${retired} must be retired at bundle activation`);
  assert.ok(activator.includes('ensureLastImport(source, "studio-native-authority-v250.js")'));
  assert.ok(activator.includes('ensureLastImport(source, "studio-native-authority-v250.css")'));
  assert.match(vite, /async buildStart\(\)/);
  assert.match(vite, /activateStudioNativeV250/);
});

test("six responsive families keep one centered n and complete menu", () => {
  for (const marker of [
    'new Set(["application", "phone", "mobile", "compact"])',
    'new Set(["tablet", "desktop", "laptop", "computer"])',
    "sn-logo-mark",
    "ngeblogging-sidebar-native-v250",
  ]) assert.ok(runtime.includes(marker), marker);
  for (const marker of ["--v250-side-open:248px","--v250-side-rail:70px",'data-studio-v250-family="small"','data-studio-v250-family="large"']) assert.ok(css.includes(marker), marker);
  for (const label of ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"]) assert.ok(studio.includes(label), label);
});

test("v251 defensively restores native large sidebar, topbar and profile after stale inline mutations", () => {
  for (const marker of [
    "studio-sidebar-rescue-v251-20260804",
    "v244-legacy-sidebar",
    "data-v244-legacy-top",
    "removeAttribute(\"inert\")",
    "removeAttribute(\"aria-hidden\")",
    "studioV251Family",
    "studioV251Sidebar",
    "sn-mobile-sidebar-open",
  ]) assert.ok(rescue.includes(marker), marker);
  for (const marker of [
    "--v251-open:248px",
    "--v251-rail:70px",
    'data-studio-v251-family="large"',
    'data-studio-v251-sidebar="expanded"',
    'data-studio-v251-sidebar="collapsed"',
    'data-studio-v251-family="small"',
    ".sn-avatar",
    ".sn-logo-mark",
  ]) assert.ok(rescueCss.includes(marker), marker);
  assert.ok(entry.indexOf('import "./studio-sidebar-rescue-v251.js";') > entry.indexOf('import "./studio-native-authority-v250.css";'));
  assert.ok(entry.indexOf('import "./studio-sidebar-rescue-v251.css";') > entry.indexOf('import "./studio-sidebar-rescue-v251.js";'));
  assert.ok(activator.includes('ensureLastImport(source, "studio-sidebar-rescue-v251.js")'));
  assert.ok(activator.includes('ensureLastImport(source, "studio-sidebar-rescue-v251.css")'));
  assert.doesNotMatch(rescue, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});

test("profile is visible and exposes five distinct actions", () => {
  for (const marker of ["Profil","Pengaturan","Tambahkan situs","Lihat situs","Keluar","openProfile"]) assert.ok(runtime.includes(marker), marker);
  assert.match(css, /\.sn-avatar/);
  assert.match(css, /\.sn-profile-menu-v250/);
});

test("Nara native controls remain and small medium are non-modal", () => {
  for (const marker of ["<Camera />","<ImageIcon />","<File />","<MicOff />","SpeakerIcon","intelligenceOptions","modelOptions"]) assert.ok(nara.includes(marker), marker);
  assert.ok(runtime.includes("dataset.v250Interaction"));
  assert.ok(css.includes('.nara-assistant-layer[data-v250-interaction="nonmodal"]'));
  assert.ok(css.includes(".nara-attachment-menu"));
  assert.doesNotMatch(css, /\.nara-floating-button[^}]*animation:[^n]/);
});

test("Theme editor keeps device preview, real gutter, detailed areas and custom HTML widget", () => {
  for (const label of ["Aplikasi","Handphone","Mobile","Perangkat kecil","Tablet","Laptop","Situs desktop","Komputer"]) assert.ok(theme.includes(label), label);
  assert.ok(runtime.includes("tn-code-gutter-v250"));
  assert.ok(runtime.includes("LAYOUT_AREAS"));
  assert.ok(css.includes(".v250-layout-map"));
  if (widgets.includes("SIDEBAR_LEFT_SLOTS") && entry.includes("studio-theme-layout-v256.css")) {
    for (let index = 1; index <= 4; index += 1) {
      assert.ok(widgets.includes(`"sidebar-left-${index}"`), `v256 missing left ${index}`);
      assert.ok(widgets.includes(`"sidebar-right-${index}"`), `v256 missing right ${index}`);
    }
    assert.ok(widgets.includes("migrateLegacyArea"));
  } else {
    assert.equal((widgets.match(/id: \"(?:header-left|header-right|below-header|sidebar-left|before-content|after-content|sidebar-right|footer-left|footer-right|footer-wide)\"/g) || []).length, 10);
  }
  assert.ok(widgets.includes('id: "custom-html"'));
});

test("login remains persistent and generated membership gets official public fallback only before bundling", () => {
  for (const marker of ['flowType: "pkce"',"persistSession: true","autoRefreshToken: true","PRODUCTION_SUPABASE_PUBLISHABLE_KEY_V245"]) assert.ok(auth.includes(marker), marker);
  assert.ok(authReadiness.includes('import "./auth-provider-gateway-v250.js"'));
  assert.ok(provider.includes("/api/auth-proxy"));
  assert.ok(provider.includes("/auth/v1/authorize"));
  assert.ok(provider.includes("same-origin-auth-gateway"));
  for (const marker of [
    "studio-native-bundle-activation-v250-20260804",
    "polvmlrhqoiflumibfqs.supabase.co",
    "sb_publishable_Jqz6qDzX4IKSunPoDT5zyQ_sk6EK4W-",
    "listUserSitesDirectV192",
    "readPersistedSupabaseSessionV198",
    "Authorization: `Bearer ${accessToken}`",
    "direct-supabase-rls",
    "persisted-storage-first",
  ]) assert.ok(activator.includes(marker), marker);
  assert.doesNotMatch(runtime + provider + activator, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|supabase\.auth\.signOut\s*\(/);
  assert.doesNotMatch(activator, /service_role|SUPABASE_SERVICE_ROLE|sb_secret_/i);
});

test("v250 rotates cache only after proven v249 finalizer and protects auth surfaces", () => {
  assert.match(vite, /finalizeServiceWorkerV249/);
  assert.match(vite, /rotateServiceWorkerV250/);
  assert.ok(vite.indexOf("rotateServiceWorkerV250()") > vite.indexOf("finalizeServiceWorkerV249()"));
  for (const marker of [
    "ngeblogging-app-v250-native-bundle-20260804",
    "studio-native-bundle-cache-v250",
    "studio-native-bundle-v250-20260804",
    "NGE_BLOGGING_UPDATE_AVAILABLE_V250",
    "isAuthSurface(url)",
    "studioNativeBundleReleaseV250",
  ]) assert.ok(swRotate.includes(marker), marker);
  assert.doesNotMatch(swRotate, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});