import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v23 assets are active after compatibility authorities", async () => {
  const index = await read("index.html");
  assert.ok(index.indexOf("studio-responsive-v23.css") > index.indexOf("studio-v22-final.css"));
  assert.match(index, /<script type="module" src="\/src\/studio-runtime-v23\.js"><\/script>/);
});
