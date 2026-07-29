import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("v145 rotates the PWA guard instead of reusing the v142 one", () => {
  const pwa = read("src/pwa-runtime.js");
  const worker = read("public/sw.js");
  assert.match(pwa, /ngeblogging-pwa-v145-20260729/);
  assert.match(pwa, /ngeblogging-pwa-controller-v145/);
  assert.match(pwa, /pwa-v145-studio-mobile-cache/);
  assert.match(pwa, /sessionStorage\.removeItem\(LEGACY_CONTROLLER_GUARD\)/);
  assert.match(worker, /ngeblogging-app-v145-studio-mobile-cache-20260729/);
  assert.match(worker, /single-react-mobile-cache-v145/);
  assert.match(worker, /service-worker-activated-studio-mobile-cache-v145/);
  assert.match(worker, /FORCE_REFRESH_QUERY/);
  assert.match(worker, /FORCE_REFRESH_VALUE/);
  assert.match(worker, /refreshStaleWindow/);
  assert.match(worker, /client\.navigate\(url\.href\)/);
});

test("login and callback surfaces are protected from update reloads", () => {
  const pwa = read("src/pwa-runtime.js");
  const worker = read("public/sw.js");
  for (const marker of [
    'location.pathname === "/login"',
    'location.pathname === "/signup"',
    'location.pathname === "/signin"',
    'authMode === "callback"',
    'authMode === "recovery"',
    'authMode === "session-expired"',
    'authMode === "callback-error"',
  ]) assert.match(pwa, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(worker, /if \(url\.origin !== self\.location\.origin \|\| isAuthSurface\(url\)\) return/);
});

test("desktop-site phones use the physical-device fallback", () => {
  const device = read("src/studio-device-mode-v140.js");
  assert.match(device, /studio-device-mode-v145-20260729/);
  assert.match(device, /platformHandheldSignal/);
  assert.match(device, /PHYSICAL_PHONE_MAX = 720/);
  assert.match(device, /physicalShortSide/);
  assert.match(device, /compactPhysicalScreen/);
  assert.match(device, /platformHandheldSignal\(\) \|\| !finePointer \|\| compactPhysicalScreen/);
});

test("the v145 drawer covers the viewport without backdrop blur or gaps", () => {
  const studio = read("src/Studio.jsx");
  const css = read("src/studio-layout-authority-v145.css");
  assert.match(studio, /studio-layout-authority-v145\.css/);
  assert.match(css, /z-index:2147482000!important/);
  assert.match(css, /width:100%!important/);
  assert.match(css, /height:100dvh!important/);
  assert.match(css, /\.sn-shell>\.sn-side-backdrop\{/);
  assert.match(css, /display:none!important/);
  assert.match(css, /content:"n"!important/);
  assert.doesNotMatch(css, /content:"n\."/);
  assert.match(css, /backdrop-filter:none!important/);
  assert.match(css, /\.nara-size-controls-v144/);
});
