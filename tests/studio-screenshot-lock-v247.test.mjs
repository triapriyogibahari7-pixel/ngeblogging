import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const legacyCss = read("src/studio-screenshot-lock-v247.css");
const v248 = read("src/studio-regression-guard-v248.js");
const css = read("src/studio-regression-guard-v248.css");
const auth = read("src/lib/supabase.js");
const studio = read("src/StudioNext.jsx");
const nara = read("src/NaraAssistant.jsx");
const themeCatalog = read("src/theme-catalog.js");
const widgets = read("src/widget-system.js");

const menu = ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"];

test("v247 is preserved as backup but v248 is the active final guard", () => {
  assert.match(legacyCss, /Screenshot lock v247/);
  assert.doesNotMatch(entry, /studio-screenshot-lock-v247\.css/);
  assert.ok(entry.indexOf("studio-regression-guard-v248.js") > entry.indexOf("studio-shell-rescue-v242.js"));
  assert.match(v248, /studio-regression-guard-v248-20260803/);
});

test("v248 blocks second chrome and legacy darkening without freezing the real page", () => {
  assert.match(v248, /removeConflictingChrome/);
  assert.match(v248, /ngeblogging-studio-chrome-v244/);
  assert.match(v248, /removeAttribute\("inert"\)/);
  assert.match(css, /\.sn-side-backdrop[\s\S]*backdrop-filter:none!important/);
  assert.match(css, /background:transparent!important/);
});

test("single n identity, profile and responsive sidebar are source-owned", () => {
  assert.match(css, /\.sn-logo-mark[\s\S]*background:linear-gradient/);
  assert.match(css, /\.sn-logo-mark[\s\S]*color:#fff!important/);
  assert.match(css, /data-v248-family="large"/);
  assert.match(css, /data-v248-family="small"/);
  assert.match(css, /\.sn-avatar[\s\S]*visibility:visible!important/);
});

test("all sidebar actions remain mounted in React", () => {
  for (const label of menu) assert.ok(studio.includes(label), `missing ${label}`);
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

test("Nara stays non-modal for small/medium and retains native tools", () => {
  assert.match(css, /data-nara-interaction="small"/);
  assert.match(css, /data-nara-interaction="medium"/);
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
  assert.match(css, /\.sv124-free-domain>aside[\s\S]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(css, /\.sv124-free-domain>aside :is\(a,button\)[\s\S]*white-space:nowrap!important/);
  assert.match(css, /\.sv124-domain-register form>button[\s\S]*width:100%!important/);
});
