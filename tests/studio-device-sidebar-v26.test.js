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

test("v26 loads last and stays scoped to Studio and Nara", () => {
  const v25Css = index.indexOf("studio-interaction-v25.css");
  const v26Css = index.indexOf("studio-device-sidebar-v26.css");
  const v24Runtime = index.indexOf("nara-mobile-window-v24.js");
  const v26Runtime = index.indexOf("studio-device-sidebar-v26.js");
  assert.ok(v25Css > -1);
  assert.ok(v26Css > v25Css);
  assert.ok(v24Runtime > -1);
  assert.ok(v26Runtime > v24Runtime);
  assert.doesNotMatch(cssRules, /homepage|hero-public|public-site|tenant-page/i);
});

test("phone, mobile, tablet, laptop, desktop, standalone, and Apple mobile are classified", () => {
  for (const marker of ["phone", "mobile", "tablet", "laptop", "desktop", "standalone", "studioAppleMobile"]) {
    assert.ok(runtime.includes(marker), marker);
  }
  assert.match(css, /@media \(max-width: 480px\)/);
  assert.match(css, /@media \(min-width: 481px\) and \(max-width: 760px\)/);
  assert.match(css, /@media \(min-width: 761px\) and \(max-width: 1100px\)/);
  assert.match(css, /@media \(min-width: 1101px\)/);
  assert.match(css, /@media \(display-mode: standalone\)/);
  assert.match(css, /-webkit-touch-callout/);
});

test("mobile and tablet own one unclipped edge toggle with clickable navigation", () => {
  assert.match(runtime, /sn-device-toggle-v26/);
  assert.match(runtime, /currentSource\.click\(\)/);
  assert.match(runtime, /ensureNavAccessibility/);
  assert.match(runtime, /button\.tabIndex = 0/);
  assert.match(css, /direct child of the Studio shell/i);
  assert.match(css, /z-index: 31200 !important/);
  assert.match(css, /pointer-events: auto !important/);
  assert.match(css, /data-v26-sidebar-open="true"/);
  assert.match(css, /sn-sidebar-scrim-v23[\s\S]*z-index: 30900 !important/);
  assert.match(css, /sn-mobile-nav,[\s\S]*sn-side-bottom[\s\S]*display: none !important/);
});

test("approved desktop geometry is locked and recoverable", () => {
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

test("Nara exposes mini widget, complete box, and expanded viewport without removing capabilities", () => {
  assert.match(css, /data-nara-size-v26="mini"/);
  assert.match(runtime, /"mini" : "compact"/);
  assert.match(runtime, /nara-size-toggle-v26/);
  assert.match(runtime, /nara-window-toggle-v24/);
  assert.match(runtime, /leaveExpanded/);
  assert.match(runtime, /grid-template-columns: 42px minmax\(0, 1fr\) 36px 36px 36px 36px !important/);
  assert.match(css, /data-nara-window-mode="expanded"/);
  assert.match(runtime, /Buka kotak Nara lengkap/);
  assert.match(runtime, /Kecilkan menjadi widget/);
});

test("PWA cache rotates after responsive authority changes", () => {
  assert.match(serviceWorker, /ngeblogging-app-v26-20260725/);
  assert.match(serviceWorker, /ngeblogging-app-v25-20260725/);
  assert.match(serviceWorker, /fetch\(request, \{ cache: "no-store" \}\)/);
});