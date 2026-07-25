import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v23 is the only active Studio and Nara responsive authority", async () => {
  const index = await read("index.html");
  const nara = index.indexOf("nara-interaction-authority.css");
  const v23 = index.indexOf("studio-responsive-v23.css");
  assert.ok(nara > -1);
  assert.ok(v23 > nara);
  assert.match(index, /studio-runtime-v23\.js/);
  assert.match(index, /nara-command-center-bridge\.js/);
  for (const legacy of ["studio-v14-authority.css", "studio-responsive-v21.css", "studio-responsive-v22.css", "studio-v22-final.css"]) {
    assert.match(index, new RegExp(`href="/src/${legacy.replaceAll(".", "\\.")}"[^>]+media="not all"`));
  }
  for (const legacy of [
    "studio-runtime-layout-guard.js",
    "studio-mobile-navigation.js",
    "studio-production-guard.js",
    "nara-availability-bridge.js",
    "studio-v10-authority.css",
    "studio-v11-mobile-repair.css",
    "nara-interaction-guard.js",
    "studio-mobile-v15.css",
    "studio-mobile-v16.css",
    "studio-mobile-v17.css",
    "studio-mobile-v18.css",
    "studio-mobile-v19.css",
    "studio-mobile-v20.css",
    "nara-launcher-v20.js",
  ]) assert.doesNotMatch(index, new RegExp(`<script[^>]+${legacy.replaceAll(".", "\\.")}|<link[^>]+${legacy.replaceAll(".", "\\.")}`));
});

test("Nara launcher remains clickable, singular, centered, and full viewport on phones", async () => {
  const css = await read("src/studio-responsive-v23.css");
  const runtime = await read("src/studio-runtime-v23.js");
  const secure = await read("src/StudioSecure.jsx");
  const assistant = await read("src/NaraAssistant.jsx");
  assert.match(css, /\.nara-floating-button[\s\S]*place-items: center !important/);
  assert.match(css, /data-physical-phone="true"\] \.nara-assistant-layer[\s\S]*100dvh/);
  assert.match(runtime, /dataset\.naraLauncherAuthority = "single-v23"/);
  assert.match(runtime, /launchers\.forEach\(\(button, index\)/);
  assert.match(runtime, /button\.hidden = false/);
  assert.match(runtime, /button\.disabled = false/);
  assert.match(secure, /\.sn-top-actions \.sn-nara-button, \.ce-nara/);
  assert.match(css, /data-nara-open="true"\] \.nara-floating-button/);
  assert.match(assistant, /className="nara-floating-button" onClick=\{\(\) => setOpen\(true\)\}/);
});

test("only one left sidebar remains and Nara is outside the menu", async () => {
  const secure = await read("src/StudioSecure.jsx");
  const studio = await read("src/StudioNext.jsx");
  const runtime = await read("src/studio-runtime-v23.js");
  assert.equal((studio.match(/className="sn-icon"/g) || []).length, 1);
  assert.doesNotMatch(studio, /sn-mobile-nav|sn-mobile-sheet-layer|sn-side-bottom/);
  assert.match(secure, /sn-mobile-nav, :scope > \.sn-mobile-sheet-layer, \.sn-side-close, \.sn-side-bottom/);
  assert.match(runtime, /button\.dataset\.naraWorkspaceRoute = "true"/);
  assert.match(runtime, /toggle\.dataset\.sidebarAuthority = "single-v23"/);
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

test("PWA keeps v23 cache authority and network-first navigation", async () => {
  const sw = await read("public/sw.js");
  const runtime = await read("src/pwa-runtime.js");
  assert.match(sw, /ngeblogging-app-v23-20260725/);
  assert.match(sw, /request\.mode === "navigate"/);
  assert.match(sw, /fetch\(request, \{ cache: "no-store" \}\)/);
  assert.match(runtime, /ngeblogging-pwa-v23-20260725/);
  assert.match(runtime, /navigator\.serviceWorker\.register\("\/sw\.js"/);
  assert.doesNotMatch(runtime, /window\.location\.reload/);
});

test("Nara text fallback remains wired through the Cloudflare production worker", async () => {
  const config = await read("wrangler.production.jsonc");
  const worker = await read("cloudflare/worker-v22.mjs");
  assert.match(config, /worker-v22\.mjs/);
  assert.match(worker, /TEXT_FALLBACK_MODELS/);
  assert.match(worker, /originalResponse\.status/);
  assert.match(worker, /Nara Edge Cadangan/);
});
