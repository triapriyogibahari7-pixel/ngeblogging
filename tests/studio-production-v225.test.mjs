import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, WIDGET_COUNT } from "../src/widget-system.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const chain = read("scripts/patch-service-worker-v179.mjs");
const patch = read("scripts/patch-production-v225.mjs");
const runtime = read("src/studio-production-v225.js");
const css = read("src/studio-production-v225.css");
const isolation = read("src/studio-production-v225-action-isolation.js");
const isolationCss = read("src/studio-production-v225-action-isolation.css");
const v222 = read("src/studio-production-v222.js");
const v209 = read("src/studio-production-v209.js");
const themeStudio = read("src/ThemeStudio.jsx");
const nara = read("src/NaraAssistant.jsx");
const auth = read("src/lib/supabase.js");
const analytics = read("src/studio-analytics-v41.js");
const dataReauth = read("scripts/patch-data-reauth-v224.mjs");
const release = JSON.parse(read("public/release-v225.json"));
const worker = read("public/sw.js");

const RELEASE = "studio-production-v225-20260803";

test("v225 runs after v224 data reauth and becomes final UI/cache authority", () => {
  const v224Pos = chain.lastIndexOf('patch-data-reauth-v224.mjs');
  const v225Pos = chain.lastIndexOf('patch-production-v225.mjs');
  assert.ok(v224Pos >= 0 && v225Pos > v224Pos);
  assert.match(runtime,new RegExp(RELEASE));
  assert.match(patch,/studio-production-v225\.js/);
  assert.match(patch,/studio-production-v225-action-isolation\.js/);
  assert.match(worker,/ngeblogging-app-v225-theme-layout-nara-20260803/);
  assert.match(worker,/theme-layout-nara-cache-v225/);
  assert.match(worker,/DATA_REAUTH_COMPAT_VERSION_V224/);
  assert.equal(release.preservesV224DataReauth,true);
});

test("v224 login data reauth remains installed and persistent sessions remain enabled", () => {
  assert.match(dataReauth,/retryDataAfterReauthV224/);
  assert.match(dataReauth,/refreshSession\(\)/);
  assert.match(auth,/DATA_REAUTH_RELEASE_V224/);
  assert.match(auth,/persistSession:\s*true/);
  assert.match(auth,/autoRefreshToken:\s*true/);
  for (const source of [runtime,isolation,patch]) assert.doesNotMatch(source,/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
  assert.equal(release.auth.v224DataReauthPreserved,true);
  assert.equal(release.auth.forcedLogoutAdded,false);
});

test("v209 cannot hide explicit HTML CSS JavaScript actions after isolation", () => {
  assert.match(v209,/querySelectorAll\(":scope > button"\)/);
  assert.match(isolation,/outside-v209-direct-button-sweep/);
  assert.match(isolation,/v225-theme-code-actions/);
  assert.match(isolationCss,/v225-theme-code-actions/);
  for (const kind of ["html","css","javascript"]) assert.ok(themeStudio.includes(`data-v222-code-tab="${kind}"`));
  assert.equal(release.theme.explicitHtmlActionVisible,true);
  assert.equal(release.theme.explicitCssActionVisible,true);
  assert.equal(release.theme.explicitJavascriptActionVisible,true);
});

test("physical-small green map keeps four left center and four right slots", () => {
  assert.match(runtime,/green-reference-four-left-four-right/);
  assert.match(runtime,/compact-green-map/);
  for (const selector of [".sidebar-left-1",".sidebar-left-2",".sidebar-left-3",".sidebar-left-4",".content-main",".sidebar-right-1",".sidebar-right-2",".sidebar-right-3",".sidebar-right-4"]) assert.ok(css.includes(selector));
  assert.match(themeStudio,/preferredArea=\{widgetArea\}/);
  assert.equal(release.theme.physicalSmallFourLeftFourRight,true);
});

test("Theme code keeps real gutter through 10000 lines and responsive split", () => {
  assert.match(v222,/MAX_CODE_LINES = 10000/);
  assert.match(v222,/v222-code-line-gutter/);
  assert.match(v222,/v222-format-code/);
  assert.match(runtime,/1-to-10000-actual/);
  assert.match(css,/data-v225-workspace="preview-above-code"/);
  assert.match(css,/data-v225-workspace="code-left-preview-right"/);
  assert.equal(release.theme.codeLineLimitSupported,10000);
  assert.equal(release.theme.actualLineNumbersRetained,true);
});

test("100 themes, Theme Custom and 26 widgets remain real catalog requirements", () => {
  assert.equal(THEME_COUNT,100);
  assert.equal(BUILT_IN_THEMES.length,100);
  assert.equal(new Set(BUILT_IN_THEMES.map((item) => item.id)).size,100);
  assert.equal(WIDGET_COUNT,26);
  assert.ok(BUILT_IN_WIDGETS.some((item) => item.id === "custom-html"));
  assert.match(themeStudio,/Tema Custom/);
  assert.match(themeStudio,/tn-widget-custom-code-v209/);
});

test("Nara remains nonmodal in small medium and exposes camera photo file model intelligence", () => {
  assert.match(runtime,/camera-photo-file/);
  assert.match(runtime,/viewport-fixed/);
  assert.match(css,/data-v225-nara-mode="nonmodal"/);
  assert.match(css,/data-v225-attachment-menu="viewport-fixed"/);
  for (const marker of ["Kamera","Foto","File teks","Mic","SpeakerIcon","Nara Mini","Nara Writer","Nara Vision","Nara Max","Instan","Sedang","Tinggi","Maksimal"]) assert.ok(nara.includes(marker),marker);
  assert.equal(release.nara.smallMediumNonModal,true);
  assert.equal(release.nara.attachmentMenuFixedToViewport,true);
});

test("sidebar drawer does not blur the Studio and Domain actions stay horizontal", () => {
  assert.match(runtime,/transparent-click-close/);
  assert.match(runtime,/centered-n/);
  assert.match(css,/backdrop-filter:none!important/);
  assert.match(css,/data-v225-domain-action="full-horizontal"/);
  assert.equal(release.sidebar.mobileBackdropNoBlur,true);
  assert.equal(release.domain.physicalSmallActionsFullHorizontal,true);
});

test("analytics keeps real RPC source while v225 enlarges charts without fake production data", () => {
  assert.match(analytics,/get_site_analytics_dashboard/);
  assert.match(analytics,/SIMULASI TAMPILAN — BUKAN DATA PRODUKSI/);
  assert.match(runtime,/large-detail/);
  assert.match(css,/data-v225-analytics="large-detail"/);
  assert.match(css,/op41-donut/);
  assert.equal(release.analytics.productionDataSourcePreserved,true);
});

test("release never claims impossible mass login verification", () => {
  assert.equal(release.claims.massUserCapacityClaimed,false);
  assert.equal(release.claims.nineHundredMillionOrBillionLoginSimulationClaimed,false);
  assert.equal(release.claims.allOAuthProvidersEndToEndProven,false);
});
