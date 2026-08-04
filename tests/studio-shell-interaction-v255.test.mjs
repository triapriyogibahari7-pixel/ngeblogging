import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const studio = readFileSync(new URL("../src/Studio.jsx", import.meta.url), "utf8");
const runtime = readFileSync(new URL("../src/studio-shell-interaction-v255.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/studio-shell-interaction-v255.css", import.meta.url), "utf8");
const nara = readFileSync(new URL("../src/NaraAssistant.jsx", import.meta.url), "utf8");
const auth = readFileSync(new URL("../src/lib/supabase.js", import.meta.url), "utf8");
const authGateway = readFileSync(new URL("../server/auth-gateway-v108.mjs", import.meta.url), "utf8");
const worker = readFileSync(new URL("../cloudflare/worker-v67.mjs", import.meta.url), "utf8");
const theme = readFileSync(new URL("../src/ThemeStudio.jsx", import.meta.url), "utf8");

const requiredMenus = ["Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik", "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar"];

test("v255 is the last active Studio shell authority", () => {
  assert.match(studio, /studio-shell-nara-v253\.css/);
  assert.match(studio, /studio-shell-interaction-v255\.js/);
  assert.match(studio, /studio-shell-interaction-v255\.css/);
  assert.ok(studio.indexOf("studio-shell-interaction-v255.css") > studio.indexOf("studio-shell-nara-v253.css"));
});

test("single internal n delegates to React sidebar ownership", () => {
  assert.match(runtime, /#ngeblogging-studio-sidebar \.sn-logo-mark/);
  assert.match(runtime, /toggleThroughReact/);
  assert.match(runtime, /\.sn-shell \.sn-sidebar-toggle/);
  assert.match(runtime, /stopImmediatePropagation/);
  assert.match(runtime, /window\.visualViewport/);
  assert.match(styles, /data-studio-v255-family="large"/);
  assert.match(styles, /data-studio-v255-family="small"/);
  assert.match(styles, /sn-sidebar-toggle\{display:none!important/);
  assert.match(styles, /sn-side-close/);
});

test("profile surface is bounded and exposes separate profile/settings plus site actions", () => {
  for (const action of ["profile", "settings", "add-site", "view-site", "logout"]) assert.ok(runtime.includes(action));
  assert.match(runtime, /studioAccountViewV189 = action/);
  assert.match(styles, /data-studio-account-view-v189="profile"/);
  assert.match(styles, /sn-profile-menu-v150/);
});

test("Nara stays floating, non-modal in small/medium, and attachment menu opens upward", () => {
  assert.match(styles, /\.nara-floating-button\{/);
  assert.match(styles, /position:fixed!important/);
  assert.match(styles, /data-v255-interaction="nonmodal"/);
  assert.match(styles, /pointer-events:none!important/);
  assert.match(styles, /data-v255-size="full"/);
  assert.match(styles, /\.nara-attachment-menu\{/);
  assert.match(styles, /bottom:calc\(100% \+ 8px\)!important/);
  for (const feature of ["Kamera", "Foto", "File teks", "Tingkat kecerdasan", "Model Nara", "Tutup"]) assert.ok(nara.includes(feature));
});

test("Theme Studio retains 100 themes, widgets, eight previews, code and preview panes", () => {
  assert.match(theme, /THEME_COUNT/);
  assert.match(theme, /WIDGET_COUNT/);
  for (const device of ["application", "phone", "mobile", "compact", "tablet", "laptop", "desktop", "computer"]) assert.ok(theme.includes(`id: "${device}"`));
  assert.match(theme, /tn-code-pane/);
  assert.match(theme, /tn-code-preview-pane/);
  assert.match(theme, /HTML/);
  assert.match(theme, /CSS/);
  assert.match(theme, /JavaScript/);
  assert.match(styles, /grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)!important/);
});

test("auth persistence and provider routes remain intact", () => {
  assert.match(auth, /persistSession: true/);
  assert.match(auth, /autoRefreshToken: true/);
  assert.match(auth, /flowType: "pkce"/);
  for (const provider of ["google", "github", "linkedin_oidc"]) assert.ok(auth.includes(provider));
  assert.match(auth, /signInWithPassword/);
  assert.match(auth, /signInWithOtp/);
});

test("official-host OAuth gateway no longer depends only on Worker env vars", () => {
  assert.match(authGateway, /AUTH_GATEWAY_PUBLIC_FALLBACK_RELEASE/);
  assert.match(authGateway, /PRODUCTION_SUPABASE_URL/);
  assert.match(authGateway, /PRODUCTION_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(authGateway, /production-public-fallback/);
  assert.match(authGateway, /officialNgebloggingHost/);
  assert.doesNotMatch(authGateway, /service[_-]?role/i);
  assert.match(worker, /resolveAuthGatewayConfig/);
  assert.match(worker, /authConfigSource/);
  assert.match(worker, /same-origin-gateway-public-fallback/);
});

test("menu contract remains complete in React source", () => {
  const source = readFileSync(new URL("../src/StudioNext.jsx", import.meta.url), "utf8");
  for (const label of requiredMenus) assert.ok(source.includes(label), `missing Studio menu: ${label}`);
});
