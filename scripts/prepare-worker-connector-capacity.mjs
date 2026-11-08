import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const TARGET = 60;
function main() {
  if (process.env.WORKERS_CI !== '1' || process.env.WORKERS_CI_BRANCH !== 'main') {
    console.log('[connector-capacity] SKIPPED_NON_PRODUCTION');
    return;
  }
  const result = spawnSync(process.execPath, [resolve('scripts/deploy-worker-free-limit.mjs'), '--prepare'], { cwd: process.cwd(), env: process.env, encoding: 'utf8', shell: false, timeout: 60000, maxBuffer: 4000000 });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error || result.signal || result.status !== 0) throw new Error('VARIABLE_PREPARATION_FAILED_NO_DEPLOY');
  const lines = String(result.stdout || '').split('\n').filter(line => line.startsWith('[worker-vars] PLAN '));
  if (lines.length !== 1) throw new Error('VARIABLE_PLAN_NOT_VERIFIED_NO_DEPLOY');
  const plan = JSON.parse(lines[0].slice('[worker-vars] PLAN '.length));
  if (plan.worker !== 'ngeblogging' || !Number.isSafeInteger(plan.variablesAfter) || plan.variablesAfter < 0 || !Array.isArray(plan.removed)) throw new Error('INVALID_VARIABLE_PLAN_NO_DEPLOY');
  if (plan.variablesAfter > TARGET) {
    console.log('[connector-capacity] ' + JSON.stringify({ variablesAfter: plan.variablesAfter, target: TARGET, additionalRemovalsNeeded: plan.variablesAfter - TARGET, deploymentAllowed: false }));
    throw new Error('FOUR_CONNECTOR_SLOTS_NOT_AVAILABLE_NO_DEPLOY');
  }
  const config = JSON.parse(readFileSync(resolve('wrangler.jsonc'), 'utf8'));
  if (config.name !== 'ngeblogging' || config.keep_vars !== false || Object.keys(config.vars || {}).length > plan.variablesAfter) throw new Error('PREPARED_CONFIGURATION_NOT_VERIFIED_NO_DEPLOY');
  console.log('[connector-capacity] ' + JSON.stringify({ variablesAfter: plan.variablesAfter, freeSlotsAt64: 64 - plan.variablesAfter, target: TARGET, preparedOnly: true, deploymentVerified: false }));
}
try { main(); } catch { console.error('[connector-capacity] STOP_NO_DEPLOY'); process.exitCode = 1; }
