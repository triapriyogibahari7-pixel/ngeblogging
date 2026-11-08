import test from 'node:test';
import assert from 'node:assert/strict';
import { naraOwnerChatOptions } from '../server/nara-owner-chat-options.mjs';
const owner = { id: 'owner', email: 'triapriyogibahari7@gmail.com', email_confirmed_at: '2026-11-08' };
const maximal = Object.freeze({ id: 'xhigh', maxTokens: 4000 });
test('owner maximum policy is isolated and preserves profile', () => {
  for (const model of ['nara-vision', 'nara-max']) {
    const options = naraOwnerChatOptions(owner, model, maximal);
    assert.equal(options.quota.remaining, null);
    assert.equal(options.intelligence.maxTokens, 8192);
    assert.equal(options.policy.respectProviderLimits, true);
  }
  assert.equal(maximal.maxTokens, 4000);
  for (const user of [null, {}, { ...owner, email: 'visitor@example.com' }, { ...owner, email_confirmed_at: null }, { ...owner, id: null }]) assert.equal(naraOwnerChatOptions(user, 'nara-max', maximal), null);
  assert.equal(naraOwnerChatOptions(owner, 'nara-mini', maximal), null);
  assert.equal(naraOwnerChatOptions(owner, 'nara-max', { id: 'standard' }), null);
});
test('server output token configuration is bounded', () => {
  assert.equal(naraOwnerChatOptions(owner, 'nara-max', maximal, { NARA_OWNER_MAX_OUTPUT_TOKENS: '12000' }).intelligence.maxTokens, 12000);
  for (const value of ['Infinity', '-1', '999999', 'NaN']) assert.equal(naraOwnerChatOptions(owner, 'nara-max', maximal, { NARA_OWNER_MAX_OUTPUT_TOKENS: value }).intelligence.maxTokens, 8192);
});
