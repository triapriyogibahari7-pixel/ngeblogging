import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v288 loads after the v287 interaction owner", async () => {
  const chain = await read("src/studio-live-visual-v286.js");
  const runtime = await read("src/studio-final-authority-v288.js");
  assert.match(chain, /studio-react-shell-v287\.js/);
  assert.match(chain, /\.then\(\(\) => import\("\.\/studio-final-authority-v288\.js"\)\)/);
  assert.match(runtime, /studio-final-authority-v288-20260805/);
  assert.doesNotMatch(runtime, /stopImmediatePropagation|new MutationObserver|location\.(?:reload|replace)\s*\(/);
});

test("v288 keeps one responsive sidebar visible in both layout families", async () => {
  const css = await read("src/studio-final-authority-v288.css");
  const studio = await read("src/StudioNext.jsx");
  assert.match(css, /data-studio-device-mode="large"/);
  assert.match(css, /data-studio-device-mode="small"/);
  assert.match(css, /--v288-side-open:248px/);
  assert.match(css, /--v288-side-rail:72px/);
  assert.match(css, /collapsed~\.sn-main/);
  assert.match(css, /not\(\.mobile-open\)>\.sn-logo/);
  assert.match(css, /sn-logo-mark strong/);
  assert.match(css, /background:transparent!important/);
  assert.doesNotMatch(css, /backdrop-filter:blur\(/);

  for (const label of [
    "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
    "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
  ]) assert.ok(studio.includes(label), `sidebar must keep ${label}`);
});

test("six responsive modes remain mapped to small and large layout families", async () => {
  const device = await read("src/studio-device-mode-v140.js");
  for (const mode of ["application", "phone", "mobile", "compact", "tablet", "desktop"]) {
    assert.ok(device.includes(`"${mode}"`), `missing responsive mode ${mode}`);
  }
  assert.match(device, /\["application", "phone", "mobile", "compact"\]\.includes\(responsiveMode\)/);
  assert.match(device, /return \"large\"/);
  assert.match(device, /return \"laptop\"/);
  assert.match(device, /return \"computer\"/);
  assert.match(device, /desktopSiteLock/);
});

test("profile stays separate from settings and exposes useful account actions", async () => {
  const profile = await read("src/studio-react-shell-v287.js");
  for (const label of ["Profil", "Ganti avatar", "Tambahkan situs", "Pengaturan", "Nara AI", "Keluar"]) {
    assert.ok(profile.includes(label), `profile menu missing ${label}`);
  }
  assert.match(profile, /requestedMode === "profile"/);
  assert.match(profile, /accountView\("settings"\)/);
});

test("Nara remains viewport fixed, non-modal in small/medium and exposes native tools", async () => {
  const css = await read("src/studio-final-authority-v288.css");
  const nara = await read("src/NaraAssistant.jsx");
  assert.match(css, /\.nara-floating-button\{position:fixed!important/);
  assert.match(css, /data-nara-interaction="nonmodal"/);
  assert.match(css, /pointer-events:none!important/);
  assert.match(css, /\.nara-attachment-menu\{/);
  assert.match(css, /data-nara-size="small"/);
  assert.match(css, /data-nara-size="medium"/);
  for (const label of ["Kamera", "Foto", "File teks", "Nara Mini", "Nara Writer", "Nara Vision", "Nara Max", "Instan", "Sedang", "Tinggi", "Maksimal"]) {
    assert.ok(nara.includes(label), `Nara missing ${label}`);
  }
});

test("Theme Studio keeps real layout map and code/preview geometry", async () => {
  const finalCss = await read("src/studio-final-authority-v288.css");
  const layoutCss = await read("src/studio-theme-layout-v264.css");
  const polish = await read("src/studio-native-polish-v284.js");
  assert.match(finalCss, /tn-layout-map-v264/);
  assert.match(finalCss, /tn-layout-popover-v264/);
  assert.match(finalCss, /grid-template-areas:"code preview"/);
  assert.match(finalCss, /grid-template-areas:"preview" "code"/);
  assert.match(finalCss, /data-max-lines/);
  assert.match(layoutCss, /tn-layout-content-v264/);
  assert.match(layoutCss, /grid-template-rows:repeat\(4/);
  assert.match(layoutCss, /tn-layout-quick-v264/);
  assert.match(polish, /MAX_CODE_LINES = 10000/);
  assert.match(polish, /lineNumberText\(count\)/);
});

test("auth remains persistent and all requested sign-in transports stay wired", async () => {
  const auth = await read("src/lib/supabase.js");
  const modal = await read("src/AuthModal.jsx");
  const callback = await read("src/lib/auth-callback-v162.js");
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  for (const provider of ["google", "github", "linkedin_oidc"]) assert.ok(auth.includes(`"${provider}"`));
  assert.match(modal, /signInWithPassword/);
  assert.match(modal, /signInWithMagicLink/);
  assert.match(callback, /exchangeCodeForSession/);
  assert.doesNotMatch(callback, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
});

test("v288 does not replace production pages with fake completion claims", async () => {
  const runtime = await read("src/studio-final-authority-v288.js");
  const css = await read("src/studio-final-authority-v288.css");
  for (const source of [runtime, css]) {
    assert.doesNotMatch(source, /100% berhasil|900juta|999 pageviews|super canggih/i);
  }
});
