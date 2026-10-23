import test from "node:test";
import assert from "node:assert/strict";
import { shouldClearDefaultDraft } from "../src/editor-empty-draft.mjs";

const post = { title: "Post tanpa judul", content: "<h1>Judul Post</h1><p>Mulai menulis ide Anda.</p>", status: "draft", width: 1440 };
const page = { title: "Page tanpa judul", content: "<h1>Judul Page</h1><p>Bangun halaman profesional.</p>", status: "draft", width: 1024 };

test("untouched desktop Post and Page templates can be cleared", () => {
  assert.equal(shouldClearDefaultDraft(post), true);
  assert.equal(shouldClearDefaultDraft(page), true);
});
test("preserve user changes, published content, mobile, and active typing", () => {
  for (const changes of [{ content: post.content + "<p>Tulisan saya</p>" }, { title: "Judul saya" }, { status: "published" }, { status: "review" }, { width: 760 }, { editing: true }, { content: "" }]) {
    assert.equal(shouldClearDefaultDraft({ ...post, ...changes }), false);
  }
});
