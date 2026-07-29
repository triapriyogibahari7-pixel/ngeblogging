import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Studio loads the v140 device and layout authority after its component tree", () => {
  const studio = read("src/Studio.jsx");
  assert.match(studio, /import StudioFastGate from "\.\/StudioFastGate\.jsx"/);
  assert.match(studio, /studio-device-mode-v140\.js/);
  assert.match(studio, /studio-layout-v140\.css/);
  assert.doesNotMatch(studio, /^import .*studio-layout-v139/m);
});

test("one device authority detects narrow viewports and desktop-site phones", () => {
  const runtime = read("src/studio-device-mode-v140.js");
  assert.match(runtime, /COMPACT_MAX = 820/);
  assert.match(runtime, /navigator\.userAgentData\?\.mobile/);
  assert.match(runtime, /navigator\.maxTouchPoints/);
  assert.match(runtime, /any-pointer: coarse/);
  assert.match(runtime, /any-pointer: fine/);
  assert.match(runtime, /effectiveWidth <= COMPACT_MAX \|\| handheldSignal\(\)/);
  assert.match(runtime, /MODE_EVENT/);
  assert.doesNotMatch(runtime, /stopImmediatePropagation/);
  assert.doesNotMatch(runtime, /forcedDrawer/);
});

test("React remains the only navigation owner and exposes the mobile n button", () => {
  const studio = read("src/StudioNext.jsx");
  assert.match(studio, /data-navigation-owner="react-v138"/);
  assert.match(studio, /<span>Komentar<\/span>/);
  assert.match(studio, /<span>Domain<\/span>/);
  assert.match(studio, /<span>API Keys<\/span>/);
  assert.match(studio, /sn-mobile-menu-mark/);
  assert.match(studio, /<strong>n<\/strong><i>\.<\/i>/);
  assert.match(studio, /currentStudioDeviceMode\(\) === "small"/);
});

test("v140 locks mobile and desktop geometry without blur or white overflow", () => {
  const css = read("src/studio-layout-v140.css");
  assert.match(css, /data-studio-device-mode="small"/);
  assert.match(css, /data-studio-device-mode="large"/);
  assert.match(css, /--studio-v140-drawer:min\(88vw,360px\)/);
  assert.match(css, /transform:translate3d\(-104%,0,0\)!important/);
  assert.match(css, /width:calc\(100% - var\(--studio-v140-side\)\)!important/);
  assert.match(css, /width:calc\(100% - var\(--studio-v140-side-collapsed\)\)!important/);
  assert.match(css, /\.sn-mobile-menu-mark/);
  assert.match(css, /\.sn-desktop-sidebar-icon/);
  assert.match(css, /backdrop-filter:none!important/);
  assert.match(css, /background:var\(--studio-v140-bg\)!important/);
  assert.doesNotMatch(css, /@import/);
});

test("Supabase auth uses a bounded direct route before optional gateways", () => {
  const source = read("src/lib/supabase.js");
  const direct = source.indexOf('markTransport("auth", "direct-primary")');
  const gateway = source.indexOf("const gatewayResult = await tryGateways(source, descriptor)");
  assert.ok(direct > -1);
  assert.ok(gateway > direct);
  assert.match(source, /AUTH_DIRECT_TIMEOUT_MS = 8_000/);
  assert.match(source, /timedNativeFetch/);
});

test("service worker rotates all stale UI caches to v140 and protects auth pages", () => {
  const worker = read("public/sw.js");
  assert.match(worker, /ngeblogging-app-v140-stable-sidebar-auth-20260729/);
  assert.match(worker, /single-react-sidebar-and-direct-auth-v140-20260729/);
  assert.match(worker, /pwa-v140-stable-sidebar-auth/);
  assert.match(worker, /url\.pathname === "\/login"/);
  assert.match(worker, /cache: "no-store"/);
});
