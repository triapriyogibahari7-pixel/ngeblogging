import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createTestRedirectPipeline} from '../server/drafts/domain-transfer-redirect-pipeline.mjs';
const row = (overrides = {}) => ({target_url: 'https://target.test/', permanent: true, preserve_path: true, ...overrides});
const response = (rows, status = 200) => new Response(JSON.stringify(rows), {status});
const request = (path = '/guide?ref=source', method = 'GET') => new Request('https://docs.example.test' + path, {method});
function fixture(replies, options = {}) {
  const calls = [], entries = new Map(), writes = [];
  const cache = {async get(key) {return entries.get(key) || null;}, async set(key, value, ttl) {entries.set(key, structuredClone(value)); writes.push(ttl);}};
  const fetchImpl = async (url, init) => {calls.push({url, init}); const next = replies.shift(); assert.ok(next, 'Unexpected fetch'); if (next instanceof Error) throw next; return typeof next === 'function' ? next(url, init) : next;};
  const config = {origin: 'https://database.test', fetchImpl, cache, namespace: 'pipeline-fixture', ...options};
  return {...createTestRedirectPipeline(config), calls, entries, writes, config};
}
test('adapter builds read-only filtered request without credentials', async () => {
  const h = fixture([response([row()])]); assert.equal((await h.resolve(request())).status, 308);
  const {url, init} = h.calls[0], parsed = new URL(url);
  assert.equal(parsed.origin, 'https://database.test'); assert.equal(parsed.pathname, '/rest/v1/site_domain_redirects');
  assert.deepEqual(Object.fromEntries(parsed.searchParams), {source_hostname: 'eq.docs.example.test', enabled: 'eq.true', select: 'target_url,permanent,preserve_path', limit: '2'});
  assert.equal(init.method, 'GET'); assert.equal(init.cache, 'no-store'); assert.equal(init.redirect, 'error'); assert.equal(init.headers.authorization, undefined); assert.equal(init.headers.apikey, undefined); assert.equal(init.body, undefined); assert.equal(h.writes.length, 0);
});
test('empty successful result falls through as null', async () => {const h = fixture([response([])]); assert.equal(await h.resolve(request()), null);});
test('HTTP failure is 503, not missing, and recovery is immediate', async () => {
  const h = fixture([response({}, 503), response([row()])]); const failed = await h.resolve(request(), {fresh: false});
  assert.equal(failed.status, 503); assert.deepEqual(await failed.json(), {code: 'REDIRECT_LOOKUP_UNAVAILABLE'}); assert.equal(failed.headers.get('cache-control'), 'no-store'); assert.equal(failed.headers.get('location'), null); assert.equal(h.writes.length, 0);
  assert.equal((await h.resolve(request(), {fresh: false})).status, 308); assert.equal(h.calls.length, 2);
});
test('transport failure produces 503', async () => {const h = fixture([new Error('fixture secret must not escape')]); const r = await h.resolve(request()); assert.equal(r.status, 503); assert.equal((await r.text()).includes('secret'), false);});
test('malformed body produces 503', async () => {const h = fixture([new Response('{')]); assert.equal((await h.resolve(request())).status, 503);});
test('ambiguous and unsafe rules produce 503 without redirects', async () => {
  for (const rows of [[row(), row()], [row({target_url: 'http://target.test/'})], [row({target_url: 'https://user:pass@target.test/'})]]) {const h = fixture([response(rows)]), r = await h.resolve(request()); assert.equal(r.status, 503); assert.equal(r.headers.get('location'), null);}
});
test('path and incoming query are preserved', async () => {const h = fixture([response([row({target_url: 'https://target.test/base'})])]); const r = await h.resolve(request('/a%20b?x=a%2Bb')); assert.equal(r.headers.get('location'), 'https://target.test/base/a%20b?x=a%2Bb');});
test('configured target query takes priority', async () => {const h = fixture([response([row({target_url: 'https://target.test/?fixed=1'})])]); assert.equal((await h.resolve(request())).headers.get('location'), 'https://target.test/guide?fixed=1');});
test('preserve_path false retains only configured target', async () => {const h = fixture([response([row({target_url: 'https://target.test/base', preserve_path: false})])]); assert.equal((await h.resolve(request())).headers.get('location'), 'https://target.test/base');});
test('temporary rules use 307 with no-store', async () => {const h = fixture([response([row({permanent: false})])]), r = await h.resolve(request()); assert.equal(r.status, 307); assert.equal(r.headers.get('cache-control'), 'no-store');});
test('HEAD has no body for redirect or failure', async () => {const h = fixture([response([row()]), response({}, 503)]); for (const status of [308, 503]) {const r = await h.resolve(request('/', 'HEAD')); assert.equal(r.status, status); assert.equal(await r.text(), '');}});
test('POST and platform hosts bypass this test resolver', async () => {const h = fixture([]); assert.equal(await h.resolve(request('/', 'POST')), null); for (const host of ['ngeblogging.com', 'www.ngeblogging.com', 'studio.ngeblogging.com', 'source.ngeblogging.com']) assert.equal(await h.resolve(new Request('https://' + host + '/')), null); assert.equal(h.calls.length, 0);});
test('fresh default does not serve a cached rule after simulated visibility change', async () => {const h = fixture([response([row()]), response([])]); await h.resolve(request(), {fresh: false}); assert.equal(await h.resolve(request()), null); assert.equal(h.entries.size, 1); assert.equal(h.calls.length, 2);});
test('fresh backend denial cannot fall back to cached rule', async () => {const h = fixture([response([row()]), response({}, 403)]); await h.resolve(request(), {fresh: false}); assert.equal((await h.resolve(request())).status, 503); assert.equal(h.calls.length, 2);});
test('deadline covers headers even when injected fetch never settles', async () => {const h = fixture([() => new Promise(() => {})], {timeoutMs: 5}); assert.equal((await h.resolve(request())).status, 503); assert.equal(h.calls[0].init.signal.aborted, true);});
test('deadline also covers stalled successful body read', async () => {const h = fixture([{ok: true, text: () => new Promise(() => {})}], {timeoutMs: 5}); assert.equal((await h.resolve(request())).status, 503); assert.equal(h.calls[0].init.signal.aborted, true);});
test('real origins, credentials, path/query and invalid deadlines are rejected', () => {
  const h = fixture([]);
  for (const origin of ['https://example.supabase.co', 'https://ngeblogging.com', 'https://user:pass@database.test', 'https://database.test/path', 'https://database.test/?x=1', 'http://database.test']) assert.throws(() => createTestRedirectPipeline({...h.config, origin}), /TEST_REDIRECT_CONFIG_REQUIRED/);
  for (const timeoutMs of [0, 5001, '5']) assert.throws(() => createTestRedirectPipeline({...h.config, timeoutMs}), /TEST_REDIRECT_CONFIG_REQUIRED/);
  assert.throws(() => createTestRedirectPipeline({...h.config, fetchImpl: undefined}), /TEST_REDIRECT_CONFIG_REQUIRED/);
  for (const origin of ['http://127.0.0.1:54321', 'http://localhost:54321', 'http://[::1]:54321']) assert.ok(createTestRedirectPipeline({...h.config, origin}).resolve);
});
test('same-host rules fail closed rather than generating growing redirects', async () => {const h = fixture([response([row({target_url: 'https://docs.example.test/base'})])]), r = await h.resolve(request()); assert.equal(r.status, 503); assert.equal(r.headers.get('location'), null);});
async function withHttpFixture(handler, run) {
  const server = createServer(handler);
  await new Promise((resolve, reject) => {server.once('error', reject); server.listen(0, '127.0.0.1', resolve);});
  try {return await run(`http://127.0.0.1:${server.address().port}`);}
  finally {server.closeAllConnections(); await new Promise(resolve => server.close(resolve));}
}
test('native loopback HTTP integrates filtered read through redirect response', async () => {
  let observed;
  await withHttpFixture((req, res) => {observed = {method: req.method, url: req.url, authorization: req.headers.authorization}; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify([row()]));}, async origin => {
    const h = fixture([], {origin, fetchImpl: globalThis.fetch}); const r = await h.resolve(request());
    assert.equal(r.status, 308); assert.equal(r.headers.get('location'), 'https://target.test/guide?ref=source'); assert.equal(observed.method, 'GET'); assert.equal(observed.authorization, undefined); assert.equal(new URL(observed.url, origin).searchParams.get('source_hostname'), 'eq.docs.example.test');
  });
});
test('native loopback HTTP 503 is not negatively cached before recovery', async () => {
  let count = 0;
  await withHttpFixture((req, res) => {count++; res.setHeader('content-type', 'application/json'); res.statusCode = count === 1 ? 503 : 200; res.end(JSON.stringify(count === 1 ? {} : [row()]));}, async origin => {
    const h = fixture([], {origin, fetchImpl: globalThis.fetch}); assert.equal((await h.resolve(request(), {fresh: false})).status, 503); assert.equal(h.entries.size, 0); assert.equal((await h.resolve(request(), {fresh: false})).status, 308); assert.equal(count, 2);
  });
});
test('native loopback stalled body is bounded and abort signalled', async () => {
  let started = false, signal;
  await withHttpFixture((req, res) => {started = true; res.setHeader('content-type', 'application/json'); res.flushHeaders(); res.write('[');}, async origin => {
    const fetchImpl = (url, init) => {signal = init.signal; return globalThis.fetch(url, init);};
    const h = fixture([], {origin, fetchImpl, timeoutMs: 100}); assert.equal((await h.resolve(request())).status, 503); assert.equal(started, true); assert.equal(signal.aborted, true);
  });
});
