import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const gate = read("src/StudioOnboardingGate.jsx");
const gateCss = read("src/studio-first-site-v169.css");
const recovery = read("src/studio-recovery-v150.js");
const recoveryCss = read("src/studio-recovery-v150.css");
const policy = read("src/lib/site-policy-v169.js");
const migration = read("supabase/migrations/20260730093000_site_limit_25_v169.sql");
const fastGate = read("src/StudioFastGate.jsx");
const worker = read("cloudflare/worker-v69.mjs");
const serviceWorker = read("public/sw.js");
const release = JSON.parse(read("public/release-v169.json"));

const TYPES = [
  ["blog", "Blog"],
  ["website", "Website"],
  ["news", "Portal berita"],
  ["forum", "Forum"],
  ["community", "Komunitas"],
  ["landing", "Landing page"],
  ["diary", "Diary / jurnal"],
  ["portfolio", "Portofolio"],
  ["profile", "Profil"],
  ["knowledge", "Knowledge base"],
  ["general-knowledge", "Pengetahuan umum"],
];

test("v169 keeps first-site onboarding before Studio", () => {
  assert.ok(fastGate.includes("StudioOnboardingGate"));
  assert.ok(fastGate.includes('dataset.studioEntryMode = "verify-first-site"'));
  assert.ok(gate.includes('if (phase === "ready") return <StudioSecure'));
  assert.ok(gate.includes('if (phase === "onboarding") return <FirstSiteOnboarding'));
  assert.ok(gate.includes("Studio baru dibuka setelah situs nyata berhasil dibuat"));
  assert.ok(gate.includes("Tidak ada situs yang dibuat otomatis dari alamat email"));
});

test("v169 onboarding contains every requested site type and required preference", () => {
  for (const [value, label] of TYPES) {
    assert.ok(gate.includes(`value: "${value}"`), `missing type ${value}`);
    assert.ok(gate.includes(`label: "${label}"`), `missing label ${label}`);
  }
  for (const marker of [
    "Nama situs", "Subdomain gratis", "Deskripsi singkat", "Tema awal", "Bahasa", "Zona waktu",
    "is_site_slug_available", ".ngeblogging.com", "initial_theme", "onboarding_completed_at",
  ]) assert.ok(gate.includes(marker), `onboarding missing ${marker}`);
});

test("v169 enforces a factual maximum of 25 owned sites in UI data layer and database", () => {
  for (const marker of [
    "MAX_SITES_PER_ACCOUNT = 25", "SITE_LIMIT_REACHED_25", "getSiteQuota", "createUserSiteWithPolicy",
    'site.role || ""', "ownedSites.length",
  ]) assert.ok(policy.includes(marker), `policy missing ${marker}`);
  assert.ok(gate.includes("MAX_SITES_PER_ACCOUNT"));
  assert.ok(gate.includes("quota.canCreate"));
  assert.ok(recovery.includes("MAX_SITES_PER_ACCOUNT"));
  assert.ok(recovery.includes("getSiteQuota"));
  assert.ok(migration.includes("owned_sites >= 25"));
  assert.ok(migration.includes("before insert on public.sites"));
  assert.ok(migration.includes("SITE_LIMIT_REACHED_25"));
});

test("v169 makes the created site active but does not publish it without consent", () => {
  for (const marker of [
    "setActiveSiteId(site.id)", "active-site-ready", "active-site-change",
    "tetap berstatus draf dan privat", "tidak dipublikasikan tanpa persetujuan",
  ]) assert.ok(gate.toLowerCase().includes(marker.toLowerCase()), `active-site contract missing ${marker}`);
  assert.match(gate, /publishActiveSite\(selected(?:,\s*user\?\.id)?\)/);
});

test("profile dropdown contains a working install-app path and explicit logout", () => {
  for (const marker of [
    "Dapatkan aplikasi", "beforeinstallprompt", "appinstalled", "installApplication", "prompt.userChoice",
    "Tambahkan ke layar utama", "data-action=\"logout\"", ".sn-account-logout-v135",
  ]) assert.ok(recovery.includes(marker), `profile/install missing ${marker}`);
  assert.ok(recoveryCss.includes("max-height:min(520px,calc(100dvh - 84px))"));
  assert.ok(recoveryCss.includes("overflow:auto"));
});

test("first-site surfaces prevent horizontal overflow and respect safe areas", () => {
  for (const marker of [
    "min-width:0", "max-width:100%", "overflow-x:hidden", "env(safe-area-inset-top)",
    "env(safe-area-inset-bottom)", "grid-template-columns:1fr", "prefers-reduced-motion",
  ]) assert.ok(`${gateCss}\n${recoveryCss}`.includes(marker), `responsive onboarding missing ${marker}`);
});

test("production probe and Worker publish the v169 contract", () => {
  assert.equal(release.status, "ok");
  assert.equal(release.release, "first-site-onboarding-v169-20260730");
  assert.equal(release.maxSitesPerAccount, 25);
  assert.equal(release.firstSiteBeforeStudio, true);
  assert.equal(release.firstSiteCreatedAutomaticallyFromEmail, false);
  assert.equal(release.activeWorkspaceAfterCreate, true);
  assert.equal(release.autoPublishAfterCreate, false);
  assert.equal(release.installAppProfileAction, true);
  assert.equal(release.legacyWhiteR4, false);
  for (const marker of [
    "FIRST_SITE_RELEASE", "SITE_POLICY_RELEASE", "/release-v169.json", "maxSitesPerAccount: 25",
    "firstSiteBeforeStudio: true", "installAppProfileAction: true", "x-ngeblogging-first-site",
  ]) assert.ok(worker.includes(marker), `worker missing ${marker}`);
});

test("PWA cache keeps the v169 first-site contract under v192 auth/bootstrap authority without caching auth callbacks", () => {
  for (const marker of [
    "ngeblogging-app-v192-auth-studio-bootstrap-20260801", "auth-studio-bootstrap-cache-v192",
    "AUTH_STUDIO_BOOTSTRAP_RELEASE_V192", "first-site-onboarding-v169-20260730", "site-policy-v169-20260730",
    'url.pathname === "/login"', 'url.pathname.startsWith("/auth/")', "networkFirst(request",
  ]) assert.ok(serviceWorker.includes(marker), `service worker missing ${marker}`);
  assert.doesNotMatch(serviceWorker, /await refreshStaleWindow\(client, url\);/);
});