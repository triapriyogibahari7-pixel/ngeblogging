import test from 'node:test';
import assert from 'node:assert/strict';
import { requireConnectorAdminIdentity } from '../server/nara-connector-admin-identity.mjs';
const admin = { id: '91d4b436-6d7a-4e46-93f5-1ecdc6d33fb3', email: 'triapriyogibahari7@gmail.com', email_confirmed_at: '2026-07-21T10:49:16Z', is_anonymous: false };
const denied = value => assert.throws(() => requireConnectorAdminIdentity(value), { message: 'CONNECTOR_ADMIN_REQUIRED' });
test('verified target identity passes the identity layer only', () => {
 assert.equal(requireConnectorAdminIdentity(admin), admin);
 assert.equal(requireConnectorAdminIdentity({ ...admin, email: ' TRIAPRIYOGIBAHARI7@gmail.com ' }).id, admin.id);
});
test('same email on a different ID is denied', () => denied({ ...admin, id: 'another-user' }));
test('same ID with a different email is denied', () => denied({ ...admin, email: 'other@example.com' }));
test('missing, invalid or non-string confirmation timestamps are denied', () => {
 for (const email_confirmed_at of [null, undefined, '', 'not-a-date', true]) denied({ ...admin, email_confirmed_at });
});
test('metadata roles and anonymous identities cannot bypass policy', () => {
 denied({ id: 'ordinary-user', email: 'other@example.com', email_confirmed_at: admin.email_confirmed_at, user_metadata: { role: 'admin' }, app_metadata: { role: 'admin' } });
 denied({ ...admin, is_anonymous: true });
});
test('malformed identities fail closed without returning private fields', () => {
 for (const value of [null, undefined, {}, { ...admin, email: null }, { ...admin, id: undefined }]) denied(value);
});
