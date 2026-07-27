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

test("desktop logout is moved to a dedicated sidebar footer", async () => {
  const [entry, logout] = await Promise.all([
    read("src/domain-authority-v75.js"),
    read("src/sidebar-logout-v80.js"),
  ]);
  assert.match(entry, /sidebar-logout-v80\.js/);
  for (const marker of [
    "sidebar-logout-v80-20260727",
    "sn-side-footer-v80",
    "Keluar dari Ngeblogging",
    "footer.append(logout)",
    "@media (min-width:901px)",
  ]) assert.ok(logout.includes(marker), marker);
});

test("PWA cache rotates for the isolated domain release", async () => {
  const worker = await read("public/sw.js");
  assert.match(worker, /domain-manager-v80-20260727/);
  assert.match(worker, /pwa-v80/);
  assert.match(worker, /service-worker-activated-domain-manager-v80/);
});
