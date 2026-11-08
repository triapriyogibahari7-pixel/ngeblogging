import test from 'node:test';
import assert from 'node:assert/strict';
import { runNaraOwnerResearch } from '../server/nara-owner-research-loop.mjs';
const user = { id: 'owner', email: 'triapriyogibahari7@gmail.com', email_confirmed_at: '2026-11-08' };
const base = { user, projectId: 'project-a', question: 'Baca konfigurasi proyek', checkActiveAdmin: async () => true, tools: {} };
test('reads authorized evidence then finishes without claiming full coverage', async () => {
  const result = await runNaraOwnerResearch({ ...base,
    tools: { config: { readOnly: true, requiresSpendApproval: false, execute: async context => {
      assert.equal(context.actorId, 'owner'); assert.equal(context.projectId, 'project-a');
      return { status: 'read', source: 'repository:config', data: { runtime: 'worker' } };
    } } },
    plan: async ({ evidence }) => evidence.length ? { type: 'finish' } : { type: 'read', tool: 'config', arguments: {} },
  });
  assert.equal(result.status, 'planner-finished'); assert.equal(result.evidence.length, 1); assert.equal(result.completeProjectScan, false);
});
test('ordinary account cannot start planning', async () => {
  let called = false;
  await assert.rejects(runNaraOwnerResearch({ ...base, user: { ...user, email: 'visitor@example.com' }, plan: async () => { called = true; } }), /FORBIDDEN/);
  assert.equal(called, false);
});
test('write tools are rejected before execution', async () => {
  let called = false;
  await assert.rejects(runNaraOwnerResearch({ ...base, plan: async () => ({ type: 'read', tool: 'write', arguments: {} }), tools: { write: { readOnly: false, requiresSpendApproval: false, execute: async () => { called = true; } } } }), /TOOL_NOT_ALLOWED/);
  assert.equal(called, false);
});
test('revocation after a read prevents evidence return', async () => {
  let active = true;
  await assert.rejects(runNaraOwnerResearch({ ...base, checkActiveAdmin: async () => active,
    plan: async () => ({ type: 'read', tool: 'config', arguments: {} }),
    tools: { config: { readOnly: true, requiresSpendApproval: false, execute: async () => { active = false; return { status: 'read', source: 'config', data: 'private' }; } } },
  }), /FORBIDDEN/);
});
test('metadata-only results are not recorded as successful reads', async () => {
  const result = await runNaraOwnerResearch({ ...base, maxSteps: 1, plan: async () => ({ type: 'read', tool: 'config', arguments: {} }), tools: { config: { readOnly: true, requiresSpendApproval: false, execute: async () => ({ status: 'not-connected' }) } } });
  assert.equal(result.evidence.length, 0); assert.equal(result.trace[0].status, 'no-verified-data');
});
