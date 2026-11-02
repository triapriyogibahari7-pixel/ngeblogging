import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import * as wrangler from 'wrangler';
import {verifyProviderDomainReviewReceipt} from '../server/domain-provider-review-receipt.mjs';
assert.equal(typeof wrangler.createTestHarness,'function','PINNED_WRANGLER_TEST_HARNESS_UNAVAILABLE');
const server=wrangler.createTestHarness({workers:[{config:{name:'domain-auth-native-fixture',main:fileURLToPath(new URL('./fixtures/domain-auth-native.worker.mjs',import.meta.url)),compatibility_date:'2026-07-28',compatibility_flags:['nodejs_compat'],workers_dev:false,routes:[]}}]});
before(async()=>{await server.listen();},{timeout:60000});
after(async()=>{await server.close();},{timeout:30000});
async function run(mode){
 const response=await server.getWorker('domain-auth-native-fixture').fetch('http://isolated-fixture.invalid/'+mode);assert.equal(response.status,200);
 const value=await response.json();assert.equal(value.fixtureOnly,true);assert.equal(value.blockedExternalCalls,0);
 if(value.calls)assert.equal(value.calls.unexpected,0);
 const output=JSON.stringify(value);for(const secret of ['offline-fixture-public-key','offline-fixture-registrar-token','Bearer offline-fixture-session'])assert.ok(!output.includes(secret));
 return value;
}
test('native Request reproduces unsupported error mode and accepts manual',async()=>{
 const value=await run('native-modes');assert.equal(value.runtime,'workerd');assert.equal(value.error.accepted,false);assert.equal(value.error.errorType,'TypeError');assert.equal(value.manual.accepted,true);assert.equal(value.manual.redirect,'manual');
});
test('native search traverses auth, ownership and real quote/pricing modules with isolated upstreams',async()=>{
 const value=await run('search');assert.equal(value.status,200);const b=value.body;
 assert.equal(b.code,'DOMAIN_CUSTOMER_SEARCH');assert.equal(b.suggestionCount,50);assert.equal(b.candidateCount,51);assert.equal(b.checkedCount,51);assert.equal(b.complete,true);assert.equal(b.purchaseAllowed,false);assert.equal(b.checkoutAvailable,false);
 assert.deepEqual(value.calls,{session:1,site:1,quote:51,unexpected:0,total:53});
 for(const row of b.candidates){assert.equal(row.status,'available');assert.equal(row.price.currency,'IDR');assert.equal(row.price.amountIdr,128283);}
});
test('native review rechecks ownership and quotes then emits a verifiable NDR2 receipt',async()=>{
 const value=await run('review'),b=value.body;assert.equal(value.status,200);assert.equal(b.code,'DOMAIN_CUSTOMER_REVIEW');assert.equal(b.reviewReceiptVersion,2);assert.equal(b.orderCreated,false);assert.equal(b.paymentStarted,false);assert.equal(b.purchaseAllowed,false);
 assert.deepEqual(value.calls,{session:2,site:1,quote:1,unexpected:0,total:4});
 const claims=verifyProviderDomainReviewReceipt(b.review.token,{key:new Uint8Array(32).fill(11),userId:'11111111-1111-4111-8111-111111111111',siteId:'22222222-2222-4222-8222-222222222222',providerId:'cloudflare',registrarAccountRef:'cloudflare:095e57b46e7ba7f6b188480d9e4e5fe7',domain:'example.com',expectedAmountIdr:128283});
 assert.equal(claims.currency,'IDR');assert.equal(claims.purchaseAllowed,false);
});
test('native auth redirects cannot reach another destination or a registrar',async()=>{
 for(const [mode,code,status,total] of [['session-redirect','AUTH_SESSION_UPSTREAM_UNAVAILABLE',302,1],['site-redirect','AUTH_SITE_UPSTREAM_UNAVAILABLE',307,2]]){
  const value=await run(mode);assert.equal(value.status,503);assert.equal(value.body.code,code);assert.equal(value.body.upstreamStatus,status);assert.equal(value.calls.quote,0);assert.equal(value.calls.total,total);
 }
});
test('native rejected registrar redirects never acquire invented prices',async()=>{
 const value=await run('quote-redirect');assert.equal(value.status,200);assert.equal(value.body.code,'DOMAIN_CUSTOMER_SEARCH');assert.equal(value.body.complete,false);assert.equal(value.body.checkedCount,0);
 assert.ok(value.body.candidates.every(row=>row.price===null&&row.status==='unverified'));assert.equal(value.calls.quote,51);
});
test('native session, ownership and permission failures remain distinct and fail closed',async()=>{
 for(const [mode,status,code] of [['expired',401,'INVALID_SESSION'],['foreign',403,'SITE_OWNER_REQUIRED'],['site-forbidden',503,'AUTH_SITE_ACCESS_DENIED'],['api-key-rejected',503,'AUTH_API_KEY_REJECTED']]){
  const value=await run(mode);assert.equal(value.status,status);assert.equal(value.body.code,code);assert.equal(value.calls.quote,0);
 }
});
test('native caller timeout remains denied without quote activity',async()=>{
 const value=await run('timeout');assert.equal(value.status,503);assert.equal(value.body.code,'AUTH_REQUEST_TIMEOUT');assert.equal(value.calls.quote,0);
});
test('native concurrent diagnostic state does not poison successful search',async()=>{
 const value=await run('parallel');assert.equal(value.results[0].body.code,'AUTH_SESSION_FETCH_FAILED');assert.equal(value.results[1].body.code,'DOMAIN_CUSTOMER_SEARCH');assert.equal(value.results[1].body.complete,true);
});
test('native handler admission state survives successive requests',async()=>{
 const value=await run('rate-limit');assert.equal(value.results.length,11);assert.ok(value.results.slice(0,10).every(r=>r.body.code==='DOMAIN_SEARCH_DISABLED'));assert.equal(value.results[10].status,429);assert.equal(value.results[10].body.code,'LOOKUP_RATE_LIMITED');assert.equal(value.calls.quote,0);
});
