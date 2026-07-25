import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const css = read("src/studio-mobile-v21.css");
const naraCss = read("src/nara-global-v21.css");
const sidebarRuntime = read("src/studio-sidebar-v15.js");
const globalNara = read("src/NaraGlobalV21.jsx");
const commandCenter = read("src/nara-command-center-bridge.js");

test("v21 owns the final runtime order", () => {
  assert.ok(index.indexOf("studio-mobile-v21.css") > index.indexOf("studio-mobile-v20.css"));
  assert.ok(index.indexOf("nara-global-v21.css") > index.indexOf("studio-mobile-v21.css"));
  assert.match(index, /studio-sidebar-v15\.js/);
  assert.match(index, /NaraGlobalV21\.jsx/);
  assert.doesNotMatch(index, /nara-launcher-v20\.js/);
});

test("one sidebar controller remains and no bottom navigation returns", () => {
  assert.match(sidebarRuntime, /querySelectorAll\(":scope > \.sn-sidebar-edge-v15"\)\.forEach/);
  assert.match(sidebarRuntime, /toggle\.dataset\.sidebarAuthority = "single-v21"/);
  assert.match(sidebarRuntime, /profile\.compactPhone/);
  assert.match(sidebarRuntime, /v21InitialSidebarResolved/);
  assert.match(sidebarRuntime, /\.sn-mobile-nav, \.sn-mobile-sheet-layer, \.sn-side-close, \.sn-side-bottom/);
  assert.match(css, /\.sn-side\.collapsed > nav > button[\s\S]*place-items: center !important/);
  assert.match(css, /\.sn-side[\s\S]*z-index: 30020 !important/);
  assert.match(css, /\.sn-sidebar-scrim-v15[\s\S]*z-index: 30010 !important/);
});

test("global Nara is a real React root rather than a synthetic proxy", () => {
  assert.match(globalNara, /import NaraAssistant from "\.\/NaraAssistant"/);
  assert.match(globalNara, /createRoot\(host\)\.render\(<GlobalNara \/>\)/);
  assert.match(globalNara, /NaraAssistant/);
  assert.match(globalNara, /onOpenChange=\{setOpen\}/);
  assert.match(globalNara, /ngeblogging:nara-open/);
  assert.match(globalNara, /document\.body\.append\(host\)/);
  assert.doesNotMatch(globalNara, /proxy\.addEventListener/);
  assert.doesNotMatch(globalNara, /HTMLElement\.prototype\.click/);
  assert.match(naraCss, /#root \.nara-floating-button[\s\S]*display: none !important/);
  assert.match(naraCss, /\.nara-global-v21 \.nara-floating-button[\s\S]*pointer-events: auto !important/);
});

test("header and editor launch the same global Nara instance", () => {
  assert.match(globalNara, /\.sn-top-actions \.sn-nara-button, \.ce-nara/);
  assert.match(globalNara, /setContext\(inferContext\(target\)\)/);
  assert.match(globalNara, /setOpen\(true\)/);
  assert.match(globalNara, /event\.stopImmediatePropagation/);
  assert.match(naraCss, /data-nara-global-open="true"/);
});

test("global assistant is above sidebar and independent of root scaling", () => {
  assert.match(naraCss, /\.nara-assistant-layer[\s\S]*z-index: 2147483647 !important/);
  assert.match(naraCss, /\.nara-assistant-shell[\s\S]*width: 100% !important/);
  assert.match(naraCss, /data-desktop-site-phone="true"[\s\S]*width: var\(--sn-physical-layout-width/);
  assert.match(naraCss, /zoom: var\(--sn-browser-scale,1\) !important/);
  assert.match(naraCss, /body\.nara-dialog-open/);
});

test("Nara is hidden from sidebar but complete workspace routes remain", () => {
  assert.match(sidebarRuntime, /label === "Nara AI"/);
  assert.match(sidebarRuntime, /button\.dataset\.naraWorkspaceRoute = "true"/);
  assert.match(commandCenter, /route\.click\(\)/);
  for (const capability of ["Projects", "Memori", "Buat gambar", "Plugins", "Baca QR", "BarcodeDetector"]) {
    assert.ok(commandCenter.includes(capability), capability);
  }
});

test("Tata Letak still opens the real customizer", () => {
  assert.match(sidebarRuntime, /data-layout-route-v21/);
  assert.match(sidebarRuntime, /Tata Letak/);
  assert.match(sidebarRuntime, /currentTheme\.click\(\)/);
  assert.match(sidebarRuntime, /sesuaikan/i);
});

test("all requested Nara controls remain in the assistant and workspace", () => {
  const assistant = read("src/NaraAssistant.jsx");
  const workspace = read("src/NaraWorkspace.jsx");
  for (const capability of ["Tingkat kecerdasan", "Model Nara", "Kamera", "Foto", "File teks", "Pertanyaan suara", "Jelaskan gambar"]) {
    assert.ok(assistant.includes(capability), capability);
  }
  for (const capability of ["Projects", "Memory", "Images", "Plugins", "Memori jangka panjang", "Buat gambar"]) {
    assert.ok(workspace.includes(capability), capability);
  }
});
