import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

execFileSync(process.execPath, ["scripts/patch-studio-screenshot-v177.mjs"], { stdio: "pipe" });
execFileSync(process.execPath, ["scripts/patch-studio-screenshot-v177.mjs"], { stdio: "pipe" });

const entry = read("src/Studio.jsx");
const studio = read("src/StudioNext.jsx");
const nara = read("src/NaraAssistant.jsx");
const recovery = read("src/studio-recovery-v150.js");
const profile = read("src/ProfileSettingsV177.jsx");
const runtime = read("src/studio-screenshot-fixes-v177.js");
const css = read("src/studio-screenshot-fixes-v177.css");
const device = read("src/studio-device-mode-v140.js");
const theme = read("src/ThemeStudio.jsx");

const sidebarLabels = [
  "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
  "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
];

test("v177 loads after the v176 screenshot authority and keeps every sidebar page", () => {
  assert.ok(entry.indexOf("studio-mobile-stability-v176.js") < entry.indexOf("studio-screenshot-fixes-v177.js"));
  for (const label of sidebarLabels) assert.ok(studio.includes(`>${label}<`), `missing ${label}`);
  assert.match(runtime, /studio-screenshot-fixes-v177-20260731/);
});

test("six responsive families and all eight preview profiles remain protected", () => {
  for (const mode of ["application", "phone", "mobile", "compact", "tablet", "desktop", "laptop", "computer"]) {
    assert.ok(device.includes(`"${mode}"`) || theme.includes(`id: "${mode}"`), `missing ${mode}`);
  }
});

test("mobile drawer backdrop can never cover or disable the drawer", () => {
  assert.match(css, /--sv177-drawer-width/);
  assert.match(css, /clip-path:inset\(0 0 0 var\(--sv177-drawer-width\)\)!important/);
  assert.match(css, /z-index:2147482400!important/);
  assert.match(css, /z-index:2147482500!important/);
  assert.match(css, /backdrop-filter:none!important/);
  assert.match(css, /justify-content:flex-start!important/);
  assert.match(runtime, /sidebar\.removeAttribute\("inert"\)/);
  assert.match(runtime, /main\?\.removeAttribute\("inert"\)/);
  assert.match(runtime, /drawerInteractiveV177/);
});

test("mobile n logo is optically centered and never inherits a blur or decorative pill", () => {
  assert.match(css, /\.sn-mobile-menu-mark::before/);
  assert.match(css, /content:none!important/);
  assert.match(css, /place-items:center!important/);
  assert.match(css, /transform:none!important/);
  assert.match(css, /color:#1f61d2!important/);
});

test("avatar stays bounded and Profile is separate from site Settings", () => {
  assert.match(css, /inline-size:44px!important/);
  assert.match(css, /block-size:44px!important/);
  assert.match(studio, /ProfileViewV177/);
  assert.match(studio, /SiteSettingsViewV177/);
  assert.match(studio, /view === "profile"/);
  assert.match(recovery, /ngeblogging:open-profile/);
  assert.match(recovery, /ngeblogging:open-settings/);
  assert.match(profile, /data-profile-page-release="v177"/);
  assert.match(profile, /data-settings-page-release="v177"/);
  assert.match(profile, /Dapatkan aplikasi/);
  assert.match(recovery, /ngeblogging:install-app-request/);
  assert.match(runtime, /data-action="install"/);
});

test("Nara small and medium are structurally non-modal with one stable launcher", () => {
  assert.match(nara, /!open && \(/);
  assert.match(nara, /aria-modal=\{size === "full"\}/);
  assert.match(nara, /data-nara-interaction=\{size === "full" \? "modal" : "nonmodal"\}/);
  assert.match(nara, /size === "full" && <button className="nara-assistant-backdrop"/);
  assert.match(nara, /recognition\.current\?\.stop/);
  assert.match(nara, /activeRequest\.current\?\.abort/);
  assert.match(css, /body\.sv177-nara-open \.nara-floating-button \{ display:none!important; \}/);
  assert.match(css, /data-nara-interaction="nonmodal"/);
  assert.match(css, /pointer-events:none!important/);
  assert.match(css, /grid-template-columns:36px minmax\(0,1fr\) 34px 34px 34px!important/);
  assert.match(css, /\.nara-assistant-header>button:last-child/);
  assert.match(runtime, /hidden = index !== launchers\.length - 1 \|\| Boolean\(layer\)/);
});

test("raw fetch failures become a contained Indonesian error state", () => {
  assert.match(runtime, /TypeError: Failed to fetch/);
  assert.match(runtime, /Koneksi ke layanan belum tersedia/);
  assert.match(runtime, /sv177-network-error/);
  assert.match(css, /\.sv177-network-error/);
});

test("v177 CSS blocks remain balanced", () => {
  assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length);
});
