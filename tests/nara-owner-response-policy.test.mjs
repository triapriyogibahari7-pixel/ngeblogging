import test from 'node:test';
import assert from 'node:assert/strict';
import { naraOwnerResponsePolicy } from '../shared/nara-owner-response-policy.mjs';

const owner = { id: 'verified-owner', email: 'triapriyogibahari7@gmail.com', email_confirmed_at: '2026-11-08T00:00:00Z' };
test('maximum policy is restricted to verified owner and supported modes', () => {
  for (const mode of ['vision-max-pro', 'maksimal']) {
    const policy = naraOwnerResponsePolicy(owner, mode);
    assert.equal(policy.applicationMessageQuota, null);
    assert.equal(policy.respectProviderLimits, true);
    assert.equal(policy.requireConfirmationForWrites, true);
    assert.equal(policy.metadataIsExecutionResult, false);
    assert.equal(Object.isFrozen(policy), true);
  }
});
test('visitors, ordinary users, unconfirmed accounts and unrelated modes keep existing policy', () => {
  for (const user of [null, {}, { ...owner, email: 'visitor@example.com' }, { ...owner, email_confirmed_at: null }, { ...owner, id: null }]) {
    assert.equal(naraOwnerResponsePolicy(user, 'maksimal'), null);
  }
  assert.equal(naraOwnerResponsePolicy(owner, 'standard'), null);
});
