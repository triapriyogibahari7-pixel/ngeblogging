import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Pengaturan and Keluar mirror the live workspace navigation axis", async () => {
  const [runtime, styles, authority, studio] = await Promise.all([
    read("src/sidebar-account-footer-alignment-v117.js"),
    read("src/sidebar-account-footer-alignment-v117.css"),
    read("src/studio-domain-single-authority-v112.js"),
    read("src/StudioNext.jsx"),
  ]);

  assert.match(runtime, /sidebar-account-footer-alignment-v117-20260729/);
  assert.match(runtime, /labelOf\(button\) === "Ringkasan"/);
  assert.match(runtime, /getBoundingClientRect\(\)/);
  assert.match(runtime, /--af117-row-left/);
  assert.match(runtime, /--af117-row-width/);
  assert.match(runtime, /--af117-icon-center/);
  assert.match(runtime, /--af117-label-left/);
  assert.match(runtime, /side\.classList\.contains\("collapsed"\)/);
  assert.match(runtime, /attributeFilter: \["class"\]/);

  assert.match(styles, /width:var\(--af117-row-width\)!important/);
  assert.match(styles, /margin:0 0 0 var\(--af117-row-left\)!important/);
  assert.match(styles, /left:var\(--af117-icon-center\)!important/);
  assert.match(styles, /margin:0 10px 0 var\(--af117-label-left\)!important/);
  assert.match(styles, /studio-v30-desktop/);
  assert.match(styles, /studio-v30-laptop/);
  assert.match(styles, /studio-v30-desktop-phone/);
  assert.match(styles, /studio-v30-compact/);
  assert.match(styles, /data-desktop-layout-requested="true"/);

  assert.match(authority, /import "\.\/sidebar-account-footer-alignment-v117\.css"/);
  assert.match(authority, /import "\.\/sidebar-account-footer-alignment-v117\.js"/);
  assert.match(studio, /className="sn-account-footer"/);
  assert.match(studio, />Pengaturan<\/span>/);
  assert.match(studio, />Keluar<\/span>/);
});
