import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-source-stability-v252.js");
const css = read("src/studio-source-stability-v252.css");
const studio = read("src/StudioNext.jsx");
const auth = read("src/lib/supabase.js");
const authReadiness = read("src/auth-readiness-bridge.js");
const nara = read("src/NaraAssistant.jsx");
const analytics = read("src/studio-analytics-v41.js");
const recovery = read("src/studio-recovery-v150.js");
const themeCatalog = read("src/theme-catalog.js");
const widgetSystem = read("src/widget-system.js");
const activation = read("scripts/activate-studio-native-v250.mjs");

const requiredMenu = ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"];

test("v252 loads after v251 and build activation preserves the order", () => {
  const rescueCss = entry.indexOf('import "./studio-sidebar-rescue-v251.css";');
  const runtimeIndex = entry.indexOf('import "./studio-source-stability-v252.js";');
  const cssIndex = entry.indexOf('import "./studio-source-stability-v252.css";');
  assert.ok(rescueCss >= 0);
  assert.ok(runtimeIndex > rescueCss);
  assert.ok(cssIndex > runtimeIndex);
  assert.match(activation, /studio-source-stability-v252\.js/);
  assert.match(activation, /studio-source-stability-v252\.css/);
  assert.match(activation, /V252_SOURCE_RUNTIME_ORDER_INVALID/);
  assert.match(activation, /V252_SOURCE_CSS_ORDER_INVALID/);
});

test("one native n delegates to React state without destructive navigation", () => {
  assert.match(runtime, /window\.addEventListener\("click"[\s\S]*activateNativeLogo/);
  assert.match(runtime, /#ngeblogging-studio-sidebar \.sn-logo-mark/);
  assert.match(runtime, /reactToggle\(\)\?\.click\(\)/);
  assert.match(runtime, /stopImmediatePropagation/);
  assert.doesNotMatch(runtime, /location\.reload|location\.assign|localStorage\.clear|sessionStorage\.clear|signOut\(/);
  assert.match(css, /data-studio-v252-family="large"/);
  assert.match(css, /data-studio-v252-family="small"/);
  assert.match(css, /data-studio-v252-sidebar="expanded"/);
  assert.match(css, /data-studio-v252-sidebar="collapsed"/);
  assert.match(css, /data-studio-v252-sidebar="open"/);
  assert.match(css, /data-studio-v252-sidebar="closed"/);
});

test("all sidebar labels remain and mobile backdrop cannot blur the application", () => {
  for (const label of requiredMenu) assert.ok(studio.includes(label), `missing sidebar label ${label}`);
  assert.match(css, /\.sn-side>nav[\s\S]*gap:2px!important/);
  assert.match(css, /\.sn-account-footer[\s\S]*margin-top:auto!important/);
  assert.match(css, /\.sn-side-backdrop[\s\S]*background:transparent!important/);
  assert.match(css, /backdrop-filter:none!important/);
  assert.match(css, /z-index:4100!important/);
  assert.match(css, /\.sn-side[\s\S]*z-index:4200!important/);
});

test("profile remains visible while Profile and Settings stay separate in the active v250 menu", () => {
  const authority = read("src/studio-native-authority-v250.js");
  assert.match(authority, /data-action="profile"/);
  assert.match(authority, /data-action="settings"/);
  assert.match(authority, /data-action="add-site"/);
  assert.match(authority, /data-action="view-site"/);
  assert.match(authority, /data-action="logout"/);
  assert.match(authority, /if \(action === "profile"\) return openProfile/);
  assert.match(authority, /if \(action === "settings"\) return clickSidebar\("Pengaturan"\)/);
  assert.match(css, /\.sn-avatar[\s\S]*visibility:visible!important[\s\S]*pointer-events:auto!important/);
});

test("auth remains persistent and health checks cannot disable login methods", () => {
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(auth, /flowType:\s*"pkce"/);
  assert.match(auth, /new Set\(\["google", "github", "linkedin_oidc"\]\)/);
  assert.match(authReadiness, /Opsi login tetap aktif/);
  assert.match(authReadiness, /auth-provider-gateway-v250\.js/);
  assert.doesNotMatch(authReadiness, /\.disabled\s*=\s*true|hidden\s*=\s*true/);
});

test("Nara small and medium stay non-modal and native tools remain present", () => {
  assert.match(runtime, /data\.v252Interaction|dataset\.v252Interaction/);
  assert.match(runtime, /full \? "modal" : "nonmodal"/);
  assert.match(css, /nara-assistant-layer\[data-v252-interaction="nonmodal"\][\s\S]*pointer-events:none!important/);
  assert.match(css, /data-v252-size="small"/);
  assert.match(css, /data-v252-size="medium"/);
  assert.match(css, /data-v252-size="full"/);
  assert.match(nara, /<Camera \/>/);
  assert.match(nara, /<ImageIcon \/>/);
  assert.match(nara, /<File \/>/);
  assert.match(nara, /<MicOff \/>/);
  assert.match(nara, /SpeakerIcon/);
  assert.match(nara, /intelligenceOptions/);
  assert.match(nara, /modelOptions/);
});

test("Theme code, Domain and mobile editor remain bounded by v252", () => {
  assert.match(css, /\.tn-code-workspace[\s\S]*overflow:hidden!important/);
  assert.match(css, /data-studio-v252-family="large"\] \.tn-code-workspace[\s\S]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(css, /data-studio-v252-family="small"\] \.tn-code-workspace[\s\S]*grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(css, /\.v250-layout-map/);
  assert.match(css, /\.sv124-free-domain>aside[\s\S]*grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(css, /\.ce-actions[\s\S]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(css, /\.ce-tabs,.ce-ribbon[\s\S]*overflow-x:auto!important/);
});

test("real analytics recovery remains enabled and simulation is explicitly labeled", () => {
  assert.match(recovery, /loadAnalytics\(view, 30, false\)/);
  assert.match(analytics, /get_site_analytics_dashboard/);
  assert.match(analytics, /7 hari/);
  assert.match(analytics, /30 hari/);
  assert.match(analytics, /90 hari/);
  assert.match(analytics, /SIMULASI TAMPILAN — BUKAN DATA PRODUKSI/);
  assert.match(analytics, /Manusia dan bot/);
  assert.match(analytics, /Distribusi perangkat/);
  assert.match(analytics, /Referrer teratas/);
  assert.match(analytics, /Lokasi agregat/);
});

test("100-theme and 26-widget architecture remains intact", () => {
  const families = [...themeCatalog.matchAll(/\{ id:"[^"]+",name:"[^"]+",category:/g)].length;
  const compositions = [...themeCatalog.matchAll(/\{ id:"(?:prime|dawn|night|coast|atelier)"/g)].length;
  assert.equal(families, 20);
  assert.equal(compositions, 5);
  const widgetIds = [...widgetSystem.matchAll(/\{ id: "[^"]+", name:/g)].length;
  assert.equal(widgetIds, 26);
  assert.match(widgetSystem, /id: "custom-html"/);
});
