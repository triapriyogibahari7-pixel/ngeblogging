import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Domain rejects legacy inline offsets and uses the shared desktop navigation grid", async () => {
  const [runtime, styles, authority] = await Promise.all([
    read("src/sidebar-domain-alignment-v115.js"),
    read("src/sidebar-domain-alignment-v115.css"),
    read("src/studio-domain-single-authority-v112.js"),
  ]);

  assert.match(runtime, /sidebar-domain-alignment-v115-20260729/);
  assert.match(runtime, /BLOCKED_LEGACY_GEOMETRY = new Set/);
  assert.match(runtime, /"margin-left", "border-top", "transform", "box-shadow"/);
  assert.match(runtime, /CSSStyleDeclaration\?\.prototype/);
  assert.match(runtime, /registry\.protectedStyles\.has\(this\)/);
  assert.match(runtime, /cleanLegacyInlineGeometry\(domain\)/);
  assert.match(runtime, /domain\.style\.removeProperty\(property\)/);
  assert.doesNotMatch(runtime, /attributeFilter: \["class", "style"\]/);
  assert.match(runtime, /window\.visualViewport\?\.addEventListener\("resize"/);

  assert.match(styles, /data-sidebar-domain-alignment-v115/);
  assert.match(styles, /margin:2px auto!important/);
  assert.match(styles, /grid-template-columns:24px minmax\(0,112px\)!important/);
  assert.match(styles, /place-items:center!important/);
  assert.match(styles, /html\[data-desktop-layout-requested="true"\]/);

  assert.match(authority, /import "\.\/sidebar-domain-alignment-v115\.css"/);
  assert.match(authority, /import "\.\/sidebar-domain-alignment-v115\.js"/);
});
