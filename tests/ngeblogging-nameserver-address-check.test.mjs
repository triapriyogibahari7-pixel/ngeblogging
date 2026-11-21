import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectNameserverAddresses} from '../server/ngeblogging-nameserver-address-check.mjs';

test('unresolved nameservers never authorize migration', async () => {
  const result = await inspectNameserverAddresses({lookup:async () => {throw Object.assign(new Error('missing'), {code:'ENOTFOUND'});}});
  assert.equal(result.nameservers.length,2);
  assert.ok(result.blockers.includes('NAMESERVER_ADDRESS_UNRESOLVED'));
  assert.equal(result.productionReady,false);
  assert.equal(result.migrationAllowed,false);
});
test('shared addresses are detected without claiming authoritative service', async () => {
  const result = await inspectNameserverAddresses({lookup:async (_name,family) => family === 4 ? ['192.0.2.1'] : []});
  assert.deepEqual(result.sharedAddresses,['192.0.2.1']);
  assert.ok(result.blockers.includes('NAMESERVER_ADDRESSES_OVERLAP'));
  assert.equal(result.authoritativeDnsVerified,false);
  assert.equal(result.migrationAllowed,false);
});
test('distinct fixture addresses still do not establish DNS or HTTPS readiness', async () => {
  const result = await inspectNameserverAddresses({lookup:async (name,family) => family === 4 ? [name.startsWith('ns1.') ? '192.0.2.1' : '192.0.2.2'] : []});
  assert.deepEqual(result.sharedAddresses,[]);
  for (const key of ['udp53Verified','tcp53Verified','networkDiversityVerified','zoneConsistencyVerified','gatewayVerified','productionReady','migrationAllowed']) assert.equal(result[key],false);
});
test('invalid DNS resolver results are rejected', async () => {
  const result = await inspectNameserverAddresses({lookup:async () => ['not-an-address']});
  assert.ok(result.blockers.includes('NAMESERVER_ADDRESS_UNRESOLVED'));
  assert.equal(result.nameservers[0].errors[0].code,'INVALID_ADDRESS_RESULT');
});
