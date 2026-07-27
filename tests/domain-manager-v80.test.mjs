import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

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

test("settings and logout are proportionate, fixed and functional in every sidebar layout", async () => {
  const [entry, navigation, studio] = await Promise.all([
    read("src/domain-authority-v75.js"),
    read("src/sidebar-logout-v80.js"),
    read("src/StudioNext.jsx"),
  ]);
  assert.match(entry, /sidebar-logout-v80\.js/);
  for (const marker of [
    "sidebar-footer-v82-20260728",
    "sn-side-footer-v82",
    "sn-footer-action-v82",
    "Buka Pengaturan",
    "Keluar dari Ngeblogging",
    "sourceButton(currentSide, \"Pengaturan\")",
    "document.querySelector(\".sn-avatar\")?.click()",
    "position:absolute!important",
    "--sn-footer-v82-height:158px",
    "font-size:15px!important",
    "min-height:58px!important",
    "data-desktop-layout-requested",
    "data-layout-mode=\"tablet\"",
  ]) assert.ok(navigation.includes(marker), marker);
  assert.doesNotMatch(navigation, /footer\.append\(logout\)|appendChild\(logout\)/);
  assert.match(studio, />Pengaturan<\/span>/);
  assert.match(studio, />Keluar<\/span>/);
});

test("PWA cache rotates for proportional sidebar footer", async () => {
  const worker = await read("public/sw.js");
  assert.match(worker, /sidebar-footer-v82-20260728/);
  assert.match(worker, /pwa-v82/);
  assert.match(worker, /service-worker-activated-sidebar-footer-v82/);
  assert.match(worker, /NGE_BLOGGING_FORCE_RELOAD_V77/);
});
