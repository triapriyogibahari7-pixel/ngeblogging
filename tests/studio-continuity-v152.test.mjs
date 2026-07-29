import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Studio v152 preserves the desktop sidebar preference", async () => {
  const source = await read("src/studio-continuity-v152.js");
  assert.match(source, /SIDEBAR_PREFERENCE_KEY/);
  assert.match(source, /localStorage\.getItem\(SIDEBAR_PREFERENCE_KEY\)/);
  assert.match(source, /localStorage\.setItem\(SIDEBAR_PREFERENCE_KEY, value\)/);
  assert.match(source, /currentLayoutMode\(\) === "small"/);
  assert.match(source, /\.sn-sidebar-toggle/);
});

test("small and medium Nara windows stay non-modal", async () => {
  const [source, styles] = await Promise.all([
    read("src/studio-continuity-v152.js"),
    read("src/studio-continuity-v152.css"),
  ]);
  assert.match(source, /const modal = size === "full"/);
  assert.match(source, /dataset\.naraInteraction/);
  assert.match(source, /aria-modal/);
  assert.match(styles, /data-nara-interaction="non-modal"/);
  assert.match(styles, /pointer-events:\s*none\s*!important/);
  assert.match(styles, /\.nara-assistant-shell\s*\{[\s\S]*pointer-events:\s*auto\s*!important/);
  assert.match(styles, /data-nara-size="small"/);
  assert.match(styles, /data-nara-size="medium"/);
  assert.match(styles, /data-nara-size="full"/);
});

test("Studio entry imports the v152 authority last", async () => {
  const studio = await read("src/Studio.jsx");
  const jsIndex = studio.indexOf('import "./studio-continuity-v152.js"');
  const cssIndex = studio.indexOf('import "./studio-continuity-v152.css"');
  assert.ok(jsIndex > studio.indexOf('import "./studio-completion-v151.js"'));
  assert.ok(cssIndex > studio.indexOf('import "./studio-completion-v151.css"'));
});
