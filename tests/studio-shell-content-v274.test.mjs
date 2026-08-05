import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-shell-content-v274.js");
const css = read("src/studio-shell-content-v274.css");
const studio = read("src/StudioNext.jsx");
const nara = read("src/NaraAssistant.jsx");
const themeCatalog = read("src/theme-catalog.js");
const widgets = read("src/widget-system.js");
const auth = read("src/lib/supabase.js");
const authModal = read("src/AuthModal.jsx");
const analytics = read("src/studio-analytics-v41.js");
const editorPatch = read("scripts/patch-content-editor-v162.mjs");
const editorSource = read("src/ContentEditor.jsx");
const editorAuthority = `${editorSource}\n${editorPatch}`;
const contentData = read("src/lib/content-data.js");
const publicComments = read("public/comments-v93.js");
const onboarding = read("src/StudioOnboardingGate.jsx");
const sitePolicy = read("src/lib/site-policy-v169.js");

const menu = ["Buat Post","Ringkasan","Posts","Pages","Tema","Media","Analitik","Anggota","Komentar","Domain","API Keys","Pengaturan","Keluar"];

test("v274 is loaded after v272 as the final Studio shell authority", () => {
  assert.ok(entry.indexOf('import "./studio-shell-content-v274.js";') > entry.indexOf('import "./studio-shell-authority-v272.js";'));
  assert.match(runtime, /studio-shell-content-v274-20260804/);
  assert.match(runtime, /data\.v274State|dataset\.v274State/);
});

test("all sidebar items remain and only the internal n owns the visible toggle", () => {
  for (const label of menu) assert.ok(studio.includes(label), `missing ${label}`);
  assert.match(css, /#ngeblogging-studio-sidebar>\.sn-logo>\.sn-logo-mark/);
  assert.match(css, /\.sn-main>\.sn-top>\.sn-sidebar-toggle[\s\S]*display:none!important/);
  assert.match(css, /#ngeblogging-studio-sidebar\.collapsed[\s\S]*nav>button/);
  assert.match(runtime, /afterNavigation/);
});

test("compact drawer is non-blurred and desktop content follows open or collapsed sidebar", () => {
  assert.match(css, /data-v274-compact-family="true"[\s\S]*#ngeblogging-studio-sidebar:not\(\.mobile-open\)/);
  assert.match(css, /body\.sn-mobile-sidebar-open \.sn-side-backdrop[\s\S]*background:transparent!important/);
  assert.match(css, /#ngeblogging-studio-sidebar:not\(\.collapsed\)\+\.sn-main[\s\S]*calc\(100% - var\(--v274-side-open\)\)/);
  assert.match(css, /#ngeblogging-studio-sidebar\.collapsed\+\.sn-main[\s\S]*calc\(100% - var\(--v274-side-rail\)\)/);
});

test("Nara remains fixed, small and medium are non-modal, and attachments open upward", () => {
  assert.match(css, /\.nara-floating-button[\s\S]*position:fixed!important/);
  assert.match(css, /data-nara-interaction="nonmodal"[\s\S]*pointer-events:none!important/);
  assert.match(css, /\.nara-attachment-menu[\s\S]*bottom:calc\(100% \+ 8px\)!important/);
  assert.match(nara, /cameraInput\.current\?\.click\(\)/);
  assert.match(nara, /imageInput\.current\?\.click\(\)/);
  assert.match(nara, /fileInput\.current\?\.click\(\)/);
  assert.match(nara, /intelligenceOptions/);
  assert.match(nara, /modelOptions/);
});

test("Theme Studio remains 100 themes, 26 widgets, readable layout map and split code editor", () => {
  const families = [...themeCatalog.matchAll(/\{ id:"[^"]+",name:"[^"]+",category:/g)].length;
  const compositions = [...themeCatalog.matchAll(/\{ id:"(?:prime|dawn|night|coast|atelier)"/g)].length;
  assert.equal(families, 20);
  assert.equal(compositions, 5);
  assert.equal([...widgets.matchAll(/\{ id: "[^"]+", name:/g)].length, 26);
  assert.match(widgets, /id: "custom-html"/);
  assert.match(css, /\.tn-layout-map-v264[\s\S]*width:540px!important/);
  assert.match(css, /\.tn-code-workspace[\s\S]*grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(css, /grid-template-areas:"code" "preview"/);
});

test("Post and Page keep the same full editor, 5000-word guard, SEO and social metadata", () => {
  assert.match(studio, /<ContentEditor doc=\{active\}/);
  assert.match(editorPatch, /words > 5000/);
  assert.match(editorPatch, /words >= 4500/);
  assert.match(editorPatch, /\/ 5\.000 kata/);
  assert.match(editorPatch, /Draf tetap disimpan dan tulisan tidak dipotong/);
  for (const marker of ["SEO title", "Meta description", "Focus keyword", "Canonical URL", "Twitter Card", "Gambar sosial", "Schema type", "ce-seo-preview-v162"]) {
    assert.ok(editorAuthority.includes(marker), `active editor authority missing ${marker}`);
  }
  for (const marker of ["metadata", "seo", "scheduled_at", "featured_image_path"]) {
    assert.ok(contentData.includes(marker), `content persistence missing ${marker}`);
  }
  assert.match(contentData, /payload\.metadata = normalizeMetadata/);
  assert.match(contentData, /payload\.seo = normalizeSeo/);
});

test("public comments preserve empty state, ten primary moods and ten reactions", () => {
  assert.match(publicComments, /PRIMARY_MOODS = \["😀","😃","😄","😁","😊","😍","🥰","😎","🤩","😂"\]/);
  assert.match(publicComments, /REACTIONS = \["😀","😊","😍","😂","😮","😢","😡","👍","❤️","🎉"\]/);
  assert.match(publicComments, /Belum ada komentar\. Jadilah yang pertama membuka diskusi\./);
  assert.match(publicComments, /ngc-honeypot/);
  assert.match(publicComments, /4000/);
});

test("first-site onboarding remains before Studio and enforces the real 25-site policy", () => {
  for (const marker of ["Nama situs", "Subdomain gratis", "Deskripsi singkat", "Tema awal", "Bahasa", "Zona waktu", "is_site_slug_available", ".ngeblogging.com"]) {
    assert.ok(onboarding.includes(marker), `onboarding missing ${marker}`);
  }
  for (const type of ["blog", "website", "news", "portfolio", "forum", "community", "landing", "profile", "knowledge"]) {
    assert.ok(onboarding.includes(`value: "${type}"`), `onboarding missing ${type}`);
  }
  assert.match(sitePolicy, /MAX_SITES_PER_ACCOUNT = 25/);
});

test("analytics is production-first and keeps explicit simulation labeling", () => {
  assert.match(runtime, /loadAnalytics\(view, 30, false\)/);
  assert.match(analytics, /DATA PRODUKSI NYATA/);
  assert.match(analytics, /SIMULASI TAMPILAN — BUKAN DATA PRODUKSI/);
  assert.match(css, /\.op41-line[\s\S]*min-height:320px!important/);
});

test("all requested login methods remain wired and auth persistence is preserved", () => {
  assert.match(authModal, /id: "google"/);
  assert.match(authModal, /id: "linkedin_oidc"/);
  assert.match(authModal, /signInWithPassword/);
  assert.match(authModal, /signInWithMagicLink/);
  assert.match(auth, /signInWithOAuth/);
  assert.match(auth, /persistSession:\s*true/);
  assert.match(auth, /autoRefreshToken:\s*true/);
  assert.doesNotMatch(runtime, /localStorage\.clear|sessionStorage\.clear|signOut\(|location\.reload\(/);
});
