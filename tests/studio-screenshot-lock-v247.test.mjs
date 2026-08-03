import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-sidebar-brand-v246.js");
const css = read("src/studio-screenshot-lock-v247.css");
const auth = read("src/lib/supabase.js");
const studio = read("src/StudioNext.jsx");
const stable = read("src/studio-stable-shell-v244.js");
const nara = read("src/NaraAssistant.jsx");
const themeCatalog = read("src/theme-catalog.js");
const widgets = read("src/widget-system.js");

const menu = ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"];

test("v247 CSS is the last Studio visual authority", () => {
  const v246 = entry.indexOf('import "./studio-sidebar-brand-v246.css"');
  const v247 = entry.indexOf('import "./studio-screenshot-lock-v247.css"');
  assert.ok(v246 >= 0);
  assert.ok(v247 > v246);
});

test("responsive family follows current detector instead of stale historical family", () => {
  assert.match(runtime, /if \(desktopSite\) return "large"/);
  assert.match(runtime, /if \(SMALL\.has\(declared\)\) return "small"/);
  assert.match(runtime, /if \(LARGE\.has\(declared\)\) return "large"/);
  assert.match(runtime, /synchronizeHistoricalState/);
  assert.match(runtime, /html\.dataset\.studioV244Family = mode/);
  assert.match(runtime, /root\.dataset\.sidebar = state/);
});

test("legacy mobile backdrop cannot darken or freeze Studio", () => {
  assert.match(runtime, /neutralizeLegacyBlockingLayers/);
  assert.match(runtime, /document\.body\.classList\.remove\("sn-mobile-sidebar-open"\)/);
  assert.match(css, /\.sn-side-backdrop/);
  assert.match(css, /pointer-events:none!important/);
  assert.match(css, /backdrop-filter:none!important/);
});

test("one n and readable Ngeblogging identity are locked", () => {
  assert.match(css, /data-v246-family="large"[\s\S]*\.v244-mobile-n/);
  assert.match(css, /\.v244-brand-row>strong[\s\S]*font-size:20px!important/);
  assert.match(css, /:is\(\.v244-internal-n,\.v244-mobile-n\)::after\{content:none!important/);
  assert.match(css, /:is\(\.v244-internal-n,\.v244-mobile-n\)>span[\s\S]*color:#fff!important/);
});

test("large pages follow expanded and collapsed sidebar widths", () => {
  assert.match(css, /--v247-open:248px/);
  assert.match(css, /--v247-rail:70px/);
  assert.match(css, /data-studio-v246-sidebar="expanded"[\s\S]*margin-left:var\(--v247-open\)!important/);
  assert.match(css, /data-studio-v246-sidebar="collapsed"[\s\S]*margin-left:var\(--v247-rail\)!important/);
});

test("small drawer is non-shifting and keeps profile visible", () => {
  assert.match(css, /data-v246-family="small"[\s\S]*\.v244-mobile-n/);
  assert.match(css, /data-studio-v246-family="small"[\s\S]*margin-left:0!important/);
  assert.match(css, /\.v244-avatar[\s\S]*visibility:visible!important/);
  assert.match(css, /\.v244-drawer-backdrop[\s\S]*background:transparent!important/);
});

test("all required sidebar actions and separate profile settings logout remain", () => {
  for (const label of menu) assert.ok(studio.includes(label), `missing ${label}`);
  assert.match(stable, /data-account="profile"/);
  assert.match(stable, /data-account="settings"/);
  assert.match(stable, /data-account="logout"/);
});

test("auth remains persistent and provider-ready", () => {
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(auth, /flowType:\s*"pkce"/);
  assert.match(auth, /PRODUCTION_SUPABASE_PUBLISHABLE_KEY_V245/);
  assert.match(auth, /google/);
  assert.match(auth, /linkedin_oidc/);
  assert.match(auth, /signInWithPassword/);
});

test("Nara stays non-modal for small medium and keeps attachment tools", () => {
  assert.match(css, /nara-assistant-layer\[data-v244-mode="nonmodal"\]/);
  assert.match(css, /pointer-events:none!important/);
  assert.match(nara, /<Camera \/>/);
  assert.match(nara, /<ImageIcon \/>/);
  assert.match(nara, /<File \/>/);
  assert.match(nara, /<MicOff \/>/);
  assert.match(nara, /SpeakerIcon/);
  assert.match(nara, /intelligenceOptions/);
  assert.match(nara, /modelOptions/);
});

test("theme and widget architecture are not replaced", () => {
  const families = [...themeCatalog.matchAll(/\{ id:"[^"]+",name:"[^"]+",category:/g)].length;
  const compositions = [...themeCatalog.matchAll(/\{ id:"(?:prime|dawn|night|coast|atelier)"/g)].length;
  assert.equal(families, 20);
  assert.equal(compositions, 5);
  const widgetIds = [...widgets.matchAll(/\{ id: "[^"]+", name:/g)].length;
  assert.equal(widgetIds, 26);
});

test("mobile Domain actions remain readable horizontal controls", () => {
  assert.match(css, /\.sv124-free-domain>aside[\s\S]*grid-template-columns:1fr!important/);
  assert.match(css, /\.sv124-free-domain>aside :is\(button,a\)[\s\S]*white-space:nowrap!important/);
  assert.match(css, /\.sv124-domain-register form>button[\s\S]*width:100%!important/);
});
