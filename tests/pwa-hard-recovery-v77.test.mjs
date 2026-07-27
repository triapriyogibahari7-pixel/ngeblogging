import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("service worker v77 claims and navigates stale windows exactly once", async () => {
  const worker = await read("public/sw.js");
  for (const marker of [
    'const VERSION = "ngeblogging-app-v77-20260727"',
    'self.clients.matchAll({ type: "window", includeUncontrolled: true })',
    'NGE_BLOGGING_FORCE_RELOAD_V77',
    'url.searchParams.set(RECOVERY_QUERY, RECOVERY_VALUE)',
    'await client.navigate(url.href)',
    'await self.clients.claim()',
    'cache: "no-store"',
  ]) assert.ok(worker.includes(marker), marker);
  assert.ok(worker.includes('url.searchParams.get(RECOVERY_QUERY) === RECOVERY_VALUE'));
  assert.ok(worker.includes('isSensitiveAuthCallback(url)'));
});

test("browser runtime reloads after controller takeover without entering a loop", async () => {
  const runtime = await read("src/pwa-runtime.js");
  for (const marker of [
    'const RELEASE = "ngeblogging-pwa-v77-20260727"',
    'ngeblogging-pwa-controller-v77',
    'navigator.serviceWorker.addEventListener("controllerchange"',
    'NGE_BLOGGING_FORCE_RELOAD_V77',
    'sessionStorage.setItem(CONTROLLER_GUARD, RECOVERY_VALUE)',
    'window.location.replace(url.href)',
    'updateViaCache: "none"',
  ]) assert.ok(runtime.includes(marker), marker);
  assert.ok(runtime.includes('url.searchParams.get(RECOVERY_QUERY) === RECOVERY_VALUE'));
  assert.ok(runtime.includes('sensitiveAuthCallback()'));
});
