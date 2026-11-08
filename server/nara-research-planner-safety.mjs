const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export function parseSafeNaraResearchAction(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).byteLength > 8000) throw Error('INVALID_RESEARCH_PLAN');
  let action;
  try { action = JSON.parse(text); } catch { throw Error('INVALID_RESEARCH_PLAN'); }
  if (!object(action)) throw Error('INVALID_RESEARCH_PLAN');
  if (action.type === 'finish' && Object.keys(action).length === 1) return { type: 'finish' };
  if (action.type !== 'read' || action.tool !== 'resource' || Object.keys(action).some(k => !['type', 'tool', 'arguments'].includes(k))) throw Error('INVALID_RESEARCH_PLAN');
  const args = action.arguments;
  if (!object(args) || Object.keys(args).some(k => !['connectionId', 'read'].includes(k)) || typeof args.connectionId !== 'string' || !object(args.read)) throw Error('INVALID_RESEARCH_PLAN');
  return { type: 'read', tool: 'resource', arguments: args };
}

// This stops waiting; provider execution may continue if its API cannot cancel.
// Only wrap planner inference here, never authorization or credential operations.
export async function guardedNaraResearchPlan(run, until) {
  if (typeof run !== 'function' || !Number.isFinite(until)) throw Error('INVALID_PLANNER_DEPENDENCIES');
  const ms = Math.min(8000, until - Date.now());
  if (ms <= 0) return { action: { type: 'finish' }, failure: 'planner-timeout' };
  let timer;
  try {
    const text = await Promise.race([
      Promise.resolve().then(run),
      new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(Error('PLANNER_TIMEOUT'), { timeout: true })), ms); }),
    ]);
    return { action: parseSafeNaraResearchAction(text), failure: null };
  } catch (error) {
    const failure = error?.timeout || error?.name === 'AbortError' ? 'planner-timeout' : error?.message === 'INVALID_RESEARCH_PLAN' ? 'planner-invalid-json' : 'planner-unavailable';
    return { action: { type: 'finish' }, failure };
  } finally { clearTimeout(timer); }
}
