import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [runtime, styles, index, serviceWorker] = await Promise.all([
  read("src/domain-experience-authority-v58.js"),
  read("src/domain-experience-authority-v58.css"),
  read("index.html"),
  read("public/sw.js"),
]);

test("v58 menjelaskan domain utama, propagasi, nameserver, HTTPS, dan wildcard", () => {
  for (const marker of [
    "Hubungkan domain milik Anda",
    "SEDANG DALAM PROPAGASI",
    "Periksa nameserver",
    "Ganti nameserver lama dengan nameserver Ngeblogging",
    "HTTPS & wildcard",
    "Periksa koneksi",
  ]) assert.ok(runtime.includes(marker), `marker v58 tidak ditemukan: ${marker}`);
});

test("v58 menggunakan satu kolom alamat opsional untuk www, subdomain, dan subdomain bertingkat", () => {
  for (const marker of [
    "ALAMAT OPSIONAL",
    "www, subdomain, dan subdomain bertingkat",
    "Alamat tambahan (opsional)",
    "www, blog, toko, app, atau docs.tim",
    "Routing wildcard dan HTTPS dikelola otomatis",
    "Tambahkan",
  ]) assert.ok(runtime.includes(marker), `marker v58 tidak ditemukan: ${marker}`);

  assert.ok(runtime.includes('[data-action="refresh-root"]'));
  assert.doesNotMatch(runtime, /createForm\(\{ mode: "single"/);
  assert.doesNotMatch(runtime, /createForm\(\{ mode: "nested"/);
});

test("v58 mencegah header bertumpuk dan menjaga field domain dalam satu baris", () => {
  assert.match(styles, /\.dfz-root :is\([\s\S]*header[\s\S]*transform: none !important/);
  assert.match(styles, /\.dfz-root-form,[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto !important/);
  assert.match(styles, /\.dfz-address-form label > div[\s\S]*display: flex !important/);
  assert.match(styles, /@media \(max-width: 760px\)/);
  assert.match(styles, /@media \(max-width: 480px\)/);
  assert.match(styles, /@media \(hover: none\) and \(pointer: coarse\)/);
  assert.match(styles, /prefers-reduced-motion/);
});

test("v58 tetap tersedia sebagai kompatibilitas dan v57 dinonaktifkan", () => {
  const v56Css = index.indexOf('<link href="/src/domain-layout-authority-v56.css"');
  const v58Css = index.indexOf('<link href="/src/domain-experience-authority-v58.css"');
  const v56Js = index.indexOf('<script type="module" src="/src/domain-layout-authority-v56.js"');
  const v58Js = index.indexOf('src="/src/domain-experience-authority-v58.js"');

  assert.ok(v58Css > v56Css);
  assert.ok(v58Js > v56Js);
  assert.match(index, /domain-address-experience-v57\.css[^>]*media="not all"/);
  assert.match(index, /type="application\/x-disabled" src="\/src\/domain-address-experience-v57\.js"/);
  assert.match(serviceWorker, /ngeblogging-app-v58-20260727/);
  assert.match(serviceWorker, /ngeblogging-app-v57-20260727/);
});
