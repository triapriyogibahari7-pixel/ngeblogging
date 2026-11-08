import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNaraResearchAction } from '../server/nara-owner-research-bridge.mjs';
test('planner accepts strict JSON resource read and finish', () => {
  assert.deepEqual(parseNaraResearchAction('{"type":"finish"}'), { type: 'finish' });
  const read = { type: 'read', tool: 'resource', arguments: { connectionId: 'connection-id', read: { operation: 'github-file', path: 'README.md' } } };
  assert.deepEqual(parseNaraResearchAction(JSON.stringify(read)), read);
});
test('planner rejects prose, arbitrary tool names and arrays as arguments', () => {
  for (const text of ['Berikut rencana', '```json\n{}\n```', '{"type":"read","tool":"shell","arguments":{}}', '{"type":"read","tool":"resource","arguments":[]}', 'x'.repeat(8001)]) assert.throws(() => parseNaraResearchAction(text));
});
