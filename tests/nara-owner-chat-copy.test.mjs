import test from 'node:test';
import assert from 'node:assert/strict';
import { isNaraArticlePrompt, isNaraDefaultWelcome } from '../src/nara-owner-chat-copy.mjs';
test('only predefined article prompts match', () => {
  for (const text of ['Buat ide artikel', 'Perbaiki tulisan', 'Perbaiki artikel', 'Audit SEO']) assert.equal(isNaraArticlePrompt(text), true);
  for (const text of ['Jelaskan gambar', 'Konektor', 'Kirim pesan', 'Perbaiki kode']) assert.equal(isNaraArticlePrompt(text), false);
});
test('matches default signed-in welcome, not arbitrary assistant replies', () => {
  assert.equal(isNaraDefaultWelcome('Halo Tri. Saya Nara, asisten Ngeblogging Anda. Saya bisa membantu menulis, meriset ide, memperbaiki SEO, dan memahami lampiran.'), true);
  assert.equal(isNaraDefaultWelcome('Berikut hasil riset proyek Anda.'), false);
  assert.equal(isNaraDefaultWelcome('Halo Tri. Berikut hasil analisis artikel.'), false);
});
