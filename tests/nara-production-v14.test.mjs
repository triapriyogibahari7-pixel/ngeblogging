import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("final Nara authority loads after the single Studio v14 authority", async () => {
  const index = await read("index.html");
  assert.ok(index.indexOf("studio-v14-authority.css") > -1);
  assert.ok(index.indexOf("nara-interaction-authority.css") > index.indexOf("studio-v14-authority.css"));
  assert.doesNotMatch(index, /studio-production-guard\.js|nara-interaction-guard\.js|nara-availability-bridge\.js/);
});

test("Nara launcher is visible clickable and above application overlays", async () => {
  const css = await read("src/nara-interaction-authority.css");
  const studioCss = await read("src/studio-v14-authority.css");
  assert.match(css, /z-index:\s*2147483000\s*!important/);
  assert.match(css, /pointer-events:\s*auto\s*!important/);
  assert.match(css, /\.nara-assistant-layer/);
  assert.match(studioCss, /\.nara-floating-button/);
  assert.match(studioCss, /touch-action: manipulation !important/);
});

test("only one left sidebar remains and Nara is outside the menu", async () => {
  const secure = await read("src/StudioSecure.jsx");
  const css = await read("src/studio-v14-authority.css");
  assert.match(secure, /\.sn-mobile-nav, :scope > \.sn-mobile-sheet-layer, \.sn-side-close, \.sn-side-bottom/);
  assert.match(secure, /dataset\.sidebarAuthority = "single"/);
  assert.match(secure, /dataset\.naraWorkspaceRoute = "true"/);
  assert.match(secure, /\.sn-top-actions \.sn-nara-button/);
  assert.match(css, /\[data-nara-workspace-route="true"\]/);
  assert.match(css, /\.sn-mobile-nav,[\s\S]*\.sn-side-bottom/);
});

test("Control Center QR and complete capabilities remain reachable", async () => {
  const commandCenter = await read("src/nara-command-center-bridge.js");
  const css = await read("src/nara-command-center.css");
  for (const marker of ["Projects", "Memori", "Buat gambar", "Plugins", "Baca QR", "BarcodeDetector", "Baca kode QR pada gambar ini", "openWorkspace"]) {
    assert.ok(commandCenter.includes(marker), marker);
  }
  assert.match(css, /\.nara-capability-shortcuts/);
  assert.match(css, /\.nara-capability-shortcut/);
});

test("plugin catalog includes GitHub Supabase Neon and Cloudflare", async () => {
  const data = await read("src/lib/nara-data.js");
  for (const provider of ["github", "supabase", "neon", "cloudflare"]) {
    assert.match(data, new RegExp(`id:\"${provider}\"`));
  }
});

test("PWA keeps the current v14 cache authority and network-first navigation", async () => {
  const sw = await read("public/sw.js");
  assert.match(sw, /ngeblogging-app-v14-20260724/);
  assert.match(sw, /request\.mode === "navigate"/);
  assert.match(sw, /fetch\(request, \{ cache: "no-store" \}\)/);
});
