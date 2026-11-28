import test from 'node:test';
import assert from 'node:assert/strict';
import { PREMIUM_FREE_THEMES, PREMIUM_FREE_COUNT } from '../src/premium-free-catalog.mjs';
import { PREMIUM_BRIGHT_GENERATED as PREVIOUS } from '../src/premium-bright-themes-upgraded-054.mjs';
import { PREMIUM_BRIGHT_GENERATED as UPGRADED, PREMIUM_UPGRADED_055 as ULTRA } from '../src/premium-bright-themes-upgraded-055.mjs';

const TARGET = 'signature-055-editorial-5';

test('only theme 055 is replaced; 051-054 and the other themes stay exactly as before', () => {
  assert.equal(UPGRADED.length, PREVIOUS.length);
  assert.deepEqual(UPGRADED.map(theme => theme.id), PREVIOUS.map(theme => theme.id));
  UPGRADED.forEach((theme, index) => {
    if (theme.id === TARGET) assert.notEqual(theme, PREVIOUS[index]);
    else assert.equal(theme, PREVIOUS[index]);
  });
  assert.deepEqual(ULTRA.map(theme => theme.id), [TARGET]);
});

test('catalog size is unchanged and 051-055 are served as Ultra', () => {
  assert.ok(PREMIUM_FREE_COUNT >= 146);
  for (const id of ['signature-051-editorial-1', 'signature-052-editorial-2', 'signature-053-editorial-3', 'signature-054-editorial-4', TARGET]) {
    const matches = PREMIUM_FREE_THEMES.filter(theme => theme.id === id);
    assert.equal(matches.length, 1);
    assert.match(matches[0].name, /Ultra$/);
    assert.equal(matches[0].topic, 'Editorial');
  }
  assert.ok(PREMIUM_FREE_THEMES.find(theme => theme.id === TARGET).code.javascript.length > 500);
});

test('Ultra 055: inline JS is self-contained, offline and safe; no external assets', () => {
  const { html, css, javascript } = ULTRA[0].code;
  assert.match(html, /<svg\b/);
  assert.match(html, /data-count=/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.doesNotMatch(html, /<(?:img|iframe|script|video|audio|link|object|embed)\b|https?:\/\/|\son[a-z]+=/i);
  assert.doesNotMatch(css, /@import|url\s*\(|https?:\/\/|\/\//i);
  assert.doesNotMatch(javascript, /\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon|eval|importScripts|localStorage|sessionStorage|indexedDB)\b|document\.cookie|innerHTML|outerHTML|insertAdjacentHTML|new Function|<\/script|https?:\/\//i);
  assert.match(javascript, /prefers-reduced-motion/);
  assert.match(javascript, /IntersectionObserver/);
  for (const [, id] of html.matchAll(/for="([^"]+)"/g)) assert.ok(html.includes(`id="${id}"`), `label target ${id}`);
  for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(html.includes(`id="${id}"`), `anchor target ${id}`);
});
