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

test("settings and logout are real React buttons pinned in every sidebar layout", async () => {
  const [secure, styles, studio, legacyProxy] = await Promise.all([
    read("src/StudioSecure.jsx"),
    read("src/sidebar-react-footer-v84.css"),
    read("src/StudioNext.jsx"),
    read("src/sidebar-logout-v80.js"),
  ]);
  assert.match(secure, /sidebar-react-footer-v84\.css/);
  assert.doesNotMatch(secure, /sidebar-logout-v80\.js/);
  assert.match(secure, /sidebar-react-footer-v84-20260728/);
  for (const marker of [
    ".sn-side > nav > button:nth-last-child(2)",
    ".sn-side > nav > button:last-child",
    "position: absolute !important",
    "bottom: 66px !important",
    "bottom: 10px !important",
    "min-height: 58px !important",
    "font-size: 15px !important",
    "data-desktop-layout-requested",
    "data-layout-mode=\"tablet\"",
  ]) assert.ok(styles.includes(marker), marker);
  assert.match(studio, />Pengaturan<\/span>/);
  assert.match(studio, />Keluar<\/span>/);
  assert.match(studio, /onClick=\{onExit\}/);
  assert.ok(legacyProxy.includes("sidebar-footer-v82-20260728"), "legacy proxy stays archived but is no longer imported");
});

test("PWA cache rotates for React-owned sidebar footer", async () => {
  const worker = await read("public/sw.js");
  assert.match(worker, /sidebar-react-footer-v84-20260728/);
  assert.match(worker, /pwa-v84/);
  assert.match(worker, /service-worker-activated-sidebar-react-footer-v84/);
  assert.match(worker, /NGE_BLOGGING_FORCE_RELOAD_V77/);
});
