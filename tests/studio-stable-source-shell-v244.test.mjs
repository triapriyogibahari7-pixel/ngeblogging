import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-stable-shell-v244.js");
const css = read("src/studio-stable-shell-v244-final.css");
const studio = read("src/StudioNext.jsx");
const auth = read("src/lib/supabase.js");
const nara = read("src/NaraAssistant.jsx");
const release = read("public/release-v244.json");
const vite = read("vite.config.js");

const RELEASE = "studio-stable-source-shell-v244-20260803";

test("v244 preempts legacy interaction runtimes and owns final CSS", () => {
  const early = entry.indexOf('import "./studio-stable-shell-v244.js"');
  const historical = entry.indexOf('import "./studio-style-authority-v144.js"');
  const rescue = entry.indexOf('import "./studio-shell-rescue-v242.js"');
  const finalCss = entry.indexOf('import "./studio-stable-shell-v244-final.css"');
  assert.ok(early >= 0 && early < historical, "v244 capture authority must register before historical listeners");
  assert.ok(finalCss > rescue, "v244 final CSS must load after v242 rescue CSS/runtime");
  assert.match(vite, /finalizeServiceWorkerV244/);
});

test("v244 keeps one independent chrome with complete navigation and separate profile/settings", () => {
  for (const marker of [
    RELEASE,
    "ngeblogging-studio-chrome-v244",
    "ngeblogging-sidebar-state-v244",
    "v244-mobile-n",
    "v244-internal-n",
    "v244-profile-menu",
    "v244-legacy-sidebar",
    'data-account="profile"',
    'data-account="settings"',
    'data-account="add-site"',
    'data-account="view-site"',
    'data-account="logout"',
  ]) assert.ok(runtime.includes(marker), `missing v244 runtime marker: ${marker}`);

  for (const label of ["Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik", "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar"]) {
    assert.ok(studio.includes(label), `React action must remain mounted: ${label}`);
    assert.ok(runtime.includes(label), `v244 visible chrome must expose: ${label}`);
  }
});

test("v244 preserves six-mode intent without desktop scaling the real page", () => {
  for (const marker of [
    'new Set(["application", "phone", "mobile", "compact"])',
    'return "large"',
    'data-studio-v244-family="large"',
    'data-studio-v244-family="small"',
    "--v244-open:248px",
    "--v244-rail:70px",
    "zoom:1!important",
    "width:min(78vw,328px)",
    "background:transparent",
  ]) assert.ok(runtime.includes(marker) || css.includes(marker), `missing responsive contract: ${marker}`);
});

test("Nara small/medium is non-modal and attachment plus reaches real native inputs", () => {
  for (const marker of ["openNaraAttachments", "Kamera", "Foto", "File", "stopImmediatePropagation", "naraInput"])
    assert.ok(runtime.includes(marker), `missing Nara v244 marker: ${marker}`);
  for (const marker of ['data-v244-mode="nonmodal"', "pointer-events:none!important", "#ngeblogging-nara-attachments-v244", ".nara-composer-tools"])
    assert.ok(css.includes(marker), `missing Nara CSS contract: ${marker}`);
  for (const marker of ["cameraInput", "imageInput", "fileInput", "capture=\"environment\"", "nara-select intelligence", "nara-select model"])
    assert.ok(nara.includes(marker), `real Nara React control missing: ${marker}`);
});

test("auth/session remains persistent and v244 adds no destructive session action", () => {
  for (const marker of ['flowType: "pkce"', "persistSession: true", "autoRefreshToken: true"])
    assert.ok(auth.includes(marker), `auth contract missing: ${marker}`);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|supabase\.auth\.signOut\s*\(/);
  assert.match(release, new RegExp(RELEASE));
  assert.match(release, /oauthEndToEndRequiresRealProviderSession/);
});
