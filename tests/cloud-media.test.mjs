import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const bridge = readFileSync(new URL("../src/cloudflare-media-bridge.js", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/202607230200_cloudflare_public_media.sql", import.meta.url), "utf8");
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("Studio loads the cloud media integration", () => {
  assert.match(index, /cloudflare-media-bridge\.js/);
  assert.match(bridge, /site-public-media/);
  assert.match(bridge, /media_assets/);
});

test("media upload enforces raster image formats and a 15 MiB limit", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]) {
    assert.match(bridge, new RegExp(type.replace("/", "\\/")));
  }
  assert.match(bridge, /15 \* 1024 \* 1024/);
  assert.doesNotMatch(bridge, /image\/svg\+xml/);
});

test("editor images use public cloud URLs and dispatch autosave input", () => {
  assert.match(bridge, /uploadImage\(file\)/);
  assert.match(bridge, /insertImageIntoEditor/);
  assert.match(bridge, /loading=\"lazy\"/);
  assert.match(bridge, /new InputEvent\("input"/);
});

test("media deletion removes both the object and metadata row", () => {
  assert.match(bridge, /storage\.from\(BUCKET\)\.remove/);
  assert.match(bridge, /from\("media_assets"\)\.delete/);
});

test("storage migration is public, size-limited, typed, and tenant-scoped", () => {
  assert.match(migration, /'site-public-media'/);
  assert.match(migration, /15728640/);
  assert.match(migration, /public = excluded\.public/);
  assert.match(migration, /private\.is_site_member/);
  assert.match(migration, /private\.has_site_role/);
  assert.match(migration, /\(storage\.foldername\(name\)\)\[2\] = \(select auth\.uid\(\)\)::text/);
});
