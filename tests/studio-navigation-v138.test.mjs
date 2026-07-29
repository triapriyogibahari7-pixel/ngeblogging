import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Studio loads v140 authority plus the final v141 layout hotfix", () => {
  const studio = read("src/Studio.jsx");
  const compatibility = read("src/studio-device-mode-v138.js");
  assert.match(studio, /import StudioFastGate from "\.\/StudioFastGate\.jsx"/);
  assert.match(studio, /studio-device-mode-v140\.js/);
  assert.match(studio, /studio-layout-v140\.css/);
  assert.match(studio, /studio-layout-hotfix-v141\.css/);
  assert.match(compatibility, /from "\.\/studio-device-mode-v140\.js"/);
});

test("device authority detects narrow viewports and Chrome desktop-site phones", () => {
  const runtime = read("src/studio-device-mode-v140.js");
  assert.match(runtime, /studio-device-mode-v141-20260729/);
  assert.match(runtime, /COMPACT_MAX = 820/);
  assert.match(runtime, /navigator\.userAgentData\?\.mobile/);
  assert.match(runtime, /navigator\.maxTouchPoints/);
  assert.match(runtime, /any-pointer: coarse/);
  assert.match(runtime, /any-pointer: fine/);
  assert.match(runtime, /effectiveWidth <= COMPACT_MAX \|\| handheldSignal\(\)/);
  assert.match(runtime, /REACT_NAVIGATION_OWNER = "react-v138"/);
  assert.doesNotMatch(runtime, /stopImmediatePropagation/);
  assert.doesNotMatch(runtime, /forcedDrawerOpen/);
});

test("React remains the only complete navigation and exposes the mobile n button", () => {
  const studio = read("src/StudioNext.jsx");
  assert.match(studio, /data-navigation-owner="react-v138"/);
  assert.match(studio, /<span>Ringkasan<\/span>/);
  assert.match(studio, /<span>Komentar<\/span>/);
  assert.match(studio, /<span>Domain<\/span>/);
  assert.match(studio, /<span>API Keys<\/span>/);
  assert.match(studio, /sn-mobile-menu-mark/);
  assert.match(studio, /<strong>n<\/strong><i>\.<\/i>/);
  assert.match(studio, /currentStudioDeviceMode\(\) === "small"/);
});

test("v141 geometry cannot blur, overlap, or leave white viewport gaps", () => {
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
});

test("login uses direct Supabase transport and PWA never reloads auth surfaces", () => {
  const supabase = read("src/lib/supabase.js");
  const pwa = read("src/pwa-runtime.js");
  const worker = read("public/sw.js");
  assert.match(supabase, /supabaseTransport = supabaseConfigured \? "direct-v140"/);
  assert.doesNotMatch(supabase, /resilientSupabaseFetch/);
  assert.match(pwa, /location\.pathname === "\/login"/);
  assert.match(pwa, /location\.pathname === "\/signup"/);
  assert.match(worker, /ngeblogging-app-v141-studio-mobile-auth-20260729/);
  assert.match(worker, /single-react-layout-handheld-direct-auth-v141/);
  assert.match(worker, /pwa-v141-studio-mobile-auth/);
  assert.match(worker, /function isAuthSurface/);
  assert.match(worker, /cache: "no-store"/);
});
