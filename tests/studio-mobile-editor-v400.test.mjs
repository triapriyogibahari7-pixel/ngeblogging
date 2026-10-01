import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const editor = await readFile(new URL("../src/ContentEditor.jsx", import.meta.url), "utf8");
const secure = await readFile(new URL("../src/StudioSecure.jsx", import.meta.url), "utf8");
const css = await readFile(new URL("../src/studio-mobile-editor-v400.css", import.meta.url), "utf8");

test("v400 mobile editor authority is wired into both editor entry paths", () => {
  assert.match(editor, /studio-mobile-editor-v400\.css/);
  assert.match(editor, /data-mobile-editor-v400="true"/);
  assert.match(secure, /studio-mobile-editor-v400\.css/);
});

test("v400 keeps the title and actions in a deterministic two-row grid", () => {
  assert.match(css, /\.ce-titlebar\{[\s\S]*display:grid!important/);
  assert.match(css, /grid-template-areas:"back file" "actions actions"!important/);
  assert.match(css, /\.ce-file\{[\s\S]*display:grid!important/);
  assert.match(css, /\.ce-actions\{[\s\S]*display:grid!important/);
});

test("v400 removes the old striped word-status block on small devices", () => {
  assert.match(css, /\.ce-word-status\{\s*display:none!important/);
});

test("v400 is gated to the small device mode and never targets tablet or desktop modes", () => {
  assert.match(css, /html\[data-studio-device-mode="small"\]/);
  assert.doesNotMatch(css, /data-studio-device-mode="large"/);
  assert.doesNotMatch(css, /data-studio-responsive-mode="tablet"/);
  assert.doesNotMatch(css, /data-studio-responsive-mode="desktop"/);
  assert.doesNotMatch(css, /editor-v266-large/);
});
