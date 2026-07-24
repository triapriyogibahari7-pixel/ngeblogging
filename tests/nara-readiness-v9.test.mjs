import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const bridge = readFileSync(new URL("../src/nara-availability-bridge.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../src/nara-v9-readiness.css", import.meta.url), "utf8");
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("Nara stays visible when a real text provider is healthy", () => {
  assert.match(bridge, /availability = health\.nara === false \? "unavailable" : "ready"/);
  assert.match(bridge, /controls\.forEach\(reveal\)/);
  assert.match(bridge, /health\.billing === true/);
  assert.match(bridge, /health\.imageGeneration === true/);
});

test("inactive payment and vision capabilities are removed from the Nara interface", () => {
  assert.match(bridge, /\.nara-upgrade-card,\.nara-context-bar button/);
  assert.match(bridge, /new Set\(\["light", "standard"\]\)/);
  assert.match(bridge, /new Set\(\["nara-mini"\]\)/);
  assert.match(bridge, /label\.startsWith\("Kamera"\) \|\| label\.startsWith\("Foto"\)/);
  assert.match(bridge, /button\.textContent = "Susun outline"/);
  assert.match(css, /html:not\(\[data-nara-billing-ready="true"\]\) \.nara-upgrade-card/);
  assert.match(css, /html:not\(\[data-nara-image-ready="true"\]\)/);
});

test("readiness CSS loads before the React application", () => {
  assert.match(index, /href="\/src\/nara-v9-readiness\.css"/);
  assert.ok(index.indexOf("nara-v9-readiness.css") < index.indexOf('/src/main.jsx'));
});
