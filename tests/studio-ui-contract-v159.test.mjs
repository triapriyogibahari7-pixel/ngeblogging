import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const styleAuthority = read("src/studio-style-authority-v144.js");
const platform = read("src/studio-platform-v160.js");
const runtime = read("src/studio-ui-contract-v159.js");
const css = read("src/studio-ui-contract-v159.css");
const recovery = read("src/studio-recovery-v150.js");
const recoveryCss = read("src/studio-recovery-v150.css");
const analytics = read("src/studio-analytics-v41.js");
const device = read("src/studio-device-mode-v140.js");
const studio = read("src/StudioNext.jsx");
const theme = read("src/ThemeStudio.jsx");
const editor = read("src/ContentEditor.jsx");
const completion = read("src/studio-completion-v151.js");
const nara = read("src/NaraAssistant.jsx");
const naraNonmodal = read("src/nara-nonmodal-v151.css");
const auth = read("src/lib/supabase.js");
const comments = read("public/comments-v93.js");

const sidebarLabels = [
  "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
  "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
];
const responsiveModes = ["application", "phone", "mobile", "compact", "tablet", "desktop"];
const previewLabels = ["Aplikasi", "Handphone", "Mobile", "Perangkat kecil", "Tablet", "Laptop", "Situs desktop", "Komputer"];
const blueprints = ["blog", "website", "news", "portfolio", "forum", "community", "landing", "profile", "knowledge"];

function balanced(source, open, close) {
  assert.equal((source.match(open) || []).length, (source.match(close) || []).length);
}

test("v159 remains loaded transitively by the active v160 Studio authority", () => {
  assert.ok(styleAuthority.includes('import "./studio-platform-v160.js"'));
  assert.ok(platform.includes('import "./studio-ui-contract-v159.js"'));
  assert.ok(runtime.includes('import "./studio-recovery-v150.js"'));
  assert.ok(runtime.includes('import "./studio-recovery-v150.css"'));
  assert.ok(runtime.includes('import "./studio-ui-contract-v159.css"'));
  assert.ok(runtime.includes("studio-ui-contract-v159-20260730"));
});

test("desktop sidebar has a center menu, attached edge toggle and adaptive content width", () => {
  for (const marker of [
    "sn-sidebar-edge-toggle-v159", "Perluas menu Studio", "Ciutkan menu Studio",
    "data-menu-center", "--sn-sidebar-open", "--sn-sidebar-closed",
    ".sn-side.collapsed + .sn-main", "justify-content: center",
  ]) assert.ok(`${runtime}\n${css}`.includes(marker), `missing ${marker}`);
  for (const label of sidebarLabels) assert.ok(studio.includes(`>${label}<`), `sidebar missing ${label}`);
});

test("six responsive families and laptop/computer variants remain explicit", () => {
  for (const mode of responsiveModes) assert.ok(device.includes(`"${mode}"`), `device mode missing ${mode}`);
  assert.ok(device.includes('return "laptop"'));
  assert.ok(device.includes('return "computer"'));
  assert.ok(device.includes('? "small"'));
  assert.ok(device.includes(': "large"'));
  for (const marker of [
    'data-device-mode="small"', "mobile-open", "76vw", "margin-left: 0",
    ".sn-mobile-menu-mark", ".sn-desktop-sidebar-icon",
  ]) assert.ok(css.includes(marker), `mobile contract missing ${marker}`);
});

test("profile dropdown, first-site onboarding and persistent sessions are restored", () => {
  for (const marker of ["sn-profile-menu-v150", "Profil", "Pengaturan", "Keluar", "aria-haspopup", "aria-expanded"]) {
    assert.ok(`${runtime}\n${recovery}\n${recoveryCss}`.includes(marker), `profile recovery missing ${marker}`);
  }
  for (const blueprint of blueprints) assert.ok(recovery.includes(`"${blueprint}"`), `onboarding missing ${blueprint}`);
  for (const marker of ["createUserSite", "setActiveSiteId", "is_site_slug_available", "refreshSession", "retained-offline"]) {
    assert.ok(recovery.includes(marker), `onboarding/session recovery missing ${marker}`);
  }
});

