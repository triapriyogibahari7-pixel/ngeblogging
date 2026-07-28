import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Domain copies exact desktop sidebar geometry from a stable workspace sibling", async () => {
  const [runtime, styles, authority] = await Promise.all([
    read("src/sidebar-domain-alignment-v115.js"),
    read("src/sidebar-domain-alignment-v115.css"),
    read("src/studio-domain-single-authority-v112.js"),
  ]);

  assert.match(runtime, /sidebar-domain-alignment-v115-20260729/);
  assert.match(runtime, /REFERENCE_LABELS = \["Anggota", "Analitik"/);
  assert.match(runtime, /copyGeometry\(reference, domain, BUTTON_GEOMETRY\)/);
  assert.match(runtime, /copyGeometry\(reference\.querySelector\("svg"\), domain\.querySelector\("svg"\), ICON_GEOMETRY\)/);
  assert.match(runtime, /copyGeometry\(reference\.querySelector\("span"\), domain\.querySelector\("span"\), LABEL_GEOMETRY\)/);
  assert.match(runtime, /mutation\.attributeName === "style"/);
  assert.match(runtime, /window\.visualViewport\?\.addEventListener\("resize"/);

  assert.match(styles, /data-sidebar-domain-alignment-v115/);
  assert.match(styles, /margin:2px auto!important/);
  assert.match(styles, /grid-template-columns:24px minmax\(0,112px\)!important/);
  assert.match(styles, /place-items:center!important/);
  assert.match(styles, /html\[data-desktop-layout-requested="true"\]/);

  assert.match(authority, /import "\.\/sidebar-domain-alignment-v115\.css"/);
  assert.match(authority, /import "\.\/sidebar-domain-alignment-v115\.js"/);
});
