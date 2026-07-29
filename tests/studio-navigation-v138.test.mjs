import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Studio loads the v138 device authority statically after its component tree", () => {
  const studio = read("src/Studio.jsx");
  assert.match(studio, /import StudioFastGate from "\.\/StudioFastGate\.jsx"/);
  assert.match(studio, /studio-device-modes-v138\.css/);
  assert.match(studio, /studio-device-mode-v138\.js/);
  assert.doesNotMatch(studio, /studio-device-mode-v137/);
});

test("device mode detects physical phones even when desktop-site viewport is wide", () => {
  const runtime = read("src/studio-device-mode-v138.js");
  assert.match(runtime, /SMALL_MAX = 700/);
  assert.match(runtime, /HANDHELD_MAX = 760/);
  assert.match(runtime, /visualViewport\?\.scale/);
  assert.match(runtime, /visualPhysicalWidth/);
  assert.match(runtime, /shortestScreenSide <= HANDHELD_MAX/);
  assert.match(runtime, /pointer: coarse/);
  assert.match(runtime, /MODE_EVENT/);
  assert.doesNotMatch(runtime, /import\("\.\/studio-device-modes/);
});

test("React owns the complete stable navigation and the mobile n button", () => {
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

test("small and large geometry cannot overlap or leave white viewport gaps", () => {
  const css = read("src/studio-device-modes-v138.css");
  assert.match(css, /data-studio-device-mode="small"/);
  assert.match(css, /data-studio-device-mode="large"/);
  assert.match(css, /width:86vw!important/);
  assert.match(css, /transform:translate3d\(-105%,0,0\)!important/);
  assert.match(css, /\.sn-shell\[data-navigation-owner="react-v138"\]>\.sn-side:not\(\.collapsed\)\+\.sn-main/);
  assert.match(css, /margin:0!important/);
  assert.match(css, /display:flex!important;\s*grid-template-columns:none!important/);
  assert.match(css, /width:calc\(100% - 220px\)!important/);
  assert.match(css, /width:calc\(100% - 70px\)!important/);
  assert.match(css, /background:#f5f7fb/);
  assert.match(css, /backdrop-filter:none!important/);
  assert.match(css, /sn-mobile-menu-mark/);
});

test("legacy menu bridges stand down when the React v138 owner is present", () => {
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

test("service worker rotates stale UI caches to v138", () => {
  const worker = read("public/sw.js");
  assert.match(worker, /ngeblogging-app-v138-(?:sidebar|navigation)-20260729/);
  assert.match(worker, /(?:single-react-sidebar|react-sidebar-device-authority)-v138-20260729/);
  assert.match(worker, /pwa-v138-(?:sidebar|navigation)/);
});
