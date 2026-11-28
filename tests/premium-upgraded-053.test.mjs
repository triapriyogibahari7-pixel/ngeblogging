import test from 'node:test';
import assert from 'node:assert/strict';
import { PREMIUM_FREE_THEMES, PREMIUM_FREE_COUNT } from '../src/premium-free-catalog.mjs';
import { PREMIUM_BRIGHT_GENERATED as PREVIOUS } from '../src/premium-bright-themes-upgraded.mjs';
import { PREMIUM_BRIGHT_GENERATED as UPGRADED, PREMIUM_UPGRADED_053 as ULTRA } from '../src/premium-bright-themes-upgraded-053.mjs';

const TARGET = 'signature-053-editorial-3';

test('only theme 053 is replaced; 051, 052 and the other themes stay exactly as before', () => {
  assert.equal(UPGRADED.length, PREVIOUS.length);
  assert.deepEqual(UPGRADED.map(theme => theme.id), PREVIOUS.map(theme => theme.id));
  UPGRADED.forEach((theme, index) => {
    if (theme.id === TARGET) assert.notEqual(theme, PREVIOUS[index]);
    else assert.equal(theme, PREVIOUS[index]);
  });
  assert.deepEqual(ULTRA.map(theme => theme.id), [TARGET]);
});

test('catalog size is unchanged and 051, 052, 053 are all served as Ultra', () => {
  assert.ok(PREMIUM_FREE_COUNT >= 146);
  for (const id of ['signature-051-editorial-1', 'signature-052-editorial-2', TARGET]) {
    const matches = PREMIUM_FREE_THEMES.filter(theme => theme.id === id);
    assert.equal(matches.length, 1);
    assert.match(matches[0].name, /Ultra$/);
    assert.equal(matches[0].topic, 'Editorial');
    assert.equal(matches[0].code.javascript, '');
  }
});

test('Ultra 053 uses inline SVG and CSS only: no scripts, no external assets, reduced-motion respected', () => {
  const { html, css, javascript } = ULTRA[0].code;
  assert.match(html, /<svg\b/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.equal(javascript, '');
  assert.doesNotMatch(html, /<(?:img|iframe|script|video|audio|link|object|embed)\b|https?:\/\/|\son[a-z]+=/i);
  assert.doesNotMatch(css, /@import|url\s*\(|https?:\/\/|\/\//i);
  for (const [, id] of html.matchAll(/for="([^"]+)"/g)) assert.ok(html.includes(`id="${id}"`), `label target ${id}`);
});
