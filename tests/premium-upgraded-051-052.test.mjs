import test from 'node:test';
import assert from 'node:assert/strict';
import { PREMIUM_FREE_THEMES, PREMIUM_FREE_COUNT } from '../src/premium-free-catalog.mjs';
import { PREMIUM_BRIGHT_GENERATED as ORIGINAL } from '../src/premium-bright-themes-generated.mjs';
import { PREMIUM_BRIGHT_GENERATED as UPGRADED, PREMIUM_UPGRADED_051_052 as ULTRA } from '../src/premium-bright-themes-upgraded.mjs';

const TARGETS = ['signature-051-editorial-1', 'signature-052-editorial-2'];

test('only themes 051 and 052 are replaced; IDs and the other 80 themes are untouched', () => {
  assert.equal(UPGRADED.length, ORIGINAL.length);
  assert.deepEqual(UPGRADED.map(theme => theme.id), ORIGINAL.map(theme => theme.id));
  UPGRADED.forEach((theme, index) => {
    if (TARGETS.includes(theme.id)) assert.notEqual(theme, ORIGINAL[index]);
    else assert.equal(theme, ORIGINAL[index]);
  });
  assert.deepEqual(ULTRA.map(theme => theme.id), TARGETS);
});

test('catalog size is unchanged and the Ultra versions are served', () => {
  assert.ok(PREMIUM_FREE_COUNT >= 146);
  for (const id of TARGETS) {
    const matches = PREMIUM_FREE_THEMES.filter(theme => theme.id === id);
    assert.equal(matches.length, 1);
    assert.match(matches[0].name, /Ultra$/);
    assert.equal(matches[0].topic, 'Editorial');
    assert.equal(matches[0].code.javascript, '');
  }
});

test('Ultra 051/052 use inline SVG and CSS only: no scripts, no external assets, reduced-motion respected', () => {
  for (const theme of ULTRA) {
    const { html, css, javascript } = theme.code;
    assert.match(html, /<svg\b/);
    assert.match(css, /prefers-reduced-motion:reduce/);
    assert.equal(javascript, '');
    assert.doesNotMatch(html, /<(?:img|iframe|script|video|audio|link|object|embed)\b|https?:\/\/|\son[a-z]+=/i);
    assert.doesNotMatch(css, /@import|url\s*\(|https?:\/\/|\/\//i);
    for (const [, id] of html.matchAll(/for="([^"]+)"/g)) assert.ok(html.includes(`id="${id}"`), `label target ${id}`);
  }
});
