import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("collapsed desktop sidebar hides only the Comments label", async () => {
  const [runtime, styles, authority] = await Promise.all([
    read("src/sidebar-comments-collapse-v116.js"),
    read("src/sidebar-comments-collapse-v116.css"),
    read("src/studio-domain-single-authority-v112.js"),
  ]);

  assert.match(runtime, /sidebar-comments-collapse-v116-20260729/);
  assert.match(runtime, /side\.classList\.contains\("collapsed"\)/);
  assert.match(runtime, /matchMedia\("\(min-width: 761px\)"\)/);
  assert.match(runtime, /dataset\.desktopLayoutRequested === "true"/);
  assert.match(runtime, /BLOCKED_WHEN_COLLAPSED\.has\(normalized\)/);
  assert.match(runtime, /label\.style === this/);
  assert.match(runtime, /label\.hidden = collapsed/);
  assert.match(runtime, /setInterval\(schedule, 500\)/);

  assert.match(styles, /\.sn-side\.collapsed>nav>#ngeblogging-comments-native-v106>span/);
  assert.match(styles, /display:none!important/);
  assert.match(styles, /visibility:hidden!important/);
  assert.match(styles, /html\[data-desktop-layout-requested="true"\]/);
  assert.match(styles, /\.sn-side:not\(\.collapsed\)>nav>#ngeblogging-comments-native-v106>span:not\(\[hidden\]\)/);
  assert.match(styles, /display:block!important/);

  assert.match(authority, /import "\.\/sidebar-comments-collapse-v116\.css"/);
  assert.match(authority, /import "\.\/sidebar-comments-collapse-v116\.js"/);
});
