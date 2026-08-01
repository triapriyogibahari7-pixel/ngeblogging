import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("v185 loads directly after the established v183 production authority", () => {
  const entry = read("src/Studio.jsx");
  const v183 = entry.indexOf('import "./studio-production-v183-controls.css";');
  const v185 = entry.indexOf('import "./studio-mobile-authority-v185.js";');
  assert.ok(v183 >= 0);
  assert.ok(v185 > v183);
});

test("v180 and v183 continue to own auth, active-site bootstrap and loading recovery", () => {
  const v180 = read("scripts/patch-production-recovery-v180.mjs");
  const v183 = read("scripts/patch-studio-production-v183.mjs");
  for (const marker of ["direct-fallback-v180", "direct-supabase-oauth", "Situs aktif belum tersedia", "Koneksi komentar belum tersedia"]) {
    assert.ok(v180.includes(marker), `missing v180 authority ${marker}`);
  }
  for (const marker of ["studio-bootstrap-resilient-v183", "Promise.allSettled", "ACTIVE_SITE_SNAPSHOT_V183", "ngeblogging:active-site-ready"]) {
    assert.ok(v183.includes(marker), `missing v183 authority ${marker}`);
  }
});

test("v185 mobile authority protects drawer, editor, media, themes and Nara", () => {
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

test("v185 does not reintroduce a forced service-worker navigation", () => {
  const chain = read("scripts/patch-service-worker-v179.mjs");
  assert.doesNotMatch(chain, /patch-studio-source-v185/);
  assert.doesNotMatch(chain, /await refreshStaleWindow\(client, url\);/);
});
