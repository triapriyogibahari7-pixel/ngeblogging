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

test("Domain stays after Anggota while account actions remain in the dedicated footer", async () => {
  const [secure, styles, sourceFix, homeActions, studio, legacyProxy] = await Promise.all([
    read("src/StudioSecure.jsx"),
    read("src/sidebar-account-footer-v85.css"),
    read("src/studio-v9-enhancements.css"),
    read("src/sidebar-home-actions-v90.css"),
    read("src/StudioNext.jsx"),
    read("src/sidebar-logout-v80.js"),
  ]);
  assert.match(secure, /sidebar-account-footer-v85\.css/);
  assert.match(secure, /sidebar-home-actions-v90\.css/);
  assert.match(secure, /sidebar-home-actions-v90-20260728/);
  assert.doesNotMatch(secure, /sidebar-logout-v80\.js|sidebar-react-footer-v84\.css/);
  assert.match(secure, /hideNaraRouteWithoutRemovingReactNodes/);
  assert.doesNotMatch(secure, /filter\(\(button\) => buttonLabel\(button\) === "Nara AI"\)[\s\S]{0,140}button\.remove\(\)/);

  for (const marker of [
    'className="sn-account-footer"',
    'data-sidebar-footer-release="v88"',
    "sn-account-settings-v88",
    "sn-account-logout-v88",
    'onClick={()=>chooseView("settings")}',
    "onClick={onExit}",
    'className="sn-logo-mark"',
  ]) assert.ok(studio.includes(marker), marker);
  assert.match(studio, />Anggota<\/span><\/button><button[^>]*>[\s\S]*?>Domain<\/span><\/button><\/nav>/);
  assert.match(studio, /<\/nav><div className="sn-account-footer"/);
  assert.doesNotMatch(studio, /<nav[^>]*>[\s\S]*sn-account-settings-v88[\s\S]*<\/nav>/);

  const sourceActive = executableCss(sourceFix);
  assert.match(sourceActive, /\.sn-side > nav > button:last-child[\s\S]*margin-top:\s*0\s*!important/);
  assert.match(sourceActive, /border-top:\s*0\s*!important/);
  assert.doesNotMatch(sourceActive, /\.sn-side > nav > button:last-child[\s\S]{0,120}margin-top:\s*auto/);

  for (const marker of [
    "Sidebar navigation and account footer v89",
    ".sn-side > nav > button:last-child",
    "margin-top: 0 !important",
    "margin-bottom: 0 !important",
    ".sn-account-footer",
    ".sn-account-settings-v88",
    ".sn-account-logout-v88",
    "flex: 0 0 auto !important",
    "min-height: 48px !important",
    "min-height: 58px !important",
    "font-size: 15px !important",
    ".sn-logo-mark > i",
    "display: none !important",
    ".sn-logo::after",
    "content: none !important",
  ]) assert.ok(styles.includes(marker), marker);

  for (const marker of [
    "Sidebar and Ringkasan action geometry v90",
    'html[data-desktop-layout-requested="true"] .sn-welcome',
    "flex-wrap: wrap !important",
    "@media (max-width: 1100px)",
    "grid-template-columns: repeat(2, minmax(0, 1fr)) !important",
    "width: 100% !important",
  ]) assert.ok(homeActions.includes(marker), marker);
  assert.doesNotMatch(executableCss(homeActions), /margin-top:\s*auto|overflow:\s*hidden\s*!important/);

  const activeStyles = executableCss(styles);
  assert.doesNotMatch(activeStyles, /position:\s*(?:absolute|fixed|sticky)\s*!important|nth-last-child|margin-top:\s*auto\s*!important/);
  assert.doesNotMatch(activeStyles, /^\s*bottom:\s*\d/m);
  assert.ok(legacyProxy.includes("sidebar-footer-v82-20260728"), "legacy proxy stays archived but is no longer imported");
});

test("PWA cache rotates for Domain source flow and Ringkasan actions v90", async () => {
  const worker = await read("public/sw.js");
  assert.match(worker, /sidebar-home-actions-v90-20260728/);
  assert.match(worker, /pwa-v90/);
  assert.match(worker, /service-worker-activated-sidebar-home-actions-v90/);
  assert.match(worker, /NGE_BLOGGING_FORCE_RELOAD_V77/);
});
