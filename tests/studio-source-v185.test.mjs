import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("v185 patch is chained into every development and production validation path", () => {
  const chain = read("scripts/patch-service-worker-v179.mjs");
  assert.match(chain, /patch-studio-source-v185\.mjs/);
});

test("v185 keeps an active-site snapshot and restores Studio during transient network failures", () => {
  const patch = read("scripts/patch-studio-source-v185.mjs");
  for (const marker of [
    "ACTIVE_SITE_SNAPSHOT_KEY",
    "getActiveSiteSnapshot",
    "setActiveSiteSnapshot",
    "studio-bootstrap-primary-first-v185",
    "Promise.allSettled",
    "cached-site-recovery-v185",
  ]) assert.ok(patch.includes(marker), `missing ${marker}`);
});

test("v185 ends no-site loading and provides a direct auth fallback", () => {
  const patch = read("scripts/patch-studio-source-v185.mjs");
  assert.match(patch, /Situs aktif belum tersedia/);
  assert.match(patch, /Koneksi komentar belum tersedia/);
  assert.match(patch, /auth-direct-fallback-v185/);
  assert.match(patch, /direct-oauth-v185/);
});

test("v185 mobile authority protects drawer, editor, media, themes, and Nara", () => {
  const css = read("src/studio-mobile-authority-v185.css");
  const runtime = read("src/studio-mobile-authority-v185.js");
  for (const marker of [
    ".sn-side.mobile-open",
    ".sn-side-backdrop",
    ".sn-media-tools nav",
    ".ce-titlebar",
    ".ce-workspace",
    ".tn-hero-actions",
    ".nara-assistant-layer",
  ]) assert.ok(css.includes(marker), `missing CSS contract ${marker}`);
  for (const marker of [
    "normalizeDrawer",
    "normalizeNara",
    "normalizeMediaTools",
    "revealThemeActions",
  ]) assert.ok(runtime.includes(marker), `missing runtime contract ${marker}`);
});
