import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const supabase = read("src/lib/supabase.js");
const callback = read("src/auth-callback-authority-v107.js");
const authGateway = read("server/auth-gateway-v108.mjs");
const dataGateway = read("server/data-gateway-v110.mjs");
const worker = read("cloudflare/worker-v67.mjs");
const runtime = read("src/studio-stability-v255.js");
const css = read("src/studio-stability-v255.css");
const studio = read("src/StudioNext.jsx");
const themeCatalog = read("src/theme-catalog.js");
const widgetSystem = read("src/widget-system.js");
const nara = read("src/NaraAssistant.jsx");

const requiredMenu = [
  "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
  "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
];

test("v255 is the final Studio JS/CSS authority after v253", () => {
  const v253Css = entry.indexOf('import "./studio-shell-nara-v253.css";');
  const v255Js = entry.indexOf('import "./studio-stability-v255.js";');
  const v255Css = entry.indexOf('import "./studio-stability-v255.css";');
  assert.ok(v253Css >= 0);
  assert.ok(v255Js > v253Css);
  assert.ok(v255Css > v255Js);
  assert.match(runtime, /studio-stability-v255-20260804/);
  assert.match(css, /data-studio-stability-v255/);
});

test("production auth gateway has a public-client fallback instead of returning not-ready only because Worker env is missing", () => {
  assert.match(authGateway, /PRODUCTION_SUPABASE_URL/);
  assert.match(authGateway, /PRODUCTION_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(authGateway, /resolveAuthGatewayConfig/);
  assert.match(authGateway, /production-public-fallback/);
  assert.match(authGateway, /x-ngeblogging-auth-config/);
  assert.doesNotMatch(authGateway, /service_role|SUPABASE_SERVICE_ROLE/);
});

test("production data gateway uses the same safe fallback and exposes real readiness", () => {
  assert.match(dataGateway, /PRODUCTION_SUPABASE_URL/);
  assert.match(dataGateway, /PRODUCTION_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(dataGateway, /resolveDataGatewayConfig/);
  assert.match(dataGateway, /production-public-fallback/);
  assert.match(dataGateway, /x-ngeblogging-data-config/);
  assert.doesNotMatch(dataGateway, /service_role|SUPABASE_SERVICE_ROLE/);
  assert.match(worker, /authGatewayConfigured\(env, requestUrl\)/);
  assert.match(worker, /dataGatewayConfigured\(env, requestUrl\)/);
  assert.match(worker, /authGatewayConfigSource/);
  assert.match(worker, /dataGatewayConfigSource/);
});

test("browser auth keeps persistent sessions and falls back from unhealthy or mismatched gateways", () => {
  assert.match(supabase, /persistSession:\s*true/);
  assert.match(supabase, /autoRefreshToken:\s*true/);
  assert.match(supabase, /AUTH_GATEWAY_DEADLINE_MS = 8_000/);
  assert.match(supabase, /response\.status >= 500/);
  assert.match(supabase, /gatewayResponseHasAuthority/);
  assert.match(supabase, /direct-supabase-fallback/);
  assert.match(supabase, /signOut\(\{ scope: "local" \}\)/);
});

test("password recovery transport shares the production public client config", () => {
  assert.match(callback, /PRODUCTION_SUPABASE_URL_V245/);
  assert.match(callback, /PRODUCTION_SUPABASE_PUBLISHABLE_KEY_V245/);
  assert.match(callback, /officialProductionHost/);
  assert.match(callback, /auth-callback-authority-v255-20260804/);
  assert.match(callback, /authPasswordTransportV255/);
});

test("all mandatory sidebar items remain and one n geometry is centered in both families", () => {
  for (const label of requiredMenu) assert.ok(studio.includes(label), `missing ${label}`);
  assert.match(css, /data-studio-v253-family="large"\] \.sn-side[\s\S]*display:flex!important/);
  assert.match(css, /data-studio-v253-sidebar="expanded"\] \.sn-main[\s\S]*margin-left:var\(--v255-side-open\)/);
  assert.match(css, /data-studio-v253-sidebar="collapsed"\] \.sn-main[\s\S]*margin-left:var\(--v255-side-rail\)/);
  assert.match(css, /\.sn-logo-mark strong[\s\S]*place-items:center!important/);
  assert.match(css, /\.sn-mobile-menu-mark strong[\s\S]*place-items:center!important/);
  assert.match(css, /\.sn-sidebar-edge-toggle-v147/);
  assert.match(runtime, /setAttribute\("aria-label", label\)/);
});

