import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const css = read("src/studio-device-sidebar-v26.css");
const runtime = read("src/studio-device-sidebar-v26.js");
const backupCss = read("backups/studio-desktop-sidebar-v25-locked.css");
const backupDoc = read("backups/studio-desktop-sidebar-v25-locked.md");
const serviceWorker = read("public/sw.js");

const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, "");

test("v27 replaces the v26 authority in place and remains scoped to Studio and Nara", () => {
  const v25Css = index.indexOf("studio-interaction-v25.css");
  const authorityCss = index.indexOf("studio-device-sidebar-v26.css");
  const v24Runtime = index.indexOf("nara-mobile-window-v24.js");
  const authorityRuntime = index.indexOf("studio-device-sidebar-v26.js");
  assert.ok(v25Css > -1);
  assert.ok(authorityCss > v25Css);
  assert.ok(v24Runtime > -1);
  assert.ok(authorityRuntime > v24Runtime);
  assert.match(runtime, /studio-device-sidebar-nara-v27-20260725/);
  assert.match(runtime, /studio-device-sidebar-nara-v26-20260725/);
  assert.doesNotMatch(cssRules, /homepage|hero-public|public-site|tenant-page/i);
});

test("desktop-site on a physical phone is not confused with a true desktop", () => {
  for (const marker of [
    "physicalPhone",
    "desktopPhone",
    "desktop-phone",
    "screenShortSide",
    "desktopSitePhone",
    "desktopLayoutRequested",
    "studio-compact-v27",
    "studio-desktop-v27",
  ]) assert.ok(runtime.includes(marker), marker);
  assert.match(runtime, /physicalPhone && width > MOBILE_MAX/);
  assert.match(css, /studio-desktop-v27[\s\S]*width: 220px !important/);
  assert.match(css, /data-v27-source-toggle="visible"/);
});

test("compact modes own one direct edge toggle and one non-blurred scrim", () => {
  assert.match(runtime, /sn-device-toggle-v27/);
  assert.match(runtime, /sn-device-scrim-v27/);
  assert.match(runtime, /clickSourceToggle/);
  assert.match(runtime, /ensureNavAccessibility/);
  assert.match(runtime, /button\.tabIndex = 0/);
  assert.match(css, /studio-compact-v27[\s\S]*z-index: 41000 !important/);
  assert.match(css, /sn-device-toggle-v27[\s\S]*z-index: 41200 !important/);
  assert.match(css, /sn-device-scrim-v27[\s\S]*z-index: 40900 !important/);
  assert.match(css, /sn-device-scrim-v27[\s\S]*backdrop-filter: none !important/);
  assert.match(css, /sn-sidebar-scrim-v23[\s\S]*display: none !important/);
  assert.match(css, /data-v27-source-toggle="programmatic"/);
  assert.match(css, /sn-mobile-nav,[\s\S]*sn-side-bottom[\s\S]*display: none !important/);
});

test("phone, mobile, tablet, application, Apple mobile, laptop, and desktop remain separate", () => {
  for (const marker of ["phone", "mobile", "tablet", "desktop-phone", "laptop", "desktop", "standalone", "appleMobile"]) {
    assert.ok(runtime.includes(marker), marker);
  }
  for (const selector of ["studio-phone-v27", "studio-mobile-v27", "studio-tablet-v27", "studio-standalone-v27"]) {
    assert.ok(css.includes(selector), selector);
  }
  assert.match(css, /--sn-v27-rail: 58px/);
  assert.match(css, /--sn-v27-rail: 64px/);
  assert.match(css, /--sn-v27-rail: 72px/);
  assert.match(css, /-webkit-touch-callout/);
});

test("approved desktop geometry remains locked and recoverable", () => {
  for (const source of [css, backupCss]) {
    assert.match(source, /width: 220px !important/);
    assert.match(source, /width: 70px !important/);
    assert.match(source, /margin-left: 220px !important/);
    assert.match(source, /margin-left: 70px !important/);
  }
  assert.match(backupCss, /DO NOT LOAD AUTOMATICALLY/);
  assert.match(backupDoc, /e3c3e1603fbd0aa1b3a6a467af154399b730723b/);
  assert.equal(index.includes("backups/studio-desktop-sidebar-v25-locked.css"), false);
});

test("Nara still exposes mini widget, complete box, and fullscreen controls beside Close", () => {
  assert.match(css, /data-nara-size-v27="mini"/);
  assert.match(runtime, /nara-size-toggle-v26 nara-size-toggle-v27/);
  assert.match(runtime, /nara-window-toggle-v24/);
  assert.match(runtime, /leaveExpanded/);
  assert.match(css, /grid-template-columns: 42px minmax\(0, 1fr\) 36px 36px 36px 36px !important/);
  assert.match(css, /data-nara-window-mode="expanded"/);
  assert.match(runtime, /Buka kotak Nara lengkap/);
  assert.match(runtime, /Kecilkan menjadi widget/);
});

test("PWA cache rotates after removing the conflicting sidebar authority", () => {
  assert.match(serviceWorker, /ngeblogging-app-v27-20260725/);
  assert.match(serviceWorker, /ngeblogging-app-v26-20260725/);
  assert.match(serviceWorker, /fetch\(request, \{ cache: "no-store" \}\)/);
});
