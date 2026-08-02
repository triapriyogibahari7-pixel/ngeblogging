import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("diagnostic v214 patch completed before source build", () => {
  assert.match(read("src/Studio.jsx"), /studio-production-v214\.js/);
  assert.match(read("src/StudioNext.jsx"), /sn-profile-menu-wrap/);
  assert.match(read("src/StudioNext.jsx"), /studio-production-v214-profile\.css/);
  assert.match(read("src/studio-shell-controller-v147.js"), /studio-v214-react-profile-authority/);
  assert.match(read("public/sw.js"), /ngeblogging-app-v214-screenshot-final-20260802/);
});
