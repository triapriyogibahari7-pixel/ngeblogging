import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("domain manager v79 is the only domain DOM writer and follows the global active workspace", async () => {
  const [entry, manager, operations, legacy, baseCss, css] = await Promise.all([
    read("src/domain-authority-v75.js"),
    read("src/domain-manager-v79.js"),
    read("src/studio-operations-v41.js"),
    read("src/studio-domain-backup-v35.js"),
    read("src/domain-authority-v75.css"),
    read("src/domain-manager-v79.css"),
  ]);

  assert.ok(entry.includes('import "./domain-manager-v79.js"'));
  assert.ok(entry.includes('import "./domain-manager-v79.css"'));
  for (const marker of [
    "domain-manager-v79-20260727",
    "ACTIVE_SITE_STORAGE_KEY",
    "activeSiteId()",
    "window.__ngebloggingActiveSite",
    "ngeblogging:active-site-change",
    "ngeblogging:active-site-ready",
    "SITUS AKTIF",
    "gunakan pemilih Workspace",
    "Satu situs memakai satu domain akar",
    "toggle-address",
    "nama atau bagian.bertingkat",
    "Periksa situs aktif",
    "MAX_ACCOUNT_SITES = 12",
    "getVerifiedSession({ force: true })",
    "/api/domains/register",
    "/api/domains/refresh",
    "/api/domains/address",
  ]) assert.ok(manager.includes(marker), marker);

  assert.doesNotMatch(manager, /data-d78-site-select|data-d79-site-select|<select/);
  assert.ok(manager.includes('root.className = "d75-root d78-root"'));
  assert.ok(manager.includes('child.style.setProperty("display", "none", "important")'));
  assert.ok(manager.includes('document.querySelectorAll(".d78-root,.d75-root")'));
  assert.doesNotMatch(operations, /loadDomains\s*\(/);
  assert.doesNotMatch(operations, /from "\.\/studio-domains-v41\.js"/);
  assert.doesNotMatch(legacy, /normalizeDomain|sn-domain-preview-row-v35/);
  assert.ok(css.includes('[data-domain-manager-v79]>:not(.d78-root)'));
  assert.ok(baseCss.includes('.sn-side>nav>button:last-child'));
  assert.ok(baseCss.includes('@media(min-width:901px)'));
});
