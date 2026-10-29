import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const headers = await readFile(new URL('../public/_headers', import.meta.url), 'utf8');
const line = headers.split('\n').find(value => value.trim().startsWith('Content-Security-Policy:'));
const policy = new Map(line.trim().slice('Content-Security-Policy:'.length).split(';').map(part => { const [name,...values] = part.trim().split(/\s+/); return [name, values]; }));
test('Snap uses explicit production and sandbox origins', () => {
  for (const directive of ['script-src','frame-src','connect-src']) {
    const values = policy.get(directive);
    assert.ok(values.includes('https://app.midtrans.com'));
    assert.ok(values.includes('https://app.sandbox.midtrans.com'));
    assert.ok(!values.includes('*'));
    assert.ok(!values.includes('https:'));
  }
});
test('checkout preserves isolation and security headers', () => {
  assert.deepEqual(policy.get('object-src'), ["'none'"]);
  assert.deepEqual(policy.get('frame-ancestors'), ["'none'"]);
  assert.match(headers, /X-Content-Type-Options: nosniff/);
  assert.match(headers, /X-Frame-Options: DENY/);
});
