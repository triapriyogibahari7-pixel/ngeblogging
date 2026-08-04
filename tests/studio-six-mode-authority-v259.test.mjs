import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const runtime = read("src/studio-six-mode-authority-v259.js");
const css = read("src/studio-six-mode-authority-v259.css");
const shellV255 = read("src/studio-shell-interaction-v255.js");
const studio = read("src/Studio.jsx");
const auth = read("src/lib/supabase.js");
const authGateway = read("server/auth-gateway-v108.mjs");
const finalizer = read("scripts/finalize-studio-v259-order.mjs");
const vite = read("vite.config.js");
const sw = read("scripts/service-worker-v259-rotate.mjs");
const release = JSON.parse(read("public/release-v259.json"));

const requiredMenu = [
  "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
  "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
];
const viewports = [
  "320x568", "360x640", "375x667", "390x844", "412x915", "430x932",
  "600x960", "768x1024", "820x1180", "1024x768", "1280x720", "1366x768",
  "1440x900", "1920x1080",
];

test("v259 is installed after v257 and protected by the production finalizer", () => {
  const v257 = studio.indexOf('import "./studio-visual-native-v257.css";');
  const runtimeIndex = studio.indexOf('import "./studio-six-mode-authority-v259.js";');
  const cssIndex = studio.indexOf('import "./studio-six-mode-authority-v259.css";');
  assert.ok(v257 >= 0);
  assert.ok(runtimeIndex > v257);
  assert.ok(cssIndex > runtimeIndex);
  assert.match(finalizer, /studio-v259-post-build-order-20260804/);
  assert.match(finalizer, /V259_FINAL_ORDER_INVALID/);
  assert.match(vite, /finalizeStudioV259Order/);
});

test("six-mode authority keeps Chrome Android desktop-site locked as large", () => {
  assert.match(runtime, /desktopSitePhone/);
  assert.match(runtime, /v232ModeLock === "desktop-site-large"/);
  assert.match(runtime, /studioDesktopSitePhone = "true"/);
  assert.match(runtime, /studioResponsiveMode = "desktop"/);
  assert.match(runtime, /studioDeviceMode = "large"/);
  assert.match(runtime, /studioDeviceVariant = "desktop"/);
});

test("all required sidebar destinations are preserved and the small layout reserves no blank rail", () => {
  for (const label of requiredMenu) assert.ok(runtime.includes(`"${label}"`), `missing v259 menu guard ${label}`);
  assert.match(runtime, /data-v259-required-menu|v259RequiredMenu/);
  assert.match(css, /data-studio-v259-family="small"\] \.sn-main[\s\S]*margin-left:0!important/);
  assert.match(css, /--v259-side-open:248px/);
  assert.match(css, /--v259-side-rail:70px/);
  assert.match(css, /data-studio-v259-sidebar="expanded"[\s\S]*width:var\(--v259-side-open\)!important/);
  assert.match(css, /data-studio-v259-sidebar="collapsed"[\s\S]*width:var\(--v259-side-rail\)!important/);
  assert.match(css, /data-v259-required-menu="true"[\s\S]*visibility:visible!important/);
  assert.match(css, /data-studio-v259-sidebar="collapsed"[\s\S]*>svg[\s\S]*visibility:visible!important/);
});

test("profile remains fixed and bounded on both small and large layouts", () => {
  assert.match(runtime, /v259Profile = "fixed-visible"/);
  assert.match(css, /\.sn-avatar[\s\S]*position:fixed!important[\s\S]*z-index:11040!important/);
  assert.match(css, /sn-profile-menu-v150[\s\S]*max-width:calc\(100vw - 20px\)!important/);
});

