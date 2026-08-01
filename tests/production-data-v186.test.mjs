import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const packageJson = JSON.parse(read("package.json"));
const patch = read("scripts/patch-production-data-v186.mjs");
const chain = read("scripts/patch-service-worker-v179.mjs");
const studio = read("src/StudioNext.jsx");
const gate = read("src/StudioOnboardingGate.jsx");
const auth = read("src/lib/supabase.js");
const domain = read("src/DomainPanelV124.jsx");
const comments = read("src/CommentsPanelV124.jsx");
const nara = read("src/NaraAssistant.jsx");
const serviceWorker = read("public/sw.js");
const release = JSON.parse(read("public/release-v186.json"));

test("v186 runs after the existing v185 visual authority", () => {
  assert.match(chain, /patch-studio-production-v183\.mjs/);
  assert.match(chain, /patch-production-data-v186\.mjs/);
  assert.ok(chain.indexOf("patch-studio-production-v183.mjs") < chain.indexOf("patch-production-data-v186.mjs"));
  assert.match(chain, /patch-workflow-compat-v186\.mjs/);
});

test("Studio active-site bootstrap is independent from profile loading", () => {
  assert.match(studio, /studio-bootstrap-resilient-v186/);
  assert.match(studio, /readActiveSiteSnapshotV186/);
  assert.match(studio, /publishActiveSiteV186/);
  assert.match(studio, /getUserProfile\(user\.id\)\.then/);
  assert.match(studio, /listUserSites\(user\.id\)/);
  assert.doesNotMatch(studio, /Promise\.all\(\[getOrCreatePrimarySite/);
  assert.doesNotMatch(studio, /getOrCreatePrimarySite/);
  assert.match(studio, /loadLocalDocs\(!user\?\.id\)/);
  assert.match(studio, /return allowStarter \? STARTER : \[\]/);
});

test("transient startup failures preserve session and cached site", () => {
  assert.match(gate, /cachedActiveSiteV186/);
  assert.match(gate, /degraded-session-retained/);
  assert.match(gate, /force: attempt > 0/);
  assert.doesNotMatch(gate, /localStorage\.clear\s*\(/);
  assert.doesNotMatch(gate, /signOut\s*\(/);
});

test("auth gateway failure falls back to direct Supabase and OAuth is not proxied", () => {
  assert.match(auth, /direct-fallback-v186/);
  assert.match(auth, /\[404, 502, 503, 504\]/);
  assert.match(auth, /return nativeFetch\(directInput, init\)/);
  assert.match(auth, /direct-supabase-oauth-v186/);
  const providerStart = auth.indexOf("function providerDestination");
  const providerEnd = auth.indexOf("export async function signInWithProvider", providerStart);
  assert.doesNotMatch(auth.slice(providerStart, providerEnd), /proxiedAuthUrl/);
});

test("Domain and Comments no longer spin forever without an active site", () => {
  assert.match(domain, /getVerifiedSession\(\{ force: false \}\)/);
  assert.match(domain, /setLoading\(false\); setError\("Situs aktif belum tersedia/);
  assert.doesNotMatch(domain, /isSessionReauthError\(nextError\) \|\| \[401, 403\]/);
  assert.match(comments, /setLoading\(false\); setError\(!site\?\.id/);
  assert.match(comments, /Koneksi komentar belum tersedia/);
});

test("Nara small and medium are non-modal in React source", () => {
  assert.match(nara, /aria-modal=\{size === "full"\}/);
  assert.match(nara, /data-nara-mode=\{size === "full" \? "modal" : "nonmodal"\}/);
  assert.match(nara, /hidden=\{size !== "full"\}/);
  assert.match(nara, /tabIndex=\{size === "full" \? 0 : -1\}/);
});

test("v186 protections remain while the final cache is rotated by v187", () => {
  assert.match(serviceWorker, /ngeblogging-app-v187-production-authority-20260801/);
  assert.match(serviceWorker, /production-authority-cache-v187/);
  assert.match(serviceWorker, /PRODUCTION_DATA_RELEASE_V186/);
  assert.match(serviceWorker, /PRODUCTION_AUTHORITY_RELEASE_V187/);
  assert.doesNotMatch(serviceWorker, /await refreshStaleWindow\(client, url\);/);
  assert.doesNotMatch(patch, /signOut\s*\(/);
  assert.doesNotMatch(patch, /localStorage\.clear\s*\(/);
});

test("release and production scripts include v186", () => {
  assert.match(packageJson.scripts["verify:v186"], /production-data-v186\.test\.mjs/);
  assert.match(packageJson.scripts["test:production"], /production-data-v186\.test\.mjs/);
  assert.equal(release.release, "production-data-source-v186-20260801");
  assert.equal(release.repairs.activeSiteBootstrapNonBlocking, true);
  assert.equal(release.repairs.authGatewayDirectFallback, true);
  assert.equal(release.repairs.naraSmallMediumNonModalAtSource, true);
});

test("v187 production authority is applied after v186 in every production build", () => {
  assert.match(chain, /patch-production-ui-v187\.mjs/);
  assert.ok(chain.indexOf("patch-production-data-v186.mjs") < chain.indexOf("patch-production-ui-v187.mjs"));
  assert.match(read("src/Studio.jsx"), /studio-production-authority-v187\.js/);
  assert.match(read("public/sw.js"), /ngeblogging-app-v187-production-authority-20260801/);
  assert.match(read("src/StudioNext.jsx"), /SIDEBAR_STATE_V187/);
  assert.match(read("src/StudioNext.jsx"), /documentWordCountV187\(active\.content\)/);
});
