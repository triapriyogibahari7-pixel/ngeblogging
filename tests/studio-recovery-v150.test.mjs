import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const studioEntry = readFileSync("src/Studio.jsx", "utf8");
const recovery = readFileSync("src/studio-recovery-v150.js", "utf8");
const recoveryCss = readFileSync("src/studio-recovery-v150.css", "utf8");
const analytics = readFileSync("src/studio-analytics-v41.js", "utf8");
const studio = readFileSync("src/StudioNext.jsx", "utf8");
const theme = readFileSync("src/ThemeStudio.jsx", "utf8");
const nara = readFileSync("src/NaraAssistant.jsx", "utf8");
const supabase = readFileSync("src/lib/supabase.js", "utf8");
const authSession = readFileSync("src/lib/auth-session-v76.js", "utf8");

const sidebar = [
  "Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik",
  "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar",
];

const blueprints = ["blog", "website", "news", "portfolio", "forum", "community", "landing", "profile", "knowledge"];

test("Studio activates recovery after current layout authorities", () => {
  assert.match(studioEntry, /studio-recovery-v150\.js/);
  assert.match(studioEntry, /studio-operations-v41\.css/);
  assert.match(studioEntry, /studio-recovery-v150\.css/);
  assert.ok(studioEntry.indexOf("studio-interface-v149.css") < studioEntry.indexOf("studio-recovery-v150.css"));
});

test("production analytics backup is restored without enabling legacy navigation", () => {
  assert.match(recovery, /import \{ loadAnalytics \}/);
  assert.match(recovery, /loadAnalytics\(view, 30, false\)/);
  assert.match(analytics, /get_site_analytics_dashboard/);
  assert.match(analytics, /DATA PRODUKSI NYATA/);
  assert.match(analytics, /Kunjungan per hari/);
  assert.match(analytics, /Distribusi perangkat/);
  assert.match(analytics, /Performa konten/);
  assert.doesNotMatch(recovery, /studio-operations-v41\.js/);
});

test("new users receive complete first-site onboarding", () => {
  for (const blueprint of blueprints) assert.ok(recovery.includes(`[\"${blueprint}\"`) || recovery.includes(`\"${blueprint}\",`), `missing ${blueprint}`);
  assert.match(recovery, /Buat ruang digital Anda/);
  assert.match(recovery, /is_site_slug_available/);
  assert.match(recovery, /createUserSite/);
  assert.match(recovery, /setActiveSiteId/);
  assert.match(recoveryCss, /sn-onboarding-blueprints-v150/);
});

test("profile dropdown has Profile, Settings and explicit Logout", () => {
  for (const label of ["Profil", "Pengaturan", "Keluar"]) assert.ok(recovery.includes(label));
  assert.match(recovery, /sn-account-logout-v135/);
  assert.match(recovery, /sn-account-settings-v135/);
  assert.match(recoveryCss, /sn-profile-menu-v150/);
});

test("session is persisted and refreshed without clearing it on transient network failures", () => {
  assert.match(supabase, /persistSession: true/);
  assert.match(supabase, /autoRefreshToken: true/);
  assert.match(recovery, /refreshSession/);
  assert.match(recovery, /retained-offline/);
  assert.match(authSession, /retainSessionDuringNetworkFailure/);
  assert.match(authSession, /isTransientSessionError/);
});

test("sidebar, equal Posts-Pages workflow, themes and Nara remain intact", () => {
  for (const label of sidebar) assert.ok(studio.includes(`>${label}<`), `missing ${label}`);
  assert.match(studio, /view === "posts" && <ContentList/);
  assert.match(studio, /view === "pages" && <ContentList/);
  assert.match(studio, /type="article"/);
  assert.match(studio, /type="page"/);
  assert.match(theme, /100 tema aktif/);
  assert.match(recovery, /Edit Tata Letak/);
  for (const marker of ["cameraInput", "imageInput", "fileInput", "startVoice", "SpeakerIcon", "nara-native-size-controls-v149"]) assert.ok(nara.includes(marker), `missing ${marker}`);
});

test("recovery styles are balanced", () => {
  assert.equal((recoveryCss.match(/{/g) || []).length, (recoveryCss.match(/}/g) || []).length);
});
