import test from 'node:test';
import assert from 'node:assert/strict';
import {DOMAIN_BACKEND_TIMEOUT_MS,isDomainDeadlineRequest,withDomainDeadline} from '../server/domain-api-deadline.mjs';
const request = (path = '/api/domains/register', method = 'POST', origin = 'https://ngeblogging.com') => new Request('https://ngeblogging.com' + path, {method, headers: {origin}});
test('deadline is shorter than the frontend mutation budget and scopes only register/refresh POST', () => {
  assert.ok(DOMAIN_BACKEND_TIMEOUT_MS < 30000);
  assert.equal(isDomainDeadlineRequest(request()), true);
  assert.equal(isDomainDeadlineRequest(request('/api/domains/refresh')), true);
  for (const path of ['/api/domains/list','/api/domains/audit','/api/domains/remove','/api/commerce/domains/order-reconcile']) assert.equal(isDomainDeadlineRequest(request(path)), false);
  assert.equal(isDomainDeadlineRequest(request('/api/domains/register','OPTIONS')), false);
});
test('normal responses are returned unchanged and operation runs once', async () => {
  let calls = 0; const expected = new Response('{"domain":{"status":"verifying"}}', {status:201});
  const actual = await withDomainDeadline(request(), {}, null, () => {calls++;return expected;});
  assert.equal(actual, expected);assert.equal(calls,1);
});
test('timeout is uncertain, keeps original task alive, and never replays', async () => {
  let calls = 0, finish;const tasks=[];
  const result = await withDomainDeadline(request(), {}, {waitUntil: task => tasks.push(task)}, () => {calls++;return new Promise(resolve => {finish=resolve;});}, {timeoutMs:5});
  assert.equal(result.status,504);const payload=await result.json();
  assert.equal(payload.code,'DOMAIN_API_BACKEND_TIMEOUT');assert.equal(payload.mutationOutcome,'unknown');assert.equal(payload.retryAutomatically,false);assert.equal(payload.statusReadRequired,true);
  finish(new Response('{}'));await Promise.all(tasks);assert.equal(calls,1);
});
test('rejections become safe structured JSON, not HTML or leaked upstream details', async () => {
  const response = await withDomainDeadline(request(), {}, null, () => {throw Error('private upstream detail');});
  assert.equal(response.status,503);const body=await response.text();assert.equal(JSON.parse(body).code,'DOMAIN_API_BACKEND_ERROR');assert.equal(body.includes('private upstream detail'),false);
});
test('timeout does not grant CORS to an arbitrary origin', async () => {
  const response = await withDomainDeadline(request('/api/domains/register','POST','https://untrusted.example'), {}, null, () => {throw Error();});
  assert.equal(response.headers.has('access-control-allow-origin'),false);
});
