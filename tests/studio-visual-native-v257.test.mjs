import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const studioEntry = read("src/Studio.jsx");
const runtime = read("src/studio-visual-native-v257.js");
const styles = read("src/studio-visual-native-v257.css");
const device = read("src/studio-device-mode-v140.js");
const studio = read("src/StudioNext.jsx");
const nara = read("src/NaraAssistant.jsx");
const theme = read("src/ThemeStudio.jsx");
const widgets = read("src/widget-system.js");
const themeCatalog = read("src/theme-catalog.js");
const auth = read("src/lib/supabase.js");
const vite = read("vite.config.js");
const finalizer = read("scripts/finalize-studio-v257-order.mjs");

const menus = ["Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik", "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar"];

test("v257 is loaded after v255 and is finalized after legacy build activators", () => {
  const v255 = studioEntry.indexOf('import "./studio-shell-interaction-v255.css";');
  const runtimeIndex = studioEntry.indexOf('import "./studio-visual-native-v257.js";');
  const stylesIndex = studioEntry.indexOf('import "./studio-visual-native-v257.css";');
  assert.ok(v255 >= 0);
  assert.ok(runtimeIndex > v255);
  assert.ok(stylesIndex > runtimeIndex);
  assert.match(finalizer, /studio-v257-post-build-order-20260804/);
  assert.match(finalizer, /V257_FINAL_ORDER_INVALID/);
  assert.match(vite, /finalizeStudioV257Order/);
});

test("six responsive classes plus laptop/computer desktop variants remain native", () => {
  for (const mode of ["application", "phone", "mobile", "compact", "tablet", "desktop"]) assert.ok(device.includes(`"${mode}"`), `missing device mode ${mode}`);
  for (const variant of ["laptop", "computer"]) assert.ok(device.includes(`"${variant}"`), `missing desktop variant ${variant}`);
  assert.match(runtime, /SMALL_MODES/);
  assert.match(runtime, /LARGE_MODES/);
  assert.match(styles, /data-studio-v257-mode="application"/);
  assert.match(styles, /data-studio-v257-mode="phone"/);
  assert.match(styles, /data-studio-v257-mode="mobile"/);
  assert.match(styles, /data-studio-v257-mode="compact"/);
  assert.match(styles, /data-studio-v257-family="large"/);
  assert.match(styles, /data-studio-v257-family="small"/);
});

