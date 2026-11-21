import test from 'node:test';
import assert from 'node:assert/strict';
import {NgebloggingFullZoneFoundation, normalizeZoneName, TARGET_NAMESERVERS} from '../server/ngeblogging-full-zone-foundation.mjs';
const adapter = new NgebloggingFullZoneFoundation();
const siteId = '12345678-1234-4234-8234-123456789abc';
test('foundation never advertises working DNS or assigned nameservers', () => {
  const result = adapter.checkCapabilities();
  for (const key of ['configurationReady','providerApiVerified','authoritativeDnsVerified','gatewayVerified','productionReady','instructionsAllowed']) assert.equal(result[key], false);
  assert.deepEqual(result.assignedNameservers, []);
  assert.ok(result.blockers.includes('RUNTIME_ROUTER_NOT_INTEGRATED'));
});
test('connection plan is side-effect free and separates targets from assignments', () => {
  const plan = adapter.planConnection({siteId, hostname:'Customer.COM.'});
  assert.equal(plan.hostname, 'customer.com');
  assert.equal(plan.status, 'blocked');
  assert.equal(plan.sideEffects, false);
  assert.equal(plan.requiresAuthorization, true);
  assert.equal(plan.requiresOwnershipProof, true);
  assert.equal(plan.instructionsAllowed, false);
  assert.deepEqual(plan.assignedNameservers, []);
  assert.deepEqual(plan.targetNameservers, [...TARGET_NAMESERVERS]);
  plan.targetNameservers.pop();
  assert.equal(TARGET_NAMESERVERS.length, 2);
});
test('reject malformed input, IP literals, local names and platform zones', () => {
  for (const name of ['', 'https://customer.com', '*.customer.com', 'customer.com/path', 'customer.com:53', '127.0.0.1', 'a.local', 'a.invalid', 'ngeblogging.com', 'ns1.ngeblogging.com', 'bad..com', '-bad.com']) assert.throws(() => normalizeZoneName(name));
  assert.throws(() => adapter.planConnection({siteId:'bad',hostname:'customer.com'}), {code:'INVALID_SITE'});
});
