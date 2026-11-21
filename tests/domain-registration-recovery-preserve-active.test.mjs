import test from 'node:test';
import assert from 'node:assert/strict';
import { recoverPendingFullZoneRegistration } from '../server/pending-full-zone-registration.mjs';

const siteId = '11111111-1111-4111-8111-111111111111';
const zoneId = 'a'.repeat(32);
const env = { SUPABASE_URL: 'https://db.example', SUPABASE_PUBLISHABLE_KEY: 'test-public-key', CLOUDFLARE_API_TOKEN: 'test-token', CLOUDFLARE_ACCOUNT_ID: 'b'.repeat(32), CLOUDFLARE_WORKER_SERVICE: 'ngeblogging' };
const domain = { id: '22222222-2222-4222-8222-222222222222', site_id: siteId, hostname: 'customer.example', provider: 'cloudflare-full-zone', provider_hostname_id: zoneId, status: 'active', provider_status: 'active', ssl_status: 'active', is_primary: true, verified_at: '2026-10-01T00:00:00Z', last_checked_at: '2026-10-01T00:00:00Z', ssl_validation: [{ id: 'previous-tls' }], ownership_verification: { additional_hostnames: [{ host: 'www', enabled: false }] } };
function request() { return new Request('https://ngeblogging.com/api/domains/register', { method: 'POST', headers: { authorization: 'Bearer test-user-token', 'content-type': 'application/json' }, body: JSON.stringify({ siteId, hostname: domain.hostname }) }); }
function mockNetwork(t, { row = domain, zoneStatus = 'active', dbStatus = 200 } = {}) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (input, options = {}) => {
    const url = String(input);
    const method = options.method || 'GET';
    calls.push({ url, method, body: options.body });
    if (url.startsWith('https://api.cloudflare.com/client/v4/zones?')) return Response.json({ success: true, result: [{ id: zoneId, name: domain.hostname, status: zoneStatus, name_servers: ['one.ns.example', 'two.ns.example'] }] });
    assert.ok(url.startsWith('https://db.example/rest/v1/site_domains?'), url);
    if (method === 'GET') return Response.json(row ? [row] : [], { status: dbStatus });
    assert.ok(method === 'PATCH' || method === 'POST');
    return Response.json([{ ...(row || { site_id: siteId, hostname: domain.hostname }), ...JSON.parse(options.body) }]);
  });
  return calls;
}

test('recovery preserves the active primary domain without any write', async (t) => {
  const calls = mockNetwork(t);
  const response = await recoverPendingFullZoneRegistration(request(), env, new Response(null, { status: 503, headers: { 'x-request-id': 'test-id' } }));
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(payload.domain, domain);
  assert.equal(payload.pending, false);
  assert.equal(payload.requiresRefresh, true);
  assert.equal(payload.verificationSource, 'stored-active-domain');
  assert.equal(payload.instructions.action, 'zone-active');
  assert.equal(payload.requestId, 'test-id');
  assert.ok(calls.every((call) => call.method === 'GET'));
});

test('recovery does not turn a secondary active domain into primary', async (t) => {
  mockNetwork(t, { row: { ...domain, is_primary: false } });
  const payload = await (await recoverPendingFullZoneRegistration(request(), env)).json();
  assert.equal(payload.domain.is_primary, false);
});

for (const status of [401, 403]) test(`does not mask HTTP ${status}`, async (t) => {
  const calls = mockNetwork(t);
  assert.equal(await recoverPendingFullZoneRegistration(request(), env, new Response(null, { status })), null);
  assert.equal(calls.length, 0);
});

test('does not reuse a domain assigned to another site', async (t) => {
  const calls = mockNetwork(t, { row: { ...domain, site_id: '33333333-3333-4333-8333-333333333333' } });
  assert.equal(await recoverPendingFullZoneRegistration(request(), env), null);
  assert.ok(calls.every((call) => call.method === 'GET'));
});

test('database read failure does not write or report accepted recovery', async (t) => {
  const calls = mockNetwork(t, { dbStatus: 403 });
  assert.equal(await recoverPendingFullZoneRegistration(request(), env), null);
  assert.ok(calls.every((call) => call.method === 'GET'));
});

for (const variant of [{ ssl_status: 'pending' }, { status: 'verifying' }, { provider_hostname_id: 'c'.repeat(32) }, { provider: 'cloudflare-custom-hostnames' }]) test(`unverified or mismatched state is not preserved: ${JSON.stringify(variant)}`, async (t) => {
  const calls = mockNetwork(t, { row: { ...domain, ...variant } });
  const payload = await (await recoverPendingFullZoneRegistration(request(), env)).json();
  assert.equal(payload.domain.status, 'verifying');
  assert.equal(payload.domain.ssl_status, 'pending');
  assert.equal(payload.domain.is_primary, false);
  assert.ok(calls.some((call) => call.method === 'PATCH'));
});

test('inactive Cloudflare zone is not reported active', async (t) => {
  mockNetwork(t, { zoneStatus: 'pending' });
  const payload = await (await recoverPendingFullZoneRegistration(request(), env)).json();
  assert.equal(payload.domain.status, 'verifying');
  assert.equal(payload.domain.ssl_status, 'pending');
});

test('new registrations retain the existing pending flow', async (t) => {
  const calls = mockNetwork(t, { row: null, zoneStatus: 'pending' });
  const result = await recoverPendingFullZoneRegistration(request(), env);
  assert.equal(result.status, 201);
  const payload = await result.json();
  assert.equal(payload.domain.status, 'verifying');
  assert.equal(payload.domain.is_primary, false);
  assert.ok(calls.some((call) => call.method === 'POST'));
});
