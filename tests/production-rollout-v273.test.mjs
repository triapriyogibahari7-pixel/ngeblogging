import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const entry = read("src/Studio.jsx");
const shell = read("src/studio-shell-authority-v272.js");
const shellCss = read("src/studio-shell-authority-v272.css");
const layout = read("src/studio-theme-layout-v264.js");
const nara = read("src/NaraAssistant.jsx");
const profile = read("src/studio-profile-menu-v268.js");
const widgets = read("src/widget-system.js");
const themes = read("src/theme-catalog.js");
const auth = read("src/lib/supabase.js");
const studio = read("src/StudioNext.jsx");

const requiredMenu = [
  "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
  "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
];

test("v273 rollout keeps v272 as the final responsive shell authority", () => {
  assert.ok(entry.includes('import "./studio-shell-authority-v272.js";'));
  assert.ok(entry.indexOf('studio-shell-authority-v272.js') > entry.indexOf('studio-scroll-chrome-v270.css'));
  assert.match(shell, /dataset\.v272DesktopFamily = String\(large\)/);
  assert.match(shellCss, /#ngeblogging-studio-sidebar\.collapsed\+\.sn-main/);
  assert.match(shellCss, /\.nara-floating-button[\s\S]*position:fixed!important/);
});

test("single n toggle, desktop rail, compact drawer, and five-account-action profile remain wired", () => {
  assert.match(entry, /studio-sidebar-single-toggle-v267\.js/);
  assert.match(shellCss, /\.sn-sidebar-edge-toggle-v147[\s\S]*display:none!important/);
  assert.match(shellCss, /data-v272-desktop-family="false"[\s\S]*#ngeblogging-studio-sidebar:not\(\.mobile-open\)/);
  for (const action of ["profile", "add-site", "settings", "nara", "logout"]) {
    assert.ok(profile.includes(`data-action=\"${action}\"`), `missing profile action ${action}`);
  }
});

test("the Theme Studio keeps the real 26-slot map with four left and four right slots", () => {
  for (const slot of [
    "sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4",
    "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4",
    "before-content", "after-content", "footer-copyright-left", "footer-copyright-right",
  ]) assert.ok(layout.includes(`\"${slot}\"`), `missing layout slot ${slot}`);
  assert.match(layout, /tn-layout-popover-v264/);
  assert.match(layout, /Semua 26 widget/);
  assert.match(layout, /Edit HTML \/ CSS \/ JavaScript/);
});

test("100-theme and 26-widget production architecture remains present", () => {
  const familyCount = [...themes.matchAll(/\{ id:"[^"]+",name:"[^"]+",category:/g)].length;
  const compositionCount = [...themes.matchAll(/\{ id:"(?:prime|dawn|night|coast|atelier)"/g)].length;
  assert.equal(familyCount, 20);
  assert.equal(compositionCount, 5);
  assert.match(themes, /FAMILIES\.flatMap/);
  const widgetCount = [...widgets.matchAll(/\{ id: "[^"]+", name:/g)].length;
  assert.equal(widgetCount, 26);
  assert.match(widgets, /id: "custom-html"/);
});

test("Nara retains Camera, Photo, File, microphone, models and intelligence without forced full-screen", () => {
  assert.match(nara, /cameraInput\.current\?\.click\(\)/);
  assert.match(nara, /imageInput\.current\?\.click\(\)/);
  assert.match(nara, /fileInput\.current\?\.click\(\)/);
  assert.match(nara, /intelligenceOptions/);
  assert.match(nara, /modelOptions/);
  assert.match(nara, /Mic/);
  assert.match(shellCss, /data-nara-size="small"/);
  assert.match(shellCss, /data-nara-size="medium"/);
});

test("login persistence and every required Studio menu stay protected", () => {
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  for (const label of requiredMenu) assert.ok(studio.includes(label), `missing menu ${label}`);
  for (const source of [shell, profile, auth]) {
    assert.doesNotMatch(source, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/);
  }
});
