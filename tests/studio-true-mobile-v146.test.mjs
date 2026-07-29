import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("v146 treats a desktop-site phone as a physical mobile viewport", () => {
  const device = read("src/studio-device-mode-v140.js");
  const css = read("src/studio-true-mobile-v146.css");
  assert.match(device, /studio-device-mode-v146-20260729/);
  assert.match(device, /cssScreenDimension/);
  assert.match(device, /desktopSiteProfile/);
  assert.match(device, /--studio-phone-zoom/);
  assert.match(device, /--studio-phone-target-width/);
  assert.match(css, /data-studio-desktop-site-phone="true"/);
  assert.match(css, /zoom:var\(--studio-phone-zoom\)!important/);
});

test("v146 mobile drawer is full screen, solid, and opened by the n button", () => {
  const css = read("src/studio-true-mobile-v146.css");
  assert.match(css, /z-index:2147482500!important/);
  assert.match(css, /width:100%!important/);
  assert.match(css, /height:100dvh!important/);
  assert.match(css, /content:"n"!important/);
  assert.doesNotMatch(css, /content:"n\."/);
  assert.match(css, /backdrop-filter:none!important/);
  assert.match(css, /\.sn-shell>\.sn-side\.mobile-open/);
});

test("v146 makes Domain, API Keys, and Theme Studio genuinely responsive", () => {
  const css = read("src/studio-true-mobile-v146.css");
  for (const marker of [
    ".sv124-metrics-grid",
    ".sn-api-metrics",
    ".sn-api-table>article",
    ".tn-hero",
    ".tn-theme-grid",
    ".tn-modal-backdrop",
  ]) assert.match(css, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(css, /grid-template-columns:1fr!important/);
});

test("Nara exposes Kecil, Sedang, and Penuh with full-width phone layouts", () => {
  const runtime = read("src/nara-size-authority-v144.js");
  const css = read("src/studio-true-mobile-v146.css");
  assert.match(runtime, /nara-size-authority-v146-20260729/);
  assert.match(runtime, /\["small", "Kecil"\]/);
  assert.match(runtime, /\["medium", "Sedang"\]/);
  assert.match(runtime, /\["full", "Penuh"\]/);
  assert.match(css, /data-nara-size="small"/);
  assert.match(css, /data-nara-size="medium"/);
  assert.match(css, /data-nara-size="full"/);
  assert.match(css, /height:48dvh!important/);
  assert.match(css, /height:76dvh!important/);
  assert.match(css, /height:100dvh!important/);
});

test("v146 rotates cache while protecting every auth surface", () => {
  const pwa = read("src/pwa-runtime.js");
  const worker = read("public/sw.js");
  assert.match(pwa, /ngeblogging-pwa-v146-20260729/);
  assert.match(pwa, /ngeblogging-pwa-controller-v146/);
  assert.match(pwa, /pwa-v146-true-mobile/);
  assert.match(worker, /ngeblogging-app-v146-true-mobile-20260729/);
  assert.match(worker, /single-react-true-mobile-v146/);
  assert.match(worker, /studio-true-mobile-v146/);
  for (const marker of ["/login", "/signup", "/signin", "callback", "recovery", "session-expired", "callback-error"]) {
    assert.match(worker, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
