import test from 'node:test';
import assert from 'node:assert/strict';
import {domainRowsForSite} from '../src/lib/domain-panel-result.mjs';
const old = {id: 'domain-1', site_id: 'site-1', hostname: 'example.com', status: 'verifying', updated_at: '2026-11-06T01:00:00Z'};
const latest = {...old, status: 'active', provider_status: 'active', ssl_status: 'active', updated_at: '2026-11-06T02:00:00Z'};
test('newer API state is not hidden by an older database row', () => {
  assert.equal(domainRowsForSite('site-1', null, [old, latest])[0], latest);
});
test('newer failure replaces older active state instead of forcing green', () => {
  const failed = {...old, status: 'failed', updated_at: '2026-11-06T03:00:00Z'};
  assert.equal(domainRowsForSite('site-1', null, [latest, failed])[0], failed);
});
test('accepted operation response wins over stale list snapshots', () => {
  assert.equal(domainRowsForSite('site-1', latest, [old])[0], latest);
});
test('other sites and managed subdomains are excluded', () => {
  assert.deepEqual(domainRowsForSite('site-1', null, [{...old, site_id: 'site-2'}, {...old, hostname: 'free.ngeblogging.com'}]), []);
});
