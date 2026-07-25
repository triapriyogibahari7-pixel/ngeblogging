import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v23 is the only active responsive Studio authority", async () => {
  const index = await read("index.html");
  const secure = await read("src/StudioSecure.jsx");
  assert.match(index, /studio-responsive-v23\.css/);
  assert.match(index, /studio-runtime-v23\.js/);
  for (const legacy of ["studio-v14-authority.css", "studio-responsive-v21.css", "studio-responsive-v22.css", "studio-v22-final.css"]) {
    assert.match(index, new RegExp(`${legacy.replaceAll(".", "\\.")}[^>]+media="not all"`));
  }
  assert.doesNotMatch(secure, /import\s+["']\.\/studio-responsive-v21\.css["']/);
  assert.doesNotMatch(secure, /import\s+["']\.\/studio-responsive-v22\.css["']/);
  assert.doesNotMatch(secure, /import\s+["']\.\/studio-v22-final\.css["']/);
  assert.match(secure, /import\s+["']\.\/studio-responsive-v23\.css["']/);
});

test("v23 keeps one left rail, one toggle, and no bottom navigation", async () => {
  const runtime = await read("src/studio-runtime-v23.js");
  const css = await read("src/studio-responsive-v23.css");
  assert.match(runtime, /dataset\.sidebarAuthority = "single-v23"/);
  assert.match(runtime, /sn-sidebar-scrim-v23/);
  assert.match(runtime, /Tata Letak/);
  assert.match(runtime, /\.sn-mobile-nav, :scope > \.sn-mobile-sheet-layer, \.sn-side-close, \.sn-side-bottom/);
  assert.match(css, /--sn-v23-rail: 64px/);
  assert.match(css, /\.sn-side\.collapsed > nav > button[\s\S]*place-items: center !important/);
  assert.match(css, /\.sn-mobile-nav,[\s\S]*\.sn-side-bottom[\s\S]*display: none !important/);
});

test("v23 removes header and editor Nara duplicates while keeping all capabilities", async () => {
  const runtime = await read("src/studio-runtime-v23.js");
  const css = await read("src/studio-responsive-v23.css");
  const assistant = await read("src/NaraAssistant.jsx");
  const workspace = await read("src/NaraWorkspace.jsx");
  assert.match(runtime, /\.sn-top-actions \.sn-nara-button, \.ce-nara/);
  assert.match(runtime, /dataset\.naraLauncherAuthority = "single-v23"/);
  assert.match(css, /html\[data-nara-open="true"\] \.nara-floating-button/);
  for (const marker of ["Tingkat kecerdasan", "Model Nara", "Kamera", "Foto", "File teks", "Pertanyaan suara"]) assert.ok(assistant.includes(marker), marker);
  for (const marker of ["Projects", "Memory", "Images", "Plugins", "Memori jangka panjang", "Buat gambar"]) assert.ok(workspace.includes(marker), marker);
});

test("Nara fills physical phones and Desktop-site Android without side columns", async () => {
  const css = await read("src/studio-responsive-v23.css");
  const runtime = await read("src/studio-runtime-v23.js");
  assert.match(runtime, /viewportToScreenRatio >= 1\.18/);
  assert.match(runtime, /root\.dataset\.desktopLayoutRequested/);
  assert.match(css, /data-physical-phone="true"\] \.nara-assistant-layer[\s\S]*width: 100vw !important/);
  assert.match(css, /data-physical-phone="true"\] \.nara-assistant-layer[\s\S]*height: 100dvh !important/);
  assert.match(css, /data-physical-phone="true"\] \.nara-assistant-shell[\s\S]*width: 100% !important/);
  assert.match(css, /data-physical-phone="true"\] \.nara-assistant-backdrop[\s\S]*display: none !important/);
});

test("editor stretches the writing surface to remove the empty gray column", async () => {
  const css = await read("src/studio-responsive-v23.css");
  assert.match(css, /\.ce-workspace[\s\S]*align-items: stretch !important/);
  assert.match(css, /\.ce-paper-shell[\s\S]*display: flex !important[\s\S]*flex-direction: column !important/);
  assert.match(css, /\.ce-paper[\s\S]*flex: 1 1 auto !important/);
  assert.match(css, /data-desktop-layout-requested="true"\] \.ce-workspace[\s\S]*minmax\(320px, 360px\)/);
});

test("v23 rotates the PWA shell cache", async () => {
  const sw = await read("public/sw.js");
  const runtime = await read("src/pwa-runtime.js");
  assert.match(sw, /ngeblogging-app-v23-20260725/);
  assert.match(runtime, /ngeblogging-pwa-v23-20260725/);
  assert.match(sw, /fetch\(request, \{ cache: "no-store" \}\)/);
  assert.doesNotMatch(runtime, /window\.location\.reload/);
});
