import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v52 switcher and v53 stability authority load once after previous Studio authorities", async () => {
  const html = await read("index.html");
  assert.ok(html.indexOf("studio-site-switcher-v52.css") > html.indexOf("studio-theme-domain-v50.css"));
  assert.ok(html.indexOf("studio-site-switcher-stability-v53.css") > html.indexOf("studio-site-switcher-v52.css"));
  assert.ok(html.indexOf("studio-site-switcher-v52.js") > html.indexOf("studio-theme-domain-v50.js"));
  assert.equal(html.match(/studio-site-switcher-v52\.css/g)?.length, 1);
  assert.equal(html.match(/studio-site-switcher-stability-v53\.css/g)?.length, 1);
  assert.equal(html.match(/studio-site-switcher-v52\.js/g)?.length, 1);
});

test("v52 uses a permanent host and quarantines asynchronous legacy cards", async () => {
  const runtime = await read("src/studio-site-switcher-v52.js");
  const stability = await read("src/studio-site-switcher-stability-v53.css");
  assert.match(runtime, /document\.documentElement\.dataset\.studioSiteSwitcherV52/);
  assert.match(runtime, /function quarantineLegacyCards/);
  assert.match(runtime, /card\.dataset\.sp52LegacyHidden = "true"/);
  assert.match(runtime, /querySelector\(":scope > \.sp52-site-switcher"\)/);
  assert.match(runtime, /host\.className = "sp52-site-switcher"/);
  assert.doesNotMatch(runtime, /host\.className = "sp37-active-site sp52-site-switcher"/);
  assert.match(runtime, /let renderPromise = null/);
  assert.match(runtime, /if \(!card \|\| renderPromise\) return renderPromise/);
  assert.match(runtime, /const unique = new Map\(\)/);
  assert.match(stability, /\.sp37-active-site:not\(\.sp52-site-switcher\)/);
  assert.match(stability, /display: none !important/);
  assert.match(stability, /animation: none !important/);
});

test("legacy v39 and v41 observers stop mutating the v52 workspace authority", async () => {
  const quality = await read("src/studio-quality-v39.js");
  const operations = await read("src/studio-operations-v41.js");
  assert.match(quality, /card\.classList\.contains\("sp52-site-switcher"\)/);
  assert.match(operations, /querySelector\(":scope > \.sp52-site-switcher"\)/);
});

test("v52 only rebuilds markup when the selected site or membership list changes", async () => {
  const runtime = await read("src/studio-site-switcher-v52.js");
  assert.match(runtime, /const signature = `\$\{selected\.id\}:\$\{sites\.map\(\(site\) => site\.id\)\.join\("\|"\)\}`/);
  assert.doesNotMatch(runtime, /updated_at \|\|/);
  assert.match(runtime, /card\.dataset\.sp52Signature === signature/);
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

test("v52 switches by stable site id and reloads only after an explicit selection", async () => {
  const runtime = await read("src/studio-site-switcher-v52.js");
  assert.match(runtime, /setActiveSiteId\(siteId\)/);
  assert.match(runtime, /ngeblogging:active-site-changed/);
  assert.match(runtime, /location\.reload\(\)/);
  assert.match(runtime, /ACTIVE_SITE_STORAGE_KEY/);
  assert.doesNotMatch(runtime, /window\.setInterval/);
});

test("v52 leaves Nara and the locked Studio sidebar untouched", async () => {
  const runtime = await read("src/studio-site-switcher-v52.js");
  const css = await read("src/studio-site-switcher-v52.css");
  const stability = await read("src/studio-site-switcher-stability-v53.css");
  for (const forbidden of [".nara-", ".sn-side"]) {
    const pattern = new RegExp(forbidden.replace(".", "\\."));
    assert.doesNotMatch(runtime, pattern);
    assert.doesNotMatch(css, pattern);
    assert.doesNotMatch(stability, pattern);
  }
});

test("PWA cache rotates to v53 and retains v52 compatibility", async () => {
  const sw = await read("public/sw.js");
  assert.match(sw, /ngeblogging-app-v53-20260726/);
  assert.match(sw, /ngeblogging-app-v52-20260726/);
});
