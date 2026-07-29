import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Studio loads the v140 device and layout authorities statically", () => {
  const studio = read("src/Studio.jsx");
  const compatibility = read("src/studio-device-mode-v138.js");
  assert.match(studio, /import StudioFastGate from "\.\/StudioFastGate\.jsx"/);
  assert.match(studio, /studio-device-mode-v140\.js/);
  assert.match(studio, /studio-layout-v140\.css/);
  assert.doesNotMatch(studio, /studio-device-mode-v139\.js/);
  assert.doesNotMatch(studio, /studio-device-modes-v138\.css/);
  assert.match(compatibility, /from "\.\/studio-device-mode-v140\.js"/);
});

test("v140 detects physical phones and desktop-site mode without a second drawer state", () => {
  const runtime = read("src/studio-device-mode-v140.js");
  assert.match(runtime, /HANDHELD_MAX = 820/);
  assert.match(runtime, /COMPACT_MAX = 760/);
  assert.match(runtime, /Android\|iPhone\|iPad\|iPod/);
  assert.match(runtime, /navigator\.maxTouchPoints > 1/);
  assert.match(runtime, /pointer: coarse/);
  assert.match(runtime, /physicalHandheld/);
  assert.match(runtime, /react-only-v140/);
  assert.match(runtime, /MutationObserver/);
  assert.match(runtime, /MODE_EVENT/);
  assert.doesNotMatch(runtime, /forcedDesktopSitePhone/);
  assert.doesNotMatch(runtime, /stopImmediatePropagation/);
});

test("React owns the complete navigation and mobile n button", () => {
  const studio = read("src/StudioNext.jsx");
  assert.match(studio, /data-navigation-owner="react-v138"/);
  assert.match(studio, /<span>Komentar<\/span>/);
  assert.match(studio, /<span>Domain<\/span>/);
  assert.match(studio, /<span>API Keys<\/span>/);
  assert.match(studio, /<CommentsPanelV124 site=\{site\}/);
  assert.match(studio, /<DomainPanelV124 site=\{site\}/);
  assert.match(studio, /<ApiKeysPanel setToast=\{setToast\}\/>/);
  assert.match(studio, /sn-mobile-menu-mark/);
  assert.match(studio, /<strong>n<\/strong><i>\.<\/i>/);
  assert.match(studio, /currentStudioDeviceMode\(\) === "small"/);
});

test("v140 geometry exposes n. and cannot overlap, blur, or leave white viewport gaps", () => {
  const css = read("src/studio-layout-v140.css");
  assert.match(css, /@import "\.\/studio-layout-v139\.css"/);
  assert.match(css, /data-studio-device-mode="small"/);
  assert.match(css, /data-studio-device-mode="large"/);
  assert.match(css, /\.sn-sidebar-toggle::before/);
  assert.match(css, /content:"n\."!important/);
  assert.match(css, /width:min\(88vw,340px\)!important/);
  assert.match(css, /margin:0!important/);
  assert.match(css, /overflow-x:hidden!important/);
  assert.match(css, /backdrop-filter:none!important/);
  assert.match(css, /\.sn-v139-forced-backdrop/);
});

test("legacy menu bridges stand down when React owns navigation", () => {
  const secure = read("src/StudioSecure.jsx");
  const comments = read("src/comments-studio-runtime-v93.jsx");
  const api = read("src/api-keys-studio-bridge.jsx");
  const sidebar = read("src/sidebar-final-v91.js");
  const finalRuntime = read("src/studio-final-v106.js");

  assert.doesNotMatch(secure, /import "\.\/studio-domain-single-authority-v112\.js"/);
  assert.match(comments, /navigationOwner==="react-v138"/);
  assert.match(api, /navigationOwner === "react-v138"/);
  assert.match(sidebar, /navigationOwner === "react-v138"/);
  assert.match(finalRuntime, /data-navigation-owner="react-v138"/);
});

test("production shell does not execute legacy Studio layout authorities", () => {
  const index = read("index.html");
  assert.match(index, /pwa-runtime-v140\.js/);
  for (const legacy of [
    "studio-interaction-v49.js",
    "studio-shell-v30.js",
    "studio-mobile-route-reset-v32.js",
    "studio-content-flow-v34.js",
    "studio-production-repair-v38.js",
    "studio-layout-builder-v39.js",
    "studio-responsive-repair-v43.js",
    "studio-reflow-v48.js",
    "studio-ui-stability-v95.js",
    "studio-surface-authority-v100.js",
    "studio-mobile-precision-v99.js",
    "studio-final-v106.js",
  ]) assert.doesNotMatch(index, new RegExp(`type="module" src="/src/${legacy.replaceAll(".", "\\.")}`));
});

test("service worker rotates all stale clients to v140 without double navigation", () => {
  const worker = read("public/sw.js");
  assert.match(worker, /ngeblogging-app-v140-sidebar-auth-20260729/);
  assert.match(worker, /single-react-layout-and-auth-v140/);
  assert.match(worker, /Promise\.allSettled/);
  assert.match(worker, /self\.clients\.claim\(\)/);
  assert.match(worker, /notifyOpenWindows/);
  assert.doesNotMatch(worker, /client\.navigate\(url\.href\)/);
});
