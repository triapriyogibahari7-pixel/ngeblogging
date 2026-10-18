import { readFileSync, writeFileSync } from 'node:fs';
const sha = process.env.GITHUB_SHA;
if (!/^[a-f0-9]{40}$/i.test(sha || '')) throw Error('INVALID_DEPLOYMENT_COMMIT');
const path = 'public/sw.js';
let source = readFileSync(path, 'utf8');
function replaceOne(pattern, replacement, label) {
  if ([...source.matchAll(pattern)].length !== 1) throw Error('SW_SOURCE_MISMATCH: ' + label);
  source = source.replace(pattern, () => replacement);
}
replaceOne(/^const VERSION = .*;$/gm, 'const VERSION = ' + JSON.stringify('ngeblogging-app-' + sha) + ';', 'version');
replaceOne(/^const CACHE_RELEASE = .*;$/gm, 'const CACHE_RELEASE = ' + JSON.stringify('deployment-' + sha) + ';', 'cache release');
const oldFilter = '.filter((key) => ![SHELL_CACHE, ASSET_CACHE].includes(key))';
const scopedFilter = '.filter((key) => key.startsWith("ngeblogging-app-") && ![SHELL_CACHE, ASSET_CACHE].includes(key))';
if (source.includes(oldFilter)) {
  if (source.split(oldFilter).length !== 2) throw Error('AMBIGUOUS_CACHE_CLEANUP');
  source = source.replace(oldFilter, scopedFilter);
} else if (!source.includes(scopedFilter)) throw Error('CACHE_CLEANUP_NOT_FOUND');
writeFileSync(path, source);
console.log('SERVICE_WORKER_VERSIONED', sha);
