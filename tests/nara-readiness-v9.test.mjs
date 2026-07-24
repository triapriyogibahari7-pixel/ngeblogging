import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const bridge = readFileSync(new URL("../src/nara-availability-bridge.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/nara-v9-readiness.css", import.meta.url), "utf8");
const authority = readFileSync(new URL("../src/studio-v10-authority.css", import.meta.url), "utf8");
const guard = readFileSync(new URL("../src/studio-production-guard.js", import.meta.url), "utf8");
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");


test("Nara stays visible with healthy or degraded text providers", () => {
  assert.match(bridge, /availability = health\.nara === false \? "degraded" : "ready"/);
  assert.match(bridge, /assistantLaunchers\(\)\.forEach/);
  assert.match(bridge, /reveal\(button\)/);
  assert.match(bridge, /health\.billing === true/);
  assert.match(bridge, /health\.imageGeneration === true/);
  assert.match(authority, /\.nara-floating-button[\s\S]*pointer-events: auto !important/);
  assert.match(authority, /\.nara-floating-button[\s\S]*z-index: 18000 !important/);
});


test("models intelligence camera photo files voice image prompts memory QR and plugins remain in the interface", () => {
  assert.match(bridge, /preserveAssistantCapabilities/);
  assert.match(bridge, /\.nara-select option/);
  assert.match(bridge, /\.nara-attachment-menu button/);
  assert.match(bridge, /\.nara-composer input/);
  assert.match(bridge, /\.nara-quick-prompts button/);
  assert.match(css, /must never remove/);
  assert.match(guard, /Baca QR/);
  assert.match(guard, /Projects/);
  assert.match(guard, /Memori/);
  assert.match(guard, /Buat gambar/);
  assert.match(guard, /Plugins/);
  assert.doesNotMatch(bridge, /removeInactiveOptions/);
  assert.doesNotMatch(bridge, /new Set\(\["light", "standard"\]\)/);
  assert.doesNotMatch(bridge, /new Set\(\["nara-mini"\]\)/);
  assert.doesNotMatch(bridge, /label\.startsWith\("Kamera"\).*conceal/s);
  assert.doesNotMatch(bridge, /button\.textContent = "Susun outline"/);
});


test("readiness and v10 authority CSS load before the React application", () => {
  assert.match(index, /href="\/src\/nara-v9-readiness\.css"/);
  assert.match(index, /href="\/src\/studio-v10-authority\.css"/);
  assert.ok(index.indexOf("nara-v9-readiness.css") < index.indexOf('/src/main.jsx'));
  assert.ok(index.indexOf("studio-v10-authority.css") < index.indexOf('/src/main.jsx'));
});
