import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Studio loads the v147 interface authority last", () => {
  const studio = read("src/Studio.jsx");
  const compatibility = read("src/studio-device-mode-v138.js");
  assert.match(studio, /import StudioFastGate from "\.\/StudioFastGate\.jsx"/);
  for (const marker of [
    "studio-style-authority-v144.js",
    "studio-device-mode-v140.js",
    "nara-size-authority-v144.js",
    "studio-shell-controller-v147.js",
    "studio-layout-v140.css",
    "studio-layout-hotfix-v141.css",
    "studio-layout-hotfix-v142.css",
    "studio-layout-authority-v144.css",
    "studio-layout-authority-v145.css",
    "studio-interface-authority-v147.css",
  ]) assert.ok(studio.includes(marker), `${marker} harus tetap dimuat`);
  assert.ok(studio.lastIndexOf("studio-interface-authority-v147.css") > studio.lastIndexOf("studio-layout-authority-v145.css"));
  assert.match(compatibility, /from "\.\/studio-device-mode-v140\.js"/);
  assert.doesNotMatch(studio, /studio-device-mode-v139\.js/);
});

test("device authority declares six families and protects touch laptops", () => {
  const runtime = read("src/studio-device-mode-v140.js");
  for (const marker of [
    "studio-device-mode-v147-20260729",
    "studio-device-mode-v145-20260729",
    "COMPACT_MAX = 760",
    "TABLET_MAX = 1180",
    "PHONE_MAX = 430",
    "HANDHELD_MAX = 600",
    '"application"', '"phone"', '"mobile"', '"compact"', '"tablet"', '"desktop"',
    '"laptop"', '"computer"',
    "navigator.userAgentData?.mobile",
    "navigator.maxTouchPoints",
    "any-pointer: coarse",
    "any-pointer: fine",
    "platformHandheldSignal",
    "compactPhysicalScreen",
    "interactive-widget=resizes-content",
    "ngeblogging:studio-device-mode-change",
  ]) assert.ok(runtime.includes(marker), `${marker} harus ada`);
  for (const forbidden of ["clearLegacyInlineLayout", "forcedDesktopSitePhone", "forcedBackdrop", "setForcedDrawer"]) {
    assert.ok(!runtime.includes(forbidden), `${forbidden} tidak boleh kembali`);
  }
});

test("React remains the complete sidebar owner", () => {
  const studio = read("src/StudioNext.jsx");
  assert.match(studio, /data-navigation-owner="react-v138"/);
  for (const label of [
    "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
    "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
  ]) assert.ok(studio.includes(label), `${label} harus tetap ada`);
  assert.match(studio, /<CommentsPanelV124 site=\{site\}/);
  assert.match(studio, /<DomainPanelV124 site=\{site\}/);
  assert.match(studio, /<ApiKeysPanel setToast=\{setToast\}\/>/);
  assert.match(studio, /currentStudioDeviceMode\(\) === "small"/);
});

test("historical Studio styles remain isolated", () => {
  const authority = read("src/studio-style-authority-v144.js");
  assert.match(authority, /studio-style-authority-v144-20260729/);
  for (const stylesheet of [
    "studio-responsive-v23.css", "studio-shell-v30.css", "studio-mobile-content-v31.css",
    "studio-mobile-polish-v32.css", "studio-mobile-overlap-v33.css",
    "studio-layout-builder-v39.css", "sidebar-final-v91.css", "studio-ui-stability-v95.css",
    "studio-surface-authority-v100.css", "studio-mobile-precision-v99.css", "studio-final-v106.css",
  ]) assert.ok(authority.includes(stylesheet));
  assert.match(authority, /link\.media = "not all"/);
  assert.match(authority, /MutationObserver/);
});

test("v147 geometry has responsive sidebar rails, partial mobile drawer, and no overflow", () => {
  const css = read("src/studio-interface-authority-v147.css");
  for (const marker of [
    "--sn-v147-sidebar-open:268px",
    "--sn-v147-sidebar-closed:80px",
    "calc(100% - var(--sn-v147-sidebar-open))",
    "calc(100% - var(--sn-v147-sidebar-closed))",
    "width:min(82vw,360px)!important",
    "sn-sidebar-edge-toggle-v147",
    "sn-profile-menu-v147",
    "content:\"n\"!important",
    "overflow-x:clip!important",
    "backdrop-filter:none!important",
  ]) assert.ok(css.includes(marker), `${marker} harus ada`);
  assert.ok(!css.includes('content:"n."'));
  assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length);
});

test("Nara provides small medium full modes, intelligence choices, and spoken replies", () => {
  const runtime = read("src/nara-size-authority-v144.js");
  const css = read("src/studio-interface-authority-v147.css");
  for (const marker of [
    "nara-interface-authority-v147-20260729",
    "Kecil", "Medium", "Penuh", "Instan", "Sedang", "Tinggi",
    "shell.dataset.naraSize", "speechSynthesis", "nara-speech-action-v147",
  ]) assert.ok(runtime.includes(marker), `${marker} harus ada`);
  for (const marker of [
    'data-nara-size="medium"', 'data-nara-size="full"',
    ".nara-size-controls-v147", ".nara-speech-action-v147",
  ]) assert.ok(css.includes(marker));
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

test("service worker rotates to v147 and preserves v143 login handoff", () => {
  const worker = read("public/sw.js");
  const pwa = read("src/pwa-runtime.js");
  for (const marker of [
    "ngeblogging-app-v147-studio-interface-20260729",
    "ngeblogging-app-v145-studio-mobile-cache-20260729",
    "single-react-interface-v147",
    "single-react-mobile-cache-v145",
    "auth-route-handoff-v143-20260729",
    "function isAuthSurface",
    'url.pathname === "/signin"',
    "notifyOpenWindows", "refreshStaleWindow", "FORCE_REFRESH_QUERY",
    "client.navigate(url.href)", "NGE_BLOGGING_FORCE_RELOAD_V77",
    "Promise.allSettled", "self.clients.claim()",
  ]) assert.ok(worker.includes(marker), `${marker} harus ada`);
  for (const marker of [
    "ngeblogging-pwa-v147-20260729",
    "ngeblogging-pwa-controller-v147",
    "pwa-v147-studio-interface",
    "function responsiveFamily",
    "function authSurface",
  ]) assert.ok(pwa.includes(marker));
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
