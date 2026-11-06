import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../src/api-origin-failover-v60.js', import.meta.url), 'utf8');
const siteId = '11111111-1111-4111-8111-111111111111';
const row = { id: 'domain-id', site_id: siteId, hostname: 'example.com', provider: 'cloudflare-full-zone', status: 'verifying', provider_status: 'pending', ssl_status: 'pending', ownership_verification: { required_name_servers: ['alice.ns.cloudflare.com', 'bob.ns.cloudflare.com'] } };
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
let serial = 0;
async function setup(mock) {
  const calls = [];
  globalThis.location = new URL('https://ngeblogging.com/studio');
  globalThis.document = { documentElement: { dataset: {} } };
  globalThis.CustomEvent = class { constructor(type, options) { this.type = type; this.detail = options?.detail; } };
  globalThis.window = { fetch: async request => { calls.push(request); return mock(request); }, dispatchEvent() {} };
  const module = await import('data:text/javascript;base64,' + Buffer.from(source + `\n//recovery-${++serial}`).toString('base64'));
  return { calls, fetch: module.resilientDomainFetch };
}
const register = h => h.fetch('/api/domains/register', { method: 'POST', headers: { authorization: 'Bearer test-token' }, body: JSON.stringify({ siteId, hostname: 'example.com' }) });
test('recovers saved nameservers without replaying POST or promoting status', async () => {
  const h = await setup(request => { if (request.method === 'POST') throw Error('connection lost'); assert.equal(request.headers.get('authorization'), 'Bearer test-token'); assert.equal(new URL(request.url).searchParams.get('siteId'), siteId); return json({ domains: [row] }); });
  const response = await register(h), payload = await response.json();
  assert.equal(response.status, 200); assert.equal(payload.recovered, true); assert.equal(payload.domain.status, 'verifying'); assert.equal(payload.domain.ssl_status, 'pending'); assert.equal(h.calls.filter(r => r.method === 'POST').length, 1); assert.equal(h.calls.length, 2);
});
test('read-only recovery can use the known backup origin', async () => {
  const h = await setup(request => { if (request.method === 'POST') throw Error('lost'); if (new URL(request.url).origin === 'https://ngeblogging.com') return new Response('<html/>', { status: 502 }); return json({ domains: [row] }); });
  assert.equal((await (await register(h)).json()).recovered, true); assert.equal(h.calls.length, 3); assert.equal(h.calls[2].method, 'GET');
});
test('does not recover another site, hostname, deletion, or missing nameservers', async () => {
  for (const domain of [{ ...row, site_id: 'other' }, { ...row, hostname: 'other.example' }, { ...row, status: 'pending_deletion' }, { ...row, ownership_verification: {} }]) {
    const h = await setup(request => { if (request.method === 'POST') throw Error('lost'); return json({ domains: [domain] }); });
    const payload = await (await register(h)).json(); assert.equal(payload.code, 'DOMAIN_API_MUTATION_UNCERTAIN'); assert.equal(payload.retryAutomatically, false); assert.equal(h.calls.filter(r => r.method === 'POST').length, 1);
  }
});
test('explicit authentication failure never starts recovery', async () => {
  const h = await setup(() => json({ code: 'AUTH_REQUIRED', error: 'Sign in' }, 401));
  assert.equal((await register(h)).status, 401); assert.equal(h.calls.length, 1);
});
