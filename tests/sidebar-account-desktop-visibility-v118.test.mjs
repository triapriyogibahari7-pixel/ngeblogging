import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Pengaturan and Keluar icons stay visible when the desktop sidebar is collapsed", async () => {
  const [runtime, styles, authority] = await Promise.all([
    read("src/sidebar-account-desktop-visibility-v118.js"),
    read("src/sidebar-account-desktop-visibility-v118.css"),
    read("src/studio-domain-single-authority-v112.js"),
  ]);

  assert.match(runtime, /sidebar-account-desktop-visibility-v118-20260729/);
  assert.match(runtime, /desktopLayoutActive/);
  assert.match(runtime, /node\.hidden = false/);
  assert.match(runtime, /removeAttribute\("aria-hidden"\)/);
  assert.match(runtime, /\["Pengaturan", "Keluar"\]/);
  assert.match(runtime, /querySelector\(":scope > svg"\)/);
  assert.match(runtime, /\["class", "style", "hidden", "aria-hidden", "data-desktop-layout-requested"\]/);

  assert.match(styles, /studio-v30-desktop/);
  assert.match(styles, /studio-v30-laptop/);
  assert.match(styles, /studio-v30-desktop-phone/);
  assert.match(styles, /data-desktop-layout-requested="true"/);
  assert.match(styles, />button>svg\[hidden\]/);
  assert.match(styles, /display:block!important/);
  assert.match(styles, /visibility:visible!important/);
  assert.match(styles, /opacity:1!important/);
  assert.match(styles, /stroke:currentColor!important/);
  assert.match(styles, /\.sn-side\.collapsed>.sn-account-footer>button>span/);
  assert.doesNotMatch(styles, /studio-v30-compact:not/);

  assert.match(authority, /import "\.\/sidebar-account-desktop-visibility-v118\.css"/);
  assert.match(authority, /import "\.\/sidebar-account-desktop-visibility-v118\.js"/);
});
