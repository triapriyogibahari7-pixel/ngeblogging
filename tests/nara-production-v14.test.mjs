import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v14 Studio, v15 mobile, v16 repair, and final Nara authorities replace historical guard stacks", async () => {
  const index = await read("index.html");
  const v14 = index.indexOf("studio-v14-authority.css");
  const v15 = index.indexOf("studio-mobile-v15.css");
  const nara = index.indexOf("nara-interaction-authority.css");
  const v16 = index.indexOf("studio-v16-authority.css");
  assert.ok(v14 > -1);
  assert.ok(v15 > v14);
  assert.ok(nara > v15);
  assert.ok(v16 > nara);
  assert.match(index, /nara-command-center-bridge\.js/);
  for (const legacy of [
    "studio-runtime-layout-guard.js",
    "studio-mobile-navigation.js",
    "studio-production-guard.js",
    "nara-availability-bridge.js",
    "studio-v10-authority.css",
    "studio-v11-mobile-repair.css",
    "nara-interaction-guard.js",
  ]) assert.doesNotMatch(index, new RegExp(legacy.replaceAll(".", "\\.")));
});

test("Nara launcher and assistant remain visible clickable and above Studio", async () => {
  const css = await read("src/studio-v14-authority.css");
  const finalCss = await read("src/nara-interaction-authority.css");
  const secure = await read("src/StudioSecure.jsx");
  assert.match(css, /\.nara-floating-button[\s\S]*z-index: 24000 !important/);
  assert.match(css, /\.nara-assistant-layer[\s\S]*z-index: 30000 !important/);
  assert.match(finalCss, /pointer-events:\s*auto\s*!important/);
  assert.match(secure, /\.sn-top-actions \.sn-nara-button/);
  assert.match(secure, /button\.hidden = false/);
  assert.match(secure, /button\.disabled = false/);
});

test("only one left sidebar remains and Nara is outside the menu", async () => {
  const secure = await read("src/StudioSecure.jsx");
  const studio = await read("src/StudioNext.jsx");
  assert.equal((studio.match(/className="sn-icon"/g) || []).length, 1);
  assert.doesNotMatch(studio, /sn-mobile-nav|sn-mobile-sheet-layer|sn-side-bottom/);
  assert.match(secure, /sn-mobile-nav, :scope > \.sn-mobile-sheet-layer, \.sn-side-close, \.sn-side-bottom/);
  assert.match(secure, /dataset\.sidebarAuthority = "single"/);
  assert.match(secure, /dataset\.naraWorkspaceRoute = "true"/);
});

test("one Control Center keeps QR and all requested Nara capabilities reachable", async () => {
  const bridge = await read("src/nara-command-center-bridge.js");
  const css = await read("src/nara-command-center.css");
  for (const marker of ["Projects", "Memori", "Buat gambar", "Plugins", "Baca QR", "BarcodeDetector", "dedupe(shell)"]) {
    assert.ok(bridge.includes(marker), marker);
  }
  assert.match(bridge, /data-release/);
  assert.match(bridge, /node !== owner\) node\.remove\(\)/);
  assert.match(css, /\.nara-capability-shortcuts/);
});

test("plugin catalog includes GitHub Supabase Neon and Cloudflare", async () => {
  const data = await read("src/lib/nara-data.js");
  for (const provider of ["github", "supabase", "neon", "cloudflare"]) {
    assert.match(data, new RegExp(`id:\"?${provider}\"?`));
  }
});

test("PWA keeps the v16 cache authority and network-first navigation", async () => {
  const sw = await read("public/sw.js");
  const runtime = await read("src/pwa-runtime.js");
  assert.match(sw, /ngeblogging-app-v16-20260724/);
  assert.match(sw, /request\.mode === "navigate"/);
  assert.match(sw, /fetch\(request, \{ cache: "no-store" \}\)/);
  assert.match(runtime, /navigator\.serviceWorker\.register\("\/sw\.js"/);
  assert.doesNotMatch(runtime, /window\.location\.reload/);
});
