import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const helper = read("server/system-shell-authority-v157.mjs");
const patcher = read("scripts/patch-legacy-worker-entry-v157.mjs");
const auth = read("src/lib/supabase.js");
const studio = read("src/StudioNext.jsx");

const legacyWorkers = [
  "cloudflare/worker.mjs",
  "cloudflare/worker-v22.mjs",
  "cloudflare/worker-v35.mjs",
  "cloudflare/worker-v37.mjs",
  "cloudflare/worker-v41.mjs",
];

test("legacy Cloudflare entries receive the v157 React shell authority", () => {
  for (const path of legacyWorkers) {
    const source = read(path);
    assert.ok(source.includes('import { tryServeSystemShellV157 } from "../server/system-shell-authority-v157.mjs";'), `${path} missing helper import`);
    assert.ok(source.includes("const systemShellV157 = await tryServeSystemShellV157(request, env);"), `${path} missing early shell call`);
    assert.ok(source.includes("if (systemShellV157) return systemShellV157;"), `${path} missing early shell return`);
  }
});

test("v157 serves only system shell and preserves API plus tenant traffic", () => {
  for (const marker of [
    "2026.07.30-system-shell-v157",
    "2026.07.30-auth-shell-v157",
    'new Set(["ngeblogging.com", "www.ngeblogging.com"])',
    'url.pathname.startsWith("/api/")',
    'new URL("/index.html", request.url)',
    "env.ASSETS.fetch",
    "no-store, max-age=0, must-revalidate",
    "/release-v157.json",
    "legacyWhiteR4: false",
  ]) assert.ok(helper.includes(marker), `helper missing ${marker}`);

  assert.ok(helper.includes("if (!isSystemHost(url)"));
  assert.ok(helper.includes("return null"));
  assert.ok(!helper.includes("WHITE-R4-2026.07.12"));
});

test("build patcher covers all previously used Worker authorities", () => {
  for (const path of legacyWorkers) assert.ok(patcher.includes(`"${path}"`), `patcher missing ${path}`);
  assert.ok(patcher.includes("Fetch authority tidak ditemukan"));
  assert.ok(patcher.includes("writeFileSync"));
});

test("auth providers, persistent sessions and complete Studio navigation remain intact", () => {
  for (const marker of [
    '"google"', '"linkedin_oidc"', "signInWithPassword", "signInWithMagicLink",
    "persistSession: true", "autoRefreshToken: true", "/api/auth-proxy",
  ]) assert.ok(auth.includes(marker), `auth missing ${marker}`);

  for (const label of [
    "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
    "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
  ]) assert.ok(studio.includes(`>${label}<`), `Studio menu missing ${label}`);
});
