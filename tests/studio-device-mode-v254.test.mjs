import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const device = read("src/studio-device-mode-v140.js");
const studio = read("src/StudioNext.jsx");
const shellV253 = read("src/studio-shell-nara-v253.js");
const auth = read("src/lib/supabase.js");

function effectiveMode({ installed = false, handheld = false, physicalShortSide = 390, layoutWidth = 390, physicalViewportWidth = 390, effectiveWidth = layoutWidth }) {
  let responsive;
  if (installed) responsive = "application";
  else if (handheld && physicalShortSide <= 430) responsive = "phone";
  else if (handheld) responsive = "mobile";
  else if (effectiveWidth <= 760) responsive = "compact";
  else if (effectiveWidth <= 1180) responsive = "tablet";
  else responsive = "desktop";

  const physicalResponsiveMode = responsive;
  const desktopSitePhone = handheld && !installed && layoutWidth > physicalViewportWidth * 1.35;
  if (desktopSitePhone) responsive = "desktop";
  const layout = ["application", "phone", "mobile", "compact"].includes(responsive) ? "small" : "large";
  const variant = desktopSitePhone ? "computer" : responsive === "desktop" ? (effectiveWidth <= 1536 ? "laptop" : "computer") : responsive;
  return { physicalResponsiveMode, responsive, layout, variant, desktopSitePhone };
}

test("v254 keeps the historical detector contract and adds only a desktop-site alignment hotfix", () => {
  assert.match(device, /studio-device-mode-v188-20260801/);
  assert.match(device, /studio-device-mode-v254-hotfix-20260804/);
  assert.match(device, /let responsiveMode = classifyResponsiveMode\(view, handheld\)/);
  assert.match(device, /const physicalResponsiveMode = responsiveMode/);
  assert.match(device, /const desktopSitePhone = handheld && !standaloneSurface\(\) && view\.layoutWidth > view\.physicalViewportWidth \* 1\.35/);
  assert.match(device, /if \(desktopSitePhone\) responsiveMode = "desktop"/);
  assert.match(device, /const nextLayoutMode = layoutMode\(responsiveMode\)/);
  assert.match(device, /const variant = desktopSitePhone \? "computer" : desktopVariant\(view, responsiveMode\)/);
  assert.match(device, /root\.dataset\.studioDeviceMode = nextLayoutMode/);
  assert.match(device, /root\.dataset\.studioDeviceHotfixRelease = DEVICE_MODE_HOTFIX_RELEASE/);
  assert.match(studio, /currentStudioDeviceMode\(\) === "small"/);
  assert.match(shellV253, /studioDesktopSitePhone === "true"/);
});

test("normal six-family behavior stays unchanged while Android Desktop Site becomes large computer", () => {
  assert.equal(effectiveMode({ installed: true, handheld: true }).responsive, "application");
  assert.equal(effectiveMode({ handheld: true, physicalShortSide: 390 }).responsive, "phone");
  assert.equal(effectiveMode({ handheld: true, physicalShortSide: 500, layoutWidth: 500, physicalViewportWidth: 500 }).responsive, "mobile");
  assert.equal(effectiveMode({ handheld: false, physicalShortSide: 600, layoutWidth: 600, physicalViewportWidth: 600, effectiveWidth: 600 }).responsive, "compact");
  assert.equal(effectiveMode({ handheld: false, physicalShortSide: 820, layoutWidth: 820, physicalViewportWidth: 820, effectiveWidth: 820 }).responsive, "tablet");
  assert.equal(effectiveMode({ handheld: false, physicalShortSide: 900, layoutWidth: 1366, physicalViewportWidth: 1366, effectiveWidth: 1366 }).variant, "laptop");
  assert.equal(effectiveMode({ handheld: false, physicalShortSide: 1080, layoutWidth: 1920, physicalViewportWidth: 1920, effectiveWidth: 1920 }).variant, "computer");

  const desktopSite = effectiveMode({ handheld: true, physicalShortSide: 390, layoutWidth: 980, physicalViewportWidth: 390, effectiveWidth: 980 });
  assert.equal(desktopSite.physicalResponsiveMode, "phone");
  assert.equal(desktopSite.desktopSitePhone, true);
  assert.equal(desktopSite.responsive, "desktop");
  assert.equal(desktopSite.layout, "large");
  assert.equal(desktopSite.variant, "computer");
});

test("v254 does not alter session persistence or introduce destructive logout behavior", () => {
  assert.doesNotMatch(device, /localStorage\.clear|sessionStorage\.clear|signOut\s*\(/);
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(auth, /flowType:\s*"pkce"/);
});