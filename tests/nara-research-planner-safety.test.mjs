import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSafeNaraResearchAction, guardedNaraResearchPlan } from '../server/nara-research-planner-safety.mjs';
test('valid JSON actions retain bounded schema', () => {
  assert.deepEqual(parseSafeNaraResearchAction('{"type":"finish"}'), { type: 'finish' });
  const action = { type: 'read', tool: 'resource', arguments: { connectionId: 'id', read: { operation: 'github-file', path: 'README.md' } } };
  assert.deepEqual(parseSafeNaraResearchAction(JSON.stringify(action)), action);
});
test('rejects unknown fields, primitive JSON and invalid arguments', () => {
  for (const text of ['null', '[]', '42', 'Berikut JSON', '{"type":"finish","command":"run"}', '{"type":"read","tool":"resource","arguments":[]}', '{"type":"read","tool":"resource","arguments":{"connectionId":"id","read":{},"token":"secret"}}']) assert.throws(() => parseSafeNaraResearchAction(text), /INVALID_RESEARCH_PLAN/);
});
test('invalid planner JSON degrades without an extra model call', async () => {
  let calls = 0;
  const result = await guardedNaraResearchPlan(async () => { calls++; return 'not JSON'; }, Date.now() + 1000);
  assert.equal(result.failure, 'planner-invalid-json'); assert.equal(result.action.type, 'finish'); assert.equal(calls, 1);
});
test('planner provider errors do not expose error details', async () => {
  const result = await guardedNaraResearchPlan(async () => { throw Error('sensitive-provider-detail'); }, Date.now() + 1000);
  assert.equal(result.failure, 'planner-unavailable'); assert.equal(JSON.stringify(result).includes('sensitive'), false);
});
test('expired budget never starts inference', async () => {
  let calls = 0;
  const result = await guardedNaraResearchPlan(async () => { calls++; }, Date.now() - 1);
  assert.equal(result.failure, 'planner-timeout'); assert.equal(calls, 0);
});
test('non-settling planner stops waiting at timeout', async () => {
  const result = await guardedNaraResearchPlan(() => new Promise(() => {}), Date.now() + 20);
  assert.equal(result.failure, 'planner-timeout'); assert.equal(result.action.type, 'finish');
});