test("mobile drawer stays clickable without dark blur and desktop profile remains visible", () => {
  assert.match(css, /data-studio-v253-family="small"\] \.sn-side\.mobile-open[\s\S]*pointer-events:auto!important/);
  assert.match(css, /\.sn-side-backdrop[\s\S]*background:transparent!important[\s\S]*backdrop-filter:none!important/);
  assert.match(css, /data-studio-v253-family="small"\] \.sn-side-backdrop[\s\S]*inset:0 0 0 var\(--v255-drawer\)!important/);
  assert.match(css, /data-studio-v253-family="large"\] \.sn-avatar[\s\S]*display:grid!important[\s\S]*pointer-events:auto!important/);
  assert.match(runtime, /avatar\.setAttribute\("aria-label", "Buka menu profil"\)/);
});

test("Nara is fixed, non-blinking, non-modal for small/medium and keeps attachment tools", () => {
  assert.match(css, /\.nara-floating-button[\s\S]*position:fixed!important[\s\S]*animation:none!important/);
  assert.match(css, /data-v253-interaction="nonmodal"[\s\S]*pointer-events:none!important/);
  assert.match(css, /data-v253-interaction="nonmodal"[\s\S]*background:transparent!important/);
  assert.match(css, /\.nara-attachment-menu[\s\S]*position:absolute!important[\s\S]*z-index:9300!important/);
  assert.match(nara, /<Camera \/>[\s\S]*<b>Kamera<\/b>/);
  assert.match(nara, /<ImageIcon \/>[\s\S]*<b>Foto<\/b>/);
  assert.match(nara, /<File \/>[\s\S]*<b>File teks<\/b>/);
  assert.match(nara, /intelligenceOptions/);
  assert.match(nara, /modelOptions/);
  assert.match(nara, /SpeakerIcon/);
});

test("Theme Studio remains 100 themes, 26 widgets, responsive code/preview and a centered layout map", () => {
  const families = [...themeCatalog.matchAll(/\{ id:"[^"]+",name:"[^"]+",category:/g)].length;
  const compositions = [...themeCatalog.matchAll(/\{ id:"(?:prime|dawn|night|coast|atelier)"/g)].length;
  const widgetIds = [...widgetSystem.matchAll(/\{ id: "[^"]+", name:/g)].length;
  assert.equal(families, 20);
  assert.equal(compositions, 5);
  assert.equal(widgetIds, 26);
  assert.match(css, /\.tn-code-workspace[\s\S]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)!important/);
  assert.match(css, /data-studio-v253-family="small"\] \.tn-code-workspace[\s\S]*grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(css, /\.v250-layout-map[\s\S]*margin:18px auto!important/);
  assert.match(widgetSystem, /id: "custom-html"/);
});

test("operational surfaces are protected from horizontal overflow and mobile Domain buttons stay readable", () => {
  assert.match(css, /overflow-x:clip!important/);
  assert.match(css, /\.sv124-domain-page[\s\S]*overflow:hidden!important/);
  assert.match(css, /\.sv124-page-title>button[\s\S]*width:100%!important/);
  assert.match(css, /\.op41-table-wrap[\s\S]*overflow-x:auto!important/);
  assert.match(runtime, /min-width/);
  assert.match(runtime, /max-width/);
});
