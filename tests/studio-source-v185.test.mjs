import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("v185 patch is chained into development and production validation", () => {
  const chain = read("scripts/patch-service-worker-v179.mjs");
  assert.match(chain, /patch-studio-source-v185\.mjs/);
});

test("v185 preserves v180 and v183 production authorities", () => {
  const patch = read("scripts/patch-studio-source-v185.mjs");
  for (const marker of [
    "studio-bootstrap-resilient-v183",
    "Promise.allSettled",
    "direct-fallback-v180",
    "direct-supabase-oauth",
    "Koneksi komentar belum tersedia",
    "Situs aktif belum tersedia",
  ]) assert.ok(patch.includes(marker), `missing compatibility marker ${marker}`);
});

test("v185 resumes onboarding from the cached active workspace on transient failures", () => {
  const patch = read("scripts/patch-studio-source-v185.mjs");
  assert.match(patch, /window\.__ngebloggingActiveSite/);
  assert.match(patch, /cached-window-site-v185/);
  assert.match(patch, /isTransientStudioError/);
  assert.doesNotMatch(patch, /signOut\s*\(/);
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

test("v185 rotates cache without forced navigation", () => {
  const patch = read("scripts/patch-studio-source-v185.mjs");
  assert.match(patch, /ngeblogging-app-v185-mobile-authority-20260801/);
  assert.match(patch, /mobile-authority-cache-v185/);
  assert.match(patch, /FORCED_NAVIGATION_MUST_REMAIN_DISABLED/);
});
