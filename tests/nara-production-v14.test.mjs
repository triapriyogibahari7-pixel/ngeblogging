import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("final Nara authority loads after historical styles and guards", async () => {
  const index = await read("index.html");
  assert.ok(index.indexOf("nara-interaction-authority.css") > index.indexOf("studio-v11-mobile-repair.css"));
  assert.ok(index.indexOf("nara-interaction-guard.js") > index.indexOf("studio-production-guard.js"));
});

test("Nara launcher is visible clickable and above legacy overlays", async () => {
  const css = await read("src/nara-interaction-authority.css");
  const guard = await read("src/nara-interaction-guard.js");
  assert.match(css, /z-index:\s*2147483000\s*!important/);
  assert.match(css, /pointer-events:\s*auto\s*!important/);
  assert.match(css, /\.nara-assistant-layer/);
  assert.match(guard, /pointerdown/);
  assert.match(guard, /\.nara-floating-button"\)\?\.click\(\)/);
});

test("only one left sidebar remains and Nara is outside the menu", async () => {
  const guard = await read("src/nara-interaction-guard.js");
  assert.match(guard, /\.sn-mobile-nav/);
  assert.match(guard, /\.sn-mobile-sheet-layer/);
  assert.match(guard, /\.sn-side-bottom/);
  assert.match(guard, /dataset\.sidebarAuthority/);
  assert.match(guard, /dataset\.naraWorkspaceRoute/);
});

test("Control Center QR and complete capabilities remain reachable", async () => {
  const guard = await read("src/nara-interaction-guard.js");
  const css = await read("src/nara-interaction-authority.css");
  assert.match(guard, /nara-control-center-button/);
  assert.match(guard, /Projects · Memory · Images · Plugins/);
  assert.match(guard, /nara-qr-button/);
  assert.match(guard, /Baca kode QR pada gambar ini/);
  assert.match(guard, /Model · Kecerdasan · File · Gambar · Suara · QR/);
  assert.match(css, /\.nara-control-center-button/);
  assert.match(css, /\.nara-qr-glyph/);
});

test("plugin catalog includes GitHub Supabase Neon and Cloudflare", async () => {
  const data = await read("src/lib/nara-data.js");
  for (const provider of ["github", "supabase", "neon", "cloudflare"]) {
    assert.match(data, new RegExp(`id:\"${provider}\"`));
  }
});

test("PWA keeps the current v13 cache authority and network-first navigation", async () => {
  const sw = await read("public/sw.js");
  assert.match(sw, /ngeblogging-app-v13-20260724/);
  assert.match(sw, /request\.mode === "navigate"/);
  assert.match(sw, /fetch\(request, \{ cache: "no-store" \}\)/);
});
