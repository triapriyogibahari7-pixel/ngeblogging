import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const secure = read("src/StudioSecure.jsx");
const deviceCss = read("src/studio-device-v22.css");
const pwa = read("src/pwa-runtime.js");
const sw = read("public/sw.js");
const workersAi = read("server/workers-ai-nara.mjs");

test("v22 device authority loads after v21 and v14 is no longer active", () => {
  assert.ok(index.indexOf("studio-device-v22.css") > index.indexOf("studio-responsive-v21.css"));
  assert.doesNotMatch(index, /<link[^>]+href=["']\/src\/studio-v14-authority\.css["']/);
  assert.doesNotMatch(secure, /import\s+["']\.\/studio-v14-authority\.css["']/);
  assert.match(secure, /studio-device-v22\.css/);
});

test("desktop site detection works even when Android keeps a compact CSS width", () => {
  assert.match(pwa, /viewportToScreenRatio >= 1\.18/);
  assert.match(pwa, /root\.dataset\.desktopLayoutRequested = String\(profile\.desktopLayoutRequested\)/);
  assert.match(deviceCss, /html\[data-desktop-layout-requested="true"\] \.sn-main/);
  assert.match(deviceCss, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\) !important/);
});

test("phone sidebar has one edge control below the header and a persistent icon rail", () => {
  assert.match(deviceCss, /--sn-v22-phone-rail: 64px/);
  assert.match(deviceCss, /top: 76px !important/);
  assert.match(deviceCss, /margin-left: var\(--sn-v22-phone-rail\) !important/);
  assert.match(deviceCss, /\.sn-mobile-nav,[\s\S]*\.sn-side-bottom,[\s\S]*display: none !important/);
});

test("phones expose one Nara launcher and a true full viewport assistant", () => {
  assert.match(deviceCss, /data-physical-screen-mobile="true"\] \.sn-top-actions \.sn-nara-button/);
  assert.match(deviceCss, /data-physical-screen-mobile="true"\] \.ce-nara/);
  assert.match(deviceCss, /data-physical-screen-mobile="true"\] \.nara-floating-button[\s\S]*place-items: center !important/);
  assert.match(deviceCss, /data-physical-screen-mobile="true"\] \.nara-assistant-shell[\s\S]*width: 100vw !important/);
  assert.match(deviceCss, /data-physical-screen-mobile="true"\] \.nara-assistant-shell[\s\S]*height: 100dvh !important/);
});

test("Workers AI retries current text and vision models and strips data URL prefixes", () => {
  assert.match(workersAi, /@cf\/zai-org\/glm-4\.7-flash/);
  assert.match(workersAi, /@cf\/meta\/llama-3\.3-70b-instruct-fp8-fast/);
  assert.match(workersAi, /@cf\/google\/gemma-4-26b-a4b-it/);
  assert.match(workersAi, /@cf\/meta\/llama-4-scout-17b-16e-instruct/);
  assert.match(workersAi, /base64: match\[1\]\.replace/);
  assert.match(workersAi, /for \(const model of models\)/);
});

test("service worker cache rotates to v22", () => {
  assert.match(sw, /ngeblogging-app-v14-20260724-v22/);
  assert.match(pwa, /ngeblogging-pwa-v22-20260725/);
});
