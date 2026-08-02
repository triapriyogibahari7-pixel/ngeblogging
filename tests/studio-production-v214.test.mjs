import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("diagnostic v214 runtime patch completed before source build", () => {
  assert.match(read("src/Studio.jsx"), /studio-production-v214\.js/);
  assert.match(read("src/studio-production-v214.js"), /studio-production-v214-20260802/);
  assert.match(read("src/studio-production-v214.css"), /data-v214-workspace="split-50-50"/);
  assert.match(read("public/sw.js"), /ngeblogging-app-v214-screenshot-final-20260802/);
});
