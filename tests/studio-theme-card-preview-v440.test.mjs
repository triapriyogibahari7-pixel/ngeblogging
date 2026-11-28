import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('v440 replaces card colour mocks with a bounded live preview and a single title', () => {
  const css = read('../src/studio-theme-card-preview-v440.css');
  const js = read('../src/studio-theme-card-preview-v440.js');
  assert.match(css, /\.tn-theme-grid[^{]*\.tn-card-mock\{display:none!important\}/);
  assert.match(css, /aspect-ratio:16\/10!important/);
  assert.match(js, /setAttribute\("sandbox", ""\)/);
  assert.match(js, /IntersectionObserver/);
  assert.doesNotMatch(js, /\.remove\(\)|removeChild|innerHTML/);
  assert.doesNotMatch(js, /domain|dns|cloudflare|midtrans|fetch\s*\(/i);
});

test('v440 is loaded by the theme studio code editor bundle without touching other files', () => {
  assert.match(read('../src/studio-theme-code-editor-v364.js'), /import "\.\/studio-theme-card-preview-v440\.js";/);
});
