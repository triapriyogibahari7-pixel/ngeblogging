import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Studio loads v140 base authority and the final v141 layout lock", () => {
  const studio = read("src/Studio.jsx");
  const compatibility = read("src/studio-device-mode-v138.js");
  assert.match(studio, /import StudioFastGate from "\.\/StudioFastGate\.jsx"/);
  assert.match(studio, /studio-device-mode-v140\.js/);
  assert.match(studio, /studio-layout-v140\.css/);
  assert.match(studio, /studio-layout-hotfix-v141\.css/);
  assert.doesNotMatch(studio, /studio-device-mode-v139\.js/);
  assert.match(compatibility, /from "\.\/studio-device-mode-v140\.js"/);
  assert.doesNotMatch(compatibility, /studio-device-mode-v139\.js/);
});

test("v141 detects narrow viewports and Chrome desktop-site phones without interception", () => {
  const runtime = read("src/studio-device-mode-v140.js");
  assert.match(runtime, /studio-device-mode-v141-20260729/);
  assert.match(runtime, /COMPACT_MAX = 820/);
  assert.match(runtime, /navigator\.userAgentData\?\.mobile/);
  assert.match(runtime, /navigator\.maxTouchPoints/);
  assert.match(runtime, /any-pointer: coarse/);
  assert.match(runtime, /any-pointer: fine/);
  assert.match(runtime, /effectiveWidth <= COMPACT_MAX \|\| handheldSignal\(\)/);
  assert.match(runtime, /REACT_NAVIGATION_OWNER = "react-v138"/);
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

test("v141 geometry cannot overlap, blur, or leave white viewport gaps", () => {
  const base = read("src/studio-layout-v140.css");
  const hotfix = read("src/studio-layout-hotfix-v141.css");
  assert.match(base, /--studio-side-open:232px/);
  assert.match(base, /--studio-side-closed:76px/);
  assert.match(base, /--studio-drawer:min\(88vw,340px\)/);
  assert.match(hotfix, /data-studio-device-mode="small"/);
  assert.match(hotfix, /\.sn-side\.collapsed\+\.sn-main/);
  assert.match(hotfix, /width:100%!important/);
  assert.match(hotfix, /background:rgba\(10,24,43,\.22\)!important/);
  assert.match(hotfix, /backdrop-filter:none!important/);
  assert.match(hotfix, /\.sn-mobile-menu-mark/);
  assert.match(hotfix, /\.sn-desktop-sidebar-icon/);
  assert.match(hotfix, /\.sn-v139-forced-backdrop/);
  assert.doesNotMatch(base, /studio-final-recovery-v136\.css/);
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

test("service worker rotates stale clients to v141 and protects login", () => {
  const worker = read("public/sw.js");
  const pwa = read("src/pwa-runtime.js");
  assert.match(worker, /ngeblogging-app-v141-studio-mobile-auth-20260729/);
  assert.match(worker, /single-react-layout-handheld-direct-auth-v141/);
  assert.match(worker, /pwa-v141-studio-mobile-auth/);
  assert.match(worker, /function isAuthSurface/);
  assert.match(worker, /url\.pathname === "\/login"/);
  assert.match(worker, /url\.pathname === "\/signup"/);
  assert.match(worker, /Promise\.allSettled/);
  assert.match(worker, /self\.clients\.claim\(\)/);
  assert.match(pwa, /ngeblogging-pwa-v141-20260729/);
  assert.match(pwa, /function handheldSignal/);
  assert.match(pwa, /if \(handheld \|\| effectiveWidth <= 820\) mode = "mobile"/);
  assert.match(pwa, /function authSurface/);
});

test("Supabase login stays direct and does not wait for app proxy timeouts", () => {
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
