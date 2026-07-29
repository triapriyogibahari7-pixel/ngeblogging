import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("domain failover is limited to domain endpoints and never intercepts Nara", () => {
  const source = read("src/api-origin-failover-v60.js");
  assert.match(source, /api-origin-failover-v144-20260729/);
  assert.match(source, /function isDomainApiUrl/);
  assert.match(source, /url\.pathname\.startsWith\("\/api\/domains\/"\)/);
  assert.match(source, /url\.pathname\.startsWith\("\/api\/domain-redirects\/"\)/);
  assert.match(source, /if \(!isDomainApiUrl\(input\)\) return nativeFetch\(input, init\)/);
  assert.match(source, /Nara, komentar, media, auth, data, dan API lain memakai timeout mereka sendiri/);
  assert.match(source, /window\.fetch = resilientDomainFetch/);
  assert.doesNotMatch(source, /url\.pathname\.startsWith\("\/api\/"\)/);
});

test("Nara keeps its own long request timeout and calls the same-origin endpoint", () => {
  const nara = read("src/NaraAssistant.jsx");
  assert.match(nara, /setTimeout\(\(\) => controller\.abort\(\), 58_000\)/);
  assert.match(nara, /fetch\("\/api\/nara"/);
  assert.match(nara, /signal: controller\.signal/);
});
