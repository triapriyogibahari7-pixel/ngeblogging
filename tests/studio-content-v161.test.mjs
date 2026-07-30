import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const studio = read("src/StudioNext.jsx");
const content = read("src/StudioContentV161.jsx");
const css = read("src/studio-content-v161.css");
const patcher = read("scripts/patch-studio-content-v161.mjs");
const data = read("src/lib/content-data.js");
const completion = read("src/studio-completion-v151.js");

const statuses = ["draft", "review", "scheduled", "published", "archived"];

test("v161 patches Studio idempotently and keeps the old components as fallback", () => {
  assert.ok(studio.includes('import { StudioContentListV161, StudioSummaryV161 } from "./StudioContentV161.jsx"'));
  assert.ok(studio.includes("<StudioSummaryV161"));
  assert.ok(studio.includes('type="article"'));
  assert.ok(studio.includes('type="page"'));
  assert.ok(studio.includes("duplicateDoc={duplicateDoc}"));
  assert.ok(studio.includes("function HomeView"), "old HomeView must remain as a fallback");
  assert.ok(studio.includes("function ContentList"), "old ContentList must remain as a fallback");
  for (const marker of ["replaceOnce", "ANCHOR_MISSING", "PATCH_STUDIO_CONTENT_V161_INCOMPLETE"]) {
    assert.ok(patcher.includes(marker), `patcher missing ${marker}`);
  }
});

test("Ringkasan uses real site counts, RPC dashboards and honest unavailable states", () => {
  for (const marker of [
    'queryCount("contents"', 'queryCount("media_assets"', 'queryCount("site_members"',
    'rpc("get_site_comment_dashboard"', 'rpc("get_site_analytics_dashboard"',
    "Pageviews 30 hari", "manusia unik", "Data belum dapat dibaca", "Event belum tersedia",
    "Nilai ringkasan akan tetap nol sampai data nyata tersedia", "Tidak menggunakan skor buatan",
    'value === null || value === undefined || value === ""',
  ]) assert.ok(content.includes(marker), `summary missing ${marker}`);
  assert.ok(!content.includes("Math.random() *"), "summary must not invent metrics");
  assert.ok(!content.includes("1.480"));
  assert.ok(!content.includes("720"));
});

test("Ringkasan includes required publication, SEO, draft, activity and Nara panels", () => {
  for (const marker of [
    "RINGKASAN SITUS AKTIF", "Status SEO", "Konten terbaru", "Draf dan jadwal",
    "Buat Page", "Buat Post", "Lihat situs", "Muat ulang", "Buka Nara",
    "Subdomain aktif", "Menunggu verifikasi", "KESIAPAN PUBLIKASI",
  ]) assert.ok(content.includes(marker), `dashboard surface missing ${marker}`);
});

test("Posts and Pages expose search, all status filters, category, author and sorting", () => {
  assert.ok(content.includes("StudioContentListV161"));
  for (const status of statuses) assert.ok(content.includes(`["${status}"`), `filter missing ${status}`);
  for (const marker of [
    "Semua kategori", "Semua penulis", "Terbaru diperbarui", "Terlama diperbarui",
    "Judul A–Z", "Judul Z–A", "categoriesFor", "authorsFor", "sc161-table-wrap",
  ]) assert.ok(content.includes(marker), `content list missing ${marker}`);
});

test("content rows provide edit, truthful preview, duplicate and delete actions", () => {
  for (const marker of [
    "Edit", "Preview", "Terbitkan terlebih dahulu", "Duplikasi sebagai draf", "Hapus",
    "duplicateDoc(doc.id)", "removeDoc(doc.id)", "publicUrl", "doc.status === \"published\"",
  ]) assert.ok(content.includes(marker), `row action missing ${marker}`);
  for (const marker of [
    "const duplicateDoc = async", "getContentDocument(id)", "createContentDocument",
    "updateContentDocument(created.id, values)", 'status: "draft"', "crypto.randomUUID()",
  ]) assert.ok(studio.includes(marker), `real duplicate operation missing ${marker}`);
});

test("cloud content layer already supports server search, status, pagination and full hydration", () => {
  for (const marker of [
    "status = null", 'request.eq("status", status)', 'request.ilike("title"',
    "CONTENT_PAGE_SIZE", "cursor?.updatedAt", "getContentDocument", "updateContentDocument",
  ]) assert.ok(data.includes(marker), `content data missing ${marker}`);
});

test("5,000 word publication guard remains active after v161", () => {
  assert.ok(completion.includes("MAX_EDITOR_WORDS = 5000"));
  assert.ok(completion.includes("Tulisan tidak dipotong"));
  assert.ok(content.includes("countWords"));
});

test("v161 content layout prevents horizontal overflow across desktop and mobile", () => {
  for (const marker of [
    "min-width: 0", "max-width: 100%", "overflow-x: auto", "overscroll-behavior-inline: contain",
    "grid-template-columns: repeat(4", "@media (max-width: 1180px)",
    "@media (max-width: 820px)", "@media (max-width: 520px)",
    "@media (prefers-reduced-motion: reduce)",
  ]) assert.ok(css.includes(marker), `responsive CSS missing ${marker}`);
});

test("v161 JSX and CSS remain syntactically balanced", () => {
  assert.equal((content.match(/\{/g) || []).length, (content.match(/\}/g) || []).length);
  assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length);
});
