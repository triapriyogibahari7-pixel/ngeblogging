import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const LIMIT = 64;
const RESERVE_TARGET = 60;
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
  if (plan.variablesAfter > LIMIT) {
    console.log('[connector-capacity] ' + JSON.stringify({ variablesAfter: plan.variablesAfter, limit: LIMIT, overLimitBy: plan.variablesAfter - LIMIT, capacityCheckPassed: false }));
    throw new Error('WORKER_VARIABLE_LIMIT_EXCEEDED_NO_DEPLOY');
  }
  const config = JSON.parse(readFileSync(resolve('wrangler.jsonc'), 'utf8'));
  if (config.name !== 'ngeblogging' || config.keep_vars !== false || Object.keys(config.vars || {}).length > plan.variablesAfter) throw new Error('PREPARED_CONFIGURATION_NOT_VERIFIED_NO_DEPLOY');
  const reserveShortfall = Math.max(0, plan.variablesAfter - RESERVE_TARGET);
  if (reserveShortfall) console.log('[connector-capacity] RESERVE_WARNING ' + JSON.stringify({ reserveTarget: RESERVE_TARGET, reserveShortfall, blocking: false }));
  console.log('[connector-capacity] ' + JSON.stringify({ variablesAfter: plan.variablesAfter, limit: LIMIT, freeSlotsAt64: LIMIT - plan.variablesAfter, reserveTarget: RESERVE_TARGET, reserveSatisfied: reserveShortfall === 0, capacityCheckPassed: true, preparedOnly: true, deploymentVerified: false }));
}
try { main(); } catch { console.error('[connector-capacity] STOP_NO_DEPLOY'); process.exitCode = 1; }
