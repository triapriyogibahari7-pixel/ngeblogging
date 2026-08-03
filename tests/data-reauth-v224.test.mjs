import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const chain = read("scripts/patch-service-worker-v179.mjs");
const patch = read("scripts/patch-data-reauth-v224.mjs");
const auth = read("src/lib/supabase.js");
const worker = read("public/sw.js");
const release = JSON.parse(read("public/release-v224.json"));
const RELEASE = "data-reauth-v224-20260803";

test("v224 runs once after v223 and may hand off to a newer source authority", () => {
  assert.match(chain, /patch-production-v223\.mjs/);
  assert.match(chain, /patch-data-reauth-v224\.mjs/);
  assert.ok(chain.lastIndexOf("patch-production-v223.mjs") < chain.lastIndexOf("patch-data-reauth-v224.mjs"));
  assert.equal((chain.match(/patch-data-reauth-v224\.mjs/g) || []).length, 1);
  assert.match(patch, /patch-production-v225\.mjs/);
});

test("transient data 401 and 403 use one single-flight refresh and fresh-token retry", () => {
  assert.match(auth, /DATA_REAUTH_RELEASE_V224/);
  assert.match(auth, /dataReauthSingleflightV224/);
  assert.match(auth, /async function refreshedDataSessionV224/);
  assert.match(auth, /supabase\.auth\.refreshSession\(\)/);
  assert.match(auth, /async function retryDataAfterReauthV224/);
  assert.match(auth, /headers\.set\("authorization", `Bearer \$\{accessToken\}`\)/);
  assert.match(auth, /kind === "data" && \[401, 403\]\.includes\(response\.status\)/);
  assert.match(auth, /kind === "data" && \[401, 403\]\.includes\(directResponse\.status\)/);
  assert.match(auth, /dataReauthV224 = response\.ok \? "recovered"/);
});

test("v224 recovery never adds destructive logout or storage clearing", () => {
  assert.doesNotMatch(patch, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.equal(release.repairs.noForcedLogoutOnTransientFailure, true);
  assert.equal(release.repairs.noLocalStorageClear, true);
});

test("v224 release remains preserved under the current final service worker", () => {
  assert.match(worker, /DATA_REAUTH_RELEASE_V224/);
  assert.match(worker, /ngeblogging-app-v224-data-reauth-20260803/);
  assert.match(worker, /data-reauth-cache-v224/);
  assert.equal(release.release, RELEASE);
  assert.equal(release.repairs.data401403SingleflightRefresh, true);
  assert.equal(release.repairs.dataRetryUsesFreshAccessToken, true);
  assert.equal(release.repairs.retryCount, 1);
  assert.equal(release.preserved.themeCount, 100);
  assert.equal(release.preserved.widgetCount, 26);
  assert.equal(release.preserved.layoutFourLeftFourRight, true);
  assert.equal(release.preserved.naraCameraPhotoFile, true);
  assert.equal(release.claims.massUserCapacityClaimed, false);
});
