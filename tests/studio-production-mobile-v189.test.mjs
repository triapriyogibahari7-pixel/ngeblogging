import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-production-mobile-v189.js");
const account = read("src/studio-production-mobile-v189-account.js");
const css = read("src/studio-production-mobile-v189.css");
const narrowFix = read("src/studio-production-mobile-v189-fix.css");
const realDevice = read("src/studio-real-device-v190.js");
const realDeviceCss = read("src/studio-real-device-v190.css");
const supabase = read("src/lib/supabase.js");
const pipeline = read("scripts/patch-service-worker-v179.mjs");
const patch = read("scripts/patch-production-mobile-v189.mjs");

test("v189 remains compatibility authority immediately before v190", () => {
  assert.match(entry, /studio-production-mobile-v189\.js/);
  assert.match(entry, /studio-production-mobile-v189-account\.js/);
  assert.match(entry, /studio-production-mobile-v189-fix\.css/);
  assert.match(entry, /studio-real-device-v190\.js/);
  assert.ok(entry.indexOf("studio-physical-mobile-v188.js") < entry.indexOf("studio-production-mobile-v189.js"));
  assert.ok(entry.indexOf("studio-production-mobile-v189-fix.css") < entry.indexOf("studio-real-device-v190.js"));
  for (const file of [
    "patch-production-data-v186.mjs",
    "patch-production-ui-v187.mjs",
    "patch-production-physical-mobile-v188.mjs",
    "patch-production-mobile-v189.mjs",
  ]) assert.match(pipeline, new RegExp(file.replaceAll(".", "\\.")));
  assert.ok(pipeline.indexOf("patch-production-data-v186.mjs") < pipeline.indexOf("patch-production-ui-v187.mjs"));
  assert.ok(pipeline.indexOf("patch-production-ui-v187.mjs") < pipeline.indexOf("patch-production-physical-mobile-v188.mjs"));
  assert.ok(pipeline.indexOf("patch-production-physical-mobile-v188.mjs") < pipeline.indexOf("patch-production-mobile-v189.mjs"));
  assert.match(patch, /patch-production-v190\.mjs/);
});

test("Android desktop-site v189 compatibility does not clip a zoomed root inside a physical-width body", () => {
  assert.match(runtime, /body\.style\.setProperty\("width", "100vw"/);
  assert.match(runtime, /appRoot\.style\.setProperty\("width", `\$\{state\.physicalWidth\}px`/);
  assert.match(runtime, /appRoot\.style\.setProperty\("zoom", String\(ratio\)/);
  assert.doesNotMatch(runtime, /body\.style\.setProperty\("width", `\$\{state\.physicalWidth\}px`/);
  assert.match(css, /data-studio-desktop-site-phone-v189="true"[\s\S]*width: 100vw/);
  assert.match(realDevice, /calibrateDesktopSite/);
  assert.match(realDevice, /getBoundingClientRect\(\)\.width/);
});

test("mobile drawer remains clickable and v190 removes dark blur outside it", () => {
  assert.match(css, /#ngeblogging-studio-sidebar[\s\S]*z-index: 2147483100/);
  assert.match(runtime, /sidebar\.querySelectorAll\("button,a,input,select,textarea"\)/);
  assert.match(narrowFix, /left: var\(--v189-drawer-width\)/);
  assert.match(realDeviceCss, /#ngeblogging-studio-sidebar>nav[\s\S]*justify-content: safe center/);
  assert.match(realDeviceCss, /\.sn-side-backdrop[\s\S]*background: transparent !important/);
  assert.match(realDeviceCss, /\.sn-side-backdrop[\s\S]*backdrop-filter: none !important/);
});

test("summary, comments, Media, Members and production analytics remain contained", () => {
  assert.match(css, /\.sc161-hero[\s\S]*grid-template-columns: minmax\(0,1fr\)/);
  assert.match(css, /\.sv124-toggle-row>input:checked\+i/);
  assert.match(css, /\.sn-media-tools>nav[\s\S]*overflow-x: auto/);
  assert.match(narrowFix, /\.op41-chart-grid/);
  assert.match(realDeviceCss, /\.op41-toolbar>\*/);
  assert.match(realDeviceCss, /\.op41-active-site>\*/);
  assert.match(realDeviceCss, /position: static !important/);
  assert.match(realDeviceCss, /\.op41-table-wrap[\s\S]*overflow-x: auto/);
});

test("Nara small and medium remain non-modal with centered non-blinking launcher", () => {
  assert.match(runtime, /layer\.dataset\.v189NaraMode = mode/);
  assert.match(css, /data-v189-nara-mode="nonmodal"[\s\S]*pointer-events: none/);
  assert.match(css, /data-v189-nara-mode="nonmodal"[\s\S]*\.nara-assistant-shell[\s\S]*pointer-events: auto/);
  assert.match(realDeviceCss, /\.nara-floating-button[\s\S]*place-items: center/);
  assert.match(realDeviceCss, /\.nara-floating-button[\s\S]*animation: none !important/);
  assert.match(realDeviceCss, /data-v190-nara-mode="nonmodal"[\s\S]*pointer-events: none/);
});

test("Studio REST and Storage use same-origin data gateway with direct fallback", () => {
  assert.match(supabase, /DATA_TRANSPORT_RELEASE_V190/);
  assert.match(supabase, /DATA_GATEWAY_PREFIX/);
  assert.match(supabase, /\/rest\/v1\//);
  assert.match(supabase, /\/storage\/v1\//);
  assert.match(supabase, /same-origin-data-gateway/);
  assert.match(supabase, /direct-supabase-fallback/);
  assert.match(supabase, /persistSession: true/);
  assert.match(supabase, /autoRefreshToken: true/);
});

test("profile and settings stay distinct without deleting the complete settings form", () => {
  assert.match(runtime, /studioAccountViewV189 = profileButton \? "profile" : "settings"/);
  assert.match(css, /data-studio-account-view-v189="profile"[\s\S]*\.sn-settings-grid>section:not\(:first-child\)/);
  assert.match(runtime, /sidebarSettings\?\.click\(\)/);
  assert.match(account, /Simpan profil/);
  assert.match(account, /Simpan perubahan/);
});

test("MutationObserver repairs are idempotent and v190 launcher does not animate", () => {
  assert.match(runtime, /function setAttributeIfChanged/);
  assert.match(runtime, /function setBooleanPropertyIfChanged/);
  assert.match(runtime, /function setTextIfChanged/);
  assert.match(account, /if \(node && node\.textContent !== value\)/);
  assert.match(realDeviceCss, /prefers-reduced-motion:reduce/);
});

test("v189 delegates final cache identity to deterministic v190 patch without destructive session actions", () => {
  assert.match(patch, /patch-production-v190\.mjs/);
  assert.match(patch, /production-mobile-cache-v189/);
  assert.doesNotMatch(patch, /localStorage\.clear\s*\(|signOut\s*\(/);
});
