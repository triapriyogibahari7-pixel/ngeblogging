import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-production-v202.js");
const css = read("src/studio-production-v202.css");
const chain = read("scripts/patch-service-worker-v179.mjs");
const patch = read("scripts/patch-production-v202.mjs");
const release = JSON.parse(read("public/release-v202.json"));

const RELEASE = "studio-production-v202-20260802";

test("v202 is the final Studio authority after v201 and is chained into production builds", () => {
  const v201 = entry.indexOf('import "./studio-production-v201.js";');
  const v202 = entry.indexOf('import "./studio-production-v202.js";');
  assert.ok(v201 >= 0);
  assert.ok(v202 > v201);
  assert.match(chain, /patch-production-v201\.mjs/);
  assert.match(chain, /patch-production-v202\.mjs/);
  assert.ok(chain.indexOf("patch-production-v201.mjs") < chain.indexOf("patch-production-v202.mjs"));
});

test("physical mobile rules do not depend only on CSS viewport media queries", () => {
  assert.match(runtime, /studioPhysicalMobileV193/);
  assert.match(runtime, /studioHandheld/);
  assert.match(runtime, /userAgentData\?\.mobile/);
  assert.match(runtime, /studioMobileV202/);
  assert.match(css, /data-studio-mobile-v202="true"/);
});

test("Theme Studio has one layout action and one unified code entry", () => {
  assert.match(runtime, /Edit Tata Letak/);
  assert.match(runtime, /Edit Kode/);
  assert.match(runtime, /duplicate-layout/);
  assert.match(runtime, /duplicate-code/);
  assert.match(runtime, /scrollIntoView/);
  assert.match(css, /contain: layout paint/);
});

test("Nara opens small and has one header row plus one composer row on physical phones", () => {
  assert.match(runtime, /naraRequestedSizeV202 = "small"/);
  assert.match(runtime, /button\[data-size="small"\]/);
  assert.match(runtime, /nara-direct-attachments-v202/);
  assert.match(runtime, /nara-mobile-direct-tools-v199/);
  assert.match(css, /grid-template-areas: "title sizes voice close"/);
  assert.match(css, /\.nara-composer-tools[\s\S]*flex-flow: row nowrap/);
  assert.match(css, /data-v202-mode="nonmodal"/);
});

test("API Keys empty state and endpoint are explicitly reflowed for physical mobile", () => {
  assert.match(css, /\.sn-api-empty/);
  assert.match(css, /grid-template-columns: minmax\(0,1fr\)/);
  assert.match(css, /\.sn-api-endpoint > header/);
  assert.match(css, /\.sn-api-endpoint pre/);
});

test("v202 service worker rotates cache without destructive session actions", () => {
  assert.match(patch, /ngeblogging-app-v202-mobile-theme-nara-20260802/);
  assert.match(patch, /mobile-theme-nara-cache-v202/);
  assert.match(patch, /V202_FORCED_NAVIGATION_REMAINS/);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});

test("v202 release is factual and keeps requested feature families", () => {
  assert.equal(release.release, RELEASE);
  assert.equal(release.repairs.mobileLogoWhiteCentered, true);
  assert.equal(release.repairs.themeCodeEntryUnified, true);
  assert.equal(release.repairs.naraHeaderSingleRow, true);
  assert.equal(release.repairs.naraComposerSingleRow, true);
  assert.equal(release.preserved.sixResponsiveFamilies, true);
  assert.equal(release.preserved.eightThemePreviewProfiles, true);
  assert.equal(release.preserved.hundredThemes, true);
  assert.equal(release.validation.massLoginCapacityClaimed, false);
  assert.equal(release.validation.realDeviceRequiredBeforeHundredPercentClaim, true);
});
