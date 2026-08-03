import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, WIDGET_COUNT } from "../src/widget-system.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const chain = read("scripts/patch-v216-v215-auth-compat.mjs");
const patch = read("scripts/patch-production-v222.mjs");
const runtime = read("src/studio-production-v222.js");
const css = read("src/studio-production-v222.css");
const themeStudio = read("src/ThemeStudio.jsx");
const nara = read("src/NaraAssistant.jsx");
const auth = read("src/lib/supabase.js");
const analytics = read("src/studio-analytics-v41.js");
const release = JSON.parse(read("public/release-v222.json"));

const RELEASE = "studio-production-v222-20260803";

test("v222 is appended after v221 and preserves the full production chain", () => {
  assert.match(chain, /patch-production-v221\.mjs/);
  assert.match(chain, /patch-production-v222\.mjs/);
  assert.ok(chain.indexOf("patch-production-v221.mjs") < chain.indexOf("patch-production-v222.mjs"));
  assert.match(patch, /studio-production-v222\.js/);
  assert.match(runtime, new RegExp(RELEASE));
});

test("six responsive families remain while explicit desktop-site and physical-small modes are locked", () => {
  assert.deepEqual(release.responsive.families, ["application", "phone", "mobile", "compact", "tablet", "desktop"]);
  assert.deepEqual(release.responsive.desktopVariants, ["laptop", "desktop", "computer"]);
  assert.equal(release.responsive.explicitDesktopSiteLockedLarge, true);
  assert.equal(release.responsive.physicalSmallStaleDesktopDatasetRejected, true);
  assert.equal(release.responsive.modeBounceGuard, true);
  assert.match(runtime, /studioDesktopSitePhone === "true"/);
  assert.match(runtime, /studioV222ModeLock/);
});

test("green reference layout is full width with four clickable widget slots on both sides", () => {
  assert.match(runtime, /green-reference-full-width/);
  assert.match(runtime, /semantic-four-left-four-right/);
  assert.match(css, /data-v222-layout="green-reference-full-width"/);
  for (const selector of [
    ".sidebar-left-1", ".sidebar-left-2", ".sidebar-left-3", ".sidebar-left-4",
    ".sidebar-right-1", ".sidebar-right-2", ".sidebar-right-3", ".sidebar-right-4",
    ".content-main", ".before-content", ".after-content",
  ]) assert.ok(css.includes(selector), `missing v222 layout selector ${selector}`);
  assert.match(css, /data-v222-widget-list="below-map"/);
  assert.match(runtime, /pointer-events", "auto"/);
  assert.match(themeStudio, /preferredArea=\{widgetArea\}/);
});

test("100 themes, Theme Custom and all 26 widgets including custom HTML JavaScript remain", () => {
  assert.equal(THEME_COUNT, 100);
  assert.equal(BUILT_IN_THEMES.length, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size, 100);
  assert.equal(WIDGET_COUNT, 26);
  assert.equal(BUILT_IN_WIDGETS.at(-1)?.id, "custom-html");
  assert.match(themeStudio, /Tema Custom/);
  assert.match(themeStudio, /tn-widget-custom-code-v209/);
  assert.equal(release.theme.builtInThemesRequired, 100);
  assert.equal(release.theme.widgetCountRequired, 26);
});

test("code editor has real line numbers, reflows minified code and uses device-specific geometry", () => {
  assert.match(runtime, /MAX_CODE_LINES = 10000/);
  assert.match(runtime, /v222-code-line-gutter/);
  assert.match(runtime, /Array\.from\(\{ length: shown \}/);
  assert.match(runtime, /formatHtml/);
  assert.match(runtime, /formatBraced/);
  assert.match(runtime, /Rapikan kode/);
  assert.match(css, /data-v222-workspace="preview-above-code"/);
  assert.match(css, /data-v222-workspace="code-left-preview-right"/);
  assert.match(css, /grid-template-areas:"code preview"/);
  assert.equal(release.theme.codeLineLimitSupported, 10000);
  assert.equal(release.theme.actualLineNumbers, true);
  assert.equal(release.theme.minifiedCodeAutoPrettyPrint, true);
});

test("Nara plus menu is fixed to viewport and retains camera photo file voice model and intelligence", () => {
  assert.match(runtime, /v222AttachmentMenu = "fixed-visible"/);
  assert.match(runtime, /important\(menu, "position", "fixed"\)/);
  assert.match(css, /data-v222-attachment-menu="fixed-visible"/);
  for (const marker of ["Kamera", "Foto", "File teks", "Mic", "SpeakerIcon", "Nara Vision", "Nara Max", "Instan", "Sedang", "Tinggi", "Maksimal"]) {
    assert.ok(nara.includes(marker), `Nara feature missing ${marker}`);
  }
  assert.equal(release.nara.attachmentMenuFixedToViewport, true);
  assert.equal(release.nara.smallMediumNonModal, true);
});

test("domain mobile actions, real analytics and persistent authentication remain protected", () => {
  assert.match(css, /data-v222-domain-action="full-horizontal"/);
  assert.match(analytics, /get_site_analytics_dashboard/);
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
  assert.equal(release.analytics.realProductionRpcRetained, true);
  assert.equal(release.auth.forcedLogoutAdded, false);
  assert.equal(release.claims.massUserCapacityClaimed, false);
});
