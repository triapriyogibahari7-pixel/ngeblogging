import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("domain manager v80 is the only active domain DOM writer and follows the global workspace", async () => {
  const [entry, manager, archived, operations, legacy, isolatedCss, navigation] = await Promise.all([
    read("src/domain-authority-v75.js"),
    read("src/domain-manager-v80.js"),
    read("src/domain-manager-v79.js"),
    read("src/studio-operations-v41.js"),
    read("src/studio-domain-backup-v35.js"),
    read("src/domain-manager-v80.css.js"),
    read("src/sidebar-logout-v80.js"),
  ]);

  assert.ok(entry.includes('import "./domain-manager-v80.js"'));
  assert.ok(entry.includes('import "./sidebar-logout-v80.js"'));
  assert.doesNotMatch(entry, /domain-manager-v79\.js|domain-manager-v79\.css/);
  for (const marker of [
    "domain-manager-v80-20260727",
    "ACTIVE_SITE_STORAGE_KEY",
    "activeSiteId()",
    "window.__ngebloggingActiveSite",
    "ngeblogging:active-site-change",
    "ngeblogging:active-site-ready",
    "Ganti situs pada Workspace",
    "toggle-address",
    "nama atau bagian.bertingkat",
    "MAX_ACCOUNT_SITES = 12",
    "getVerifiedSession({ force: true })",
    "/api/domains/register",
    "/api/domains/refresh",
    "/api/domains/address",
    "attachShadow({ mode: \"open\" })",
  ]) assert.ok(manager.includes(marker), marker);

  assert.doesNotMatch(manager, /data-d78-site-select|data-d79-site-select|<select/);
  assert.ok(manager.includes('child.style.setProperty("display", "none", "important")'));
  assert.ok(manager.includes('document.querySelectorAll(".d80-host")'));
  assert.doesNotMatch(operations, /loadDomains\s*\(/);
  assert.doesNotMatch(operations, /from "\.\/studio-domains-v41\.js"/);
  assert.doesNotMatch(legacy, /normalizeDomain|sn-domain-preview-row-v35/);
  assert.match(isolatedCss, /:host\{all:initial/);
  assert.match(navigation, /sidebar-settings-v81-20260728/);
  assert.match(navigation, /sn-side-footer-v81/);
  assert.match(navigation, /Buka Pengaturan/);
  assert.match(navigation, /Keluar dari Ngeblogging/);
  assert.doesNotMatch(navigation, /footer\.append\(logout\)|appendChild\(logout\)/);
  assert.ok(archived.includes("domain-manager-v79-20260727"));
});