test("sidebar remains complete, compact and responsive instead of disappearing", () => {
  for (const label of menus) assert.ok(studio.includes(label), `missing Studio menu ${label}`);
  assert.match(styles, /#ngeblogging-studio-sidebar[\s\S]*display:flex!important/);
  assert.match(styles, /--v257-side-open:248px/);
  assert.match(styles, /--v257-side-rail:70px/);
  assert.match(styles, /data-studio-v257-sidebar="expanded"[\s\S]*\.sn-main/);
  assert.match(styles, /data-studio-v257-sidebar="collapsed"[\s\S]*\.sn-main/);
  assert.match(styles, /#ngeblogging-studio-sidebar>nav[\s\S]*gap:2px!important/);
  assert.match(styles, /\.sn-account-footer[\s\S]*margin-top:auto!important/);
  assert.match(runtime, /letter\.textContent = "n"/);
});

test("small devices keep one n, a transparent outside drawer target and a visible profile trigger", () => {
  assert.match(styles, /data-studio-v257-family="small"\] \.sn-sidebar-toggle[\s\S]*display:grid!important/);
  assert.match(styles, /#ngeblogging-studio-sidebar\.mobile-open[\s\S]*pointer-events:auto!important/);
  assert.match(styles, /\.sn-side-backdrop[\s\S]*background:transparent!important/);
  assert.match(styles, /backdrop-filter:none!important/);
  assert.match(styles, /data-studio-v257-family="small"\] \.sn-top-actions>:not\(\.sn-avatar\)/);
  assert.match(styles, /\.sn-avatar[\s\S]*position:fixed!important[\s\S]*right:var\(--v257-safe-right\)!important/);
});

test("profile menu stays bounded and can add a real avatar action", () => {
  assert.match(runtime, /data-action="avatar"/);
  assert.match(runtime, /squareAvatarBlob/);
  assert.match(runtime, /site-public-media/);
  assert.match(runtime, /updateUserProfile/);
  assert.match(runtime, /updateVisibleIdentity/);
  assert.match(styles, /\.sn-profile-menu-v150[\s\S]*position:fixed!important[\s\S]*max-height:calc\(100dvh/);
});

test("Nara opens small, stays floating/nonmodal until full and keeps Camera Photo File mic speaker model and intelligence", () => {
  assert.match(runtime, /data-v257InitialSmall/);
  assert.match(runtime, /button\[data-size="small"\]/);
  assert.match(runtime, /full \? "modal" : "nonmodal"/);
  assert.match(styles, /\.nara-floating-button[\s\S]*position:fixed!important/);
  assert.match(styles, /data-v257-interaction="nonmodal"[\s\S]*pointer-events:none!important/);
  assert.match(styles, /data-v257-size="full"/);
  assert.match(styles, /\.nara-attachment-menu[\s\S]*bottom:calc\(100% \+ 8px\)!important/);
  for (const feature of ["Kamera", "Foto", "File teks", "Tingkat kecerdasan", "Model Nara", "Tutup"]) assert.ok(nara.includes(feature), `missing Nara feature ${feature}`);
  assert.match(nara, /<Mic/);
  assert.match(nara, /SpeakerIcon/);
});

test("Theme Studio preserves 100 themes, eight previews, 26 widgets and detailed modern layout targets", () => {
  const families = [...themeCatalog.matchAll(/\{ id:"[^"]+",name:"[^"]+",category:/g)].length;
  const compositions = [...themeCatalog.matchAll(/\{ id:"(?:prime|dawn|night|coast|atelier)"/g)].length;
  const widgetIds = [...widgets.matchAll(/\{ id: "[^"]+", name:/g)].length;
  assert.equal(families, 20);
  assert.equal(compositions, 5);
  assert.equal(widgetIds, 26);
  for (const preview of ["application", "phone", "mobile", "compact", "tablet", "laptop", "desktop", "computer"]) assert.ok(theme.includes(`id: "${preview}"`), `missing Theme Studio preview ${preview}`);
  for (const area of ["header-left", "header-right", "below-header", "sidebar-left", "before-content", "after-content", "sidebar-right", "footer-left", "footer-right", "footer-wide"]) assert.ok(widgets.includes(`id: "${area}"`), `missing widget area ${area}`);
  assert.match(runtime, /LAYOUT_AREAS/);
  assert.match(runtime, /Widget kiri 4/);
  assert.match(runtime, /Widget kanan 4/);
  assert.match(runtime, /custom-html/);
  assert.match(styles, /\.v257-layout-blueprint/);
});

test("code editor and operational mobile surfaces stay bounded", () => {
  assert.match(styles, /data-studio-v257-family="large"\] \.tn-code-workspace[\s\S]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)!important/);
  assert.match(styles, /data-studio-v257-family="small"\] \.tn-code-preview-pane[\s\S]*order:1!important/);
  assert.match(styles, /data-studio-v257-family="small"\] \.tn-code-pane[\s\S]*order:2!important/);
  assert.match(styles, /\.sv124-free-domain>aside[\s\S]*width:100%!important/);
  assert.match(styles, /writing-mode:horizontal-tb!important/);
  assert.match(styles, /\.ce-tabs/);
  assert.match(styles, /overflow-x:auto!important/);
  assert.match(styles, /data-analytics-chart/);
});

test("v257 does not regress persisted login or introduce destructive storage/session actions", () => {
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});
