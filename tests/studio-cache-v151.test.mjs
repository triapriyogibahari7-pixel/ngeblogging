import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const studioEntry = read("src/Studio.jsx");
const studio = read("src/StudioNext.jsx");
const device = read("src/studio-device-mode-v140.js");
const theme = read("src/ThemeStudio.jsx");
const nara = read("src/NaraAssistant.jsx");
const favicon = read("public/favicon.svg");
const worker = read("public/sw.js");
const pwa = read("src/pwa-runtime.js");
const production = JSON.parse(read("wrangler.production.jsonc"));

const menu = [
  "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
  "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
];
const families = ["application", "phone", "mobile", "compact", "tablet", "desktop"];
const previews = ["application", "phone", "mobile", "compact", "tablet", "laptop", "desktop", "computer"];

test("Studio v150 remains the active UI and all pages stay present", () => {
  assert.match(studioEntry, /studio-recovery-v150\.js/);
  assert.match(studioEntry, /studio-recovery-v150\.css/);
  for (const label of menu) assert.ok(studio.includes(`>${label}<`), `missing ${label}`);
  for (const route of ["home", "posts", "pages", "themes", "media", "analytics", "members", "comments", "domain", "api-keys", "settings"]) {
    assert.ok(studio.includes(`view === "${route}"`), `missing ${route}`);
  }
});

test("six responsive families and laptop-computer variants remain available", () => {
  for (const family of families) assert.ok(device.includes(`"${family}"`), `missing ${family}`);
  for (const variant of ["laptop", "computer"]) assert.ok(device.includes(`"${variant}"`), `missing ${variant}`);
  assert.match(device, /interactive-widget=resizes-content/);
});

test("Theme Studio keeps eight previews, layout map, widgets, HTML and live preview", () => {
  for (const preview of previews) assert.match(theme, new RegExp(`id: \\"${preview}\\"`));
  for (const marker of ["function LayoutMap", "WIDGET TERPILIH", "<Check/>", "tn-code-preview-pane", "PREVIEW LANGSUNG", "publishThemeDraft", "restoreThemeVersion"]) {
    assert.ok(theme.includes(marker), `missing ${marker}`);
  }
});

test("Nara keeps native small medium full, attachments, microphone, speaker, models and intelligence", () => {
  for (const marker of [
    "cameraInput", "imageInput", "fileInput", "startVoice", "SpeakerIcon",
    "modelOptions", "intelligenceOptions", "nara-native-size-controls-v149",
    "Instan", "Sedang", "Tinggi", "small", "medium", "full",
  ]) assert.ok(nara.includes(marker), `missing ${marker}`);
});

test("n branding remains dot-free", () => {
  assert.match(favicon, /Ikon huruf n untuk Ngeblogging/);
  assert.doesNotMatch(favicon, /<circle/);
});

test("v151 cache and PWA authority replace v145 without interrupting auth", () => {
  for (const marker of [
    "ngeblogging-app-v151-studio-recovery-20260729",
    "ngeblogging-app-v145-studio-mobile-cache-20260729",
    "single-react-recovery-v151",
    "studio-recovery-v150",
    "studio-recovery-cache-v151",
    "function isAuthSurface",
    "refreshStaleWindow",
    "service-worker-activated-studio-recovery-v151",
  ]) assert.ok(worker.includes(marker), `worker missing ${marker}`);
  for (const route of ["/login", "/signup", "/signin"]) assert.ok(worker.includes(route));

  for (const marker of [
    "ngeblogging-pwa-v151-20260729", "ngeblogging-pwa-controller-v151",
    "pwa-v151-studio-recovery", "responsiveFamily", "dataset.deviceFamily",
    "authSurface", "navigator.serviceWorker.register",
  ]) assert.ok(pwa.includes(marker), `PWA missing ${marker}`);
  assert.equal(production.vars.APP_RELEASE, "2026.07.29-studio-recovery-v151");
  assert.equal(production.vars.UI_AUTHORITY_RELEASE, "2026.07.29-studio-recovery-v151");
});
