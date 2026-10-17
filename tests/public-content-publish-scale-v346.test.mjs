import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const studio = await readFile(new URL("../src/StudioNext.jsx", import.meta.url), "utf8");
const contentData = await readFile(new URL("../src/lib/content-data.js", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase/migrations/20260807090000_public_content_scale_v346.sql", import.meta.url), "utf8");

test("v346 publishes Posts and Pages with pending autosaves flushed before public visibility", () => {
  assert.match(studio, /publishContentDocument/);
  assert.match(studio, /pendingSave\.current\.id === active\.id \? pendingSave\.current\.values : \{\}/);
  assert.match(studio, /clearTimeout\(saveTimer\.current\)/);
  assert.match(studio, /pendingSave\.current = \{ id: null, values: \{\} \}/);
  assert.match(studio, /const nextValues = \{ \.\.\.pending, status, publishedAt \}/);
  assert.match(studio, /await publishContentDocument\(active\.id, nextValues\)/);
});

test("v346 normalizes content statuses before writing publication fields", () => {
  assert.match(contentData, /CONTENT_STATUSES = new Set\(\["draft", "review", "scheduled", "published", "archived"\]\)/);
  assert.match(contentData, /function normalizeContentStatus/);
  assert.match(contentData, /payload\.status = status/);
  assert.match(contentData, /payload\.published_at = status === "published"/);
  assert.match(contentData, /export async function publishContentDocument/);
});

test("v346 adds public and studio indexes for 100k article sites and 12-site accounts", () => {
  assert.match(migration, /contents_public_slug_lookup_v346/);
  assert.match(migration, /contents_public_article_feed_v346/);
  assert.match(migration, /contents_public_page_menu_v346/);
  assert.match(migration, /contents_studio_site_kind_status_cursor_v346/);
  assert.match(migration, /sites_owner_active_capacity_v346/);
  assert.match(migration, /where kind = 'article' and status = 'published' and visibility = 'public'/);
});
