import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Studio loads the v144 style authority last", () => {
  const studio = read("src/Studio.jsx");
  const compatibility = read("src/studio-device-mode-v138.js");
  assert.match(studio, /import StudioFastGate from "\.\/StudioFastGate\.jsx"/);
  assert.match(studio, /studio-style-authority-v144\.js/);
  assert.match(studio, /studio-device-mode-v140\.js/);
  assert.match(studio, /nara-size-authority-v144\.js/);
  assert.match(studio, /studio-layout-v140\.css/);
  assert.match(studio, /studio-layout-hotfix-v141\.css/);
  assert.match(studio, /studio-layout-hotfix-v142\.css/);
  assert.match(studio, /studio-layout-authority-v144\.css/);
  assert.match(compatibility, /from "\.\/studio-device-mode-v140\.js"/);
  assert.doesNotMatch(studio, /studio-device-mode-v139\.js/);
});

test("device authority covers mobile, app, desktop-site phones, and large browsers", () => {
  const runtime = read("src/studio-device-mode-v140.js");
  assert.match(runtime, /studio-device-mode-v141-20260729/);
  assert.match(runtime, /COMPACT_MAX = 820/);
  assert.match(runtime, /navigator\.userAgentData\?\.mobile/);
  assert.match(runtime, /navigator\.maxTouchPoints/);
  assert.match(runtime, /any-pointer: coarse/);
  assert.match(runtime, /any-pointer: fine/);
  assert.match(runtime, /effectiveWidth <= COMPACT_MAX \|\| handheldSignal\(\)/);
  assert.match(runtime, /surfaceMode/);
  assert.match(runtime, /application/);
  assert.match(runtime, /browser/);
  assert.match(runtime, /clearLegacyInlineLayout/);
  assert.match(runtime, /MutationObserver/);
  assert.doesNotMatch(runtime, /forcedDesktopSitePhone/);
  assert.doesNotMatch(runtime, /forcedBackdrop/);
  assert.doesNotMatch(runtime, /setForcedDrawer/);
  assert.doesNotMatch(runtime, /stopImmediatePropagation/);
});

test("React remains the only complete sidebar owner", () => {
  const studio = read("src/StudioNext.jsx");
  assert.match(studio, /data-navigation-owner="react-v138"/);
  for (const label of ["Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik", "Anggota", "Komentar", "Domain", "API Keys"]) {
    assert.match(studio, new RegExp(`<span>${label}<\\/span>`));
  }
  assert.match(studio, /<CommentsPanelV124 site=\{site\}/);
  assert.match(studio, /<DomainPanelV124 site=\{site\}/);
  assert.match(studio, /<ApiKeysPanel setToast=\{setToast\}\/>/);
  assert.match(studio, /currentStudioDeviceMode\(\) === "small"/);
});

test("v144 disables every active historical Studio stylesheet", () => {
  const authority = read("src/studio-style-authority-v144.js");
  assert.match(authority, /studio-style-authority-v144-20260729/);
  for (const stylesheet of [
    "studio-responsive-v23.css",
    "studio-shell-v30.css",
    "studio-mobile-content-v31.css",
    "studio-mobile-polish-v32.css",
    "studio-mobile-overlap-v33.css",
    "studio-layout-builder-v39.css",
    "sidebar-final-v91.css",
    "studio-ui-stability-v95.css",
    "studio-surface-authority-v100.css",
    "studio-mobile-precision-v99.css",
    "studio-final-v106.css",
  ]) assert.match(authority, new RegExp(stylesheet.replaceAll(".", "\\.")));
  assert.match(authority, /link\.media = "not all"/);
  assert.match(authority, /MutationObserver/);
});

test("v144 geometry has a full mobile drawer, exact desktop widths, n-only trigger, and no blur or gaps", () => {
  const layout = read("src/studio-layout-authority-v144.css");
  assert.match(layout, /--studio-v144-side-open:248px/);
  assert.match(layout, /--studio-v144-side-closed:76px/);
  assert.match(layout, /data-studio-device-mode="large"/);
  assert.match(layout, /data-studio-device-mode="small"/);
  assert.match(layout, /width:100vw!important/);
  assert.match(layout, /min-width:100vw!important/);
  assert.match(layout, /height:100dvh!important/);
  assert.match(layout, /content:"n"!important/);
  assert.match(layout, /\.sn-logo-mark i\{display:none!important\}/);
  assert.match(layout, /overflow-x:hidden!important/);
  assert.match(layout, /backdrop-filter:none!important/);
  assert.doesNotMatch(layout, /content:"n\."/);
});

test("Nara provides small, medium, and full screen modes", () => {
  const runtime = read("src/nara-size-authority-v144.js");
  const layout = read("src/studio-layout-authority-v144.css");
  assert.match(runtime, /nara-size-authority-v144-20260729/);
  assert.match(runtime, /\["small", "Kecil"\]/);
  assert.match(runtime, /\["medium", "Sedang"\]/);
  assert.match(runtime, /\["full", "Penuh"\]/);
  assert.match(runtime, /shell\.dataset\.naraSize/);
  assert.match(runtime, /localStorage\.setItem/);
  assert.match(layout, /data-nara-size="small"/);
  assert.match(layout, /data-nara-size="medium"/);
  assert.match(layout, /data-nara-size="full"/);
  assert.match(layout, /height:48dvh!important/);
  assert.match(layout, /height:76dvh!important/);
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

test("service worker rotates to v144 once and keeps v143 login handoff", () => {
  const worker = read("public/sw.js");
  const pwa = read("src/pwa-runtime.js");
  assert.match(worker, /ngeblogging-app-v144-studio-layout-20260729/);
  assert.match(worker, /single-react-layout-authority-v144/);
  assert.match(worker, /auth-route-handoff-v143-20260729/);
  assert.match(worker, /function isAuthSurface/);
  assert.match(worker, /url\.pathname === "\/signin"/);
  assert.match(worker, /notifyOpenWindows/);
  assert.match(worker, /NGE_BLOGGING_FORCE_RELOAD_V77/);
  assert.match(worker, /Promise\.allSettled/);
  assert.match(worker, /self\.clients\.claim\(\)/);
  assert.doesNotMatch(worker, /client\.navigate/);
  assert.match(pwa, /ngeblogging-pwa-v142-20260729/);
  assert.match(pwa, /function authSurface/);
});

test("Supabase login stays direct and callback completion does not reload twice", () => {
  const client = read("src/lib/supabase.js");
  const callback = read("src/auth-callback-authority-v107.js");
  const bootstrap = read("src/auth-studio-bootstrap-v106.js");
  assert.match(client, /createClient\(url, key/);
  assert.match(client, /persistSession: true/);
  assert.match(client, /autoRefreshToken: true/);
  assert.match(client, /detectSessionInUrl: false/);
  assert.match(client, /direct-v140/);
  assert.doesNotMatch(client, /resilientSupabaseFetch/);
  assert.doesNotMatch(client, /\/api\/auth-proxy/);
  assert.doesNotMatch(client, /\/api\/data-proxy/);
  assert.match(callback, /auth-callback-authority-v142-20260729/);
  assert.match(callback, /history\.replaceState/);
  assert.match(callback, /ngeblogging:auth-session-ready/);
  assert.match(bootstrap, /auth-route-handoff-v143-20260729/);
  assert.match(bootstrap, /redirectAuthenticatedSurface/);
});
