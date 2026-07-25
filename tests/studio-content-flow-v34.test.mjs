import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v34 loads after overlap v33 and its runtime loads last", async () => {
  const html = await read("index.html");
  assert.ok(html.indexOf("studio-content-flow-v34.css") > html.indexOf("studio-mobile-overlap-v33.css"));
  assert.ok(html.indexOf("studio-content-flow-v34.js") > html.indexOf("studio-mobile-route-reset-v32.js"));
});

test("v34 fixes route headings domain settings favicon and home flow", async () => {
  const css = await read("src/studio-content-flow-v34.css");
  for (const marker of [
    ".sn-page-title",
    ".sn-page-title + *",
    ".sn-domain-card",
    "#ngeblogging-site-favicon-settings",
    ".sf-header",
    ".sn-welcome",
    ".sn-home-grid > section > header h2",
  ]) assert.ok(css.includes(marker), marker);
  assert.match(css, /grid-template-columns:\s*minmax\(0, 1fr\) auto/);
  assert.match(css, /contain:\s*layout paint !important/);
  assert.match(css, /font:\s*600 21px\/1\.2 "Playfair Display"/);
});

test("v34 runtime reorders the favicon card and resets newly mounted views", async () => {
  const runtime = await read("src/studio-content-flow-v34.js");
  assert.match(runtime, /studio-content-flow-v34-20260725/);
  assert.match(runtime, /grid\.insertAdjacentElement\("afterend", favicon\)/);
  assert.match(runtime, /node\.matches\(VIEW_SELECTOR\)/);
  assert.match(runtime, /if \(newView\) resetStudioScroll\(\)/);
});

test("v34 does not target locked sidebar or Nara selectors", async () => {
  const css = await read("src/studio-content-flow-v34.css");
  const runtime = await read("src/studio-content-flow-v34.js");
  for (const forbidden of [".sn-side", ".sn-mobile-v30", ".nara-"]) {
    assert.doesNotMatch(css, new RegExp(forbidden.replace(".", "\\.")));
    assert.doesNotMatch(runtime, new RegExp(forbidden.replace(".", "\\.")));
  }
});

test("approved sidebar and Nara baseline has an immutable backup manifest", async () => {
  const backup = await read("backups/sidebar-nara-approved-v33-locked-20260725.md");
  for (const marker of [
    "83ec7420acee0441b48197cf88b49d453d5377b3",
    "8066773230249c2f97a6dfcbf1f792113d830616",
    "54aa0c66c297b477cb716ba254fc616b1e438d01",
    "b04476c19c1ae1d6403e2e97ab604e74c57c8063",
    "c58291c29ab618dc3552800e6bdaa49899e9bcdd",
  ]) assert.ok(backup.includes(marker), marker);
});

test("PWA cache rotates to v34", async () => {
  const sw = await read("public/sw.js");
  assert.match(sw, /ngeblogging-app-v34-20260725/);
  assert.match(sw, /ngeblogging-app-v33-20260725/);
});
