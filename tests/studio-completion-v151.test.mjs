import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const index = readFileSync("index.html", "utf8");
const studioEntry = readFileSync("src/Studio.jsx", "utf8");
const naraRuntime = readFileSync("src/nara-nonmodal-v151.js", "utf8");
const naraCss = readFileSync("src/nara-nonmodal-v151.css", "utf8");
const completion = readFileSync("src/studio-completion-v151.js", "utf8");
const completionCss = readFileSync("src/studio-completion-v151.css", "utf8");
const publicSite = readFileSync("src/PublicSite.jsx", "utf8");
const commentsLoader = readFileSync("src/public-comments-loader-v151.js", "utf8");
const commentsWidget = readFileSync("public/comments-v93.js", "utf8");
const commentsApi = readFileSync("server/comments-handler-v93.mjs", "utf8");
const contentEditor = readFileSync("src/ContentEditor.jsx", "utf8");
const serviceWorker = readFileSync("public/sw.js", "utf8");

const primaryMoods = ["😀","😃","😄","😁","😊","😍","🥰","😎","🤩","😂"];
const reactions = ["😀","😊","😍","😂","😮","😢","😡","👍","❤️","🎉"];

test("global Nara authority loads before the application", () => {
  assert.match(index, /nara-nonmodal-v151\.css\?v=151/);
  assert.match(index, /nara-nonmodal-v151\.js\?v=151/);
  assert.ok(index.indexOf("nara-nonmodal-v151.js") < index.indexOf("main.jsx"));
});

test("small and medium Nara never capture the whole website", () => {
  assert.match(naraRuntime, /nara-nonmodal-open-v151/);
  assert.match(naraRuntime, /aria-modal/);
  assert.match(naraCss, /data-nara-interaction="small"/);
  assert.match(naraCss, /data-nara-interaction="medium"/);
  assert.match(naraCss, /pointer-events:none!important/);
  assert.match(naraCss, /nara-assistant-shell[\s\S]*pointer-events:auto!important/);
  assert.match(naraCss, /data-nara-interaction="full"/);
});

test("Posts and Pages retain one complete editor with a 5,000-word publication guard", () => {
  assert.match(studioEntry, /studio-completion-v151\.js/);
  assert.match(studioEntry, /studio-completion-v151\.css/);
  assert.match(completion, /MAX_EDITOR_WORDS = 5000/);
  assert.match(completion, /Tulisan tidak dipotong/);
  assert.match(completion, /wordLimitDisabledV151/);
  assert.match(contentEditor, /const isPage = doc\.type === "page"/);
  for (const marker of ["Kategori", "SEO & sosial", "HTML", "commentsEnabled", "Preview"]) assert.ok(contentEditor.includes(marker), `missing ${marker}`);
});

test("mobile editor keeps metadata and SEO visible instead of deleting the sidebar", () => {
  assert.match(completionCss, /\.ce-workspace\{grid-template-columns:minmax\(0,1fr\)!important\}/);
  assert.match(completionCss, /\.ce-sidebar\{[\s\S]*display:grid!important/);
  assert.match(completionCss, /@media\(max-width:760px\)/);
  assert.match(completionCss, /\.ce-paper\{[\s\S]*width:100%!important/);
});

test("React public sites always load the production comments widget", () => {
  assert.match(publicSite, /public-comments-loader-v151\.js/);
  assert.match(commentsLoader, /comments-v93\.css\?v=151/);
  assert.match(commentsLoader, /comments-v93\.js\?v=151/);
  assert.match(commentsApi, /get_public_site_comments/);
  assert.match(commentsApi, /submit_site_comment/);
  assert.match(commentsApi, /react_to_site_comment/);
  assert.match(commentsWidget, /Belum ada komentar\. Jadilah yang pertama membuka diskusi\./);
  for (const emoji of primaryMoods) assert.ok(commentsWidget.includes(emoji), `missing mood ${emoji}`);
  for (const emoji of reactions) assert.ok(commentsWidget.includes(emoji), `missing reaction ${emoji}`);
});

test("PWA cache rotates to the v151 completion release", () => {
  assert.match(serviceWorker, /ngeblogging-app-v151-studio-completion-20260729/);
  assert.match(serviceWorker, /studio-completion-cache-v151/);
  assert.match(serviceWorker, /studio-completion-v151/);
  assert.match(serviceWorker, /isAuthSurface/);
});

test("new authority styles have balanced blocks", () => {
  assert.equal((naraCss.match(/{/g) || []).length, (naraCss.match(/}/g) || []).length);
  assert.equal((completionCss.match(/{/g) || []).length, (completionCss.match(/}/g) || []).length);
});
