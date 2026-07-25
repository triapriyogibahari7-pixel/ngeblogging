import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v29 assets are active after archived compatibility authorities", async () => {
  const index = await read("index.html");
  assert.ok(index.indexOf("studio-responsive-v23.css") > index.indexOf("studio-v22-final.css"));
  assert.ok(index.indexOf("studio-shell-v29.css") > index.indexOf("studio-mobile-widget-v28.css"));
  assert.match(index, /<script type="application\/x-disabled" src="\/src\/studio-runtime-v23\.js" data-disabled-authority="v23"><\/script>/);
  assert.match(index, /<script type="module" src="\/src\/studio-shell-v29\.js"><\/script>/);
  assert.match(index, /<script type="module" src="\/src\/nara-connectors-v29\.js"><\/script>/);
});
