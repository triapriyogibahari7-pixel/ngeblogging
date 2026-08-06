import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('v313 Nara keeps small and medium non-modal while full screen remains modal', async () => {
  const [jsx, css, release] = await Promise.all([
    read('src/NaraAssistant.jsx'),
    read('src/nara-v313.css'),
    read('public/release-v313.json'),
  ]);
  assert.match(jsx, /import "\.\/nara-v313\.css"/);
  assert.match(jsx, /data-nara-layer-size=\{size\}/);
  assert.match(jsx, /aria-modal=\{size === "full" \? "true" : "false"\}/);
  assert.match(jsx, /\{size === "full" && <button className="nara-assistant-backdrop"/);
  assert.doesNotMatch(jsx, /aria-modal="true" aria-label="Nara AI Assistant"/);
  assert.match(css, /data-nara-layer-size="small"/);
  assert.match(css, /data-nara-layer-size="medium"/);
  assert.match(css, /pointer-events:none!important/);
  assert.match(css, /\.nara-assistant-shell\{\s*pointer-events:auto!important/);
  assert.match(css, /data-nara-layer-size="full"/);
  assert.match(release, /"smallNonModal": true/);
  assert.match(release, /"fullScreenModalOnly": true/);
});

test('v313 preserves every requested Nara input and intelligence control', async () => {
  const jsx = await read('src/NaraAssistant.jsx');
  for (const marker of [
    '<Camera />', '<ImageIcon />', '<File />',
    '<Mic />', 'SpeakerIcon',
    'Nara Mini', 'Nara Writer', 'Nara Vision', 'Nara Max',
    'Instan', 'Sedang', 'Tinggi', 'Maksimal',
    'title="Tutup"',
  ]) assert.match(jsx, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(jsx, /capture="environment"/);
  assert.match(jsx, /accept="\.txt,\.md,\.csv,\.json,text\/plain,text\/markdown,text\/csv,application\/json"/);
});

test('v313 Nara CSS never reaches into the Studio sidebar', async () => {
  const css = await read('src/nara-v313.css');
  assert.doesNotMatch(css, /#ngeblogging-studio-sidebar|\.sn-side|\.sn-logo-mark|studio-sidebar/i);
  assert.match(css, /\.nara-floating-button/);
  assert.match(css, /position:fixed!important/);
  assert.match(css, /bottom:calc\(100% \+ 8px\)!important/);
  assert.match(css, /animation:none!important/);
});
