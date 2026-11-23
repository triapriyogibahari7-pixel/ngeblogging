import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../server/domain-handler.mjs', import.meta.url), 'utf8');
function section(start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, 'Expected production source anchors');
  return source.slice(a, b);
}
const registration = section('async function registerFullZoneDomain(', 'async function registerDomain(');
function registrationState(existingDomain, zoneState) {
  const a = registration.indexOf('  const domainState = {');
  const b = registration.indexOf('  let row;', a);
  assert.ok(a >= 0 && b > a);
  const context = vm.createContext({
    existingDomain, zoneState, now: '2026-11-22T00:00:00.000Z',
    fullZoneOwnership: (zone, current = {}) => ({...current, method: 'nameserver', zone_name: zone.name, required_name_servers: zone.nameServers}),
  });
  return vm.runInContext(registration.slice(a, b) + '\nJSON.parse(JSON.stringify(domainState));', context);
}
const zone = {id: 'a'.repeat(32), name: 'customer.example', active: true, status: 'active', nameServers: ['one.ns.example', 'two.ns.example']};
const existing = {id: 'row', site_id: 'site', hostname: zone.name, provider: 'cloudflare-full-zone', provider_hostname_id: zone.id, status: 'active', provider_status: 'active', ssl_status: 'active', is_primary: true, verified_at: '2026-11-20T00:00:00.000Z', ssl_validation: [{id: 'apex', hostname: zone.name}], ownership_verification: {additional_hostnames: [{host: 'www', hostname: 'www.customer.example', enabled: false}]}};

test('re-registering the same active zone preserves verified routing evidence', () => {
  const state = registrationState(existing, zone);
  assert.equal(state.status, 'active');
  assert.equal(state.ssl_status, 'active');
  assert.equal(state.verified_at, existing.verified_at);
  assert.equal(state.is_primary, true);
  assert.equal(JSON.stringify(state.ssl_validation), JSON.stringify(existing.ssl_validation));
});

test('re-registering preserves explicitly disabled additional hosts', () => {
  const state = registrationState(existing, zone);
  assert.equal(JSON.stringify(state.ownership_verification.additional_hostnames), JSON.stringify(existing.ownership_verification.additional_hostnames));
});

test('a new pending zone never receives invented active or SSL status', () => {
  const state = registrationState(null, {...zone, active: false, status: 'pending'});
  assert.equal(state.status, 'verifying');
  assert.equal(state.ssl_status, 'pending');
  assert.equal(state.is_primary, false);
  assert.equal(state.verified_at, null);
});

test('a different replacement zone cannot inherit old active evidence', () => {
  const state = registrationState(existing, {...zone, id: 'b'.repeat(32)});
  assert.equal(state.status, 'verifying');
  assert.equal(state.ssl_status, 'pending');
  assert.equal(state.verified_at, null);
});

const attachment = section('async function attachConfiguredWorkerDomains(', 'async function saveFullZoneRefreshState(');
function attachmentContext(attach, settings = []) {
  const context = vm.createContext({attachWorkerDomain: attach, additionalHostnameRecords: () => settings});
  vm.runInContext(attachment, context);
  return context.attachConfiguredWorkerDomains;
}

test('optional www failure preserves successful apex and records the failure', async () => {
  const apex = {id: 'apex', cert_id: 'certificate', hostname: zone.name};
  const run = attachmentContext(async (_env, input) => {
    if (input.hostname === zone.name) return apex;
    throw Object.assign(new Error('DNS not ready'), {code: 'CUSTOM_DOMAIN_DNS_ADDRESS_MISSING'});
  });
  const result = await run({}, existing, zone);
  assert.equal(result.apex.id, apex.id);
  assert.equal(result.www, null);
  assert.ok(Array.isArray(result.errors) && result.errors.length === 1);
  assert.equal(result.errors[0].hostname, 'www.customer.example');
});

test('apex failure is not swallowed or reported as an active domain', async () => {
  const run = attachmentContext(async () => {throw new Error('APEX_NOT_READY');});
  await assert.rejects(() => run({}, existing, zone), /APEX_NOT_READY/);
});

test('an explicitly disabled www is never reattached', async () => {
  const calls = [];
  const run = attachmentContext(async (_env, input) => {calls.push(input.hostname); return {id: 'apex', cert_id: 'certificate'};}, [{host: 'www', hostname: 'www.customer.example', enabled: false}]);
  await run({}, existing, zone);
  assert.equal(JSON.stringify(calls), JSON.stringify([zone.name]));
});
