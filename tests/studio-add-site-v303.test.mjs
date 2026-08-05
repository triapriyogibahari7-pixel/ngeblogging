import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v303 loads after the active Studio shell authority", async () => {
  const native = await read("src/studio-native-controls-v290.js");
  assert.match(native, /studio-add-site-free-subdomain-v303-20260805/);
  assert.match(native, /import\("\.\/studio-shell-authority-v298\.js"\)[\s\S]*import\("\.\/studio-add-site-v303\.js"\)/);
});

test("v303 Add site uses a dedicated real-site flow rather than clicking workspace", async () => {
  const source = await read("src/studio-add-site-v303.js");
  assert.match(source, /createUserSiteWithPolicy/);
  assert.match(source, /getSiteQuota/);
  assert.match(source, /is_site_slug_available/);
  assert.match(source, /setActiveSiteId/);
  assert.match(source, /ngeblogging:site-created-v303/);
  assert.match(source, /\.ngeblogging\.com berhasil dibuat/);
  assert.doesNotMatch(source, /\.sn-workspace[^\n]*click\(/);
});

test("v303 clearly creates a free subdomain without exposing the account limit number", async () => {
  const source = await read("src/studio-add-site-v303.js");
  for (const marker of [
    "Tambah situs gratis",
    "Subdomain gratis",
    "ALAMAT SITUS GRATIS",
    "Buat situs gratis",
    "free_subdomain: true",
    "Blog",
    "Website",
    "Portal berita",
    "Portofolio",
    "Forum",
    "Komunitas",
    "Landing page",
    "Profil",
    "Knowledge base",
  ]) assert.ok(source.includes(marker), `missing site-create marker: ${marker}`);
  assert.doesNotMatch(source, /Maksimal\s+25|25\s+situs|slot tersisa/i);
  assert.doesNotMatch(source, /fallback\s*=\s*"konten"|placeholder="konten"/i);
});

test("v303 opens from Ringkasan and profile add-site actions and keeps switch-site separate", async () => {
  const source = await read("src/studio-add-site-v303.js");
  assert.match(source, /\.sn-add-site-v298/);
  assert.match(source, /data-profile-action='add-site'/);
  assert.doesNotMatch(source, /data-profile-action='switch-site'[^\n]*openCreateSiteV303/);
  assert.match(source, /window\.addEventListener\("click", interceptedAddSiteClick, true\)/);
});

test("v303 dialog is responsive, centered on large screens and contained on mobile", async () => {
  const css = await read("src/studio-add-site-v303.css");
  assert.match(css, /place-items:center/);
  assert.match(css, /width:min\(760px,calc\(100vw - 28px\)\)/);
  assert.match(css, /max-height:min\(88dvh,820px\)/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /grid-template-columns:1fr/);
  assert.match(css, /safe-area-inset-bottom/);
});

test("v303 does not introduce destructive session or polling behavior", async () => {
  const source = await read("src/studio-add-site-v303.js");
  assert.doesNotMatch(source, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
  assert.doesNotMatch(source, /MutationObserver|setInterval|stopImmediatePropagation/);
  assert.doesNotMatch(source, /location\.(?:reload|replace)\s*\(/);
});
