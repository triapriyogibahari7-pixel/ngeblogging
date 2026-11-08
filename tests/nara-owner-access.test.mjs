import test from 'node:test';
import assert from 'node:assert/strict';
import { isNaraOwner, naraOwnerAccess, assertNaraOwnerConnector } from '../shared/nara-owner-access.mjs';

const owner = { id: 'verified-user-id', email: 'triapriyogibahari7@gmail.com', email_confirmed_at: '2026-11-08T00:00:00Z' };

test('verified owner receives complimentary non-expiring access and exactly two connectors', () => {
  assert.deepEqual(naraOwnerAccess(owner), { complimentary: true, hideUpgrade: true, expiresAt: null, connectors: ['cloudflare', 'github'] });
  assert.equal(isNaraOwner({ ...owner, email: owner.email.toUpperCase() }), true);
  for (const provider of ['cloudflare', 'github']) assert.doesNotThrow(() => assertNaraOwnerConnector(owner, provider));
});

test('guest, other accounts, and unconfirmed identities receive no owner capabilities', () => {
  for (const user of [null, {}, { ...owner, id: '' }, { ...owner, email_confirmed_at: null }, { ...owner, email: 'other@example.com' }]) {
    assert.deepEqual(naraOwnerAccess(user), { complimentary: false, hideUpgrade: false, connectors: [] });
    assert.throws(() => assertNaraOwnerConnector(user, 'github'), { status: 403 });
  }
});

test('unknown providers are rejected and caller mutations cannot alter the catalog', () => {
  assert.throws(() => assertNaraOwnerConnector(owner, 'supabase'), { status: 403 });
  naraOwnerAccess(owner).connectors.push('supabase');
  assert.deepEqual(naraOwnerAccess(owner).connectors, ['cloudflare', 'github']);
});
