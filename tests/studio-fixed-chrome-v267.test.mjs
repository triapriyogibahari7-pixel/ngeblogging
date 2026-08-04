import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const studio = read("src/Studio.jsx");
const device = read("src/studio-device-mode-v140.js");
const css = read("src/studio-shell-v265-final-hotfix.css");
const singleToggle = read("src/studio-sidebar-single-toggle-v267.js");
const sw265 = read("scripts/patch-service-worker-v265.mjs");
const sw267 = read("scripts/patch-service-worker-v267.mjs");

test("desktop-site detection is sticky and cannot bounce back during browser chrome changes", () => {
  assert.match(device, /studio-device-mode-v267-20260804/);
  assert.match(device, /let desktopSiteLock = false/);
  assert.match(device, /navigator\.userAgentData\?\.mobile === false/);
  assert.match(device, /wideTouchDesktopSurface/);
  assert.match(device, /if \(requested\) desktopSiteLock = true/);
  assert.match(device, /clearlyMobileAgain/);
  assert.match(device, /studioDesktopSiteLock/);
});

test("mobile n is physically fixed to the viewport and remains touchable after scroll", () => {
  assert.match(css, /html\.studio-v265-small \.sn-top>\.sn-sidebar-toggle[\s\S]*position:fixed!important/);
  assert.match(css, /z-index:2147483000!important/);
  assert.match(css, /touch-action:manipulation!important/);
  assert.match(css, /body\.sn-mobile-sidebar-open \.sn-top>\.sn-sidebar-toggle[\s\S]*display:none!important/);
  assert.match(css, /#ngeblogging-studio-sidebar\.mobile-open \.sn-logo-mark[\s\S]*pointer-events:auto!important/);
});

test("internal sidebar n is captured once before historical v229/v231 target listeners", () => {
  assert.match(studio, /import "\.\/studio-sidebar-single-toggle-v267\.js";/);
  assert.match(singleToggle, /studio-sidebar-single-toggle-v267-20260804/);
  assert.match(singleToggle, /document\.addEventListener\("click", activate, true\)/);
  assert.match(singleToggle, /event\.stopImmediatePropagation\(\)/);
  assert.match(singleToggle, /toggle\.click\(\)/);
  assert.doesNotMatch(singleToggle, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});

test("desktop collapsed sidebar remains a visible icon rail and external n stays hidden", () => {
  assert.match(css, /#ngeblogging-studio-sidebar\.collapsed[\s\S]*width:72px!important/);
  assert.match(css, /#ngeblogging-studio-sidebar\.collapsed>nav[\s\S]*display:flex!important/);
  assert.match(css, /#ngeblogging-studio-sidebar\.collapsed :is\(\.sn-new,nav>button,\.sn-account-footer>button\)>svg[\s\S]*display:block!important/);
  assert.match(css, /html\.studio-v265-large \.sn-top>\.sn-sidebar-toggle[\s\S]*display:none!important/);
  assert.match(css, /html\[data-studio-desktop-site-phone="true"\] \.sn-top>\.sn-sidebar-toggle/);
});

test("Nara launcher is viewport-fixed in every mode and non-modal geometry remains bounded", () => {
  assert.match(css, /\.nara-floating-button\{[\s\S]*position:fixed!important/);
  assert.match(css, /right:max\(12px,env\(safe-area-inset-right\)\)!important/);
  assert.match(css, /bottom:max\(14px,calc\(env\(safe-area-inset-bottom\) \+ 12px\)\)!important/);
  assert.match(css, /\.nara-assistant-layer\{[\s\S]*position:fixed!important/);
  assert.match(css, /\.nara-assistant-shell\[data-nara-size="small"\],\.nara-assistant-shell\[data-nara-size="medium"\][\s\S]*position:fixed!important/);
});

test("fixed chrome release rotates the service-worker cache without logout or forced navigation", () => {
  assert.match(sw265, /await import\("\.\/patch-service-worker-v267\.mjs"\)/);
  assert.match(sw267, /studio-fixed-chrome-v267-20260804/);
  assert.match(sw267, /studio-fixed-chrome-cache-v267/);
  assert.match(sw267, /UI_PATCH_RELEASE_V267/);
  assert.match(sw267, /UI_CACHE_RELEASE_V267/);
  assert.doesNotMatch(sw267, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
  assert.match(sw267, /V267_SW_DOUBLE_RELOAD_REGRESSION/);
});
