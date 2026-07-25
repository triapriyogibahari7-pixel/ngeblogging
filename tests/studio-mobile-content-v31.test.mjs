import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const css = read("src/studio-mobile-content-v31.css");
const shellCss = read("src/studio-shell-v30.css");
const shellRuntime = read("src/studio-shell-v30.js");
const assistant = read("src/NaraAssistant.jsx");
const studio = read("src/StudioNext.jsx");
const sw = read("public/sw.js");
const sidebarBackup = read("backups/studio-sidebar-v30-locked-20260725.css");
const largeBackup = read("backups/studio-desktop-large-v30-locked-20260725.md");

test("v31 loads after the approved v30 shell and leaves backups inactive", () => {
  const v30 = index.indexOf("studio-shell-v30.css");
  const v31 = index.indexOf("studio-mobile-content-v31.css");
  assert.ok(v30 > -1);
  assert.ok(v31 > v30);
  assert.equal(index.includes("backups/studio-sidebar-v30-locked-20260725.css"), false);
  assert.match(sidebarBackup, /APPROVED SIDEBAR BACKUP/);
  assert.match(largeBackup, /Studio perangkat besar v30/);
});

test("v31 is compact-device scoped and does not redefine desktop sidebar geometry", () => {
  assert.match(css, /html\.studio-v30-compact/);
  assert.doesNotMatch(css, /studio-v30-desktop \.sn-shell > \.sn-side/);
  assert.doesNotMatch(css, /studio-v30-laptop \.sn-shell > \.sn-side/);
  assert.doesNotMatch(css, /--sn-v30-desktop-open/);
  assert.match(shellCss, /--sn-v30-desktop-open: 220px/);
  assert.match(shellCss, /--sn-v30-desktop-closed: 70px/);
});

test("mobile dashboard views stack and never reuse squeezed desktop tables", () => {
  for (const marker of [
    ".sn-page-title",
    ".sn-welcome",
    ".sn-content-card",
    ".sn-content-tools",
    ".sn-doc-row",
    ".sn-members article",
    ".sn-domain-card",
    ".sn-settings-grid",
    ".nw-page",
    ".nw-project-layout",
    ".nw-plugin-grid",
  ]) assert.ok(css.includes(marker), marker);
  assert.match(css, /grid-template-areas:[\s\S]*"title delete"[\s\S]*"status time"/);
  assert.match(css, /\.sn-table-head \{ display: none !important; \}/);
  assert.match(css, /overflow-x: hidden !important/);
  assert.match(css, /overflow-wrap: anywhere !important/);
});

test("all Studio menu destinations remain present while mobile content gets responsive rules", () => {
  for (const label of ["Ringkasan", "Posts", "Pages", "Tema", "Media", "Nara AI", "Analitik", "Anggota", "Domain", "Pengaturan", "Keluar"]) {
    assert.ok(studio.includes(label), label);
  }
  assert.ok(index.includes("studio-layout-route-v29.js"), "Tata Letak route remains installed");
});

test("Nara mini widget uses a narrow tall layout and one-row header controls", () => {
  assert.match(css, /data-nara-size-v30="mini"[\s\S]*width: min\(300px, calc\(100vw - 24px\)\) !important/);
  assert.match(css, /height: min\(590px, calc\(100svh - 32px - env\(safe-area-inset-bottom\)\)\) !important/);
  assert.match(css, /grid-template-columns: 42px minmax\(0, 1fr\) repeat\(4, 30px\) !important/);
  assert.match(css, /\.nara-message-content,[\s\S]*font-size: 13px !important/);
  assert.match(css, /\.nara-composer textarea[\s\S]*font-size: 13px !important/);
  assert.match(css, /\.nara-composer-tools[\s\S]*overflow-x: auto !important/);
});

test("Nara capabilities and three sizes are preserved", () => {
  for (const marker of ["Kamera", "Foto", "File teks", "Pertanyaan suara", "Tingkat kecerdasan", "Model Nara"]) {
    assert.ok(assistant.includes(marker), marker);
  }
  for (const marker of ["nara-speaker-v30", "nara-mode-v30", "mini", "compact", "expanded"]) {
    assert.ok(shellRuntime.includes(marker), marker);
  }
  assert.match(css, /Fullscreen remains intentionally untouched/);
});

test("PWA cache rotates to v31", () => {
  assert.match(sw, /ngeblogging-app-v31-20260725/);
  assert.match(sw, /fetch\(request, \{ cache: "no-store" \}\)/);
});
