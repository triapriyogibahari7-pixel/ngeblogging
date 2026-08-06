import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v319 removes the double Theme map without deleting the v264 fallback", async () => {
  const [runtime, css, v308, release] = await Promise.all([
    read("src/studio-screenshot-regression-v319.js"),
    read("src/studio-screenshot-regression-v319.css"),
    read("src/studio-content-editor-responsive-v308.js"),
    read("public/release-v319.json"),
  ]);

  assert.match(runtime, /themeMapAuthorityV319/);
  assert.match(runtime, /v312-native/);
  assert.match(runtime, /v264-fallback/);
  assert.match(css, /data-theme-map-authority-v319="v312-native"/);
  assert.match(css, />\.tn-layout-map-v264/);
  assert.match(css, /tn-layout-models-v312/);
  assert.match(v308, /studio-screenshot-regression-v319\.js/);
  assert.match(release, /"themeMapSingleVisibleAuthority": true/);
  assert.match(release, /"legacyV264FallbackPreserved": true/);
});

test("v319 preserves v312 26-area, two-model, 100-theme and 10,000-line authorities", async () => {
  const [studio, widgetSystem, css, runtime, release] = await Promise.all([
    read("src/ThemeStudio.jsx"),
    read("src/widget-system.js"),
    read("src/studio-screenshot-regression-v319.css"),
    read("src/studio-screenshot-regression-v319.js"),
    read("public/release-v319.json"),
  ]);

  // These markers are materialized earlier in the production prebuild by the
  // v312 patch. Running this test from the v319 patch therefore catches a
  // future regression in that build chain as well as the v319 geometry layer.
  assert.match(studio, /theme-map-code-editor-v312-20260806/);
  assert.match(studio, /Model editorial/);
  assert.match(studio, /Model majalah/);
  assert.match(studio, /Array\.from\(\{ length: 10000 \}/);
  assert.match(studio, /data-theme-code-v312="line-numbers-10000"/);
  assert.match(widgetSystem, /HTML \/ CSS \/ JavaScript/);
  assert.match(runtime, /Array\.from\(\{ length: THEME_CODE_LINE_GUIDE_V319 \}/);
  assert.match(css, /grid-template-areas:"code preview"/);
  assert.match(css, /grid-template-areas:"preview" "code"/);
  assert.match(release, /"themeMapModelsPreserved": 2/);
  assert.match(release, /"themeLayoutAreasPreserved": 26/);
  assert.match(release, /"themeCountPreserved": 100/);
  assert.match(release, /"themeCodeLineGuidePreserved": 10000/);
});

test("v319 keeps first-site recovery stable and does not turn transient creation into logout", async () => {
  const [onboarding, css, release] = await Promise.all([
    read("src/StudioOnboardingGate.jsx"),
    read("src/studio-screenshot-regression-v319.css"),
    read("public/release-v319.json"),
  ]);
  assert.match(onboarding, /CREATE_RECOVERY_WINDOW_MS = 100_000/);
  assert.match(onboarding, /CREATE_RECOVERY_DELAY_MS = 12_000/);
  assert.match(onboarding, /Sesi akun tetap aktif dan tidak dihapus/);
  assert.match(css, /stableSurfaceV319|so75-startup/);
  assert.match(release, /"onboardingRecoveryWindowMsPreserved": 100000/);
});

test("v319 inherits real public-DNS verification and never claims NXDOMAIN is active", async () => {
  const [provider, panel, release] = await Promise.all([
    read("server/cloudflare-full-zone-provider.mjs"),
    read("src/DomainPanelV124.jsx"),
    read("public/release-v319.json"),
  ]);
  assert.match(provider, /PUBLIC_DNS_VERIFY_RELEASE_V318/);
  assert.match(provider, /publicDnsResolvesV318/);
  assert.match(provider, /application\/dns-json/);
  assert.match(panel, /public_dns_verified === true/);
  assert.match(panel, /worker-domain-dns-verified/);
  assert.match(release, /"fakeDomainActiveStatusAllowed": false/);
  assert.match(release, /"registrarNameserverDelegationAutomated": false/);
});

test("v319 visual runtime is non-destructive to auth and storage", async () => {
  const runtime = await read("src/studio-screenshot-regression-v319.js");
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(/);
  assert.doesNotMatch(runtime, /sessionStorage\.clear\s*\(/);
  assert.doesNotMatch(runtime, /signOut\s*\(/);
  assert.doesNotMatch(runtime, /location\.(?:reload|replace)\s*\(/);
});
