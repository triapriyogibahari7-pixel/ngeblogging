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
const physicalPatch = read("scripts/patch-production-physical-mobile-v188.mjs");
const physicalRuntime = read("src/studio-physical-mobile-v188.js");
const physicalCss = read("src/studio-physical-mobile-v188.css");
const deviceMode = read("src/studio-device-mode-v140.js");
const physicalRelease = JSON.parse(read("public/release-v188.json"));

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

test("v186, v187, and v188 protections remain while the final cache is rotated by v189", () => {
  assert.match(serviceWorker, /ngeblogging-app-v189-production-mobile-20260801/);
  assert.match(serviceWorker, /production-mobile-cache-v189/);
  assert.match(serviceWorker, /PRODUCTION_DATA_RELEASE_V186/);
  assert.match(serviceWorker, /PRODUCTION_AUTHORITY_RELEASE_V187/);
  assert.match(serviceWorker, /PHYSICAL_MOBILE_RELEASE_V188/);
  assert.match(serviceWorker, /PRODUCTION_MOBILE_RELEASE_V189/);
  assert.doesNotMatch(serviceWorker, /await refreshStaleWindow\(client, url\);/);
  assert.doesNotMatch(patch, /signOut\s*\(/);
  assert.doesNotMatch(patch, /localStorage\.clear\s*\(/);
  assert.doesNotMatch(physicalPatch, /signOut\s*\(|localStorage\.clear\s*\(/);
});

test("release and production scripts include v186 and v189", () => {
  assert.match(packageJson.scripts["verify:v186"], /production-data-v186\.test\.mjs/);
  assert.match(packageJson.scripts["verify:v189"], /studio-production-mobile-v189\.test\.mjs/);
  assert.match(packageJson.scripts["test:production"], /production-data-v186\.test\.mjs/);
  assert.match(packageJson.scripts["test:production"], /studio-production-mobile-v189\.test\.mjs/);
  assert.equal(release.release, "production-data-source-v186-20260801");
  assert.equal(release.repairs.activeSiteBootstrapNonBlocking, true);
  assert.equal(release.repairs.authGatewayDirectFallback, true);
  assert.equal(release.repairs.naraSmallMediumNonModalAtSource, true);
});

test("v187 production authority remains before physical mobile v188 and production mobile v189", () => {
  assert.match(chain, /patch-production-ui-v187\.mjs/);
  assert.match(chain, /patch-production-physical-mobile-v188\.mjs/);
  assert.match(chain, /patch-production-mobile-v189\.mjs/);
  assert.ok(chain.indexOf("patch-production-data-v186.mjs") < chain.indexOf("patch-production-ui-v187.mjs"));
  assert.ok(chain.indexOf("patch-production-ui-v187.mjs") < chain.indexOf("patch-production-physical-mobile-v188.mjs"));
  assert.ok(chain.indexOf("patch-production-physical-mobile-v188.mjs") < chain.indexOf("patch-production-mobile-v189.mjs"));
  const entry = read("src/Studio.jsx");
  assert.match(entry, /studio-production-authority-v187\.js/);
  assert.match(entry, /studio-physical-mobile-v188\.js/);
  assert.match(entry, /studio-production-mobile-v189\.js/);
  assert.ok(entry.indexOf("studio-production-authority-v187.js") < entry.indexOf("studio-physical-mobile-v188.js"));
  assert.ok(entry.indexOf("studio-physical-mobile-v188.js") < entry.indexOf("studio-production-mobile-v189.js"));
  assert.match(read("src/StudioNext.jsx"), /SIDEBAR_STATE_V187/);
  assert.match(read("src/StudioNext.jsx"), /documentWordCountV187\(active\.content\)/);
});

test("v188 detects a physical phone even with Android desktop-site viewport", () => {
  assert.match(deviceMode, /view\.layoutWidth > view\.physicalViewportWidth \* 1\.35/);
  assert.doesNotMatch(deviceMode, /Math\.max\(TABLET_MAX, view\.physicalViewportWidth \* 1\.35\)/);
  assert.match(physicalRuntime, /studioDesktopSiteCompensationV188/);
  assert.match(physicalRuntime, /layoutWidth \/ state\.physicalWidth/);
  assert.match(physicalRuntime, /appRoot\.style\.setProperty\("zoom"/);
  assert.match(physicalRuntime, /--v188-drawer-width/);
});

test("v188 physical mobile layout keeps drawer, operational pages, editor, Media and Nara contained", () => {
  assert.match(physicalCss, /data-studio-physical-mobile-v188="true"/);
  assert.match(physicalCss, /data-studio-desktop-site-phone="true"/);
  assert.match(physicalCss, /\.sn-side-backdrop[\s\S]*inset: 0 0 0 var\(--v188-drawer-width\)/);
  assert.match(physicalCss, /#ngeblogging-studio-sidebar\.mobile-open[\s\S]*pointer-events: auto/);
  assert.match(physicalCss, /\.sn-media-tools>nav[\s\S]*overflow-x: auto/);
  assert.match(physicalCss, /\.sv124-toggle-row[\s\S]*grid-template-columns: minmax\(0,1fr\) 48px/);
  assert.match(physicalCss, /\.ce-workspace[\s\S]*grid-template-columns: minmax\(0,1fr\)/);
  assert.match(physicalCss, /data-physical-nara-mode-v188="nonmodal"[\s\S]*pointer-events: none/);
  assert.match(physicalRuntime, /backdrop\.hidden = !full/);
  assert.match(physicalRuntime, /close\.setAttribute\("aria-label", "Tutup Nara AI"\)/);
});

test("v188 release records verifiable scope without mass-capacity claims", () => {
  assert.equal(physicalRelease.release, "studio-physical-mobile-v188-20260801");
  assert.equal(physicalRelease.repairs.androidDesktopSiteCompensated, true);
  assert.equal(physicalRelease.repairs.drawerItemsClickable, true);
  assert.equal(physicalRelease.repairs.naraSmallMediumNonModal, true);
  assert.match(physicalRelease.claims.capacity, /No mass-user capacity claim/);
});
