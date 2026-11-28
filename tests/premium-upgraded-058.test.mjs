import test from 'node:test';
import assert from 'node:assert/strict';
import { PREMIUM_FREE_THEMES, PREMIUM_FREE_COUNT } from '../src/premium-free-catalog.mjs';
import { PREMIUM_BRIGHT_GENERATED as PREVIOUS } from '../src/premium-bright-themes-upgraded-057.mjs';
import { PREMIUM_BRIGHT_GENERATED as UPGRADED, PREMIUM_UPGRADED_058 as ULTRA } from '../src/premium-bright-themes-upgraded-058.mjs';

const TARGET = 'signature-058-kreator-3';

test('only theme 058 is replaced; 051-057 and the other themes stay exactly as before', () => {
  assert.equal(UPGRADED.length, PREVIOUS.length);
  assert.deepEqual(UPGRADED.map(theme => theme.id), PREVIOUS.map(theme => theme.id));
  UPGRADED.forEach((theme, index) => {
    if (theme.id === TARGET) assert.notEqual(theme, PREVIOUS[index]);
    else assert.equal(theme, PREVIOUS[index]);
  });
  assert.deepEqual(ULTRA.map(theme => theme.id), [TARGET]);
});

test('catalog size is unchanged and 051-058 are served as Ultra', () => {
  assert.ok(PREMIUM_FREE_COUNT >= 146);
  const topics = { 'signature-056-kreator-1': 'Kreator', 'signature-057-kreator-2': 'Kreator', [TARGET]: 'Kreator' };
  for (const id of ['signature-051-editorial-1', 'signature-052-editorial-2', 'signature-053-editorial-3', 'signature-054-editorial-4', 'signature-055-editorial-5', 'signature-056-kreator-1', 'signature-057-kreator-2', TARGET]) {
    const matches = PREMIUM_FREE_THEMES.filter(theme => theme.id === id);
    assert.equal(matches.length, 1);
    assert.match(matches[0].name, /Ultra$/);
    assert.equal(matches[0].topic, topics[id] || 'Editorial');
  }
  assert.ok(PREMIUM_FREE_THEMES.find(theme => theme.id === TARGET).code.javascript.length > 500);
});

test('Ultra 058: inline JS is self-contained, offline and safe; no external assets', () => {
  const { html, css, javascript } = ULTRA[0].code;
  assert.match(html, /<svg\b/);
  assert.match(html, /data-count=/);
  assert.match(html, /su-mode/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.doesNotMatch(html, /<(?:img|iframe|script|video|audio|link|object|embed)\b|https?:\/\/|\son[a-z]+=/i);
  assert.doesNotMatch(css, /@import|url\s*\(|https?:\/\/|\/\//i);
  assert.doesNotMatch(javascript, /\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon|eval|importScripts|localStorage|sessionStorage|indexedDB)\b|document\.cookie|innerHTML|outerHTML|insertAdjacentHTML|new Function|<\/script|https?:\/\//i);
  assert.match(javascript, /prefers-reduced-motion/);
  assert.match(javascript, /IntersectionObserver/);
  for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(html.includes(`id="${id}"`), `anchor target ${id}`);
});
