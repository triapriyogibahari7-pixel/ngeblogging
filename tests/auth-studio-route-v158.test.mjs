import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const bootstrap = read("src/auth-studio-bootstrap-v106.js");
const helper = read("server/system-shell-authority-v157.mjs");
const worker = read("cloudflare/worker-v69.mjs");
const compatibilityWorker = read("cloudflare/worker-v68.mjs");
const netlify = read("scripts/write-netlify-redirects.mjs");
const auth = read("src/lib/supabase.js");
const studio = read("src/StudioNext.jsx");
const deviceModes = read("src/studio-device-mode-v140.js");
const completion = read("src/studio-completion-v151.js");
const naraCss = read("src/nara-nonmodal-v151.css");
const comments = read("public/comments-v93.js");
const release = JSON.parse(read("public/release-v158.json"));

const studioRoutes = ["/studio", "/dashboard", "/workspace"];

test("successful sessions use the v162 handoff while preserving the dedicated v158 Studio route", () => {
  assert.match(bootstrap, /AUTH_HANDOFF_RELEASE = "auth-studio-route-v162-20260730"/);
  assert.match(bootstrap, /AUTH_SUCCESS_VALUE = "v162"/);
  assert.match(bootstrap, /const STUDIO_ROUTES = new Set\(\["\/studio", "\/dashboard", "\/workspace"\]\)/);
  assert.match(bootstrap, /new URL\("\/studio", window\.location\.origin\)/);
  assert.match(bootstrap, /target\.searchParams\.set\("auth_success", AUTH_SUCCESS_VALUE\)/);
  assert.match(bootstrap, /needsStudioHandoff/);
  assert.ok(!bootstrap.includes('const target = new URL("/", window.location.origin)'));
});

test("Cloudflare modern and legacy authorities serve every Studio route from React", () => {
  for (const route of studioRoutes) {
    assert.ok(helper.includes(`"${route}"`), `legacy helper missing ${route}`);
    assert.ok(worker.includes(`"${route}"`), `worker v69 missing ${route}`);
  }
  for (const marker of [
    "/release-v158.json",
    "react-dist-index",
    "no-store, max-age=0, must-revalidate",
    "legacyWhiteR4: false",
  ]) {
    assert.ok(helper.includes(marker), `legacy helper missing ${marker}`);
    assert.ok(worker.includes(marker), `worker v69 missing ${marker}`);
  }
  assert.ok(helper.includes("2026.07.30-auth-studio-route-v158"));
  assert.ok(compatibilityWorker.includes("2026.07.30-auth-studio-route-v158"));
  assert.ok(worker.includes("2026.07.30-studio-route-v160"));
  assert.match(helper, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(worker, /url\.pathname\.startsWith\("\/api\/"\)/);
});

test("Netlify publishes Studio routes no-cache headers and compatible probes", () => {
  for (const route of studioRoutes) assert.ok(netlify.includes(route), `Netlify missing ${route}`);
  for (const marker of [
    "X-Ngeblogging-Studio-Route",
    "release-v158.json",
    "release-v160.json",
    "2026.07.30-studio-route-v160",
    "legacyWhiteR4: false",
    "/*       /index.html",
  ]) assert.ok(netlify.includes(marker), `Netlify missing ${marker}`);
});

test("Google LinkedIn email and persistent sessions remain enabled", () => {
  for (const marker of [
    '"google"',
    '"linkedin_oidc"',
    "signInWithPassword",
    "signInWithMagicLink",
    "persistSession: true",
    "autoRefreshToken: true",
    "detectSessionInUrl: false",
    "/api/auth-proxy",
  ]) assert.ok(auth.includes(marker), `auth missing ${marker}`);
});

test("six responsive families plus laptop and computer variants remain protected", () => {
  for (const mode of ["application", "phone", "mobile", "compact", "tablet", "desktop"]) {
    assert.ok(deviceModes.includes(`"${mode}"`), `device mode missing ${mode}`);
  }
  assert.match(deviceModes, /return "laptop"/);
  assert.match(deviceModes, /return "computer"/);
});

test("complete sidebar onboarding editor comments and nonmodal Nara remain intact", () => {
  for (const label of [
    "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
    "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
  ]) assert.ok(studio.includes(`>${label}<`), `Studio menu missing ${label}`);
  for (const blueprint of ["Blog", "Website", "Portal berita", "Portofolio", "Forum", "Komunitas", "Landing page", "Profil", "Knowledge base"]) {
    assert.ok(studio.includes(`>${blueprint}<`), `onboarding missing ${blueprint}`);
  }
  assert.match(studio, /Menyiapkan 100 tema/);
  assert.match(completion, /MAX_EDITOR_WORDS = 5000/);
  assert.match(naraCss, /data-nara-interaction="small"/);
  assert.match(naraCss, /data-nara-interaction="medium"/);
  assert.match(naraCss, /pointer-events:none!important/);
  assert.match(comments, /Belum ada komentar\. Jadilah yang pertama membuka diskusi\./);
});

test("static v158 probe continues to describe the compatible authentication handoff contract", () => {
  assert.equal(release.status, "ok");
  assert.equal(release.release, "2026.07.30-auth-studio-route-v158");
  assert.equal(release.authHandoff, "/studio");
  assert.deepEqual(release.studioRoutes, studioRoutes);
  assert.equal(release.sessionPersistence, true);
  assert.equal(release.legacyWhiteR4, false);
});
