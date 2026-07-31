import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const css = read("src/mobile-interaction-v174.css");
const runtime = read("src/mobile-interaction-v174.js");
const runner = read("scripts/run-patch-mobile-interaction-v174.mjs");
const main = read("src/main.jsx");
const studio = read("src/StudioNext.jsx");
const nara = read("src/NaraAssistant.jsx");
const device = read("src/studio-device-mode-v140.js");
const serviceWorker = read("public/sw.js");
const visual = read("public/studio-viewport-audit-v174.html");
const release = JSON.parse(read("public/release-v174.json"));
const packageJson = JSON.parse(read("package.json"));

const AUTHORITY = "mobile-interaction-v174-20260731";
const VIEWPORTS = [
  "320,568","360,640","375,667","390,844","412,915","430,932",
  "600,960","768,1024","820,1180","1024,768","1280,720","1366,768","1440,900","1920,1080",
];

test("drawer is above the backdrop and remains interactive", () => {
  for (const marker of [
    "--v174-drawer-z:2147483000", "--v174-backdrop-z:2147482000",
    "z-index:var(--v174-drawer-z)!important", "z-index:var(--v174-backdrop-z)!important",
    ".sn-side.mobile-open", "pointer-events:auto!important", "visibility:visible!important",
    "grid-template-rows:auto auto minmax(0,1fr) auto!important",
    "justify-content:flex-start!important", "touch-action:manipulation!important",
  ]) assert.ok(css.includes(marker), `drawer contract missing ${marker}`);
  for (const marker of [
    "sidebar.toggleAttribute(\"inert\", !open)", "main.toggleAttribute(\"inert\", open)",
    "sn-mobile-sidebar-open-v174", "mobileDrawerOpenV174", "aria-hidden",
  ]) assert.ok(runtime.includes(marker), `drawer runtime missing ${marker}`);
});

test("mobile logo, profile and media scale are bounded", () => {
  for (const marker of [
    ":is(.sn-logo-mark,.sn-mobile-menu-mark)::before", "content:none!important",
    "place-items:center!important", "transform:translateY(-1px)!important",
    ".sn-profile-dropdown", "width:min(280px,calc(100vw - 24px))!important",
    ".sn-media-library>.sn-page-title h1", ".sn-upload-zone h3",
    "font-size:22px!important", "zoom:1!important",
  ]) assert.ok(css.includes(marker), `bounded UI marker missing ${marker}`);
});

test("Nara launcher cannot blink, overflow, or block the website in small and medium modes", () => {
  for (const marker of [
    ".nara-floating-button", "width:54px!important", "height:54px!important",
    "animation:none!important", "contain:layout paint!important",
    '.nara-assistant-layer:not([data-nara-layer-size="full"])',
    "pointer-events:none!important", ".nara-assistant-shell[data-nara-size=\"small\"]",
    ".nara-assistant-shell[data-nara-size=\"medium\"]",
    '.nara-assistant-layer[data-nara-layer-size="full"]',
  ]) assert.ok(css.includes(marker), `Nara CSS contract missing ${marker}`);
  for (const marker of [
    "layer.setAttribute(\"aria-modal\", String(full))", "nara-nonmodal-v174",
    "nara-fullscreen-open-v148", "backdrop?.setAttribute(\"aria-hidden\", \"true\")",
  ]) assert.ok(runtime.includes(marker), `Nara runtime contract missing ${marker}`);
  for (const capability of ["Nara Mini","Nara Writer","Nara Vision","Nara Max","Instan","Sedang","Tinggi","Maksimal","cameraInput","imageInput","fileInput","startVoice","SpeakerIcon"]) {
    assert.ok(nara.includes(capability), `Nara capability removed: ${capability}`);
  }
});

test("six responsive families, complete sidebar and login contracts remain protected", () => {
  for (const mode of ["application","phone","mobile","compact","tablet","desktop","laptop","computer"]) {
    assert.ok(device.includes(`\"${mode}\"`), `responsive mode removed: ${mode}`);
  }
  for (const label of ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"]) {
    assert.ok(studio.includes(`>${label}<`), `sidebar entry removed: ${label}`);
  }
  assert.ok(main.includes('import "./mobile-public-v171.css";'));
  assert.ok(main.includes('import "./mobile-interaction-v174.js";'));
  assert.ok(main.indexOf('mobile-interaction-v174.js') > main.indexOf('mobile-public-v171.css'));
});

test("visual audit contains all target viewports and makes no production scale claim", () => {
  for (const viewport of VIEWPORTS) assert.ok(visual.includes(`[${viewport}]`), `visual audit missing ${viewport}`);
  assert.ok(visual.includes("/studio?ui_audit=v174"));
  assert.ok(visual.includes("bukan klaim kapasitas 900 juta miliar pengguna"));
  assert.equal(release.status, "ok");
  assert.equal(release.authority, AUTHORITY);
  assert.equal(release.viewportAudit, "/studio-viewport-audit-v174.html");
  for (const value of Object.values(release.fixes)) assert.equal(value, true);
});

test("v174 patch is idempotent, rotates cache, and keeps auth surfaces out of forced reload", () => {
  for (const marker of [
    "patchEntry()", "patchServiceWorker()", "verify()", "patch applied exactly once and verified",
    "ngeblogging-app-v174-mobile-interaction-20260731", "mobile-interaction-cache-v174",
    "MOBILE_PUBLIC_COMPAT_VERSION", "mobilePublicCompatVersion",
  ]) assert.ok(runner.includes(marker) || serviceWorker.includes(marker), `patch/cache marker missing ${marker}`);
  for (const authMarker of ['url.pathname === "/login"','url.pathname === "/signup"','url.pathname.startsWith("/auth/")']) {
    assert.ok(serviceWorker.includes(authMarker), `auth cache protection missing ${authMarker}`);
  }
  for (const command of [packageJson.scripts.predev, packageJson.scripts.test, packageJson.scripts["test:production"], packageJson.scripts["verify:v174"]]) {
    assert.ok(command.includes("run-patch-mobile-public-v171.mjs"), `v171 prerequisite missing from ${command}`);
    assert.ok(command.includes("run-patch-mobile-interaction-v174.mjs"), `v174 patch missing from ${command}`);
  }
  assert.ok(packageJson.scripts["test:production"].includes("tests/mobile-interaction-v174.test.mjs"));
});
