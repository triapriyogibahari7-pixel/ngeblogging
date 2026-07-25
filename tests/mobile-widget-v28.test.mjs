import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("v28 is archived and v29 owns the sidebar launcher and Nara widget", () => {
  const index = read("index.html");
  const css = read("src/studio-shell-v29.css");
  const runtime = read("src/studio-shell-v29.js");
  const sw = read("public/sw.js");

  assert.match(index, /studio-mobile-widget-v28\.css" rel="stylesheet" media="not all"/);
  assert.match(index, /studio-shell-v29\.css" rel="stylesheet"/);
  assert.doesNotMatch(index, /type="module" src="\/src\/studio-mobile-widget-v28\.js"/);
  assert.match(css, /\.sn-mobile-v29-launcher[\s\S]*top: 50dvh !important/);
  assert.match(css, /data-nara-size-v29="mini"[\s\S]*width: min\(350px/);
  assert.match(css, /data-nara-size-v29="compact"[\s\S]*width: min\(430px/);
  assert.match(runtime, /launcher\.click\(\)/);
  assert.match(runtime, /profile\.compact \? "mini" : "compact"/);
  assert.match(runtime, /state\.size === "expanded" \? state\.previous : "expanded"/);
  assert.match(sw, /ngeblogging-app-v29-20260725/);
});
