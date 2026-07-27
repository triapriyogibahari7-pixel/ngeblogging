import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [runtime, styles, index] = await Promise.all([
  read("src/domain-address-experience-v57.js"),
  read("src/domain-address-experience-v57.css"),
  read("index.html"),
]);

test("pengaturan www, subdomain, dan subdomain bertingkat selalu terlihat", () => {
  for (const marker of [
    "ALAMAT STANDAR",
    "Akses dengan www",
    "SUBDOMAIN",
    "SUBDOMAIN BERTINGKAT",
    "Struktur alamat lanjutan",
    "Pengaturan siap digunakan",
    "Aktif",
    "Nonaktif",
    "bagian.nama",
  ]) assert.match(runtime, new RegExp(marker.replace(".", "\\.")));

  assert.match(runtime, /data-action="toggle-address"/);
  assert.match(runtime, /data-action="add-address"/);
  assert.match(runtime, /data-action="remove-address"/);
  assert.match(runtime, /const placeholder = nested/);
  assert.doesNotMatch(runtime, /cloud\.console/i);
});

test("kontrol alamat aktif pada desktop, mobile, sentuh, dan reduced motion", () => {
  assert.match(styles, /grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(styles, /@media\(max-width:1180px\)/);
  assert.match(styles, /@media\(max-width:760px\)/);
  assert.match(styles, /@media\(max-width:480px\)/);
  assert.match(styles, /@media\(hover:none\) and \(pointer:coarse\)/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /\.dfz-state-button\.active/);
});

test("rilis v57 dimuat setelah otoritas full-zone", () => {
  assert.match(index, /domain-address-experience-v57\.css/);
  assert.match(index, /domain-full-zone-v54\.js[\s\S]*domain-address-experience-v57\.js/);
  assert.match(index, /ngeblogging-domain-address-ui/);
});
