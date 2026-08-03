import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const chain = read("scripts/patch-service-worker-v179.mjs");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-production-v230.js");
const css = read("src/studio-production-v230.css");
const auth = read("src/lib/supabase.js");
const gate = read("src/StudioOnboardingGate.jsx");
const theme = read("src/ThemeStudio.jsx");
const analytics = read("src/studio-analytics-v41.js");
const worker = read("public/sw.js");
const release = JSON.parse(read("public/release-v230.json"));
const RELEASE = "studio-production-v230-preview-bootstrap-live-gate-20260803";

test("v230 runs after v229 and owns final preview/bootstrap authority", () => {
  assert.match(chain, /patch-production-v229\.mjs/);
  assert.match(chain, /patch-production-v230\.mjs/);
  assert.ok(chain.indexOf("patch-production-v229.mjs") < chain.indexOf("patch-production-v230.mjs"));
  assert.match(entry, /studio-production-v229\.js/);
  assert.match(entry, /studio-production-v230\.js/);
  assert.ok(entry.indexOf("studio-production-v229.js") < entry.indexOf("studio-production-v230.js"));
  assert.match(runtime, new RegExp(RELEASE));
});

test("eight device previews preserve actual target width and scale into the visible frame", () => {
  for (const [device,width] of Object.entries({ application:360, phone:390, mobile:430, compact:600, tablet:820, laptop:1180, desktop:1440, computer:1680 })) {
    assert.match(runtime, new RegExp(`${device}: ${width}`));
  }
  assert.match(runtime, /previewTargetWidth/);
  assert.match(runtime, /availableWidth \/ targetWidth/);
  assert.match(runtime, /translateX\(-50%\) scale/);
  assert.match(css, /tn-frame-shell\[data-v230-preview-scale\]/);
  assert.match(css, /--v230-preview-target-width/);
  assert.match(css, /transform-origin:top center!important/);
  assert.equal(release.preview.keepsActualDeviceViewport, true);
  assert.equal(release.preview.visuallyScalesIntoAvailableFrame, true);
  assert.equal(release.preview.rootScalingAdded, false);
});

