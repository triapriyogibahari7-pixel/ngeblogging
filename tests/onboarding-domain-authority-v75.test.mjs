import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("new users choose site identity after an authenticated session is verified", async () => {
  const [studio, gate] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/StudioOnboardingGate.jsx"),
  ]);
  assert.ok(studio.includes('StudioOnboardingGate.jsx'));
  for (const marker of [
    "first-site-onboarding-v76-20260727",
    "Pilih jenis situs",
    "Nama situs dan subdomain tidak diambil dari email",
    "Subdomain gratis",
    "Portal berita",
    "Forum",
    "Komunitas",
    "Landing page",
    "Diary",
    "createUserSite",
    "is_site_slug_available",
    "Tidak ada situs yang dibuat otomatis",
    "getVerifiedSession({ force: true })",
    "isSessionReauthError",
    "ngeblogging:session-invalid",
  ]) assert.ok(gate.includes(marker), marker);
  assert.doesNotMatch(gate, /email\?\.split|email\.split|Studio`|Studio"/);
  assert.ok(gate.includes('if (site) { publishActiveSite(site); setPhase("ready"); } else setPhase("onboarding")'));
  assert.ok(gate.includes('if (phase === "ready") return <StudioSecure'));
  assert.ok(gate.includes('if (phase === "onboarding") return <FirstSiteOnboarding'));
});

test("domain authority v75 remains the only visible domain owner", async () => {
  const [source, index] = await Promise.all([
    read("src/domain-authority-v75.js"),
    read("index.html"),
  ]);
  for (const marker of [
    "domain-authority-v75-20260727",
    "DEADLINE_MS = 10_000",
    "domainAuthoritySuperseded",
    "Subdomain gratis · tetap ada",
    "Tidak memakai Cloudflare for SaaS",
    "dua nameserver",
    "Panel domain berhenti menunggu.",
    "Full Zone gratis",
    "ngeblogging-free-preview=1",
    "/api/domains/register",
    "/api/domains/refresh",
    "/api/domains/address",
  ]) assert.ok(source.toLowerCase().includes(marker.toLowerCase()), marker);
  assert.doesNotMatch(source, /Memuat domain situs…|class="dfz-loading"/);
  assert.ok(source.includes("Promise.race"));
  assert.ok(source.includes("child.hidden = true"));
  assert.ok(source.includes("controller.root.hidden = false"));

  for (const legacy of [
    "domain-free-subdomain-recovery-v73.js",
    "domain-full-zone-v54.js",
    "studio-domain-v41.js",
    "domain-layout-authority-v56.js",
    "domain-experience-authority-v59.js",
    "domain-feedback-authority-v60.js",
    "domain-mobile-precision-v61.js",
    "domain-operation-authority-v65.js",
  ]) {
    assert.ok(index.includes(`type="application/x-disabled" src="/src/${legacy}"`), `${legacy} must be disabled`);
    assert.ok(!index.includes(`type="module" src="/src/${legacy}"`), `${legacy} must not execute`);
  }
  assert.ok(index.includes('name="ngeblogging-domain-authority" content="single-domain-authority-v76"'));
});

test("revoked Supabase sessions refresh once, clear stale storage, and return to sign in", async () => {
  const [helper, authority, index] = await Promise.all([
    read("src/lib/auth-session-v76.js"),
    read("src/auth-session-authority-v76.js"),
    read("index.html"),
  ]);
  for (const marker of [
    "auth-session-authority-v76-20260727",
    "supabase.auth.getUser(session.access_token)",
    "supabase.auth.refreshSession(data.session)",
    'supabase.auth.signOut({ scope: "local" })',
    "SESSION_REAUTH_REQUIRED",
    "session_not_found",
    "clearPersistedAuthStorage",
  ]) assert.ok(helper.includes(marker), marker);
  for (const marker of [
    "ngeblogging:session-invalid",
    "auth=session-expired",
    "window.location.replace",
    "clearInvalidLocalSession",
  ]) assert.ok(authority.includes(marker), marker);
  assert.ok(index.includes('<script type="module" src="/src/auth-session-authority-v76.js"></script>'));
  assert.ok(index.indexOf("auth-session-authority-v76.js") < index.indexOf("/src/main.jsx"));
});

test("v76 invalidates stale PWA caches while retaining v75 compatibility", async () => {
  const [gate, worker] = await Promise.all([
    read("src/StudioOnboardingGate.jsx"),
    read("public/sw.js"),
  ]);
  assert.ok(gate.includes('import "./domain-authority-v75.js"'));
  assert.ok(gate.includes('import "./domain-authority-v75.css"'));
  assert.ok(gate.includes('import "./site-onboarding-v75.css"'));
  assert.ok(worker.includes('const VERSION = "ngeblogging-app-v76-20260727"'));
  assert.ok(worker.includes("ngeblogging-app-v75-20260727"));
  assert.ok(worker.includes("ngeblogging-app-v74-20260727"));
});
