import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const authority = read("src/studio-style-authority-v144.js");
const runtime = read("src/studio-platform-v160.js");
const css = read("src/studio-platform-v160.css");
const v159 = read("src/studio-ui-contract-v159.js");
const v159Css = read("src/studio-ui-contract-v159.css");
const studio = read("src/StudioNext.jsx");
const device = read("src/studio-device-mode-v140.js");
const theme = read("src/ThemeStudio.jsx");
const editor = read("src/ContentEditor.jsx");
const nara = read("src/NaraAssistant.jsx");
const comments = read("public/comments-v93.js");

const sizes = [
  "320, 568", "360, 640", "375, 667", "390, 844", "412, 915", "430, 932",
  "600, 960", "768, 1024", "820, 1180", "1024, 768", "1280, 720",
  "1366, 768", "1440, 900", "1920, 1080",
];
const menuLabels = [
  "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
  "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
];

test("v160 extends v159 instead of removing previous Studio features", () => {
  assert.ok(authority.includes('import "./studio-platform-v160.js"'));
  assert.ok(runtime.includes('import "./studio-ui-contract-v159.js"'));
  assert.ok(runtime.includes('import "./studio-platform-v160.css"'));
  assert.ok(v159.includes('import "./studio-recovery-v150.js"'));
  assert.ok(v159Css.includes("Only fullscreen owns a backdrop"));
  for (const label of menuLabels) assert.ok(studio.includes(`>${label}<`), `menu missing ${label}`);
});

test("sidebar open or closed preference persists and remains accessible", () => {
  for (const marker of [
    "ngeblogging:studio:sidebar:v160",
    "localStorage.getItem",
    "localStorage.setItem",
    "sidebarPreference",
    "applySidebarPreference",
    "writeSidebarPreference",
    "MutationObserver",
    "aria-label",
    "title",
  ]) assert.ok(runtime.includes(marker), `sidebar persistence missing ${marker}`);
  assert.ok(runtime.includes("sn-sidebar-edge-toggle-v159"));
  assert.ok(v159.includes("sn-sidebar-edge-toggle-v159"));
});

test("mobile drawer and profile menu have keyboard and focus recovery", () => {
  for (const marker of [
    "syncDrawerAccessibility",
    "aria-hidden",
    "toggleAttribute(\"inert\"",
    "lastSidebarButton",
    'event.key !== "Escape"',
    "syncProfileKeyboard",
    'event.key === "ArrowDown"',
    'event.key === "ArrowUp"',
    'event.key === "Home"',
    'event.key === "End"',
  ]) assert.ok(runtime.includes(marker), `interaction missing ${marker}`);
  assert.ok(studio.includes("sn-side-backdrop"));
  assert.ok(studio.includes("sn-side-close"));
});

test("all requested viewport sizes are recorded by the runtime contract", () => {
  for (const size of sizes) assert.ok(runtime.includes(`[${size}]`), `viewport missing ${size}`);
  assert.ok(runtime.includes("VIEWPORT_MATRIX.length"));
  assert.ok(runtime.includes("window.visualViewport"));
});

test("six responsive families and desktop variants remain explicit", () => {
  for (const family of ["application", "phone", "mobile", "compact", "tablet", "desktop"]) {
    assert.ok(device.includes(`"${family}"`), `device family missing ${family}`);
  }
  for (const variant of ["laptop", "computer"]) assert.ok(device.includes(`"${variant}"`));
  for (const label of ["Aplikasi", "Handphone", "Mobile", "Perangkat kecil", "Tablet", "Laptop", "Situs desktop", "Komputer"]) {
    assert.ok(theme.includes(`label: "${label}"`), `Theme preview missing ${label}`);
  }
});

test("safe areas, overflow guards and motion stability cover installed app and mobile", () => {
  for (const marker of [
    "safe-area-inset-top",
    "safe-area-inset-right",
    "safe-area-inset-bottom",
    "safe-area-inset-left",
    "overflow-x: clip",
    "min-width: 0",
    "max-width: 100%",
    "overscroll-behavior-inline: contain",
    "@media (display-mode: standalone)",
    "@media (max-width: 820px)",
    "@media (max-width: 430px)",
    "@media (max-width: 360px)",
    "@media (max-height: 640px)",
    "@media (orientation: landscape) and (max-height: 600px)",
    "@media (prefers-reduced-motion: reduce)",
  ]) assert.ok(css.includes(marker), `CSS contract missing ${marker}`);
});

test("Theme code editor and content editor keep responsive scroll contracts", () => {
  for (const marker of [
    ".tn-code-workspace",
    ".tn-code-pane",
    ".tn-code-preview-pane",
    "grid-template-columns: minmax(0, 1fr)",
    "min-height: 48dvh",
    ".ce-tabs",
    ".ce-toolbar",
  ]) assert.ok(css.includes(marker), `editor CSS missing ${marker}`);
  assert.ok(editor.includes("focusKeyword"));
  assert.ok(editor.includes("canonicalUrl"));
  assert.ok(editor.includes("commentsEnabled"));
});

test("Nara stays nonmodal in small and medium and comments keep ten moods and reactions", () => {
  assert.ok(v159.includes("backdrop.hidden = !full"));
  assert.ok(v159.includes('aria-modal", full ? "true" : "false"'));
  assert.ok(css.includes('.nara-assistant-shell[data-nara-size="small"]'));
  assert.ok(css.includes('.nara-assistant-shell[data-nara-size="medium"]'));
  for (const marker of ["Kamera", "Foto", "File teks", "Mic", "SpeakerIcon", "modelOptions", "intelligenceOptions"]) {
    assert.ok(nara.includes(marker), `Nara missing ${marker}`);
  }
  for (const emoji of ["😀", "😃", "😄", "😁", "😊", "😍", "🥰", "😎", "🤩", "😂"]) assert.ok(comments.includes(emoji));
  for (const emoji of ["😀", "😊", "😍", "😂", "😮", "😢", "😡", "👍", "❤️", "🎉"]) assert.ok(comments.includes(emoji));
});

test("v160 source files have balanced braces", () => {
  for (const source of [runtime, css]) {
    assert.equal((source.match(/\{/g) || []).length, (source.match(/\}/g) || []).length);
  }
});
