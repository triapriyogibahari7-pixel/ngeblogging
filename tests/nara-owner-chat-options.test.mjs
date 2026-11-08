import test from 'node:test';
import assert from 'node:assert/strict';
import { naraOwnerChatOptions } from '../server/nara-owner-chat-options.mjs';
import { naraIntelligenceProfileV227 } from '../server/nara-model-contract-v227.mjs';
const owner = { id: 'owner', email: 'triapriyogibahari7@gmail.com', email_confirmed_at: '2026-11-08' };
const maximal = naraIntelligenceProfileV227('xhigh');
test('verified owner maximum mode connects policy to actual backend IDs', () => {
  for (const model of ['nara-vision', 'nara-max']) {
    const options = naraOwnerChatOptions(owner, model, maximal);
    assert.equal(options.quota.allowed, true);
    assert.equal(options.quota.remaining, null);
    assert.equal(options.intelligence.maxTokens, 8192);
    assert.equal(options.capabilities.connectorExecutionAvailable, false);
    assert.equal(options.capabilities.automaticContinuationAvailable, false);
  }
});
test('other accounts and modes retain normal backend quota path', () => {
  for (const user of [null, {}, { ...owner, email: 'visitor@example.com' }, { ...owner, email_confirmed_at: null }]) assert.equal(naraOwnerChatOptions(user, 'nara-max', maximal), null);
  assert.equal(naraOwnerChatOptions(owner, 'nara-mini', maximal), null);
  assert.equal(naraOwnerChatOptions(owner, 'nara-max', naraIntelligenceProfileV227('standard')), null);
  assert.equal(maximal.maxTokens, 4000);
});
test('server output configuration is bounded', () => {
  assert.equal(naraOwnerChatOptions(owner, 'nara-max', maximal, { NARA_OWNER_MAX_OUTPUT_TOKENS: '12000' }).intelligence.maxTokens, 12000);
  for (const value of ['Infinity', '-1', '999999', 'NaN']) assert.equal(naraOwnerChatOptions(owner, 'nara-max', maximal, { NARA_OWNER_MAX_OUTPUT_TOKENS: value }).intelligence.maxTokens, 8192);
});
