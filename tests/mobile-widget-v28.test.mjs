import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("v28 centers the sidebar control and opens Nara as a widget", () => {
  const index = read("index.html");
  const css = read("src/studio-mobile-widget-v28.css");
  const runtime = read("src/studio-mobile-widget-v28.js");
  const sw = read("public/sw.js");

  assert.ok(index.indexOf("studio-mobile-widget-v28.css") > index.indexOf("studio-device-sidebar-v26.css"));
  assert.ok(index.indexOf("studio-mobile-widget-v28.js") > index.indexOf("studio-device-sidebar-v26.js"));
  assert.match(css, /top: 50dvh !important/);
  assert.match(css, /translate\(-50%, -50%\)/);
  assert.match(css, /width: min\(320px, calc\(100vw - 24px\)\) !important/);
  assert.match(css, /width: min\(410px, calc\(100vw - 24px\)\) !important/);
  assert.match(runtime, /launcher\.click\(\)/);
  assert.match(runtime, /profile\.compact \? "mini" : "compact"/);
  assert.match(runtime, /profile\.compact \? "compact" : "desktop"/);
  assert.match(sw, /ngeblogging-app-v28-20260725/);
});
