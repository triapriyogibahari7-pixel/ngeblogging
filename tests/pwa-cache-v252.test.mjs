import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const sw = read("public/sw.js");

test("post-regression service worker is v252", () => {
  for (const marker of [
    "ngeblogging-app-v252-source-stability-20260804",
    "source-stability-cache-v252",
    "source-stability-v252",
    "pwa-source-stability-v252-20260804",
    "NGE_BLOGGING_UPDATE_AVAILABLE_V252",
  ]) assert.ok(sw.includes(marker), `missing ${marker}`);
});

test("v252 keeps auth surfaces and removes forced refresh calls", () => {
  for (const marker of [
    'url.pathname === "/login"',
    'url.pathname === "/signup"',
    'url.pathname === "/signin"',
    'authMode === "callback"',
    'authMode === "recovery"',
    "SHELL_CACHE",
    "ASSET_CACHE",
    "caches.delete",
  ]) assert.ok(sw.includes(marker), `missing ${marker}`);
  assert.doesNotMatch(sw, /await\s+refreshStaleWindow\s*\(/);
});
