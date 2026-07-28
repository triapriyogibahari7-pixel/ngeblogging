import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const executableCss = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "");

test("domain manager v80 uses a Shadow DOM as the only visible domain surface", async () => {
  const [entry, manager, styles, legacy] = await Promise.all([
    read("src/domain-authority-v75.js"),
    read("src/domain-manager-v80.js"),
    read("src/domain-manager-v80.css.js"),
    read("src/domain-manager-v79.js"),
  ]);
  assert.match(entry, /domain-manager-v80\.js/);
  assert.doesNotMatch(entry, /domain-manager-v79\.js/);
  for (const marker of [
    "domain-manager-v80-20260727",
    "attachShadow({ mode: \"open\" })",
    "DOMAIN_MANAGER_V80_CSS",
    "data-d80-form=\"domain\"",
    "/api/domains/register",
    "/api/domains/refresh",
    "/api/domains/address",
    "Alamat utama tanpa www · dilindungi",
    "Mendukung satu atau beberapa tingkat subdomain",
    "Ganti situs pada Workspace",
  ]) assert.ok(manager.includes(marker), marker);
  assert.match(styles, /:host\{all:initial/);
  assert.match(styles, /\.register-form\{/);
  assert.match(styles, /\.address-form\{/);
  assert.match(styles, /@media\(max-width:700px\)/);
  assert.ok(legacy.includes("domain-manager-v79-20260727"), "legacy source remains archived but is no longer imported");
});

test("final v91 authority keeps Domain after Anggota and repairs the mobile create button", async () => {
  const [secure, styles, sourceFix, homeActions, finalCss, finalRuntime, index, studio, legacyProxy] = await Promise.all([
    read("src/StudioSecure.jsx"),
    read("src/sidebar-account-footer-v85.css"),
    read("src/studio-v9-enhancements.css"),
    read("src/sidebar-home-actions-v90.css"),
    read("src/sidebar-final-v91.css"),
    read("src/sidebar-final-v91.js"),
    read("index.html"),
    read("src/StudioNext.jsx"),
    read("src/sidebar-logout-v80.js"),
  ]);

  assert.match(secure, /sidebar-account-footer-v85\.css/);
  assert.match(secure, /sidebar-home-actions-v90\.css/);
  assert.doesNotMatch(secure, /sidebar-logout-v80\.js|sidebar-react-footer-v84\.css/);
  assert.match(secure, /hideNaraRouteWithoutRemovingReactNodes/);
  assert.doesNotMatch(secure, /filter\(\(button\) => buttonLabel\(button\) === "Nara AI"\)[\s\S]{0,140}button\.remove\(\)/);

  assert.match(studio, />Anggota<\/span><\/button><button[^>]*>[\s\S]*?>Domain<\/span><\/button><\/nav>/);
  assert.match(studio, /<\/nav><div className="sn-account-footer"/);
  assert.doesNotMatch(studio, /<nav[^>]*>[\s\S]*sn-account-settings-v88[\s\S]*<\/nav>/);

  const sourceActive = executableCss(sourceFix);
  assert.match(sourceActive, /\.sn-side > nav > button:last-child[\s\S]*margin-top:\s*0\s*!important/);
  assert.doesNotMatch(sourceActive, /\.sn-side > nav > button:last-child[\s\S]{0,120}margin-top:\s*auto/);

  for (const marker of [
    "Sidebar navigation and account footer v89",
    ".sn-account-footer",
    ".sn-logo-mark > i",
    "display: none !important",
  ]) assert.ok(styles.includes(marker), marker);

  for (const marker of [
    "Sidebar and Ringkasan action geometry v90",
    'html[data-desktop-layout-requested="true"] .sn-welcome',
    "flex-wrap: wrap !important",
  ]) assert.ok(homeActions.includes(marker), marker);

  for (const marker of [
    "Sidebar final authority v91",
    '.sn-side > nav > button[data-sidebar-domain-v91="true"]',
    "justify-content: flex-start !important",
    "margin-top: 0 !important",
    ".sn-logo-mark > i",
    "background: #ffffff !important",
    "margin: 14px 14px 14px !important",
    "min-height: 58px !important",
  ]) assert.ok(finalCss.includes(marker), marker);
  assert.doesNotMatch(executableCss(finalCss), /margin-top:\s*auto/);

  for (const marker of [
    "sidebar-final-v91-20260728",
    'labelOf(button) === "Domain"',
    'domain.dataset.sidebarDomainV91 = "true"',
    'setImportant(nav, "justify-content", "flex-start")',
    '"margin-top": "0"',
    'for (const [property, value] of Object.entries',
    '.sn-logo-mark > i, .sn-logo > i',
    'setImportant(dot, "display", "none")',
    'createButton.dataset.mobileCreateV91 = "true"',
    'background: "#ffffff"',
  ]) assert.ok(finalRuntime.includes(marker), marker);
  assert.doesNotMatch(finalRuntime, /\.remove\(\)|insertAdjacentElement|appendChild|prepend/);

  assert.match(index, /sidebar-final-v91\.css\?v=91/);
  assert.match(index, /sidebar-final-v91\.js\?v=91/);
  assert.ok(index.indexOf("sidebar-final-v91.css?v=91") > index.indexOf("domain-dns-v67.css"));
  assert.ok(index.indexOf("sidebar-final-v91.js?v=91") > index.indexOf("domain-dns-v67.js"));
  assert.ok(legacyProxy.includes("sidebar-footer-v82-20260728"));
});

test("PWA cache rotates for final direct sidebar authority v91", async () => {
  const worker = await read("public/sw.js");
  assert.match(worker, /sidebar-final-v91-20260728/);
  assert.match(worker, /pwa-v91/);
  assert.match(worker, /service-worker-activated-sidebar-final-v91/);
  assert.match(worker, /NGE_BLOGGING_FORCE_RELOAD_V77/);
});
