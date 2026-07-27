import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [runtime, styles, index, serviceWorker, worker, redirectHandler, migration] = await Promise.all([
  read("src/domain-experience-authority-v59.js"),
  read("src/domain-experience-authority-v59.css"),
  read("index.html"),
  read("public/sw.js"),
  read("cloudflare/worker.mjs"),
  read("server/domain-redirect-handler.mjs"),
  read("supabase/migrations/20260727093000_add_site_domain_redirects_v59.sql"),
]);

test("v59 menampilkan tiga panel domain yang berbeda dan tidak menduplikasi kolom alamat", () => {
  for (const marker of [
    "1. Hubungkan domain",
    "2. Alamat lanjutan",
    "3. Pengalihan alamat",
    "domain utama, subdomain, atau subdomain bertingkat",
    "Satu kolom ini menerima www, subdomain biasa, dan subdomain bertingkat",
    "Tambah redirect",
  ]) assert.match(runtime, new RegExp(marker.replaceAll(".", "\\.")));

  assert.equal((runtime.match(/data-d59-form="redirect"/g) || []).length, 1);
  assert.match(runtime, /placeholder = "contoh: domainanda\.com atau app\.domainanda\.com"/);
  assert.match(runtime, /placeholder = "www, blog, toko, cloud, atau docs\.tim"/);
});

test("v59 redirect benar-benar terhubung ke API, Worker Domain, toggle, lock, dan edge redirect", () => {
  for (const endpoint of [
    "/api/domain-redirects/list",
    "/api/domain-redirects/upsert",
    "/api/domain-redirects/toggle",
    "/api/domain-redirects/lock",
    "/api/domain-redirects/remove",
  ]) {
    assert.match(runtime + redirectHandler + worker, new RegExp(endpoint.replaceAll("/", "\\/")));
  }

  assert.match(redirectHandler, /handleDomainRequest\(addressRequest/);
  assert.match(redirectHandler, /\/api\/domains\/address/);
  assert.match(redirectHandler, /REDIRECT_LOCKED/);
  assert.match(redirectHandler, /status: rule\.permanent === false \? 307 : 308/);
  assert.match(redirectHandler, /x-ngeblogging-domain-redirect/);
  assert.match(worker, /resolveDomainRedirect\(request, env, context\)/);
  assert.match(worker, /domainRedirect[\s\S]*seoEndpoint/);
});

test("v59 memiliki penyimpanan terindeks, RLS, dan pembacaan publik hanya untuk redirect aktif", () => {
  assert.match(migration, /create table if not exists public\.site_domain_redirects/);
  assert.match(migration, /unique \(source_hostname\)/);
  assert.match(migration, /site_domain_redirects_active_source_idx/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /redirects_read_public_active/);
  assert.match(migration, /private\.has_site_role/);
  assert.match(migration, /target_url ~ '\^https:\/\//);
});

test("v59 menjadi otoritas aktif terakhir dan v57-v58 tetap dinonaktifkan", () => {
  const v56Css = index.indexOf("domain-layout-authority-v56.css");
  const v59Css = index.indexOf("domain-experience-authority-v59.css");
  const v56Js = index.indexOf("domain-layout-authority-v56.js");
  const v59Js = index.indexOf("domain-experience-authority-v59.js");
  assert.ok(v59Css > v56Css);
  assert.ok(v59Js > v56Js);
  assert.match(index, /domain-experience-authority-v58\.css[^>]*media="not all"/);
  assert.match(index, /type="application\/x-disabled" src="\/src\/domain-experience-authority-v58\.js"/);
  assert.match(index, /ngeblogging-domain-address-ui" content="\/src\/domain-experience-authority-v59\.js"/);
  assert.match(serviceWorker, /ngeblogging-app-v59-20260727/);
  assert.match(serviceWorker, /ngeblogging-app-v58-20260727/);
});

test("v59 responsif untuk desktop, mobile, sentuh, dan reduced motion", () => {
  assert.match(styles, /grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(styles, /d59-connect-guide/);
  assert.match(styles, /d59-redirect-table/);
  assert.match(styles, /@media\(max-width:1000px\)/);
  assert.match(styles, /@media\(max-width:760px\)/);
  assert.match(styles, /@media\(max-width:480px\)/);
  assert.match(styles, /@media\(hover:none\) and \(pointer:coarse\)/);
  assert.match(styles, /prefers-reduced-motion/);
});
