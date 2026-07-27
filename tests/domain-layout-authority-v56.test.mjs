import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v56 domain authority loads after every Studio and switcher style", async () => {
  const html = await read("index.html");
  const css = html.indexOf("domain-layout-authority-v56.css");
  const script = html.indexOf("domain-layout-authority-v56.js");
  assert.ok(css > html.indexOf("studio-site-switcher-stability-v53.css"));
  assert.ok(script > html.indexOf("studio-site-switcher-v52.js"));
  assert.equal(html.match(/domain-layout-authority-v56\.css/g)?.length, 1);
  assert.equal(html.match(/domain-layout-authority-v56\.js/g)?.length, 1);
});

test("v56 structurally hides every legacy direct child of the full-zone route", async () => {
  const css = await read("src/domain-layout-authority-v56.css");
  const runtime = await read("src/domain-layout-authority-v56.js");
  assert.match(css, /> :not\(\.dfz-root\)/);
  assert.match(css, /display: none !important/);
  assert.match(css, /visibility: hidden !important/);
  assert.match(runtime, /for \(const child of \[\.\.\.view\.children\]\)/);
  assert.match(runtime, /else quarantine\(child\)/);
  assert.match(runtime, /new MutationObserver/);
  assert.match(runtime, /node\.style\.setProperty\("display", "none", "important"\)/);
});

test("v56 restores bounded typography and normal flow for the full-zone title", async () => {
  const css = await read("src/domain-layout-authority-v56.css");
  assert.match(css, /\.dfz-title h1/);
  assert.match(css, /font: 600 clamp\(31px, 4vw, 46px\)\/1\.06/);
  assert.match(css, /position: static !important/);
  assert.match(css, /transform: none !important/);
  assert.match(css, /\.dfz-grid[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\) !important/);
  assert.match(css, /@media \(max-width: 760px\)/);
});

test("v56 deduplicates full-zone roots without touching Nara or the sidebar", async () => {
  const runtime = await read("src/domain-layout-authority-v56.js");
  const css = await read("src/domain-layout-authority-v56.css");
  assert.match(runtime, /roots\.filter\(\(candidate\) => candidate !== root\)\.forEach\(\(candidate\) => candidate\.remove\(\)\)/);
  for (const forbidden of [".nara-", ".sn-side"]) {
    const pattern = new RegExp(forbidden.replace(".", "\\."));
    assert.doesNotMatch(runtime, pattern);
    assert.doesNotMatch(css, pattern);
  }
});

test("PWA cache rotates to v56 while retaining v53 and v40 compatibility", async () => {
  const sw = await read("public/sw.js");
  assert.match(sw, /ngeblogging-app-v56-20260727/);
  assert.match(sw, /ngeblogging-app-v53-20260726/);
  assert.match(sw, /ngeblogging-app-v40-20260726/);
});
