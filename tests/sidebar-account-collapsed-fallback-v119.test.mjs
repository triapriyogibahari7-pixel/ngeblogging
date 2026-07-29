import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("collapsed Pengaturan and Keluar always render stable fallback icons", async () => {
  const [styles, settingsIcon, logoutIcon, authority] = await Promise.all([
    read("src/sidebar-account-collapsed-fallback-v119.css"),
    read("public/sidebar-settings-v119.svg"),
    read("public/sidebar-logout-v119.svg"),
    read("src/studio-domain-single-authority-v112.js"),
  ]);

  assert.match(styles, /\.sn-side\.collapsed>\.sn-account-footer/);
  assert.match(styles, /\.sn-account-settings-v88::before/);
  assert.match(styles, /\.sn-account-logout-v88::before/);
  assert.match(styles, /sidebar-settings-v119\.svg/);
  assert.match(styles, /sidebar-logout-v119\.svg/);
  assert.match(styles, /visibility:visible!important/);
  assert.match(styles, /opacity:1!important/);
  assert.match(styles, /z-index:10!important/);
  assert.match(styles, />svg\{[\s\S]*display:none!important/);

  assert.match(settingsIcon, /<circle cx="12" cy="12" r="3"/);
  assert.match(logoutIcon, /<path d="M10 17l5-5-5-5"/);
  assert.match(authority, /import "\.\/sidebar-account-collapsed-fallback-v119\.css"/);
});
