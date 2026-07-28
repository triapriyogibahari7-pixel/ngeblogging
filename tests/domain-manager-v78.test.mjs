import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const executableCss = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "");

test("domain manager v80 is the only active domain DOM writer and follows the global workspace", async () => {
  const [entry, secure, manager, archived, operations, legacy, isolatedCss, footerStyles, studio, legacyProxy] = await Promise.all([
    read("src/domain-authority-v75.js"),
    read("src/StudioSecure.jsx"),
    read("src/domain-manager-v80.js"),
    read("src/domain-manager-v79.js"),
    read("src/studio-operations-v41.js"),
    read("src/studio-domain-backup-v35.js"),
    read("src/domain-manager-v80.css.js"),
    read("src/sidebar-account-footer-v85.css"),
    read("src/StudioNext.jsx"),
    read("src/sidebar-logout-v80.js"),
  ]);

  assert.ok(entry.includes('import "./domain-manager-v80.js"'));
  assert.doesNotMatch(entry, /sidebar-logout-v80\.js/);
  assert.ok(secure.includes('import "./sidebar-account-footer-v85.css"'));
  assert.doesNotMatch(secure, /sidebar-logout-v80\.js|sidebar-react-footer-v84\.css/);
  assert.ok(secure.includes("hideNaraRouteWithoutRemovingReactNodes"));
  assert.ok(secure.includes('button.dataset.reactNodePreserved = "true"'));
  assert.doesNotMatch(secure, /filter\(\(button\) => buttonLabel\(button\) === "Nara AI"\)[\s\S]{0,140}button\.remove\(\)/);
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

  assert.match(studio, />Anggota<\/span><\/button><button[^>]*>[\s\S]*?>Domain<\/span><\/button><\/nav>/);
  assert.match(studio, /<\/nav><div className="sn-account-footer"/);
  assert.match(studio, /sn-account-settings-v88/);
  assert.match(studio, /sn-account-logout-v88/);
  assert.match(footerStyles, /Sidebar navigation and account footer v89/);
  assert.match(footerStyles, /\.sn-side > nav > button:last-child/);
  assert.match(footerStyles, /margin-top: 0 !important/);
  assert.match(footerStyles, /\.sn-account-footer/);
  assert.match(footerStyles, /\.sn-account-settings-v88/);
  assert.match(footerStyles, /\.sn-account-logout-v88/);
  assert.match(footerStyles, /\.sn-logo-mark > i[\s\S]*display: none !important/);
  assert.match(footerStyles, /\.sn-logo::after[\s\S]*content: none !important/);
  assert.match(footerStyles, /flex: 0 0 auto !important/);
  assert.match(footerStyles, /font-size: 15px !important/);
  assert.doesNotMatch(executableCss(footerStyles), /position:\s*(?:absolute|fixed|sticky)\s*!important|bottom:\s*\d|nth-last-child|margin-top:\s*auto\s*!important/);
  assert.ok(legacyProxy.includes("sidebar-footer-v82-20260728"));
  assert.ok(archived.includes("domain-manager-v79-20260727"));
});
