import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("v214 diagnostic build keeps the release contract available", () => {
  const release = JSON.parse(read("public/release-v214.json"));
  assert.equal(release.release, "studio-production-v214-20260802");
  assert.equal(release.validation.fakeAnalytics, false);
  assert.equal(release.validation.massCapacityClaimed, false);
});
