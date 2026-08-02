import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v208 is the final Studio authority after v207", async () => {
  const studio = await read("src/Studio.jsx");
  const v207 = studio.indexOf('import "./studio-production-v207.js";');
  const v208 = studio.indexOf('import "./studio-production-v208.js";');
  assert.ok(v207 >= 0, "v207 compatibility authority must remain");
  assert.ok(v208 > v207, "v208 must load after v207");
});

test("Theme actions cannot stack duplicate labels", async () => {
  const runtime = await read("src/studio-production-v208.js");
  const css = await read("src/studio-production-v208.css");
  assert.match(runtime, /exactly-four/);
  assert.match(runtime, /v208HiddenDuplicate/);
  assert.match(runtime, /Edit Tata Letak/);
  assert.match(runtime, /Edit Kode/);
  assert.match(css, /\.v199-button-label,.v201-button-label,.v202-button-label/);
  assert.match(css, /button\[data-v208-theme-action\]::after[\s\S]*content:none/);
});

test("Theme Layout remains a spatial map on phones", async () => {
  const runtime = await read("src/studio-production-v208.js");
  const css = await read("src/studio-production-v208.css");
  assert.match(runtime, /spatial-map/);
  for (const area of [
    "top-left-1", "top-right-3", "before-content", "sidebar-left-1",
    "sidebar-left-4", "content-main", "sidebar-right-3", "after-content",
    "bottom-left-1", "bottom-right-3",
  ]) assert.ok(css.includes(`.${area}`), `${area} must have a spatial position`);
  assert.match(css, /min-width:680px/);
  assert.match(css, /overflow-x:auto/);
});

test("Nara native plus menu exposes Camera Photo and File without modal backdrop", async () => {
  const runtime = await read("src/studio-production-v208.js");
  const css = await read("src/studio-production-v208.css");
  const nara = await read("src/NaraAssistant.jsx");
  assert.match(nara, /<b>Kamera<\/b>/);
  assert.match(nara, /<b>Foto<\/b>/);
  assert.match(nara, /<b>File teks<\/b>/);
  assert.match(runtime, /camera-photo-file/);
  assert.match(runtime, /nonmodal/);
  assert.match(css, /bottom:calc\(100% \+ 10px\)/);
  assert.match(css, /pointer-events:none !important/);
});

test("current persisted site snapshots bypass endless Studio startup after bootstrap patches", async () => {
  const fastGate = await read("src/StudioFastGate.jsx");
  const chain = await read("scripts/patch-service-worker-v179.mjs");
  const runtime = await read("src/studio-production-v208.js");
  assert.match(chain, /patch-studio-bootstrap-v195\.mjs/);
  assert.match(chain, /patch-studio-persisted-session-v198\.mjs/);
  assert.match(fastGate, /ngeblogging-active-site-snapshot-v195/);
  assert.match(fastGate, /ngeblogging-active-site-snapshot-v192/);
  assert.match(runtime, /recoverMembership/);
  assert.match(runtime, /resumeStudioOnce/);
  assert.match(runtime, /\/studio\?resume=v208/);
});

test("large-screen sidebar has two deterministic widths and no flicker transition", async () => {
  const css = await read("src/studio-production-v208.css");
  assert.match(css, /width:240px !important/);
  assert.match(css, /width:72px !important/);
  assert.match(css, /margin-left:240px !important/);
  assert.match(css, /margin-left:72px !important/);
  assert.match(css, /transition:none !important/);
});

test("v208 rotates the service worker cache after historical patches", async () => {
  const chain = await read("scripts/patch-service-worker-v179.mjs");
  const patch = await read("scripts/patch-production-v208.mjs");
  assert.match(chain, /patch-production-v208\.mjs/);
  assert.match(patch, /ngeblogging-app-v208-studio-stability-20260802/);
  assert.match(patch, /studio-stability-cache-v208/);
  assert.match(patch, /STUDIO_V207_COMPAT_VERSION/);
  assert.doesNotMatch(patch, /localStorage\.clear\(/);
});