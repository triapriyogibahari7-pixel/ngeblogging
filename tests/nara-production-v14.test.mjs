import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Nara final interaction authority is loaded after historical Studio styles", async () => {
  const index = await read("index.html");
  const legacy = index.indexOf("studio-v11-mobile-repair.css");
  const authority = index.indexOf("nara-interaction-authority.css");
  const guard = index.indexOf("nara-interaction-guard.js");
  const productionGuard = index.indexOf("studio-production-guard.js");
  assert.ok(legacy >= 0);
  assert.ok(authority > legacy);
  assert.ok(guard > authority);
  assert.ok(productionGuard > guard);
});

test("Nara launcher remains visible, clickable, and above legacy overlays", async () => {
  const css = await read("src/nara-interaction-authority.css");
  const guard = await read("src/nara-interaction-guard.js");
  assert.match(css, /\.nara-floating-button/);
  assert.match(css, /z-index:\s*2147483000\s*!important/);
  assert.match(css, /pointer-events:\s*auto\s*!important/);
  assert.match(css, /\.nara-assistant-layer/);
  assert.match(css, /width:\s*100vw\s*!important/);
  assert.match(guard, /pointerdown/);
  assert.match(guard, /document\.querySelector\("\.nara-floating-button"\)\?\.click\(\)/);
});

test("only the left sidebar is retained and Nara is not exposed as a sidebar route", async () => {
  const guard = await read("src/nara-interaction-guard.js");
  assert.match(guard, /\.sn-mobile-nav/);
  assert.match(guard, /\.sn-mobile-sheet-layer/);
  assert.match(guard, /\.sn-side-bottom/);
  assert.match(guard, /labelOf\(button\) !== "Nara AI"/);
  assert.match(guard, /dataset\.sidebarAuthority/);
  assert.match(guard, /dataset\.naraWorkspaceRoute/);
});

test("Nara Control Center and QR scanner remain reachable outside the sidebar", async () => {
  const guard = await read("src/nara-interaction-guard.js");
  const css = await read("src/nara-interaction-authority.css");
  assert.match(guard, /nara-control-center-button/);
  assert.match(guard, /Projects · Memory · Images · Plugins/);
  assert.match(guard, /nara-qr-button/);
  assert.match(guard, /Baca kode QR pada gambar ini/);
  assert.match(css, /\.nara-control-center-button/);
  assert.match(css, /\.nara-qr-glyph/);
});

test("Nara plugin catalog contains GitHub, Supabase, Neon, and Cloudflare", async () => {
  const data = await read("src/lib/nara-data.js");
  for (const provider of ["github", "supabase", "neon", "cloudflare"]) {
    assert.match(data, new RegExp(`id:\\"${provider}\\"`));
  }
});

test("PWA and Cloudflare release markers are v14", async () => {
  const sw = await read("public/sw.js");
  const wrangler = await read("wrangler.jsonc");
  const worker = await read("cloudflare/worker.mjs");
  assert.match(sw, /ngeblogging-app-v14-20260724/);
  assert.match(wrangler, /2026\.07\.24-studio-v14/);
  assert.match(worker, /release:\s*env\.APP_RELEASE/);
});
