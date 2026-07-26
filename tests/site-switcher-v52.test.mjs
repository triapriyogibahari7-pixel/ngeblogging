import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v52 site switcher loads once after the previous Studio authority", async () => {
  const html = await read("index.html");
  assert.ok(html.indexOf("studio-site-switcher-v52.css") > html.indexOf("studio-theme-domain-v50.css"));
  assert.ok(html.indexOf("studio-site-switcher-v52.js") > html.indexOf("studio-theme-domain-v50.js"));
  assert.equal(html.match(/studio-site-switcher-v52\.css/g)?.length, 1);
  assert.equal(html.match(/studio-site-switcher-v52\.js/g)?.length, 1);
});

test("v52 reconciles duplicate active-site cards before asynchronous rendering", async () => {
  const runtime = await read("src/studio-site-switcher-v52.js");
  assert.match(runtime, /:scope > \.sp37-active-site/);
  assert.match(runtime, /cards\.filter\(\(card\) => card !== host\)\.forEach\(\(card\) => card\.remove\(\)\)/);
  assert.match(runtime, /let renderPromise = null/);
  assert.match(runtime, /if \(!card \|\| renderPromise\) return renderPromise/);
  assert.match(runtime, /const unique = new Map\(\)/);
});

test("v52 exposes a professional active marker, searchable selector, and twelve-site limit", async () => {
  const runtime = await read("src/studio-site-switcher-v52.js");
  const css = await read("src/studio-site-switcher-v52.css");
  assert.match(runtime, /const SITE_LIMIT = 12/);
  assert.match(runtime, /SITUS AKTIF SEKARANG/);
  assert.match(runtime, /Cari nama atau alamat situs/);
  assert.match(runtime, /Pilih situs yang dikelola/);
  assert.match(runtime, /Kelola semua situs/);
  assert.match(runtime, /\+ Tambah situs/);
  assert.match(runtime, /data-active="\$\{active\}"/);
  assert.match(css, /\.sp52-site-row\[data-active="true"\]/);
  assert.match(css, /\.sp52-panel/);
  assert.match(css, /@media \(max-width: 760px\)/);
});

test("v52 switches by stable site id and refreshes the whole workspace", async () => {
  const runtime = await read("src/studio-site-switcher-v52.js");
  assert.match(runtime, /setActiveSiteId\(siteId\)/);
  assert.match(runtime, /ngeblogging:active-site-changed/);
  assert.match(runtime, /location\.reload\(\)/);
  assert.match(runtime, /ACTIVE_SITE_STORAGE_KEY/);
});

test("v52 leaves Nara and the locked Studio sidebar untouched", async () => {
  const runtime = await read("src/studio-site-switcher-v52.js");
  const css = await read("src/studio-site-switcher-v52.css");
  for (const forbidden of [".nara-", ".sn-side"]) {
    assert.doesNotMatch(runtime, new RegExp(forbidden.replace(".", "\\.")));
    assert.doesNotMatch(css, new RegExp(forbidden.replace(".", "\\.")));
  }
});

test("PWA cache rotates to v52 and retains v51 compatibility", async () => {
  const sw = await read("public/sw.js");
  assert.match(sw, /ngeblogging-app-v52-20260726/);
  assert.match(sw, /ngeblogging-app-v51-20260726/);
});
