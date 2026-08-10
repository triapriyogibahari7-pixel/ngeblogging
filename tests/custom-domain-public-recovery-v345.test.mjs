import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const publicData = readFileSync(new URL("../src/lib/public-data.js", import.meta.url), "utf8");

test("custom-domain public resolution accepts verified rows and active provider/TLS migration state", () => {
  assert.match(publicData, /function domainIsPubliclyRoutable/);
  assert.match(publicData, /\["active", "verified"\]/);
  assert.match(publicData, /providerStatus === "active"/);
  assert.match(publicData, /\["active", "issued", "verified"\]/);
});

test("custom-domain public resolution keeps exact hostname preference and www fallback", () => {
  assert.match(publicData, /function domainCandidates/);
  assert.match(publicData, /`www\.\$\{normalized\}`/);
  assert.match(publicData, /const exactDomain = matchingDomains\.find/);
});

test("legacy custom_domain records can recover public routing after site_domains migration", () => {
  assert.match(publicData, /async function resolveLegacyCustomDomainSite/);
  assert.match(publicData, /\.in\("custom_domain", candidates\)/);
  assert.match(publicData, /if \(!siteId\) siteId = await resolveLegacyCustomDomainSite/);
  assert.doesNotMatch(publicData, /from\("site_domains"\)[\s\S]{0,600}\.in\("status", \["active", "verified"\]\)/);
});
