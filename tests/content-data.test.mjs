import assert from "node:assert/strict";
import test from "node:test";
import { normalizeMetadata, normalizeSeo, slugify } from "../src/lib/content-data.js";

test("slugify creates stable public URL slugs", () => {
  assert.equal(slugify("  Halaman Produk & Layanan 2026! "),"halaman-produk-layanan-2026");
  assert.equal(slugify(""),"konten");
  assert.ok(slugify("a".repeat(300)).length <= 100);
});

test("Post metadata supports date time location tags and publishing controls", () => {
  const metadata = normalizeMetadata({
    tags:[" SEO ","Bisnis",""],categories:["Teknologi"],eventDate:"2026-07-23",eventTime:"19:30",timezone:"Asia/Jakarta",
    locationName:"Jakarta",address:"Indonesia",latitude:"-6.2",longitude:"106.8",sticky:true,commentsEnabled:true,
    schemaType:"Event",customFields:{ticket:"free"},
  },"article");
  assert.deepEqual(metadata.tags,["SEO","Bisnis"]);
  assert.deepEqual(metadata.categories,["Teknologi"]);
  assert.equal(metadata.eventDate,"2026-07-23");
  assert.equal(metadata.eventTime,"19:30");
  assert.equal(metadata.locationName,"Jakarta");
  assert.equal(metadata.latitude,-6.2);
  assert.equal(metadata.longitude,106.8);
  assert.equal(metadata.sticky,true);
  assert.equal(metadata.schemaType,"Event");
  assert.equal(metadata.customFields.ticket,"free");
});

test("Page defaults differ professionally from Post defaults", () => {
  const page = normalizeMetadata({},"page");
  const post = normalizeMetadata({},"article");
  assert.equal(page.template,"default-page");
  assert.equal(page.schemaType,"WebPage");
  assert.equal(post.template,"default-post");
  assert.equal(post.schemaType,"BlogPosting");
});

test("SEO normalization honors index exclusions and preview directives", () => {
  const metadata = normalizeMetadata({excludeFromSearch:true},"article");
  const seo = normalizeSeo({index:true,follow:false,noarchive:true,maxImagePreview:"large",maxSnippet:120,maxVideoPreview:30},metadata);
  assert.equal(seo.index,false);
  assert.equal(seo.follow,false);
  assert.equal(seo.noarchive,true);
  assert.equal(seo.maxSnippet,120);
  assert.equal(seo.maxVideoPreview,30);
});
