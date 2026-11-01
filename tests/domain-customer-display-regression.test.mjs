import test from 'node:test';
import assert from 'node:assert/strict';
import {createCustomerCurrencyContext,readCustomerCurrencyContext,usdEquivalentFromIdr,formatCustomerDomainMoney} from '../shared/domain-currency-display.mjs';
import {buildCustomerDomainSuggestions,DOMAIN_SUGGESTION_MODELS} from '../server/domain-customer-suggestions.mjs';
import {issueProviderDomainReviewReceipt,verifyProviderDomainReviewReceipt} from '../server/domain-provider-review-receipt.mjs';
import {readCustomerSearchView,currentCustomerSearchView} from '../src/lib/domain-customer-search.mjs';
import {readCustomerDomainReview,currentCustomerDomainReview} from '../src/lib/domain-customer-review.mjs';
// Offline fixtures only. These are not registrar responses, production rates or quotes.
const NOW=Date.parse('2026-11-01T12:00:00.000Z'),UNTIL=NOW+60000,iso=n=>new Date(n).toISOString();
const USER='11111111-1111-4111-8111-111111111111',SITE='22222222-2222-4222-8222-222222222222',REVIEW='33333333-3333-4333-8333-333333333333';
const KEY=new Uint8Array(32).fill(11),DOMAIN='example.com';
const fx=()=>({base:'USD',quote:'IDR',rate:'20000',observedAt:iso(NOW-1000),expiresAt:iso(UNTIL)});
const timing={requestStartedAt:1000,receivedAt:1100};
function reviewFixture(){
 const context={providerId:'opensrs',registrarAccountRef:'offline-fixture-account'};
 const check={code:'DOMAIN_CUSTOMER_PRICE_CHECK',environment:'production',siteId:SITE,domain:DOMAIN,availability:'available',indicative:true,purchaseAllowed:false,checkoutAvailable:false,quoteContext:context,checkedAt:iso(NOW),expiresAt:iso(UNTIL),price:{currency:'IDR',amountIdr:160000,termYears:1,expiresAt:iso(UNTIL),indicative:true,purchaseAllowed:false}};
 const review=issueProviderDomainReviewReceipt(check,{key:KEY,userId:USER,siteId:SITE,...context,now:NOW,makeId:()=>REVIEW});
 const options={key:KEY,userId:USER,siteId:SITE,...context,domain:DOMAIN,expectedAmountIdr:160000,now:NOW};
 const data={code:'DOMAIN_CUSTOMER_REVIEW',environment:'production',siteId:SITE,domain:DOMAIN,reviewReceiptVersion:2,reviewOnly:true,orderCreated:false,paymentStarted:false,purchaseAllowed:false,checkoutAvailable:false,currencyContext:fx(),review};
 return {data,options,readOptions:{userId:USER,siteId:SITE,domain:DOMAIN,...timing}};
}
function searchFixture(){
 const plan=buildCustomerDomainSuggestions(DOMAIN,['com']),names=[plan.primaryDomain,...plan.suggestions];
 const candidates=names.map((domain,index)=>({domain,isPrimary:index===0,status:'available',checkedAt:iso(NOW+1),expiresAt:iso(UNTIL),price:{currency:'IDR',amountIdr:160000,termYears:1,expiresAt:iso(UNTIL),indicative:true,purchaseAllowed:false}}));
 return {code:'DOMAIN_CUSTOMER_SEARCH',environment:'production',siteId:SITE,...plan,candidateCount:names.length,suggestionCount:50,attemptedCount:names.length,checkedCount:names.length,unverifiedCount:0,notCheckedCount:0,complete:true,timedOut:false,startedAt:iso(NOW),completedAt:iso(NOW+10),candidates,currencyContext:fx(),limits:{requestBudget:100,requestsUsed:names.length,exhausted:false},indicative:true,purchaseAllowed:false,checkoutAvailable:false};
}
const searchOptions={siteId:SITE,query:DOMAIN,...timing};
test('USD display uses exact integer rounding without changing the IDR amount',()=>{
 assert.equal(usdEquivalentFromIdr(160000,fx(),{now:NOW}),'8.00');
 assert.equal(usdEquivalentFromIdr(160001,fx(),{now:NOW}),'8.01');
 assert.equal(usdEquivalentFromIdr(1,fx(),{now:NOW}),'0.01');
 assert.equal(formatCustomerDomainMoney(160000,{currency:'USD',context:fx(),now:NOW}),'USD 8.00');
});
test('expired, future and missing-time currency displays cannot invent a rate',()=>{
 assert.throws(()=>usdEquivalentFromIdr(160000,fx(),{now:UNTIL}));
 assert.throws(()=>usdEquivalentFromIdr(160000,fx(),{now:NOW-2000}));
 assert.throws(()=>usdEquivalentFromIdr(160000,fx()));
 assert.equal(formatCustomerDomainMoney(160000,{currency:'USD',now:NOW}),'USD belum tersedia');
 assert.equal(formatCustomerDomainMoney(160000,{currency:'USD',context:fx(),now:UNTIL}),'USD belum tersedia');
});
test('currency metadata rejects malformed rates, extra fields and excessive lifetime',()=>{
 for(const rate of ['0','-1','NaN','20000e0','1.0000001'])assert.throws(()=>readCustomerCurrencyContext({...fx(),rate}));
 assert.throws(()=>readCustomerCurrencyContext({...fx(),source:'unexpected'}));
 assert.throws(()=>readCustomerCurrencyContext({...fx(),expiresAt:iso(NOW+86400001)}));
 assert.throws(()=>usdEquivalentFromIdr(1.5,fx(),{now:NOW}));
 assert.throws(()=>usdEquivalentFromIdr(1000000000000,{...fx(),rate:'0.000001'},{now:NOW}));
});
test('public context requires production verified FX and omits private fields',()=>{
 const snapshot={environment:'production',fx:{...fx(),source:'offline-fixture',costBasisVerified:true}};
 const context=createCustomerCurrencyContext(snapshot,{now:NOW});
 assert.deepEqual(Object.keys(context),['base','quote','rate','observedAt','expiresAt']);
 assert.ok(Object.isFrozen(context));
 assert.throws(()=>createCustomerCurrencyContext({...snapshot,environment:'sandbox'},{now:NOW}));
 assert.throws(()=>createCustomerCurrencyContext({...snapshot,fx:{...snapshot.fx,costBasisVerified:false}},{now:NOW}));
});
test('a long configured suffix list cannot crowd out the twenty models',()=>{
 const extensions=['com','net','org',...Array.from({length:197},(_,i)=>'tld'+i)];
 const plan=buildCustomerDomainSuggestions(DOMAIN,extensions);
 assert.equal(plan.suggestions.length,50);assert.equal(new Set(plan.suggestions).size,50);
 assert.equal(plan.configuredExtensionCount,200);assert.equal(plan.suggestionModelCount,20);
 assert.ok(plan.candidateExtensionCount>=20);assert.ok(!plan.suggestions.includes(plan.primaryDomain));
 for(const model of DOMAIN_SUGGESTION_MODELS)assert.ok(plan.suggestions.some(name=>name.startsWith(model+'-example.')),model);
});
test('a one-extension configuration reports one rather than fabricated coverage',()=>{
 const plan=buildCustomerDomainSuggestions(DOMAIN,['com']);
 assert.equal(plan.suggestions.length,50);assert.equal(plan.suggestionModelCount,20);
 assert.equal(plan.configuredExtensionCount,1);assert.equal(plan.candidateExtensionCount,1);
 assert.ok(plan.suggestions.every(name=>name.endsWith('.com')));
});
test('search exposes validated context and removes prices on monotonic expiry',()=>{
 const view=readCustomerSearchView(searchFixture(),searchOptions),fresh=currentCustomerSearchView(view,1100);
 assert.equal(fresh.usdDisplayAvailable,true);assert.equal(fresh.rows[0].price.amountIdr,160000);
 const expired=currentCustomerSearchView(view,61000);
 assert.equal(expired.usdDisplayAvailable,false);assert.ok(expired.rows.every(row=>row.price===null&&row.status==='expired'));
 const uncertain=currentCustomerSearchView(view,1099);
 assert.equal(uncertain.clockUnverified,true);assert.equal(uncertain.usdDisplayAvailable,false);assert.ok(uncertain.rows.every(row=>row.price===null));
});
test('search accepts missing legacy metadata for IDR, rejects inconsistent supplied metadata',()=>{
 const legacy=searchFixture();delete legacy.currencyContext;
 assert.equal(currentCustomerSearchView(readCustomerSearchView(legacy,searchOptions),1100).usdDisplayAvailable,false);
 const mismatch=searchFixture();mismatch.currencyContext.expiresAt=iso(UNTIL-1);
 assert.throws(()=>readCustomerSearchView(mismatch,searchOptions));
 const stats=searchFixture();delete stats.candidateExtensionCount;
 assert.throws(()=>readCustomerSearchView(stats,searchOptions));
});
test('server NDR2 verification binds owner, site, provider, account, domain and IDR amount',()=>{
 const {data,options}=reviewFixture(),claims=verifyProviderDomainReviewReceipt(data.review.token,options);
 assert.equal(claims.amountIdr,160000);assert.equal(claims.currency,'IDR');
 assert.equal(claims.purchaseAllowed,false);assert.equal(claims.checkoutAvailable,false);
 for(const change of [{userId:REVIEW},{siteId:REVIEW},{providerId:'cloudflare'},{registrarAccountRef:'another-fixture-account'},{domain:'different.example'},{expectedAmountIdr:160001},{now:UNTIL}])assert.throws(()=>verifyProviderDomainReviewReceipt(data.review.token,{...options,...change}));
 const parts=data.review.token.split('.');parts[2]=(parts[2][0]==='A'?'B':'A')+parts[2].slice(1);
 assert.throws(()=>verifyProviderDomainReviewReceipt(parts.join('.'),options));
});
test('browser review validates display metadata but does not claim HMAC verification',()=>{
 const {data,readOptions}=reviewFixture(),view=readCustomerDomainReview(data,readOptions),fresh=currentCustomerDomainReview(view,1100);
 assert.equal(fresh.usdDisplayAvailable,true);assert.equal(fresh.signatureVerified,false);assert.equal(fresh.purchaseAllowed,false);
 assert.equal(usdEquivalentFromIdr(fresh.price.amountIdr,fresh.currencyContext,{now:fresh.displayNowMs}),'8.00');
 const expired=currentCustomerDomainReview(view,61100);
 assert.equal(expired.status,'expired');assert.equal(expired.token,null);assert.equal(expired.price,null);assert.equal(expired.usdDisplayAvailable,false);
});
test('review rejects FX shorter than receipt and amounts inconsistent with its payload',()=>{
 const {data,readOptions}=reviewFixture();
 assert.throws(()=>readCustomerDomainReview({...data,currencyContext:{...fx(),expiresAt:iso(UNTIL-1)}},readOptions));
 assert.throws(()=>readCustomerDomainReview({...data,review:{...data.review,price:{...data.review.price,amountIdr:160001}}},readOptions));
 const legacy={...data};delete legacy.currencyContext;
 const view=currentCustomerDomainReview(readCustomerDomainReview(legacy,readOptions),1100);
 assert.equal(view.status,'ready');assert.equal(view.usdDisplayAvailable,false);assert.equal(view.price.currency,'IDR');
});
