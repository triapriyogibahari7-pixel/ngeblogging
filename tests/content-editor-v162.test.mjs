import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const editor = read("src/ContentEditor.jsx");
const data = read("src/lib/content-data.js");
const css = read("src/content-editor-v162.css");
const studio = read("src/StudioNext.jsx");

const tabs = ["Konten", "Sisipkan", "Tata letak", "Metadata", "SEO", "HTML"];
const schemas = ["BlogPosting", "NewsArticle", "Article", "WebPage", "AboutPage", "ContactPage", "ProfilePage", "Event", "FAQPage", "HowTo", "Product"];

test("Posts and Pages continue using the exact same ContentEditor", () => {
  assert.match(studio, /<ContentEditor doc=\{active\}/);
  assert.match(editor, /const isPage = doc\.type === "page"/);
  for (const tab of tabs) assert.ok(editor.includes(`"${tab}"`) || editor.includes(`>${tab}<`), `missing ${tab}`);
});

test("5000 word policy warns at 4500, never cuts drafts, and blocks only publication", () => {
  assert.match(editor, /words > 5000 \? "over" : words >= 4500 \? "warning"/);
  assert.match(editor, /5\.000 kata/);
  assert.match(editor, /wordsToReduce/);
  assert.match(editor, /Draf tetap disimpan dan tulisan tidak dipotong/);
  assert.match(editor, /disabled=\{words > 5000\}/);
  assert.match(editor, /karakter HTML/);
  assert.match(editor, /menit membaca/);
  assert.doesNotMatch(editor, /doc\.content\s*=\s*doc\.content\.slice\([^)]*5000/);
});

test("SEO and social metadata are editable and normalized for cloud persistence", () => {
  for (const marker of ["SEO title", "Meta description", "Focus keyword", "Canonical URL", "Judul sosial", "Deskripsi sosial", "Gambar sosial", "Twitter Card", "Skor SEO", "ce-seo-preview-v162"]) {
    assert.ok(editor.includes(marker), `missing ${marker}`);
  }
  for (const schema of schemas) assert.ok(editor.includes(schema), `missing schema ${schema}`);
  for (const marker of ["seoTitle", "socialTitle", "socialDescription", "socialImage", "twitterCard", "canonicalUrl", "focusKeyword", "schemaType"]) {
    assert.ok(data.includes(marker), `metadata normalization missing ${marker}`);
  }
  assert.match(editor, /Izinkan index/);
  assert.match(editor, /Izinkan follow/);
});

test("Page-specific settings remain richer than a basic article form", () => {
  for (const marker of ["Urutan menu", "Tampilkan di navigasi", "Jadikan Page default", "Page default", "Lebar penuh", "Landing page", "Kontak", "About Page", "Portofolio", "Profile Page"]) {
    assert.ok(editor.includes(marker), `missing Page setting ${marker}`);
  }
  assert.match(data, /showInNavigation/);
  assert.match(data, /defaultPage/);
});

test("mobile editor keeps controls visible from 320px through tablet and PWA safe areas", () => {
  for (const marker of ["@media(max-width:1024px)", "@media(max-width:760px)", "@media(max-width:390px)", "orientation:landscape", "display-mode:standalone", "prefers-reduced-motion:reduce"]) {
    assert.ok(css.includes(marker), `missing responsive marker ${marker}`);
  }
  for (const marker of ["env(safe-area-inset-top", "env(safe-area-inset-bottom", "overflow-x:clip", "scroll-snap-type:x proximity", "grid-template-columns:minmax(0,1fr)!important", "display:block;max-width:100%;overflow-x:auto", "min-height:44px"]) {
    assert.ok(css.includes(marker), `missing mobile protection ${marker}`);
  }
  assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length);
});

test("editor v162 release is attached without replacing the existing editor", () => {
  assert.match(editor, /data-editor-release="v162"/);
  assert.match(editor, /content-editor-v162\.css/);
  assert.match(editor, /contentEditable/);
  assert.match(editor, /dangerouslySetInnerHTML/);
  assert.match(editor, /MediaLibrary/);
  assert.match(editor, /Tulis dengan Nara/);
});