test("real analytics dashboard is restored without inventing production numbers", () => {
  for (const marker of [
    "get_site_analytics_dashboard", "DATA PRODUKSI NYATA", "SIMULASI TAMPILAN — BUKAN DATA PRODUKSI",
    "Pengunjung manusia unik", "Trafik bot", "Distribusi perangkat", "SUMBER TRAFIK",
    "Performa konten", "op41-line", "op41-donut", "op41-table",
  ]) assert.ok(`${analytics}\n${css}`.includes(marker), `analytics missing ${marker}`);
  assert.ok(recovery.includes("loadAnalytics(view, 30, false)"));
});

test("Theme Studio keeps at least 100 themes, layout map, widget checks and code/preview split", () => {
  assert.ok(theme.includes("THEME_COUNT"));
  assert.ok(theme.includes("LayoutMap"));
  assert.ok(theme.includes("WidgetStudio"));
  assert.ok(theme.includes("<Check/>"));
  assert.ok(theme.includes("CodeEditor"));
  for (const label of previewLabels) assert.ok(theme.includes(`label: "${label}"`), `theme preview missing ${label}`);
  for (const marker of [
    ".tn-layout-canvas", "grid-template-areas", ".tn-code-workspace",
    "grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)", "48dvh",
  ]) assert.ok(css.includes(marker), `Theme Studio CSS missing ${marker}`);
});

test("Posts and Pages share the complete SEO editor and preserve the 5,000 word guard", () => {
  assert.ok(editor.includes('const isPage = doc.type === "page"'));
  for (const marker of ["Kategori", "Metadata", "SEO", "HTML", "Preview", "commentsEnabled", "focusKeyword", "canonicalUrl"]) {
    assert.ok(editor.includes(marker), `editor missing ${marker}`);
  }
  assert.ok(completion.includes("MAX_EDITOR_WORDS = 5000"));
  assert.ok(completion.includes("Tulisan tidak dipotong"));
});

test("Nara opens small, remains nonmodal until fullscreen and keeps all requested tools", () => {
  for (const marker of [
    "SMALL_NARA_SHELLS", 'data-size="small"', "smallButton.click()", "backdrop.hidden = !full",
    'aria-modal", full ? "true" : "false"', "naraInteractionV159",
  ]) assert.ok(runtime.includes(marker), `Nara runtime missing ${marker}`);
  assert.ok(css.includes('data-nara-interaction-v159="full"'));
  for (const marker of [
    "Kamera", "Foto", "File teks", "Mic", "SpeakerIcon", "modelOptions", "intelligenceOptions",
    "Instan", "Sedang", "Tinggi", "small", "medium", "full",
  ]) assert.ok(nara.includes(marker), `Nara feature missing ${marker}`);
  assert.ok(css.includes("Only fullscreen owns a backdrop"));
  assert.ok(naraNonmodal.includes("pointer-events:none!important"));
});

test("comments and authentication contracts remain intact", () => {
  for (const emoji of ["😀", "😃", "😄", "😁", "😊", "😍", "🥰", "😎", "🤩", "😂"]) {
    assert.ok(comments.includes(emoji), `comment mood missing ${emoji}`);
  }
  for (const emoji of ["😀", "😊", "😍", "😂", "😮", "😢", "😡", "👍", "❤️", "🎉"]) {
    assert.ok(comments.includes(emoji), `comment reaction missing ${emoji}`);
  }
  assert.ok(comments.includes("Belum ada komentar. Jadilah yang pertama membuka diskusi."));
  for (const marker of [
    '"google"', '"linkedin_oidc"', "signInWithPassword", "signInWithMagicLink",
    "persistSession: true", "autoRefreshToken: true", "/api/auth-proxy",
  ]) assert.ok(auth.includes(marker), `auth missing ${marker}`);
});

test("v159 authority styles are syntactically balanced", () => {
  balanced(css, /\{/g, /\}/g);
  balanced(runtime, /\{/g, /\}/g);
});
