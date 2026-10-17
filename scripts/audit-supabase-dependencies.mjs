import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, relative, extname } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const roots = ['src', 'api', 'server', 'cloudflare', 'netlify', 'supabase'];
const extensions = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.sql', '.json', '.jsonc', '.toml']);
const rules = [
  ['supabase-reference', /supabase/i],
  ['auth-proxy', /auth-proxy/i],
  ['data-proxy', /data-proxy/i],
  ['auth-client', /\.auth\s*\./],
  ['storage-client', /\.storage\s*\./],
];
const files = [];
const missingRoots = [];
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (entry.name.startsWith('.') || ['node_modules', 'dist', 'build', 'backups'].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.isFile() && extensions.has(extname(entry.name))) {
      const text = await readFile(path, 'utf8');
      const hits = [];
      text.split(/\r?\n/).forEach((line, index) => {
        const categories = rules.filter(([, pattern]) => pattern.test(line)).map(([name]) => name);
        if (categories.length) hits.push({ line: index + 1, categories });
      });
      if (hits.length) files.push({ path: relative(root, path).replaceAll('\\', '/'), hits });
    }
  }
}
try {
  for (const name of roots) {
    try { await readdir(join(root, name)); }
    catch (error) {
      if (error.code === 'ENOENT') { missingRoots.push(name); continue; }
      throw error;
    }
    await walk(join(root, name));
  }
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const dependencies = ['dependencies', 'devDependencies', 'optionalDependencies'].flatMap(section =>
    Object.keys(pkg[section] || {}).filter(name => /supabase/i.test(name)).map(name => ({ section, name }))
  );
  console.log(JSON.stringify({
    mode: 'read-only-static-inventory',
    scannedRoots: roots.filter(name => !missingRoots.includes(name)),
    missingRoots,
    matchingFileCount: files.length,
    dependencies,
    files,
    limitations: [
      'Pattern matches are review candidates, not proof of runtime dependency.',
      'Does not inspect secrets, deployed configuration, database policies, or stored data.',
      'Does not certify migration readiness or authorize production cutover.',
      'No network requests, file writes, deployments, or database mutations.'
    ]
  }, null, 2));
} catch (error) {
  console.error('Inventory failed:', error.code || error.name);
  process.exitCode = 1;
}
