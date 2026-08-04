import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const device = read("src/studio-device-mode-v140.js");
const css = read("src/studio-final-device-authority-v268.css");
const singleToggle = read("src/studio-sidebar-single-toggle-v267.js");
const profileMenu = read("src/studio-profile-menu-v268.js");
const sw267 = read("scripts/patch-service-worker-v267.mjs");
const sw268 = read("scripts/patch-service-worker-v268.mjs");

test("six responsive classes remain available and feed a small or large layout family", () => {
  for (const mode of ["application", "phone", "mobile", "compact", "tablet", "desktop"]) {
    assert.match(device, new RegExp(`"${mode}"`));
  }
  assert.match(device, /root\.dataset\.studioDeviceMode = nextLayoutMode/);
  assert.match(device, /\["application", "phone", "mobile", "compact"\]\.includes\(responsiveMode\)/);
  assert.match(device, /return "large"/);
});

test("v268 is loaded last through the single-owner sidebar module", () => {
  assert.match(singleToggle, /import "\.\/studio-final-device-authority-v268\.css";/);
  assert.match(singleToggle, /import "\.\/studio-profile-menu-v268\.js";/);
  assert.match(singleToggle, /event\.stopImmediatePropagation\(\)/);
  assert.match(singleToggle, /toggle\.click\(\)/);
});

test("large family always renders the desktop sidebar and a centered collapsed icon rail", () => {
  assert.match(css, /html\[data-studio-device-mode="large"\] #ngeblogging-studio-sidebar[\s\S]*display:flex!important/);
  assert.match(css, /#ngeblogging-studio-sidebar:not\(\.collapsed\)[\s\S]*width:var\(--v268-side-open\)!important/);
  assert.match(css, /#ngeblogging-studio-sidebar\.collapsed[\s\S]*width:var\(--v268-side-rail\)!important/);
  assert.match(css, /--v268-side-rail:72px/);
  assert.match(css, /collapsed :is\(\.sn-new,nav>button,\.sn-account-footer>button\)[\s\S]*justify-content:center!important/);
  assert.match(css, /html\[data-studio-device-mode="large"\] \.sn-top>\.sn-sidebar-toggle[\s\S]*display:none!important/);
  assert.match(css, /html\[data-studio-device-mode="large"\] \.sn-top \.sn-avatar[\s\S]*display:flex!important/);
});

test("sidebar menu stack remains complete, tight under Create Post, and footer stays at the bottom", () => {
  assert.match(css, /#ngeblogging-studio-sidebar \.sn-new[\s\S]*margin:5px 9px 3px!important/);
  assert.match(css, /#ngeblogging-studio-sidebar>nav[\s\S]*gap:2px!important/);
  assert.match(css, /#ngeblogging-studio-sidebar>nav[\s\S]*overflow-y:auto!important/);
  assert.match(css, /#ngeblogging-studio-sidebar>\.sn-account-footer[\s\S]*margin-top:auto!important/);
  assert.match(css, /#ngeblogging-studio-sidebar>nav>button[\s\S]*visibility:visible!important/);
});

test("small family exposes one fixed n and a full-height drawer without blur", () => {
  assert.match(css, /html\[data-studio-device-mode="small"\] \.sn-top>\.sn-sidebar-toggle[\s\S]*position:fixed!important/);
  assert.match(css, /html\[data-studio-device-mode="small"\] #ngeblogging-studio-sidebar\{[\s\S]*transform:translate3d\(-105%,0,0\)!important/);
  assert.match(css, /#ngeblogging-studio-sidebar\.mobile-open[\s\S]*transform:translate3d\(0,0,0\)!important/);
  assert.match(css, /html\[data-studio-device-mode="small"\] \.sn-side-backdrop[\s\S]*background:transparent!important/);
  assert.match(css, /#ngeblogging-studio-sidebar\.mobile-open :is\(\.sn-new,nav>button,\.sn-account-footer>button\)>span[\s\S]*display:inline!important/);
});

test("mobile summary header and rows cannot overlap", () => {
  assert.match(css, /html\[data-studio-device-mode="small"\] \.sn-home-grid>section>header[\s\S]*position:static!important/);
  assert.match(css, /\.sn-home-grid>section>header[\s\S]*min-height:58px!important/);
  assert.match(css, /\.sn-home-grid>section>button[\s\S]*position:relative!important/);
  assert.match(css, /\.sn-home-grid>section>button b[\s\S]*overflow-wrap:anywhere!important/);
});

test("Nara remains viewport-fixed, non-modal in small/medium, and attachment chooser stays compact", () => {
  assert.match(css, /\.nara-floating-button\{[\s\S]*position:fixed!important/);
  assert.match(css, /z-index:2147483200!important/);
  assert.match(css, /\.nara-assistant-layer[\s\S]*pointer-events:none!important/);
  assert.match(css, /data-nara-v265-interaction="nonmodal"[\s\S]*pointer-events:none!important/);
  assert.match(css, /data-nara-v265-interaction="nonmodal"\]>\.nara-assistant-backdrop[\s\S]*display:none!important/);
  assert.match(css, /\.nara-assistant-shell\[data-nara-size="small"\][\s\S]*width:min\(390px,calc\(100vw - 16px\)\)!important/);
  assert.match(css, /\.nara-assistant-shell\[data-nara-size="medium"\][\s\S]*width:min\(680px,calc\(100vw - 16px\)\)!important/);
  assert.match(css, /\.nara-attachment-menu[\s\S]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
});

test("profile avatar owns five functional actions without automatic logout", () => {
  assert.match(profileMenu, /studio-profile-menu-v268-20260804/);
  for (const action of ["profile", "add-site", "settings", "nara", "logout"]) {
    assert.match(profileMenu, new RegExp(`data-action="${action}"`));
  }
  assert.match(profileMenu, /root\(\)\.dataset\.studioAccountViewV189 = mode === "profile" \? "profile" : "settings"/);
  assert.match(profileMenu, /document\.querySelector\("\.sn-workspace"\)/);
  assert.match(profileMenu, /document\.querySelector\("\.nara-floating-button"\)\?\.click\(\)/);
  assert.match(profileMenu, /document\.querySelector\("\.sn-account-logout-v135"\)\?\.click\(\)/);
  assert.doesNotMatch(profileMenu, /signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/);
});

test("theme code editor uses 50:50 large layout and stacked small layout", () => {
  assert.match(css, /html\[data-studio-device-mode="large"\] \.tn-code-workspace[\s\S]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)!important/);
  assert.match(css, /html\[data-studio-device-mode="small"\] \.tn-code-workspace[\s\S]*grid-template-columns:1fr!important/);
  assert.match(css, /html\[data-studio-device-mode="small"\] \.tn-layout-content-v264[\s\S]*grid-template-columns:minmax\(62px,.68fr\) minmax\(118px,1.7fr\) minmax\(62px,.68fr\)!important/);
});

test("v268 service-worker rotation is chained and remains session-safe", () => {
  assert.match(sw267, /await import\("\.\/patch-service-worker-v268\.mjs"\)/);
  assert.match(sw268, /studio-final-device-authority-v268-20260804/);
  assert.match(sw268, /studio-final-device-cache-v268/);
  assert.match(sw268, /UI_PATCH_RELEASE_V268/);
  assert.match(sw268, /UI_CACHE_RELEASE_V268/);
  assert.match(sw268, /V268_SW_DOUBLE_RELOAD_REGRESSION/);
  assert.doesNotMatch(sw268, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});
