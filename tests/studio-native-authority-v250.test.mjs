import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-native-authority-v250.js");
const css = read("src/studio-native-authority-v250.css");
const onboarding = read("src/StudioOnboardingGate.jsx");
const auth = read("src/lib/supabase.js");
const authReadiness = read("src/auth-readiness-bridge.js");
const provider = read("src/auth-provider-gateway-v250.js");
const studio = read("src/StudioNext.jsx");
const nara = read("src/NaraAssistant.jsx");
const theme = read("src/ThemeStudio.jsx");
const widgets = read("src/widget-system.js");
const vite = read("vite.config.js");

const liveImport = (path) => new RegExp(`^\\s*import\\s+[\"']\\./${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\"'];?\\s*$`, "m").test(entry);

test("v250 owns one native React Studio shell and retires click competitors", () => {
  assert.equal(liveImport("studio-native-authority-v250.js"), true);
  assert.equal(liveImport("studio-native-authority-v250.css"), true);
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
  ]) assert.equal(liveImport(retired), false, `${retired} must stay backup-only`);
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

test("profile is visible and exposes five distinct actions", () => {
  for (const marker of ["Profil","Pengaturan","Tambahkan situs","Lihat situs","Keluar","openProfile"]) assert.ok(runtime.includes(marker), marker);
  assert.match(css, /\.sn-avatar/);
  assert.match(css, /\.sn-profile-menu-v250/);
});

test("Nara native controls remain and small medium are non-modal", () => {
  for (const marker of ["<Camera />","<ImageIcon />","<File />","<MicOff />","SpeakerIcon","intelligenceOptions","modelOptions"]) assert.ok(nara.includes(marker), marker);
  assert.ok(runtime.includes("data.v250Interaction"));
  assert.ok(css.includes('.nara-assistant-layer[data-v250-interaction="nonmodal"]'));
  assert.ok(css.includes(".nara-attachment-menu"));
  assert.doesNotMatch(css, /\.nara-floating-button[^}]*animation:[^n]/);
});

test("Theme editor keeps device preview, real gutter, 10 areas and custom HTML widget", () => {
  for (const label of ["Aplikasi","Handphone","Mobile","Perangkat kecil","Tablet","Laptop","Situs desktop","Komputer"]) assert.ok(theme.includes(label), label);
  assert.ok(runtime.includes("tn-code-gutter-v250"));
  assert.ok(runtime.includes("LAYOUT_AREAS"));
  assert.ok(css.includes(".v250-layout-map"));
  assert.equal((widgets.match(/id: \"(?:header-left|header-right|below-header|sidebar-left|before-content|after-content|sidebar-right|footer-left|footer-right|footer-wide)\"/g) || []).length, 10);
  assert.ok(widgets.includes('id: "custom-html"'));
});

test("login is persistent, OAuth has same-origin route, bootstrap is membership-first", () => {
  for (const marker of ['flowType: "pkce"',"persistSession: true","autoRefreshToken: true","PRODUCTION_SUPABASE_PUBLISHABLE_KEY_V245"]) assert.ok(auth.includes(marker), marker);
  assert.ok(authReadiness.includes('import "./auth-provider-gateway-v250.js"'));
  assert.ok(provider.includes("/api/auth-proxy"));
  assert.ok(provider.includes("/auth/v1/authorize"));
  assert.ok(provider.includes("same-origin-auth-gateway"));
  assert.ok(onboarding.includes("first-site-onboarding-v250-20260804"));
  assert.ok(onboarding.includes("Critical path: Supabase already owns persisted tokens. Read the user's sites first."));
  assert.ok(onboarding.includes("verifySessionDeferred(userId)"));
  assert.doesNotMatch(runtime + onboarding + provider, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/);
});

test("v250 is a build-time service-worker gate", () => {
  assert.match(vite, /finalizeServiceWorkerV250/);
  assert.match(vite, /ngeblogging-service-worker-v250/);
});
