import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("new users choose site identity instead of receiving an email-derived site", async () => {
  const [studio, gate] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/StudioOnboardingGate.jsx"),
  ]);
  assert.ok(studio.includes('StudioOnboardingGate.jsx'));
  for (const marker of [
    "first-site-onboarding-v75-20260727",
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
  ]) assert.ok(gate.includes(marker), marker);
  assert.doesNotMatch(gate, /email\?\.split|email\.split|Studio`|Studio"/);
  assert.ok(gate.includes('if (site) { publishActiveSite(site); setPhase("ready"); } else setPhase("onboarding")'));
  assert.ok(gate.includes('if (phase === "ready") return <StudioSecure'));
  assert.ok(gate.includes('if (phase === "onboarding") return <FirstSiteOnboarding'));
});

test("domain authority v75 owns the visible page and never renders the legacy infinite spinner", async () => {
  const source = await read("src/domain-authority-v75.js");
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
});

test("v75 assets are imported by the Studio gate and stale PWA caches are invalidated", async () => {
  const [gate, worker] = await Promise.all([
    read("src/StudioOnboardingGate.jsx"),
    read("public/sw.js"),
  ]);
  assert.ok(gate.includes('import "./domain-authority-v75.js"'));
  assert.ok(gate.includes('import "./domain-authority-v75.css"'));
  assert.ok(gate.includes('import "./site-onboarding-v75.css"'));
  assert.ok(worker.includes('const VERSION = "ngeblogging-app-v75-20260727"'));
  assert.ok(worker.includes("ngeblogging-app-v74-20260727"));
});
