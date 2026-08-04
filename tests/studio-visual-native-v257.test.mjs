import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const runtime = read("src/studio-visual-native-v257.js");
const styles = read("src/studio-visual-native-v257.css");
const device = read("src/studio-device-mode-v140.js");
const studio = read("src/StudioNext.jsx");
const nara = read("src/NaraAssistant.jsx");
const theme = read("src/ThemeStudio.jsx");
const widgets = read("src/widget-system.js");
const auth = read("src/lib/supabase.js");
const vite = read("vite.config.js");
const finalizer = read("scripts/finalize-studio-v257-order.mjs");

const menus = ["Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik", "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar"];

test("v257 has a hard post-activator build-order guard", () => {
  assert.ok(finalizer.includes("studio-v257-post-build-order-20260804"));
  assert.ok(finalizer.includes("studio-shell-interaction-v255.css"));
  assert.ok(finalizer.includes("studio-visual-native-v257.js"));
  assert.ok(finalizer.includes("studio-visual-native-v257.css"));
  assert.ok(finalizer.includes("V257_FINAL_ORDER_INVALID"));
  assert.ok(finalizer.includes("V257_RUNTIME_DUPLICATE"));
  assert.ok(finalizer.includes("V257_CSS_DUPLICATE"));
  assert.ok(vite.includes("finalizeStudioV257Order"));
});

test("six responsive engines and desktop variants remain present", () => {
  for (const mode of ["application", "phone", "mobile", "compact", "tablet", "desktop"]) assert.ok(device.includes(`"${mode}"`), `missing ${mode}`);
  for (const variant of ["laptop", "computer"]) assert.ok(device.includes(`"${variant}"`), `missing ${variant}`);
  assert.ok(runtime.includes("SMALL_MODES"));
  assert.ok(runtime.includes("LARGE_MODES"));
});

test("sidebar, profile and mobile drawer contract remains complete", () => {
  for (const label of menus) assert.ok(studio.includes(label), `missing ${label}`);
  for (const marker of ["--v257-side-open:248px", "--v257-side-rail:70px", "#ngeblogging-studio-sidebar.mobile-open", "background:transparent!important", ".sn-avatar"]) assert.ok(styles.includes(marker), `missing style ${marker}`);
  assert.ok(runtime.includes('letter.textContent = "n"'));
  assert.ok(runtime.includes('button.dataset.action = "avatar"'));
  assert.ok(runtime.includes("squareAvatarBlob"));
});

test("Nara remains fixed, opens small and keeps attachment/model/voice controls", () => {
  assert.ok(runtime.includes("layer.dataset.v257InitialSmall"));
  assert.ok(runtime.includes('button[data-size="small"]'));
  assert.ok(runtime.includes('full ? "modal" : "nonmodal"'));
  for (const marker of [".nara-floating-button", "position:fixed!important", 'data-v257-interaction="nonmodal"', ".nara-attachment-menu", "bottom:calc(100% + 8px)!important"]) assert.ok(styles.includes(marker), `missing Nara style ${marker}`);
  for (const feature of ["Kamera", "Foto", "File teks", "Tingkat kecerdasan", "Model Nara", "SpeakerIcon", "<Mic"]) assert.ok(nara.includes(feature), `missing Nara feature ${feature}`);
});

test("Theme Studio keeps eight previews, 26 widgets and modern layout areas", () => {
  const widgetIds = [...widgets.matchAll(/\{ id: "[^"]+", name:/g)].length;
  assert.equal(widgetIds, 26);
  for (const preview of ["application", "phone", "mobile", "compact", "tablet", "laptop", "desktop", "computer"]) assert.ok(theme.includes(`id: "${preview}"`), `missing preview ${preview}`);
  for (const area of ["header-left", "header-right", "below-header", "sidebar-left", "before-content", "after-content", "sidebar-right", "footer-left", "footer-right", "footer-wide"]) assert.ok(widgets.includes(`id: "${area}"`), `missing layout area ${area}`);
  assert.ok(runtime.includes("Widget kiri 4"));
  assert.ok(runtime.includes("Widget kanan 4"));
  assert.ok(runtime.includes('"custom-html"'));
  assert.ok(styles.includes(".v257-layout-blueprint"));
});

test("code/mobile overflow guards and persisted sessions remain intact", () => {
  for (const marker of ["grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important", ".tn-code-preview-pane", "order:1!important", ".tn-code-pane", "order:2!important", ".sv124-free-domain>aside", "writing-mode:horizontal-tb!important", ".ce-tabs", "overflow-x:auto!important"]) assert.ok(styles.includes(marker), `missing guard ${marker}`);
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});
