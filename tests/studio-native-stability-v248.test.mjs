import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-native-stability-v248.js");
const css = read("src/studio-native-stability-v248.css");
const finalCss = read("src/studio-native-final-v248.css");
const studio = read("src/StudioNext.jsx");
const auth = read("src/lib/supabase.js");
const provider = read("src/auth-provider-gateway-v248.js");
const sessionAuthority = read("src/auth-session-authority-v76.js");
const avatar = read("src/profile-avatar-v248.js");
const widgets = read("src/widget-system.js");
const themes = read("src/theme-catalog.js");
const nara = read("src/NaraAssistant.jsx");
const vite = read("vite.config.js");

const menu = ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"];
const retired = [
  "studio-shell-controller-v147.js",
  "studio-production-v235.js",
  "studio-visual-stability-v241.js",
  "studio-shell-rescue-v242.js",
  "studio-stable-shell-v244.js",
  "studio-sidebar-brand-v246.js",
];

test("v248 makes the native React shell the last Studio interaction authority", () => {
  for (const filename of retired) assert.ok(!entry.includes(`import \"./${filename}\"`), `retired runtime re-enabled: ${filename}`);
  const js = entry.indexOf('import "./studio-native-stability-v248.js"');
  const avatarImport = entry.indexOf('import "./profile-avatar-v248.js"');
  const style = entry.indexOf('import "./studio-native-stability-v248.css"');
  const finalStyle = entry.indexOf('import "./studio-native-final-v248.css"');
  assert.ok(js >= 0 && avatarImport > js && style > avatarImport && finalStyle > style);
  assert.match(runtime, /restoreReactChrome/);
  assert.match(runtime, /v244-legacy-sidebar/);
  assert.match(css, /#ngeblogging-studio-chrome-v244/);
  assert.match(css, /display:none!important/);
  assert.doesNotMatch(vite, /finalizeServiceWorkerV24[1-7]/);
  assert.match(vite, /finalizeServiceWorkerV248/);
});

test("all required sidebar actions stay in React and one n toggles each family", () => {
  for (const label of menu) assert.ok(studio.includes(label), `missing ${label}`);
  for (const mode of ["application", "phone", "mobile", "compact"]) assert.ok(runtime.includes(`"${mode}"`));
  for (const mode of ["tablet", "desktop", "laptop", "computer"]) assert.ok(runtime.includes(`"${mode}"`));
  assert.match(runtime, /#ngeblogging-studio-sidebar \.sn-logo-mark/);
  assert.match(runtime, /sidebarToggle\(\)\?\.click\(\)/);
  assert.match(css, /--v248-sidebar-open:248px/);
  assert.match(css, /--v248-sidebar-rail:70px/);
  assert.match(css, /\.sn-side\.mobile-open/);
  assert.match(css, /\.sn-side-backdrop[\s\S]*pointer-events:none!important/);
  assert.match(finalCss, /data-studio-v248-sidebar="open"[\s\S]*\.sn-sidebar-toggle/);
  assert.match(finalCss, /sn-device-mode-badge-v148/);
});

test("profile, settings, add site, view site and logout are separate explicit actions", () => {
  for (const action of ["profile","settings","add-site","view-site","logout"]) assert.ok(runtime.includes(`data-action=\"${action}\"`));
  assert.match(runtime, /openProfile\(/);
  assert.match(runtime, /studioAccountPaneV248/);
  assert.match(css, /data-studio-account-pane-v248="profile"/);
  assert.match(css, /data-studio-account-pane-v248="settings"/);
  assert.match(avatar, /site-public-media/);
  assert.match(avatar, /squareAvatarBlob/);
  assert.match(avatar, /updateUserProfile/);
  assert.match(avatar, /Unggah avatar/);
  assert.match(finalCss, /sn-profile-avatar-upload-v248/);
});

test("OAuth providers use same-origin auth gateway while sessions remain persistent", () => {
  assert.match(sessionAuthority, /auth-provider-gateway-v248\.js/);
  assert.match(provider, /\/api\/auth-proxy/);
  assert.match(provider, /same-origin-auth-gateway/);
  assert.match(provider, /auth\/v1\/authorize/);
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.match(auth, /flowType:\s*"pkce"/);
  for (const providerName of ["google","github","linkedin_oidc"]) assert.ok(auth.includes(providerName));
});

test("Nara keeps native tools and small medium are non-modal", () => {
  for (const marker of ["<Camera />","<ImageIcon />","<File />","<MicOff />","SpeakerIcon","intelligenceOptions","modelOptions"]) assert.ok(nara.includes(marker), `missing Nara marker ${marker}`);
  assert.match(css, /data-nara-layer-size="small"/);
  assert.match(css, /data-nara-layer-size="medium"/);
  assert.match(css, /pointer-events:none!important/);
  assert.match(css, /\.nara-attachment-menu[\s\S]*bottom:calc\(100% \+ 8px\)!important/);
  assert.match(runtime, /backdrop\.hidden = !full/);
});

test("Theme Studio exposes the ten real layout areas and readable line numbers", () => {
  const areas = ["header-left","header-right","below-header","sidebar-left","before-content","after-content","sidebar-right","footer-left","footer-right","footer-wide"];
  for (const area of areas) assert.ok(widgets.includes(`id: \"${area}\"`), `missing real area ${area}`);
  assert.match(runtime, /LAYOUT_AREAS/);
  assert.match(runtime, /v248-layout-map/);
  assert.match(runtime, /tn-code-gutter-v248/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)!important/);
  assert.match(css, /ui-monospace/);
  assert.match(finalCss, /\.tn-studio[\s\S]*display:block!important/);
  assert.match(finalCss, /\.tn-modal[\s\S]*max-height:calc\(100dvh - 20px\)!important/);
});

test("100 distinct theme architecture and 26 widgets remain intact", () => {
  const families = [...themes.matchAll(/\{ id:"[^"]+",name:"[^"]+",category:/g)].length;
  const compositions = [...themes.matchAll(/\{ id:"(?:prime|dawn|night|coast|atelier)"/g)].length;
  const widgetIds = [...widgets.matchAll(/\{ id: "[^"]+", name:/g)].length;
  assert.equal(families, 20);
  assert.equal(compositions, 5);
  assert.equal(widgetIds, 26);
});

test("small-device geometry blocks overlap without hiding core surfaces", () => {
  for (const selector of [".sn-view-pad",".sv124-domain-page",".tn-studio",".ce-app",".op41-panel"]) assert.ok(css.includes(selector));
  assert.match(css, /overflow-x:clip!important/);
  assert.match(css, /min-width:0!important/);
  assert.match(css, /max-width:100%!important/);
  assert.match(css, /\.op41-donut[\s\S]*clamp\(180px,22vw,260px\)/);
});
