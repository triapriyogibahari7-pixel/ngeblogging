import test from 'node:test';
import assert from 'node:assert/strict';
import {createRedirectLookup} from '../server/drafts/domain-transfer-redirect-lookup.mjs';
const host = 'docs.example.test';
const row = (target = 'https://target.test/') => ({target_url: target, permanent: true, preserve_path: true});
const reply = (rows, status = 200) => new Response(JSON.stringify(rows), {status});
function fixture(responses) {
  const state = {now: 0, reads: 0, writes: [], calls: [], responses: [...responses]}, entries = new Map();
  const cache = {
    async get(key) {state.reads++; const entry = entries.get(key); return entry && entry.expires > state.now ? structuredClone(entry.value) : null;},
    async set(key, value, ttl) {state.writes.push(ttl); entries.set(key, {value: structuredClone(value), expires: state.now + ttl * 1000});},
  };
  const fetchRule = async (hostname, options) => {state.calls.push({hostname, options}); const next = state.responses.shift(); if (next instanceof Error) throw next; assert.ok(next, 'Unexpected backend request'); return next;};
  return {state, cache, entries, fetchRule, lookup: createRedirectLookup({namespace: 'fixture', fetchRule, cache})};
}
test('positive cache expires at 30 seconds', async () => {
  const h = fixture([reply([row()]), reply([row('https://new.test/')])]);
  assert.equal((await h.lookup(host)).rule.target_url, 'https://target.test/');
  h.state.now = 29999; assert.equal((await h.lookup(host)).rule.target_url, 'https://target.test/'); assert.equal(h.state.calls.length, 1);
  h.state.now = 30000; assert.equal((await h.lookup(host)).rule.target_url, 'https://new.test/'); assert.deepEqual(h.state.writes, [30, 30]);
});
test('successful empty array caches visible absence for 15 seconds', async () => {
  const h = fixture([reply([]), reply([row()])]);
  assert.equal((await h.lookup(host)).kind, 'missing'); h.state.now = 14999; assert.equal((await h.lookup(host)).kind, 'missing'); assert.equal(h.state.calls.length, 1);
  h.state.now = 15000; assert.equal((await h.lookup(host)).kind, 'found'); assert.deepEqual(h.state.writes, [15, 30]);
});
test('HTTP failures are unavailable, never negatively cached, and recover immediately', async () => {
  for (const status of [401, 403, 429, 500, 503]) {
    const h = fixture([reply({}, status), reply([row()])]);
    assert.deepEqual(await h.lookup(host), {kind: 'unavailable', reason: 'http'}); assert.equal(h.state.writes.length, 0);
    assert.equal((await h.lookup(host)).kind, 'found'); assert.equal(h.state.calls.length, 2);
  }
});
test('transport failures do not become missing', async () => {
  const h = fixture([new Error('offline'), reply([row()])]);
  assert.deepEqual(await h.lookup(host), {kind: 'unavailable', reason: 'transport'}); assert.equal(h.state.writes.length, 0); assert.equal((await h.lookup(host)).kind, 'found');
});
test('malformed JSON is unavailable and uncached', async () => {
  const h = fixture([new Response('{')]); assert.deepEqual(await h.lookup(host), {kind: 'unavailable', reason: 'payload'}); assert.equal(h.state.writes.length, 0);
});
test('ambiguous and unsafe payloads are unavailable and uncached', async () => {
  for (const rows of [{}, [row(), row()], [null], [{target_url: 'http://target.test/'}], [{target_url: 'https://user:pass@target.test/'}], [{target_url: 'https://target.test:8443/'}], [{...row(), permanent: 'false'}]]) {
    const h = fixture([reply(rows)]); assert.equal((await h.lookup(host)).kind, 'unavailable'); assert.equal(h.state.writes.length, 0);
  }
});
test('fresh mode bypasses positive cache without pretending to purge it', async () => {
  const h = fixture([reply([row()]), reply([row('https://new.test/')])]); await h.lookup(host);
  assert.equal((await h.lookup(host, {fresh: true})).rule.target_url, 'https://new.test/'); assert.equal(h.state.reads, 1); assert.deepEqual(h.state.writes, [30]);
  assert.equal((await h.lookup(host)).rule.target_url, 'https://target.test/');
});
test('fresh mode bypasses negative cache', async () => {
  const h = fixture([reply([]), reply([row()])]); await h.lookup(host); assert.equal((await h.lookup(host, {fresh: true})).kind, 'found'); assert.deepEqual(h.state.writes, [15]);
});
test('fresh denial never falls back to a cached redirect', async () => {
  const h = fixture([reply([row()]), reply({}, 403)]); await h.lookup(host);
  assert.deepEqual(await h.lookup(host, {fresh: true}), {kind: 'unavailable', reason: 'http'}); assert.deepEqual(h.state.writes, [30]);
});
test('fresh empty result respects changed visibility without returning old rule', async () => {
  const h = fixture([reply([row()]), reply([])]); await h.lookup(host); assert.deepEqual(await h.lookup(host, {fresh: true}), {kind: 'missing'});
});
test('cache read failure falls through to backend', async () => {
  const h = fixture([reply([row()])]); h.cache.get = async () => {throw new Error('cache offline');}; assert.equal((await h.lookup(host)).kind, 'found');
});
test('cache write failure does not erase a successful lookup', async () => {
  const h = fixture([reply([row()])]); h.cache.set = async () => {throw new Error('cache offline');}; assert.equal((await h.lookup(host)).kind, 'found');
});
test('hostname normalization and no-store adapter hint are explicit', async () => {
  const h = fixture([reply([row()])]); await h.lookup(' DOCS.EXAMPLE.TEST. '); assert.deepEqual(h.state.calls, [{hostname: host, options: {cache: 'no-store'}}]);
});
test('invalid inputs fail before adapter or cache use', async () => {
  const h = fixture([]);
  for (const input of ['localhost', 'https://docs.example.test/', 'a..test', '-a.test', 'a-.test', 'a.test:443']) await assert.rejects(h.lookup(input), /INVALID_HOSTNAME/);
  await assert.rejects(h.lookup(host, {fresh: 'true'}), /INVALID_FRESH_OPTION/); assert.equal(h.state.calls.length, 0); assert.equal(h.state.reads, 0);
});
test('namespace separates otherwise identical cache keys', async () => {
  const h = fixture([reply([row()]), reply([row('https://other.test/')])]); await h.lookup(host);
  const other = createRedirectLookup({namespace: 'other', fetchRule: h.fetchRule, cache: h.cache}); assert.equal((await other(host)).rule.target_url, 'https://other.test/'); assert.equal(h.entries.size, 2);
});
test('returned rules are whitelisted and do not mutate cached values', async () => {
  const h = fixture([reply([{...row(), permanent: false, preserve_path: false, secret: 'fixture-only'}])]); const result = await h.lookup(host);
  assert.deepEqual(result.rule, {...row(), permanent: false, preserve_path: false}); result.rule.target_url = 'https://changed.test/'; assert.equal((await h.lookup(host)).rule.target_url, 'https://target.test/');
});