test("Nara small and medium are non-modal and the launcher does not fight between observers", () => {
  assert.match(runtime, /v259Interaction = full \? "modal" : "nonmodal"/);
  assert.match(runtime, /camera-photo-file/);
  assert.match(runtime, /nara-select\.intelligence/);
  assert.match(runtime, /nara-select\.model/);
  assert.match(runtime, /launcher\.hidden = true/);
  assert.match(shellV255, /nara-launcher-stability-v259-20260804/);
  assert.match(shellV255, /hidden-while-panel-open/);
  assert.match(css, /\.nara-floating-button[\s\S]*position:fixed!important/);
  assert.match(css, /data-v259-interaction="nonmodal"[\s\S]*pointer-events:none!important/);
  assert.match(css, /data-v259-interaction="nonmodal"[\s\S]*\.nara-assistant-shell[\s\S]*pointer-events:auto!important/);
  assert.match(css, /\.nara-attachment-menu[\s\S]*bottom:calc\(100% \+ 8px\)!important/);
});

test("Theme code editor gets one synchronized gutter up to 10000 and responsive split", () => {
  assert.match(runtime, /Math\.min\(10_000/);
  assert.match(runtime, /LEGACY_CODE_GUTTERS/);
  assert.match(runtime, /legacy\.style\.setProperty\("display", "none", "important"\)/);
  assert.match(runtime, /v259-code-gutter/);
  assert.match(runtime, /gutter\.scrollTop = textarea\.scrollTop/);
  assert.match(css, /data-studio-v259-family="large"\] \.tn-code-workspace[\s\S]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)!important/);
  assert.match(css, /data-studio-v259-family="small"\] \.tn-code-preview-pane\{order:1!important\}/);
  assert.match(css, /data-studio-v259-family="small"\] \.tn-code-pane\{order:2!important\}/);
  assert.match(css, /min-height:620px!important/);
});

test("mobile editors and Domain actions are bounded instead of clipping horizontally", () => {
  assert.match(css, /data-studio-v259-family="small"\] \.ce-actions[\s\S]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)!important/);
  assert.match(css, /data-v259-domain-action="full-row"[\s\S]*width:100%!important/);
  assert.match(css, /writing-mode:horizontal-tb!important/);
  assert.match(css, /overflow-x:auto!important/);
});

test("login gateway and direct fallback have deadlines without weakening persisted sessions", () => {
  assert.match(auth, /auth-network-deadline-v259-20260804/);
  assert.match(auth, /GATEWAY_DEADLINE_MS_V259 = 8_500/);
  assert.match(auth, /DIRECT_DEADLINE_MS_V259 = 12_000/);
  assert.match(auth, /fetchWithDeadlineV259/);
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(auth, /flowType:\s*"pkce"/);
  assert.match(authGateway, /AUTH_UPSTREAM_TIMEOUT_MS = 7_000/);
  assert.match(authGateway, /production-public-fallback/);
  assert.doesNotMatch(auth, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/);
});

test("v259 release manifest keeps the requested viewport matrix without fake E2E claims", () => {
  assert.equal(release.release, "studio-six-mode-authority-v259-20260804");
  for (const viewport of viewports) assert.ok(release.validation.viewportMatrix.includes(viewport), viewport);
  assert.equal(release.validation.realDeviceExecutionVerifiedByThisManifest, false);
  assert.equal(release.validation.googleLoginEndToEndVerifiedByThisManifest, false);
  assert.equal(release.validation.linkedinLoginEndToEndVerifiedByThisManifest, false);
  assert.equal(release.validation.emailPasswordLoginEndToEndVerifiedByThisManifest, false);
  assert.match(release.validation.capacityClaim, /No 900-billion-user claim/i);
});

test("v259 service worker rotates cache without destructive session behavior", () => {
  assert.match(sw, /ACTIVE_VERSION_V258/);
  assert.match(sw, /ACTIVE_VERSION_V259/);
  assert.match(sw, /NGE_BLOGGING_UPDATE_AVAILABLE_V259/);
  assert.match(vite, /rotateServiceWorkerV259/);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
  assert.match(sw, /V259_ROTATE_DESTRUCTIVE_SESSION_ACTION/);
});
