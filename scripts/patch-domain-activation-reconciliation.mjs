import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

if (process.argv.length !== 3 || process.argv[2] !== '--apply') {
  throw new Error('Explicit --apply required; changes only the local checkout');
}
const file = new URL('../server/domain-handler.mjs', import.meta.url);
const original = readFileSync(file);
const sha = createHash('sha1').update(Buffer.from(`blob ${original.length}\0`)).update(original).digest('hex');
if (sha !== 'cfac31c3b05501edbddafc74ff52ae45e95c09ed') {
  throw new Error('Unexpected domain-handler blob; no changes written');
}
let source = original.toString('utf8');
function replaceOnce(text, before, after) {
  const at = text.indexOf(before);
  if (at < 0 || at !== text.lastIndexOf(before)) {
    throw new Error('Patch anchor missing or ambiguous; no changes written');
  }
  return text.slice(0, at) + after + text.slice(at + before.length);
}
function editSection(start, end, edit) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  if (a < 0 || b <= a || a !== source.lastIndexOf(start)) {
    throw new Error('Function boundaries do not match; no changes written');
  }
  source = source.slice(0, a) + edit(source.slice(a, b)) + source.slice(b);
}

editSection('async function registerFullZoneDomain(', 'async function registerDomain(', text => {
  text = replaceOnce(text, 'fullZoneOwnership(zoneState)', `fullZoneOwnership(
        zoneState,
        existingDomain?.provider === "cloudflare-full-zone"
          && existingDomain.provider_hostname_id === zoneState.id
          && existingDomain.hostname === zoneState.name
          ? existingDomain.ownership_verification
          : {},
      )`);
  return replaceOnce(text, '\n  let row;', `
  // Preserve verified evidence only for the same currently active zone.
  if (
    zoneState.active
    && existingDomain?.provider === "cloudflare-full-zone"
    && existingDomain.provider_hostname_id === zoneState.id
    && existingDomain.hostname === zoneState.name
    && existingDomain.status === "active"
    && existingDomain.ssl_status === "active"
    && existingDomain.verified_at
  ) {
    Object.assign(domainState, {
      status: existingDomain.status,
      ssl_status: existingDomain.ssl_status,
      verified_at: existingDomain.verified_at,
      is_primary: existingDomain.is_primary === true,
      ssl_validation: Array.isArray(existingDomain.ssl_validation)
        ? existingDomain.ssl_validation
        : [],
    });
  }

  let row;`);
});

editSection('async function attachConfiguredWorkerDomains(', 'async function saveFullZoneRefreshState(', text => {
  text = replaceOnce(text, '  let www = null;', '  const errors = [];\n  let www = null;');
  const before = [
    '    www = await attachWorkerDomain(',
    '      env,',
    '      {',
    '        hostname: `www.${zoneState.name}`,',
    '        zoneId: zoneState.id,',
    '        zoneName: zoneState.name,',
    '      },',
    '    );',
  ].join('\n');
  text = replaceOnce(text, before, `    try {
      www = await attachWorkerDomain(
        env,
        {
          hostname: \`www.\${zoneState.name}\`,
          zoneId: zoneState.id,
          zoneName: zoneState.name,
        },
      );
    } catch (error) {
      errors.push({
        hostname: \`www.\${zoneState.name}\`,
        code: String(error?.code || "OPTIONAL_HOST_ATTACHMENT_FAILED"),
        message: String(error?.message || "Optional www attachment failed"),
      });
    }`);
  return replaceOnce(text, '    additional,\n  };', '    additional,\n    errors,\n  };');
});

editSection('async function saveFullZoneRefreshState(', 'async function refreshFullZoneDomain(', text => replaceOnce(
  text,
  '        additional_hostnames:\n          additionalHostnames,',
  '        additional_hostnames:\n          additionalHostnames,\n        additional_hostname_errors:\n          Array.isArray(workerDomains?.errors)\n            ? workerDomains.errors\n            : [],',
));

execFileSync(process.execPath, ['--input-type=module', '--check'], {input: source, stdio: ['pipe', 'pipe', 'pipe']});
writeFileSync(file, source, 'utf8');
console.log('Activation reconciliation patch applied to local checkout; no deployment performed.');
