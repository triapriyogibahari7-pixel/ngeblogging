import assert from "node:assert/strict";
import test from "node:test";
import { CONTENT_PAGE_SIZE, recordToDocument } from "../src/lib/studio-data.js";

test("content pages stay bounded instead of loading an entire site", () => {
  assert.equal(CONTENT_PAGE_SIZE, 25);
  assert.ok(CONTENT_PAGE_SIZE <= 100);
});

test("database content summaries are mapped without loading article bodies", () => {
  const document = recordToDocument({
    id: "6e8e452d-1a0a-4ba2-85c9-6f552522c078",
    kind: "article",
    title: "Artikel skala besar",
    slug: "artikel-skala-besar",
    status: "draft",
    visibility: "public",
    excerpt: "Ringkas",
    body_html: "<p>Isi sangat panjang</p>",
    updated_at: "2026-07-23T01:00:00.000Z",
    published_at: null,
  }, false);

  assert.equal(document.content, null);
  assert.equal(document.hydrated, false);
  assert.equal(document.type, "article");
});

test("editor hydration includes the requested article body only", () => {
  const document = recordToDocument({
    id: "6e8e452d-1a0a-4ba2-85c9-6f552522c078",
    kind: "page",
    title: "Tentang",
    slug: "tentang",
    status: "published",
    visibility: "public",
    excerpt: "",
    body_html: "<h1>Tentang</h1>",
    updated_at: "2026-07-23T01:00:00.000Z",
    published_at: "2026-07-23T01:00:00.000Z",
  });

  assert.equal(document.content, "<h1>Tentang</h1>");
  assert.equal(document.hydrated, true);
});
