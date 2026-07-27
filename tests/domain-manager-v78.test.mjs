import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("domain manager v78 is the only domain DOM writer and supports multiple domains", async () => {
  const [manager, operations, legacy, css] = await Promise.all([
    read("src/domain-authority-v75.js"),
    read("src/studio-operations-v41.js"),
    read("src/studio-domain-backup-v35.js"),
    read("src/domain-authority-v75.css"),
  ]);

  for (const marker of [
    "domain-manager-v78-20260727",
    "domainsBySite: new Map()",
    "sortedDomains(currentDomains(state))",
    "Tambahkan lebih dari satu domain",
    "Jadikan alamat utama",
    "toggle-address",
    "nama atau bagian.bertingkat",
    "Periksa semua situs",
    "MAX_ACCOUNT_SITES = 12",
    "getVerifiedSession({ force: true })",
    "/api/domains/register",
    "/api/domains/refresh",
    "/api/domains/address",
  ]) assert.ok(manager.includes(marker), marker);

  assert.ok(manager.includes('root.className = "d75-root d78-root"'));
  assert.ok(manager.includes('child.style.setProperty("display", "none", "important")'));
  assert.ok(manager.includes('document.querySelectorAll(".d78-root,.d75-root")'));
  assert.doesNotMatch(operations, /loadDomains\s*\(/);
  assert.doesNotMatch(operations, /from "\.\/studio-domains-v41\.js"/);
  assert.doesNotMatch(legacy, /normalizeDomain|sn-domain-preview-row-v35/);
  assert.ok(css.includes('[data-domain-manager-v78]>:not(.d78-root)'));
  assert.ok(css.includes('.sn-side>nav>button:last-child'));
  assert.ok(css.includes('@media(min-width:901px)'));
});
