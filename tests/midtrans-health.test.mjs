import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../cloudflare/worker-v70.mjs', import.meta.url), 'utf8');
const start = source.indexOf('async function billingHealth(');
const end = source.indexOf('export default', start);
assert.ok(start >= 0 && end > start, 'billingHealth must exist in the Worker');
const makeHealth = new Function('handleMidtrans', source.slice(start, end) + '\nreturn billingHealth;');
const request = new Request('https://ngeblogging.com/api/health');
const report = () => Response.json({status:'ok', billing:false, billingProviders:{paypal:false, local:false}, nara:true});

for (const ready of [true, false]) {
  test(`Midtrans readiness follows configuration: ${ready}`, async () => {
    const health = makeHealth(async () => Response.json({ready, environment:'production', plans:[{id:'pro_monthly'}]}));
    const result = await health(report(), request, {});
    const data = await result.json();
    assert.equal(data.billing, ready);
    assert.equal(data.billingProviders.midtrans, ready);
    assert.equal(data.billingProviders.paypal, false);
    assert.equal(data.nara, true);
    assert.equal(data.midtrans.environment, 'production');
    assert.deepEqual(data.midtrans.plans, ['pro_monthly']);
    assert.equal(data.midtrans.readinessScope, 'configuration-only');
    assert.equal(data.midtrans.transactionProbe, 'not-run');
    assert.equal(result.headers.get('cache-control'), 'no-store');
  });
}

test('another configured provider keeps billing available', async () => {
  const health = makeHealth(async () => Response.json({ready:false, plans:[]}));
  const data = await (await health(Response.json({billingProviders:{paypal:true}}), request, {})).json();
  assert.equal(data.billing, true);
  assert.equal(data.billingProviders.paypal, true);
  assert.equal(data.billingProviders.midtrans, false);
});

for (const [name, handler] of [
  ['exception', async () => { throw new Error('unavailable'); }],
  ['HTTP failure', async () => new Response('error', {status:503})],
  ['invalid JSON', async () => new Response('{')],
]) {
  test(`preserve original health report on ${name}`, async () => {
    const original = report();
    assert.equal(await makeHealth(handler)(original, request, {}), original);
    assert.equal((await original.json()).status, 'ok');
  });
}

test('do not enrich non-JSON or unsuccessful health responses', async () => {
  const health = makeHealth(async () => { throw new Error('must not run'); });
  for (const original of [new Response('ok'), Response.json({error:'down'}, {status:503})]) {
    assert.equal(await health(original, request, {}), original);
  }
});

test('remove stale body headers while retaining unrelated headers', async () => {
  const health = makeHealth(async () => Response.json({ready:true, plans:[]}));
  const original = Response.json({status:'ok'}, {headers:{etag:'old', 'content-length':'15', 'content-encoding':'gzip', 'x-test':'kept'}});
  const result = await health(original, request, {});
  for (const name of ['etag', 'content-length', 'content-encoding']) assert.equal(result.headers.get(name), null);
  assert.equal(result.headers.get('x-test'), 'kept');
});
