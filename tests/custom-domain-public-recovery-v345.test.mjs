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

test("legacy custom_domain records recover root/www and stored URL variants", () => {
  assert.match(publicData, /function legacyCustomDomainCandidates/);
  assert.match(publicData, /`https:\/\/\$\{value\}`/);
  assert.match(publicData, /`http:\/\/\$\{value\}`/);
  assert.match(publicData, /\.in\("custom_domain", candidates\)/);
  assert.match(publicData, /normalizeHostname\(site\.custom_domain\) === normalized/);
  assert.match(publicData, /if \(!siteId\) siteId = await resolveLegacyCustomDomainSite\(db, normalizedHostname\)/);
});

test("site_domains lookup failure still reaches legacy custom-domain recovery", () => {
  assert.match(publicData, /try \{\s*const result = await withTimeout\([\s\S]*?from\("site_domains"\)/);
  assert.match(publicData, /site_domains public lookup unavailable; trying legacy custom-domain recovery/);
  assert.doesNotMatch(publicData, /const \{ data: domains, error: domainError \}[\s\S]{0,500}if \(domainError\) throw domainError/);
});
