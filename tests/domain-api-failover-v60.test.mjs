import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [failover, feedback, feedbackCss, worker, wrangler, index, netlify, sw] = await Promise.all([
  read("src/api-origin-failover-v60.js"),
  read("src/domain-feedback-authority-v60.js"),
  read("src/domain-feedback-authority-v60.css"),
  read("cloudflare/worker.mjs"),
  read("wrangler.production.jsonc"),
  read("index.html"),
  read("scripts/write-netlify-redirects.mjs"),
  read("public/sw.js"),
]);

test("v60 retries non-JSON domain API failures through the dedicated API hostname", () => {
  assert.match(failover, /https:\/\/api\.ngeblogging\.com/);
  assert.match(failover, /window\.fetch = resilientFetch/);
  assert.match(failover, /responseDetails/);
  assert.match(failover, /DOMAIN_API_ROUTE_UNAVAILABLE/);
  assert.match(failover, /arrayBuffer\(\)/);
  assert.match(failover, /ngeblogging:api-failover/);
});

test("v60 Cloudflare worker accepts authenticated cross-origin preflight", () => {
  assert.match(worker, /request\.method === "OPTIONS" && url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(worker, /access-control-allow-headers.*authorization/);
  assert.match(worker, /access-control-expose-headers/);
  assert.match(worker, /x-ngeblogging-api-origin/);
  assert.match(worker, /2026\.07\.27-domain-api-v60/);
});

test("v60 uses a dedicated API route and removes the recursive Netlify proxy", () => {
  assert.match(wrangler, /api\.ngeblogging\.com\/\*/);
  assert.match(wrangler, /PUBLIC_API_ORIGIN/);
  assert.match(wrangler, /ngeblogging\.netlify\.app/);
  assert.match(netlify, /https:\/\/api\.ngeblogging\.com/);
  assert.doesNotMatch(netlify, /"\/api\/\*\s+https:\/\/ngeblogging\.com\/api\/:splat/);
});

test("v60 never paints a failed domain request as success", () => {
  assert.match(feedback, /FAILURE_PATTERN/);
  assert.match(feedback, /classList\.toggle\("danger"/);
  assert.match(feedback, /Permintaan domain tidak selesai/);
  assert.match(feedbackCss, /\.dfz-toast\.danger/);
  assert.match(feedbackCss, /\.d60-operation-error/);
});

test("v60 loads before the domain runtime and rotates the PWA cache", () => {
  const failoverPosition = index.indexOf('<script type="module" src="/src/api-origin-failover-v60.js"');
  const domainPosition = index.indexOf('<script type="module" src="/src/domain-full-zone-v54.js"');
  const feedbackPosition = index.indexOf('<script type="module" src="/src/domain-feedback-authority-v60.js"');
  const v59Position = index.indexOf('<script type="module" src="/src/domain-experience-authority-v59.js"');
  assert.ok(failoverPosition > 0 && failoverPosition < domainPosition);
  assert.ok(feedbackPosition > v59Position);
  assert.match(index, /domain-feedback-authority-v60\.css/);
  assert.match(sw, /ngeblogging-app-v60-20260727/);
});
