import { isNaraOwner } from '../shared/nara-owner-access.mjs';

// Internal server API. Dependencies must never be supplied by request JSON.
// Adapters must enforce resource authorization and redact secrets before returning.
export async function runNaraOwnerResearch({ user, projectId, question, checkActiveAdmin, plan, tools, signal, maxSteps = 6 }) {
  if (!isNaraOwner(user) || typeof checkActiveAdmin !== 'function') throw Error('NARA_RESEARCH_FORBIDDEN');
  if (typeof projectId !== 'string' || !projectId.trim() || projectId.length > 200) throw Error('INVALID_RESEARCH_PROJECT');
  if (typeof question !== 'string' || !question.trim() || question.length > 8000) throw Error('INVALID_RESEARCH_QUESTION');
  if (typeof plan !== 'function' || !tools || typeof tools !== 'object') throw Error('INVALID_RESEARCH_DEPENDENCIES');
  if (!Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > 12) throw Error('INVALID_RESEARCH_BUDGET');
  const evidence = [], trace = [];
  const seen = new Set();
  let bytes = 0;
  const authorize = async () => {
    if (signal?.aborted) throw Error('NARA_RESEARCH_ABORTED');
    if (await checkActiveAdmin(user.id, projectId) !== true) throw Error('NARA_RESEARCH_FORBIDDEN');
  };
  const finish = async reason => {
    await authorize();
    return { status: reason, evidence, trace, limits: { maxSteps, maxEvidenceBytes: 48000 }, completeProjectScan: false };
  };
  await authorize();
  for (let step = 0; step < maxSteps; step++) {
    await authorize();
    const action = await plan({ question, projectId, evidence: structuredClone(evidence), trace: structuredClone(trace), remainingSteps: maxSteps - step, signal });
    await authorize();
    if (action?.type === 'finish') return finish('planner-finished');
    if (action?.type !== 'read' || typeof action.tool !== 'string') throw Error('INVALID_RESEARCH_ACTION');
    const tool = Object.hasOwn(tools, action.tool) ? tools[action.tool] : null;
    if (!tool || tool.readOnly !== true || tool.requiresSpendApproval !== false || typeof tool.execute !== 'function') throw Error('RESEARCH_TOOL_NOT_ALLOWED');
    const args = action.arguments;
    if (!args || typeof args !== 'object' || Array.isArray(args)) throw Error('INVALID_RESEARCH_ARGUMENTS');
    const encodedArgs = JSON.stringify(args);
    if (new TextEncoder().encode(encodedArgs).byteLength > 8000) throw Error('RESEARCH_ARGUMENTS_TOO_LARGE');
    const fingerprint = action.tool + ':' + encodedArgs;
    if (seen.has(fingerprint)) { trace.push({ step, tool: action.tool, status: 'duplicate-skipped' }); continue; }
    seen.add(fingerprint);
    await authorize();
    let result;
    try {
      result = await tool.execute({ actorId: user.id, projectId, arguments: structuredClone(args), signal });
    } catch {
      await authorize();
      trace.push({ step, tool: action.tool, status: 'read-failed' });
      continue;
    }
    await authorize();
    if (result?.status !== 'read' || typeof result.source !== 'string' || !result.source.trim() || result.source.length > 1000 || result.data === undefined) {
      trace.push({ step, tool: action.tool, status: 'no-verified-data' }); continue;
    }
    const entry = { id: `research:${evidence.length + 1}`, tool: action.tool, source: result.source, data: result.data, truncated: result.truncated === true };
    const encoded = JSON.stringify(entry);
    const size = new TextEncoder().encode(encoded).byteLength;
    if (size > 16000 || bytes + size > 48000) { trace.push({ step, tool: action.tool, status: 'evidence-budget-exceeded' }); return finish('budget-exhausted'); }
    evidence.push(JSON.parse(encoded)); bytes += size;
    trace.push({ step, tool: action.tool, status: 'read', evidenceId: entry.id });
  }
  return finish('step-limit');
}
