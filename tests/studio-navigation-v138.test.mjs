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
  assert.doesNotMatch(compatibility, /studio-device-mode-v139\.js/);
});

test("v140 uses one viewport authority without forced mobile interception", () => {
  const runtime = read("src/studio-device-mode-v140.js");
  assert.match(runtime, /COMPACT_MAX = 820/);
  assert.match(runtime, /document\.documentElement\.clientWidth/);
  assert.match(runtime, /layoutWidth\(\) <= COMPACT_MAX/);
  assert.match(runtime, /LAYOUT_NODES/);
  assert.match(runtime, /LEGACY_INLINE_PROPERTIES/);
  assert.match(runtime, /clearLegacyInlineLayout/);
  assert.match(runtime, /MutationObserver/);
  assert.match(runtime, /MODE_EVENT/);
  assert.doesNotMatch(runtime, /forcedDesktopSitePhone/);
  assert.doesNotMatch(runtime, /forcedBackdrop/);
  assert.doesNotMatch(runtime, /setForcedDrawer/);
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

test("v140 geometry cannot overlap, blur, or leave white viewport gaps", () => {
  const css = read("src/studio-layout-v140.css");
  assert.match(css, /--studio-side-open:232px/);
  assert.match(css, /--studio-side-closed:76px/);
  assert.match(css, /--studio-drawer:min\(88vw,340px\)/);
  assert.match(css, /data-studio-device-mode="small"/);
  assert.match(css, /data-studio-device-mode="large"/);
  assert.match(css, /sn-mobile-menu-mark/);
  assert.match(css, /sn-desktop-sidebar-icon/);
  assert.match(css, /margin-left:0!important/);
  assert.match(css, /width:calc\(100% - var\(--studio-side-open\)\)!important/);
  assert.match(css, /width:calc\(100% - var\(--studio-side-closed\)\)!important/);
  assert.match(css, /overflow-x:hidden!important/);
  assert.match(css, /backdrop-filter:none!important/);
  assert.match(css, /\.sn-mobile-v30-header/);
  assert.match(css, /\.sn-mobile-nav,\.sn-mobile-sheet-layer\{display:none!important\}/);
  assert.doesNotMatch(css, /studio-final-recovery-v136\.css/);
  assert.doesNotMatch(css, /data-v139-forced-mobile-open/);
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

test("service worker rotates all stale clients to v140", () => {
  const worker = read("public/sw.js");
  assert.match(worker, /ngeblogging-app-v140-studio-auth-20260729/);
  assert.match(worker, /single-react-layout-direct-auth-v140/);
  assert.match(worker, /pwa-v140/);
  assert.match(worker, /Promise\.allSettled/);
  assert.match(worker, /self\.clients\.claim\(\)/);
  assert.match(worker, /client\.navigate\(url\.href\)/);
});

test("Supabase login is direct and does not wait for app proxy timeouts", () => {
  const client = read("src/lib/supabase.js");
  assert.match(client, /createClient\(url, key/);
  assert.match(client, /persistSession: true/);
  assert.match(client, /autoRefreshToken: true/);
  assert.match(client, /detectSessionInUrl: false/);
  assert.match(client, /ngeblogging-web-v140/);
  assert.match(client, /direct-v140/);
  assert.doesNotMatch(client, /resilientSupabaseFetch/);
  assert.doesNotMatch(client, /\/api\/auth-proxy/);
  assert.doesNotMatch(client, /\/api\/data-proxy/);
});
