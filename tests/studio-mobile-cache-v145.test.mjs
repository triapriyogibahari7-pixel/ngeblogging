import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("v147 rotates PWA and service-worker guards while retaining v145 as legacy", () => {
  const pwa = read("src/pwa-runtime.js");
  const worker = read("public/sw.js");
  for (const marker of [
    "ngeblogging-pwa-v147-20260729",
    "ngeblogging-pwa-v145-20260729",
    "ngeblogging-pwa-controller-v147",
    "ngeblogging-pwa-controller-v145",
    "pwa-v147-studio-interface",
    "pwa-v145-studio-mobile-cache",
    "sessionStorage.removeItem(LEGACY_CONTROLLER_GUARD)",
  ]) assert.ok(pwa.includes(marker), `${marker} harus ada`);
  for (const marker of [
    "ngeblogging-app-v147-studio-interface-20260729",
    "ngeblogging-app-v145-studio-mobile-cache-20260729",
    "single-react-interface-v147",
    "single-react-mobile-cache-v145",
    "service-worker-activated-studio-interface-v147",
    "FORCE_REFRESH_QUERY", "FORCE_REFRESH_VALUE", "refreshStaleWindow",
    "client.navigate(url.href)",
  ]) assert.ok(worker.includes(marker), `${marker} harus ada`);
});

test("login and callback surfaces remain protected from update reloads", () => {
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
  ]) assert.ok(pwa.includes(marker), `${marker} harus ada`);
  assert.ok(worker.includes("if (url.origin !== self.location.origin || isAuthSurface(url)) return"));
});

test("desktop-site phones use physical fallback without capturing touch laptops", () => {
  const device = read("src/studio-device-mode-v140.js");
  for (const marker of [
    "studio-device-mode-v147-20260729",
    "platformHandheldSignal",
    "HANDHELD_MAX = 600",
    "physicalShortSide",
    "compactPhysicalScreen",
    "coarsePointer",
    "finePointer",
  ]) assert.ok(device.includes(marker));
  assert.ok(device.includes("platformHandheldSignal() || !finePointer || compactPhysicalScreen"));
  assert.ok(!device.includes("denseTouchScreen"));
});

test("v147 mobile drawer is partial width, full height, unblurred, and keeps all controls", () => {
  const studio = read("src/Studio.jsx");
  const css = read("src/studio-interface-authority-v147.css");
  assert.ok(studio.includes("studio-interface-authority-v147.css"));
  for (const marker of [
    "width:min(82vw,360px)!important",
    "height:100dvh!important",
    ".sn-shell>.sn-side-backdrop",
    "background:rgba(8,22,44,.42)!important",
    "content:\"n\"!important",
    "backdrop-filter:none!important",
    ".nara-size-controls-v147",
    "sn-sidebar-edge-toggle-v147",
  ]) assert.ok(css.includes(marker), `${marker} harus ada`);
  assert.ok(!css.includes('content:"n."'));
});