test("sidebar exposes one visible n control, hides X and keeps menus close to Buat Post", () => {
  assert.match(runtime, /normalizeSidebarControls/);
  assert.match(runtime, /mobile-closed-logo/);
  assert.match(runtime, /desktop-collapsed/);
  assert.match(runtime, /sideClose\.hidden = true/);
  assert.match(css, /sn-side-close\{display:none!important/);
  assert.match(css, /sn-sidebar-toggle\[hidden\]\{display:none!important/);
  assert.match(css, /#ngeblogging-studio-sidebar>nav\{justify-content:flex-start!important/);
  assert.match(css, /data-v230-sidebar="mobile-open"/);
  assert.match(css, /data-v230-sidebar="desktop-collapsed"/);
});

test("small-device layout remains the green-reference site map instead of a tiny tile board", () => {
  assert.match(theme, /data-v226-layout-source="native-green-reference"/);
  assert.match(theme, /data-v226-green-map="four-left-post-four-right"/);
  assert.match(css, /grid-template-columns:minmax\(66px,\.9fr\) minmax\(132px,1\.75fr\) minmax\(66px,\.9fr\)/);
  for (const marker of [
    ".sidebar-left-1", ".sidebar-left-2", ".sidebar-left-3", ".sidebar-left-4",
    ".sidebar-right-1", ".sidebar-right-2", ".sidebar-right-3", ".sidebar-right-4",
    ".content-main", ".before-content", ".after-content",
  ]) assert.ok(css.includes(marker), `small map missing ${marker}`);
  assert.match(theme, /preferredArea=\{widgetArea\}/);
});

test("false startup error retries only after an authenticated session and real site read succeed", () => {
  assert.match(runtime, /STARTUP_RETRY_LIMIT = 3/);
  assert.match(runtime, /supabase\.auth\.getSession\(\)/);
  assert.match(runtime, /listUserSites\(userId\)/);
  assert.match(runtime, /authenticated-and-readable/);
  assert.match(runtime, /surface\.retry\.click\(\)/);
  assert.match(runtime, /backend-not-confirmed/);
  assert.doesNotMatch(runtime, /getVerifiedSession\(\{ force: true \}\)/);
  assert.doesNotMatch(runtime, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/);
  assert.match(gate, /recoverStudioMembershipV196/);
  assert.match(gate, /tidak ada logout otomatis/);
  assert.equal(release.studioBootstrap.retryOnlyAfterLocalSessionAndSiteReadSucceed, true);
  assert.equal(release.studioBootstrap.automaticLogoutAdded, false);
});

test("topbar profile remains visible and avatar URL gets a bounded live preview", () => {
  assert.match(runtime, /querySelector\("\.sn-top,\.sn-topbar"\)/);
  assert.match(runtime, /v230TopbarProfile = "visible"/);
  assert.match(runtime, /v230-avatar-preview/);
  assert.match(css, /v230-avatar-preview/);
  assert.match(css, /object-fit:cover!important/);
  assert.equal(release.profile.topbarProfileRequired, true);
  assert.equal(release.profile.avatarUrlLivePreview, true);
});

test("v229 Theme/Nara and real Analytics remain preserved", () => {
  assert.match(theme, /data-v226-layout-source="native-green-reference"/);
  assert.match(theme, /preferredArea=\{widgetArea\}/);
  assert.match(analytics, /get_site_analytics_dashboard/);
  assert.equal(release.preserved.themeCount, 100);
  assert.equal(release.preserved.widgetCount, 26);
  assert.equal(release.preserved.greenLayoutMap, true);
  assert.equal(release.preserved.naraCameraPhotoFile, true);
  assert.equal(release.preserved.realAnalyticsRpc, true);
});

test("auth persistence and v230 service-worker cache are final without forced navigation", () => {
  assert.match(auth, /persistSession: true/);
  assert.match(auth, /autoRefreshToken: true/);
  assert.match(worker, /ACTIVE_VERSION_V230/);
  assert.match(worker, /ACTIVE_CACHE_RELEASE_V230/);
  assert.match(worker, /ngeblogging-app-v230-preview-bootstrap-live-gate-20260803/);
  assert.match(worker, /preview-bootstrap-live-gate-cache-v230/);
  assert.doesNotMatch(worker, /await refreshStaleWindow\(client, url\);/);
  assert.equal(release.serviceWorker.forcedNavigation, false);
  assert.equal(release.serviceWorker.sessionStorageClearing, false);
});

test("v230 does not claim unverified OAuth or mass capacity", () => {
  assert.equal(release.release, RELEASE);
  assert.equal(release.validation.googleOAuthEndToEndClaimed, false);
  assert.equal(release.validation.linkedinOAuthEndToEndClaimed, false);
  assert.equal(release.validation.massCapacityClaimed, false);
  assert.equal(release.validation.realDeviceRequired, true);
});

test("v234 is chained after v233 and owns the current screenshot geometry without deleting data-session recovery", () => {
  const runtime234 = read("src/studio-production-v234.js");
  const css234 = read("src/studio-production-v234.css");
  const patch234 = read("scripts/patch-production-v234.mjs");
  const release234 = JSON.parse(read("public/release-v234.json"));
  assert.match(chain, /patch-production-v233\.mjs/);
  assert.match(chain, /patch-production-v234\.mjs/);
  assert.ok(chain.indexOf("patch-production-v233.mjs") < chain.indexOf("patch-production-v234.mjs"));
  assert.match(entry, /studio-production-v234\.js/);
  assert.ok(entry.indexOf("studio-production-v232.js") < entry.indexOf("studio-production-v234.js"));
  assert.match(runtime234, /studio-production-v234-screenshot-layout-sidebar-nara-20260803/);
  assert.match(runtime234, /GRID_PLACEMENT/);
  assert.match(runtime234, /"content-main": \["4 \/ 10", "6 \/ 10"\]/);
  assert.match(runtime234, /WIDGET_CHOICES/);
  assert.match(runtime234, /HTML \/ JavaScript/);
  assert.match(runtime234, /Array\.from\(\{ length: 10000 \}/);
  assert.match(runtime234, /camera-photo-file/);
  assert.match(css234, /v234-layout-popover/);
  assert.match(css234, /code-left-preview-right/);
  assert.match(css234, /preview-top-code-bottom/);
  assert.match(css234, /nara-attachment-menu/);
  assert.match(css234, /data-v234-domain-action/);
  assert.match(patch234, /ACTIVE_VERSION_V234/);
  assert.match(patch234, /ACTIVE_CACHE_RELEASE_V234/);
  assert.match(auth, /DATA_TRANSPORT_RELEASE_V233/);
  assert.equal(release234.themeStudio.themeCount, 100);
  assert.equal(release234.themeStudio.widgetCount, 26);
  assert.equal(release234.sidebar.desktopSingleInternalN, true);
  assert.equal(release234.topbar.siteManagerMovedToSummary, true);
  assert.equal(release234.nara.cameraPhotoFileMenu, true);
  assert.equal(release234.auth.v233DataFailoverPreserved, true);
  assert.equal(release234.auth.automaticLogoutAdded, false);
  assert.doesNotMatch(runtime234, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});
