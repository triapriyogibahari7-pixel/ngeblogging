import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const device = read("src/studio-device-mode-v140.js");
const studio = read("src/StudioNext.jsx");
const shellV253 = read("src/studio-shell-nara-v253.js");
const auth = read("src/lib/supabase.js");
const rotate = read("scripts/service-worker-v254-rotate.mjs");
const vite = read("vite.config.js");

function classify({ installed = false, handheld = false, physicalShortSide = 900, layoutWidth = 1366, physicalViewportWidth = 1366, effectiveWidth = layoutWidth }) {
  const desktopSitePhone = !installed && handheld && layoutWidth > physicalViewportWidth * 1.35;
  let physical;
  if (installed) physical = "application";
  else if (handheld && physicalShortSide <= 430) physical = "phone";
  else if (handheld && physicalShortSide <= 600) physical = "mobile";
  else if (handheld) physical = "tablet";
  else if (effectiveWidth <= 760) physical = "compact";
  else if (effectiveWidth <= 1180) physical = "tablet";
  else physical = "desktop";

  const responsive = desktopSitePhone ? "desktop" : physical;
  const layout = ["application", "phone", "mobile", "compact"].includes(responsive) ? "small" : "large";
  const variant = desktopSitePhone ? "computer" : responsive === "desktop" ? (effectiveWidth <= 1536 ? "laptop" : "computer") : responsive;
  return { physical, responsive, layout, variant, desktopSitePhone };
}

test("v254 makes the source device detector the same authority React and v253 consume", () => {
  assert.match(device, /studio-device-mode-v254-20260804/);
  assert.match(device, /function desktopSiteRequested/);
  assert.match(device, /if \(desktopSiteRequested\(view, handheld, installed\)\) return "desktop"/);
  assert.match(device, /root\.dataset\.studioPhysicalResponsiveMode = physicalResponsiveMode/);
  assert.match(device, /root\.dataset\.studioDeviceMode = nextLayoutMode/);
  assert.match(device, /if \(desktopSitePhone\) return "computer"/);
  assert.match(studio, /currentStudioDeviceMode\(\) === "small"/);
  assert.match(shellV253, /studioDesktopSitePhone === "true"/);
});

test("six-family matrix stays stable across phone, application, compact, tablet, laptop and computer", () => {
  assert.deepEqual(classify({ installed: true, handheld: true, physicalShortSide: 390, layoutWidth: 390, physicalViewportWidth: 390 }), {
    physical: "application", responsive: "application", layout: "small", variant: "application", desktopSitePhone: false,
  });
  assert.equal(classify({ handheld: true, physicalShortSide: 390, layoutWidth: 390, physicalViewportWidth: 390 }).responsive, "phone");
  assert.equal(classify({ handheld: true, physicalShortSide: 500, layoutWidth: 500, physicalViewportWidth: 500 }).responsive, "mobile");
  assert.equal(classify({ handheld: false, physicalShortSide: 600, layoutWidth: 600, physicalViewportWidth: 600, effectiveWidth: 600 }).responsive, "compact");
  assert.equal(classify({ handheld: true, physicalShortSide: 820, layoutWidth: 820, physicalViewportWidth: 820, effectiveWidth: 820 }).layout, "large");
  assert.equal(classify({ handheld: true, physicalShortSide: 820, layoutWidth: 820, physicalViewportWidth: 820, effectiveWidth: 820 }).responsive, "tablet");
  assert.equal(classify({ handheld: false, physicalShortSide: 900, layoutWidth: 1366, physicalViewportWidth: 1366, effectiveWidth: 1366 }).variant, "laptop");
  assert.equal(classify({ handheld: false, physicalShortSide: 1080, layoutWidth: 1920, physicalViewportWidth: 1920, effectiveWidth: 1920 }).variant, "computer");
});

test("Android Desktop Site is deliberately the large computer family instead of bouncing back to mobile", () => {
  const mode = classify({ handheld: true, physicalShortSide: 390, layoutWidth: 980, physicalViewportWidth: 390, effectiveWidth: 980 });
  assert.equal(mode.desktopSitePhone, true);
  assert.equal(mode.physical, "phone");
  assert.equal(mode.responsive, "desktop");
  assert.equal(mode.layout, "large");
  assert.equal(mode.variant, "computer");
  assert.match(device, /const responsiveMode = desktopSitePhone \? "desktop" : physicalResponsiveMode/);
});

test("the detector never clears or signs out a session and persistent auth remains enabled", () => {
  assert.doesNotMatch(device, /localStorage\.clear|sessionStorage\.clear|signOut\s*\(/);
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(auth, /flowType:\s*"pkce"/);
});

test("v254 cache rotation runs after v253 and keeps auth surfaces protected", () => {
  for (const marker of [
    "studio-device-mode-v254-20260804",
    "ngeblogging-app-v254-device-mode-20260804",
    "studio-device-mode-cache-v254",
    "ACTIVE_VERSION_V253",
    "isAuthSurface(url)",
  ]) assert.ok(rotate.includes(marker), `missing ${marker}`);
  assert.match(vite, /rotateServiceWorkerV253\(\)[\s\S]*rotateServiceWorkerV254\(\)/);
  assert.doesNotMatch(rotate, /localStorage\.clear|sessionStorage\.clear|signOut\s*\(/);
  assert.doesNotMatch(rotate, /await\s+refreshStaleWindow\(client, url\);/);
});