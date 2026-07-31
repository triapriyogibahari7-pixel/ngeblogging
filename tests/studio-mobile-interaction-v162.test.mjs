import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const runtime = readFileSync("src/studio-mobile-interaction-v162.js", "utf8");
const css = readFileSync("src/studio-mobile-interaction-v162.css", "utf8");
const studio = readFileSync("src/Studio.jsx", "utf8");
const styleAuthority = readFileSync("src/studio-style-authority-v144.js", "utf8");

const families = ["application", "phone", "mobile", "compact", "tablet", "desktop"];
const viewportMatrix = [
  "320, 568", "360, 640", "375, 667", "390, 844", "412, 915", "430, 932",
  "600, 960", "768, 1024", "820, 1180", "1024, 768", "1280, 720",
  "1366, 768", "1440, 900", "1920, 1080",
];

test("v162 declares six real responsive families and desktop variants", () => {
  for (const family of families) assert.ok(runtime.includes(`"${family}"`), `missing family ${family}`);
  for (const pair of viewportMatrix) assert.ok(runtime.includes(`[${pair}]`), `missing viewport ${pair}`);
  for (const variant of ["laptop", "desktop", "computer"]) assert.ok(runtime.includes(`"${variant}"`));
  assert.match(runtime, /display-mode: standalone/);
  assert.match(runtime, /studioResponsiveFamilyV162/);
});

test("drawer stays clickable above a non-blurring backdrop and always unlocks", () => {
  assert.match(runtime, /main\.removeAttribute\("inert"\)/);
  assert.match(runtime, /sn-mobile-sidebar-open/);
  assert.match(runtime, /drawerBackdropV162 = "below-sidebar"/);
  assert.match(css, /\.sn-side-backdrop[\s\S]*z-index: 2147481000/);
  assert.match(css, /\.sn-side\.mobile-open[\s\S]*z-index: 2147482000/);
  assert.match(css, /backdrop-filter: none !important/);
  assert.match(css, /\.sn-side > nav[\s\S]*justify-content: flex-start !important/);
  assert.match(css, /--v162-drawer-width: clamp\(248px, 72vw, 340px\)/);
});

test("mobile n logo and avatar have fixed centered geometry", () => {
  assert.match(css, /\.sn-mobile-menu-mark,[\s\S]*place-items: center !important/);
  assert.match(css, /\.sn-mobile-menu-mark i[\s\S]*display: none !important/);
  assert.match(css, /\.sn-mobile-menu-mark strong[\s\S]*transform: translateY\(-1px\)/);
  assert.match(css, /\.sn-sidebar-toggle[\s\S]*width: 44px !important/);
  assert.match(css, /\.sn-avatar[\s\S]*width: 42px !important[\s\S]*height: 42px !important/);
});

test("Nara launcher is compact and small medium full remain distinct", () => {
  assert.match(css, /\.nara-floating-button[\s\S]*width: 58px !important[\s\S]*height: 58px !important/);
  assert.match(css, /\.nara-floating-button > b,[\s\S]*display: none !important/);
  assert.match(css, /data-nara-size="small"[\s\S]*height: min\(64dvh, 560px\)/);
  assert.match(css, /data-nara-size="medium"[\s\S]*height: min\(84dvh, 760px\)/);
  assert.match(css, /data-nara-size="full"[\s\S]*border-radius: 0 !important/);
  assert.match(runtime, /nara-close-v162/);
  assert.match(css, /\.nara-close-v162[\s\S]*visibility: visible !important/);
  assert.match(runtime, /aria-modal", full \? "true" : "false"/);
});

test("Nara mobile header and composer cannot scatter outside the panel", () => {
  assert.match(css, /\.nara-assistant-header[\s\S]*grid-template-columns/);
  assert.match(css, /\.nara-size-controls-v147[\s\S]*repeat\(3, 32px\)/);
  assert.match(css, /\.nara-composer-tools[\s\S]*grid-template-columns/);
  assert.match(css, /\.nara-select[\s\S]*min-width: 0 !important/);
  assert.match(css, /\.nara-assistant-messages[\s\S]*overflow-x: hidden !important/);
  assert.match(css, /animation: none !important/);
});

test("Android text autosizing and giant Media controls are prevented", () => {
  assert.match(css, /-webkit-text-size-adjust: 100% !important/);
  assert.match(css, /text-size-adjust: 100% !important/);
  assert.match(css, /\.sn-media-library \.sn-page-title > button[\s\S]*max-height: 52px/);
  assert.match(css, /\.sn-upload-zone h3[\s\S]*font-size: 22px/);
  assert.match(css, /\.sn-upload-zone[\s\S]*overflow: hidden !important/);
});

test("v162 authority loads after v152 while preserving prior authorities", () => {
  assert.ok(studio.indexOf("studio-continuity-v152.css") < studio.indexOf("studio-mobile-interaction-v162.css"));
  assert.ok(studio.indexOf("studio-mobile-interaction-v162.css") < studio.indexOf("studio-mobile-interaction-v162.js"));
  assert.match(styleAuthority, /studio-platform-v160\.js/);
  assert.match(styleAuthority, /studio-mobile-interaction-v162\.js/);
  assert.match(styleAuthority, /studio-style-authority-v162-20260731/);
});

test("v162 stylesheet blocks are balanced", () => {
  assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length);
});
