import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-screenshot-fix-v177.js");
const css = read("src/studio-screenshot-fix-v177.css");
const nara = read("src/NaraAssistant.jsx");
const naraPatch = read("scripts/patch-nara-interaction-v177.mjs");
const studio = read("src/StudioNext.jsx");
const device = read("src/studio-device-mode-v140.js");

const menuLabels = [
  "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
  "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
];
const modes = ["application", "phone", "mobile", "compact", "tablet", "desktop"];

test("v177 loads after v176 as the final screenshot authority", () => {
  assert.match(entry, /studio-mobile-stability-v176\.js/);
  assert.match(entry, /studio-screenshot-fix-v177\.js/);
  assert.ok(entry.lastIndexOf("studio-screenshot-fix-v177.js") > entry.lastIndexOf("studio-mobile-stability-v176.js"));
  assert.match(runtime, /studio-screenshot-fix-v177-20260731/);
});

test("drawer backdrop physically begins after the drawer and cannot cover its menu", () => {
  const block = css.match(/\.sn-side-backdrop\s*\{([\s\S]*?)\}/)?.[1] || "";
  assert.match(block, /left:var\(--sm177-drawer-width\)!important/);
  assert.doesNotMatch(block, /inset:0!important/);
  assert.match(block, /z-index:2190!important/);
  assert.match(css, /\.sn-side\.mobile-open[\s\S]*pointer-events:auto!important/);
  assert.match(runtime, /main\.removeAttribute\("inert"\)/);
  assert.match(runtime, /sidebar\.removeAttribute\("inert"\)/);
});

test("mobile drawer remains complete and menu starts immediately below Buat Post", () => {
  assert.match(css, /grid-template-rows:64px 60px minmax\(0,1fr\) auto!important/);
  assert.match(css, />\.sn-side>nav[\s\S]*justify-content:flex-start!important/);
  assert.match(css, />\.sn-side>\.sn-new[\s\S]*margin:6px 9px!important/);
  assert.match(css, />\.sn-side>\.sn-account-footer[\s\S]*env\(safe-area-inset-bottom\)/);
  for (const label of menuLabels) assert.ok(studio.includes(`>${label}<`), `menu hilang: ${label}`);
});

test("single n glyph is optically centered and old artwork is disabled", () => {
  assert.match(css, /\.sn-mobile-menu-mark::before[\s\S]*content:none!important/);
  assert.match(css, /\.sn-logo-mark::after[\s\S]*display:none!important/);
  assert.match(css, /\.sn-mobile-menu-mark strong[\s\S]*place-items:center|\.sn-mobile-menu-mark[\s\S]*place-items:center/);
  assert.match(css, /font-family:Arial,Helvetica,sans-serif!important/);
  assert.match(css, /transform:translateY\(-1px\)!important/);
});

test("mobile topbar profile and Media remain bounded against Android text inflation", () => {
  assert.match(css, /\.sn-workspace,[\s\S]*display:none!important/);
  assert.match(css, /\.sn-avatar\{[\s\S]*width:42px!important[\s\S]*height:42px!important/);
  assert.match(css, /\.sn-profile-menu-v150\{[\s\S]*width:min\(280px,calc\(100vw - 20px\)\)!important/);
  assert.match(css, /-webkit-text-size-adjust:100%!important/);
  assert.match(css, /\.sn-media-library \.sn-page-title h1[\s\S]*font-size:32px!important/);
  assert.match(css, /\.sn-upload-zone h3[\s\S]*font-size:22px!important/);
  assert.match(css, /\.sn-upload-zone button[\s\S]*height:42px!important/);
});

test("Nara launcher is centered and opening always starts at small", () => {
  assert.match(css, /\.nara-floating-button\{[\s\S]*width:52px!important[\s\S]*height:52px!important/);
  assert.match(css, /\.nara-floating-button>b,[\s\S]*display:none!important/);
  assert.match(css, /animation:none!important/);
  assert.match(nara, /changeSize\("small"\); setOpen\(true\)/);
  assert.match(naraPatch, /LAUNCH_SMALL/);
});

test("Nara small and medium are structurally nonmodal while full remains modal", () => {
  assert.match(nara, /aria-modal=\{size === "full"\}/);
  assert.match(nara, /data-nara-interaction-v177=\{size === "full" \? "modal" : "nonmodal"\}/);
  assert.match(nara, /\{size === "full" && <button className="nara-assistant-backdrop"/);
  assert.match(nara, /className="nara-close-v177"/);
  assert.match(nara, /recognition\.current\?\.stop/);
  assert.match(css, /data-nara-interaction-v177="nonmodal"[\s\S]*display:none!important/);
  assert.match(css, /data-nara-size="small"/);
  assert.match(css, /data-nara-size="medium"/);
  assert.match(css, /data-nara-size="full"/);
  assert.match(css, /\.nara-close-v177[\s\S]*visibility:visible!important/);
});

test("all six responsive families and desktop variants stay protected", () => {
  for (const mode of modes) assert.ok(device.includes(`"${mode}"`), `mode hilang: ${mode}`);
  for (const variant of ["laptop", "computer"]) assert.ok(device.includes(`"${variant}"`), `varian hilang: ${variant}`);
});

test("v177 stylesheet is balanced", () => {
  assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length);
});
