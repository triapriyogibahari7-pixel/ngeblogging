import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dataModule = readFileSync(new URL("../src/lib/media-data.js", import.meta.url), "utf8");
const library = readFileSync(new URL("../src/MediaLibrary.jsx", import.meta.url), "utf8");
const editor = readFileSync(new URL("../src/ContentEditor.jsx", import.meta.url), "utf8");
const studio = readFileSync(new URL("../src/StudioNext.jsx", import.meta.url), "utf8");
const foundationMigration = readFileSync(new URL("../supabase/migrations/202607230200_cloudflare_public_media.sql", import.meta.url), "utf8");
const expansionMigration = readFileSync(new URL("../supabase/migrations/20260723150000_expand_studio_theme_media_nara_billing.sql", import.meta.url), "utf8");
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("Studio loads the modular cloud Media library without legacy DOM bridges", () => {
  assert.match(studio, /import MediaLibrary from "\.\/MediaLibrary"/);
  assert.match(studio, /view===?"media"|view==="media"/);
  assert.match(library, /uploadMedia/);
  assert.match(dataModule, /site-public-media/);
  assert.match(dataModule, /media_assets/);
  assert.doesNotMatch(index, /cloudflare-media-bridge\.js/);
});

test("media upload supports common images video audio and documents up to 50 MiB", () => {
  for (const marker of ["image/jpeg", "image/heic", "video/mp4", "video/x-matroska", "audio/mpeg", "application/pdf", "application/zip"]) {
    assert.match(dataModule, new RegExp(marker.replace("/", "\\/")));
  }
  assert.match(dataModule, /50 \* 1024 \* 1024/);
  assert.match(dataModule, /MAX_MEDIA_BYTES/);
  assert.match(library, /Batas proyek gratis saat ini/);
});

test("editor inserts public image video audio and document URLs", () => {
  assert.match(editor, /asset\.kind === "image"/);
  assert.match(editor, /asset\.kind === "video"/);
  assert.match(editor, /asset\.kind === "audio"/);
  assert.match(editor, /loading="lazy"/);
  assert.match(editor, /rel="noopener noreferrer"/);
  assert.match(editor, /patch\(\{ content:/);
});

test("media deletion removes both the object and metadata row", () => {
  assert.match(dataModule, /storage\.from\(MEDIA_BUCKET\)\.remove/);
  assert.match(dataModule, /from\("media_assets"\)\.delete/);
});

test("storage migrations combine public typed 50 MiB media with tenant RLS", () => {
  assert.match(expansionMigration, /site-public-media/);
  assert.match(expansionMigration, /52428800/);
  assert.match(expansionMigration, /video\/mp4/);
  assert.match(expansionMigration, /audio\/mpeg/);
  assert.match(expansionMigration, /application\/pdf/);
  assert.match(foundationMigration, /private\.is_site_member/);
  assert.match(foundationMigration, /private\.has_site_role/);
  assert.match(foundationMigration, /storage\.foldername\(name\)/);
});
