import test from 'node:test';
import assert from 'node:assert/strict';
import { CONNECTOR_CATALOG, normalizeConnection, publicConnection } from '../shared/nara-connector-registry.mjs';
import { sealCredential, openCredential } from '../server/nara-connector-credentials.mjs';
const accountId = 'a'.repeat(32), zoneId = 'b'.repeat(32);
const key = '12'.repeat(32), scope = { ownerId: 'admin-1', connectionId: 'connection-1', provider: 'github' };
test('five immutable providers support independent account targets', () => {
 assert.equal(CONNECTOR_CATALOG.length, 5);
 assert.ok(CONNECTOR_CATALOG.every(Object.isFrozen));
 for (const provider of ['cloudflare', 'cloudflare-browser-rendering']) assert.equal(normalizeConnection({ provider, label: 'Work', accountId }).accountId, accountId);
 assert.equal(normalizeConnection({ provider: 'cloudflare-one-waf', label: 'Security', accountId, zoneId }).zoneId, zoneId);
 assert.equal(normalizeConnection({ provider: 'supabase', label: 'Data', projectRef: 'abcdefghijklmnopqrst' }).projectRef, 'abcdefghijklmnopqrst');
 assert.equal(normalizeConnection({ provider: 'github', label: 'Code', repository: 'another-org/another-repo' }).repository, 'another-org/another-repo');
});
test('unknown fields, providers and arbitrary target URLs are rejected', () => {
 for (const value of [null, [], { provider: 'other', label: 'X' }, { provider: 'github', label: 'X', repository: 'x/y', url: 'http://localhost' }, { provider: 'supabase', label: 'X', projectRef: 'https://evil.example' }, { provider: 'github', label: 'X', repository: 'x/..' }, { provider: 'cloudflare', label: 'X', accountId, repository: 'x/y' }]) assert.throws(() => normalizeConnection(value), /INVALID_CONNECTION/);
});
test('public serialization drops credentials and internal fields', () => {
 const record = { id: 'one', config: { provider: 'github', label: 'Code', repository: 'x/y' }, status: 'disconnected', enabled: false, token: 'private-token', sealed: { ciphertext: 'secret' } };
 const value = publicConnection(record);
 assert.equal(value.status, 'disconnected');
 assert.equal(value.enabled, false);
 assert.ok(!JSON.stringify(value).includes('private-token'));
 assert.ok(!Object.hasOwn(value, 'sealed'));
});
test('credentials round trip with fresh randomized nonces', async () => {
 const a = await sealCredential('test-token', key, scope), b = await sealCredential('test-token', key, scope);
 assert.notEqual(a.iv, b.iv);
 assert.ok(!JSON.stringify(a).includes('test-token'));
 assert.equal(await openCredential(a, key, scope), 'test-token');
});
test('credentials cannot be moved across owners, connections or providers', async () => {
 const sealed = await sealCredential('test-token', key, scope);
 for (const field of ['ownerId', 'connectionId', 'provider']) await assert.rejects(openCredential(sealed, key, { ...scope, [field]: 'other' }), /CREDENTIAL_UNAVAILABLE/);
 await assert.rejects(openCredential(sealed, '34'.repeat(32), scope), /CREDENTIAL_UNAVAILABLE/);
 const tampered = { ...sealed, ciphertext: (sealed.ciphertext[0] === '0' ? '1' : '0') + sealed.ciphertext.slice(1) };
 await assert.rejects(openCredential(tampered, key, scope), /CREDENTIAL_UNAVAILABLE/);
});
test('missing keys and invalid tokens fail closed', async () => {
 await assert.rejects(sealCredential('test-token', '', scope), /CONNECTOR_KEY_UNAVAILABLE/);
 await assert.rejects(sealCredential('with space', key, scope), /INVALID_CREDENTIAL/);
 await assert.rejects(sealCredential('test-token', key, {}), /INVALID_CREDENTIAL_CONTEXT/);
});
