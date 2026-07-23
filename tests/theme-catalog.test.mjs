import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";

function fingerprint(theme) {
  return createHash("sha256").update(`${theme.code.html}\n${theme.code.css}\n${theme.code.javascript}`).digest("hex");
}

test("catalog contains exactly 100 themes with unique identities", () => {
  assert.equal(THEME_COUNT, 100);
  assert.equal(BUILT_IN_THEMES.length, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.name)).size, 100);
});

test("all 100 themes have different HTML CSS JavaScript fingerprints", () => {
  const fingerprints = BUILT_IN_THEMES.map(fingerprint);
  assert.equal(new Set(fingerprints).size, 100);
});

test("every theme owns editable source and responsive breakpoints", () => {
  for (const theme of BUILT_IN_THEMES) {
    assert.match(theme.code.html, new RegExp(`data-theme=["']${theme.id}["']`));
    assert.match(theme.code.html, /ng-header/);
    assert.match(theme.code.css, /@media\(max-width:1024px\)/);
    assert.match(theme.code.css, /@media\(max-width:720px\)/);
    assert.match(theme.code.css, /ng-hero/);
    assert.match(theme.code.javascript, new RegExp(theme.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.ok(theme.code.html.length > 900);
    assert.ok(theme.code.css.length > 2500);
    assert.ok(theme.features.length >= 3);
    assert.ok(theme.defaultWidgetIds.length >= 4);
  }
});

test("theme families cover twenty distinct layouts and five variants", () => {
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.layout)).size, 20);
  const suffixes = new Set(BUILT_IN_THEMES.map((theme) => theme.id.split("-").at(-1)));
  assert.deepEqual([...suffixes].sort(), ["atelier","coast","dawn","night","prime"]);
});
