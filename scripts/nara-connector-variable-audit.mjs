import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { LEGACY_VARIABLE_REMOVALS, assertLegacyVariableRemoval } from './worker-variable-retirement-policy.mjs';
const ACCOUNT = '095e57b46e7ba7f6b188480d9e4e5fe7';
const WORKER = 'ngeblogging';
async function main() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) throw new Error('CLOUDFLARE_API_TOKEN_UNAVAILABLE');
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/scripts/${WORKER}/settings`, { headers: { authorization: `Bearer ${token}` }, redirect: 'error', signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`INVENTORY_HTTP_${response.status}`);
  const payload = await response.json();
  if (payload.success !== true || !Array.isArray(payload.result?.bindings)) throw new Error('INVALID_INVENTORY');
  const bindings = payload.result.bindings;
  const names = new Set();
  for (const binding of bindings) {
    if (typeof binding.name !== 'string' || names.has(binding.name)) throw new Error('INVALID_BINDING_NAMES');
    names.add(binding.name);
  }
  const configs = await Promise.all(['wrangler.jsonc', 'wrangler.production.jsonc'].map(async path => ({ path, config: JSON.parse(await readFile(path, 'utf8')) })));
  if (configs.some(item => item.config.name !== WORKER)) throw new Error('CONFIG_TARGET_MISMATCH');
  const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 16000000 }).split('\0').filter(path => path && /\.(mjs|cjs|js|jsx|ts|tsx|jsonc|yml|yaml)$/.test(path));
  const source = await Promise.all(tracked.filter(path => path !== 'scripts/nara-connector-variable-audit.mjs').map(async path => ({ path, text: await readFile(path, 'utf8') })));
  const candidates = LEGACY_VARIABLE_REMOVALS.map(name => {
    const binding = bindings.find(item => item.name === name);
    let guard = 'absent';
    if (binding) { try { assertLegacyVariableRemoval(binding); guard = 'matches_retirement_policy'; } catch { guard = 'blocked_by_retirement_policy'; } }
    const references = source.filter(item => item.text.includes(name)).map(item => item.path);
    return { name, present: Boolean(binding), type: binding?.type || null, guard, references, deletionApproved: false };
  });
  const counted = bindings.filter(item => ['plain_text', 'secret_text', 'json'].includes(item.type));
  const configReports = configs.map(({ path, config }) => {
    const union = new Set([...counted.map(item => item.name), ...Object.keys(config.vars || {})]);
    return { path, declaredVariables: Object.keys(config.vars || {}).length, unionWithLiveVariables: union.size, keepVars: config.keep_vars === true };
  });
  const report = { worker: WORKER, readOnly: true, valuesIncluded: false, variableCount: counted.length, freeSlotsAt64: Math.max(0, 64 - counted.length), requestedSpareSlots: 4, additionalSlotsNeeded: Math.max(0, counted.length + 4 - 64), configReports, bindings: bindings.map(item => ({ name: item.name, type: item.type })), candidates, warning: 'Policy match is not proof of non-use. No deletion or deployment was performed.' };
  await writeFile('nara-worker-variable-audit.json', JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify(report));
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `## Nara variable audit\nLive variables: ${report.variableCount}\nFree slots: ${report.freeSlotsAt64}\nAdditional slots needed for four spare slots: ${report.additionalSlotsNeeded}\n\nNo deletion or deployment performed. Inspect sanitized artifact before approving removals.\n`);
}
main().catch(error => { const message = String(error?.message || ''); console.error(/^[A-Z][A-Z0-9_]+$/.test(message) ? message : 'AUDIT_FAILED_WITHOUT_EXPOSING_RESPONSE'); process.exitCode = 1; });
