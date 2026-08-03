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

test("v224 runs once after v223 UI and before any later UI authority", () => {
  assert.match(chain, /patch-production-v223\.mjs/);
  assert.match(chain, /patch-data-reauth-v224\.mjs/);
  assert.ok(chain.lastIndexOf("patch-production-v223.mjs") < chain.lastIndexOf("patch-data-reauth-v224.mjs"));
  assert.equal((chain.match(/patch-data-reauth-v224\.mjs/g) || []).length, 1);
  if (chain.includes("patch-production-v225.mjs")) assert.ok(chain.lastIndexOf("patch-data-reauth-v224.mjs") < chain.lastIndexOf("patch-production-v225.mjs"));
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

test("final service worker preserves v224 data reauth authority even when a later UI release rotates cache", () => {
  const isV224 = /const VERSION = "ngeblogging-app-v224-data-reauth-20260803";/.test(worker)
    && /const CACHE_RELEASE = "data-reauth-cache-v224";/.test(worker);
  const isV225Compat = /const VERSION = "ngeblogging-app-v225-theme-layout-nara-20260803";/.test(worker)
    && /const CACHE_RELEASE = "theme-layout-nara-cache-v225";/.test(worker)
    && /DATA_REAUTH_COMPAT_VERSION_V224 = "ngeblogging-app-v224-data-reauth-20260803"/.test(worker)
    && /DATA_REAUTH_COMPAT_CACHE_V224 = "data-reauth-cache-v224"/.test(worker);
  assert.ok(isV224 || isV225Compat, "final service worker must be v224 or a later release carrying explicit v224 compatibility markers");
  assert.match(worker, /DATA_REAUTH_RELEASE_V224/);
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
