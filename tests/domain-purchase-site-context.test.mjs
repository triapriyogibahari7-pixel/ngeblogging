import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto,createHash} from 'node:crypto';
import {purchaseDomain,readPurchaseAttempt} from '../src/domain-purchase-model.mjs';
globalThis.crypto??=webcrypto;globalThis.fetch=()=>{throw Error('LIVE_NETWORK_FORBIDDEN');};
const owner='11111111-1111-1111-1111-111111111111',key='22222222-2222-2222-2222-222222222222',qid='33333333-3333-3333-3333-333333333333',site='44444444-4444-4444-4444-444444444444',other='55555555-5555-5555-5555-555555555555',terms='cloudflare-domain-registration-2026-08-20';
const id='DOM-'+createHash('sha256').update('production:'+owner+':'+key).digest('hex').slice(0,40),storageKey='ngeblogging:domain-purchase:v1:'+owner;
function fixture(mode='good'){
 const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},calls=[];
 const q={quoteId:qid,domain:'example.com',years:1,displayCurrency:'USD',salePriceUsd:'20.00',currency:'IDR',amountIdr:350000,expiresAt:new Date(Date.now()+60000).toISOString(),indicative:false};
 const registrant={name:'Synthetic Owner',email:'fixture@example.com',phone:'+62.8123456789',street:'Fixture',city:'Fixture',state:'Fixture',postalCode:'12345',countryCode:'ID'};
 const fetchImpl=async(path,init)=>{calls.push({path,headers:init.headers,body:JSON.parse(init.body)});
  if(path.endsWith('/order')){
   if(mode==='outage')return Response.json({code:'DOMAIN_ORDER_SITE_BINDING_UNAVAILABLE'},{status:503});
   const binding={orderId:id,userId:mode==='wrong-user'?other:owner,siteId:mode==='wrong-site'?other:site,siteBound:true,bindingReused:false,checkoutCreated:false,registrationActionTaken:mode==='action'};
   return Response.json({code:'DOMAIN_ORDER_PRODUCTION',environment:'production',order:{orderId:id,quoteId:qid,domain:q.domain,years:1,currency:'IDR',amountIdr:q.amountIdr,salePriceUsd:q.salePriceUsd,displayCurrency:'USD',providerId:'cloudflare',reused:false,paymentState:'pending',registrationState:'not_started'},...(mode==='missing-binding'||mode==='legacy'?{}:{siteBinding:binding})});
  }
  if(path.endsWith('/registrant'))return Response.json({code:'DOMAIN_REGISTRANT_DETAILS_SAVED',environment:'production',orderId:id,detailsSaved:true,registrationStarted:false,termsVersion:terms});
  if(path.endsWith('/checkout'))return Response.json({code:'DOMAIN_CHECKOUT_PRODUCTION',environment:'production',checkoutCreated:true,purchaseAllowed:true,reused:false,registrationStarted:false,checkout:{orderId:id,currency:'IDR',amountIdr:q.amountIdr,expiresAt:q.expiresAt,url:'https://app.midtrans.com/snap/v2/vtweb/fixture-token-123456'}});
  throw Error('unexpected mock request');
 };
 const options={owner,token:'fixture-session',storage,locks:{request:async(n,o,fn)=>fn({})},registrant,siteId:site,acceptedTerms:true,termsVersion:terms,fetchImpl,makeId:()=>key};
 const seed=(target=site)=>values.set(storageKey,JSON.stringify({owner,key,orderId:id,quote:q,phase:'order',...(target===null?{}:{siteId:target})}));
 return {q,options,calls,storage,values,seed};
}
test('site is persisted and sent only to order endpoint before checkout',async()=>{const f=fixture();await purchaseDomain(f.q,f.options);assert.equal(readPurchaseAttempt(owner,f.storage).siteId,site);assert.equal(f.calls[0].headers['x-site-id'],site);assert.equal(f.calls[1].headers['x-site-id'],undefined);assert.equal(f.calls[2].headers['x-site-id'],undefined);assert.deepEqual(f.calls[2].body,{orderId:id});});
test('same-site pending attempt preserves its idempotency key',async()=>{const f=fixture();f.seed();await purchaseDomain(f.q,f.options);assert.equal(f.calls[0].body.idempotencyKey,key);});
test('switching site blocks all API calls and preserves original attempt',async()=>{const f=fixture();f.seed();await assert.rejects(purchaseDomain(f.q,{...f.options,siteId:other}),{code:'ATTEMPT_SITE_MISMATCH'});assert.equal(f.calls.length,0);assert.equal(readPurchaseAttempt(owner,f.storage).siteId,site);});
test('legacy attempt cannot silently acquire the current site',async()=>{const f=fixture();f.seed(null);await assert.rejects(purchaseDomain(f.q,f.options),{code:'ATTEMPT_SITE_MISMATCH'});assert.equal(f.calls.length,0);});
test('bound attempt cannot silently drop its target',async()=>{const f=fixture();f.seed();await assert.rejects(purchaseDomain(f.q,{...f.options,siteId:null}),{code:'ATTEMPT_SITE_MISMATCH'});assert.equal(f.calls.length,0);});
test('missing server binding stops before registrant or checkout',async()=>{const f=fixture('missing-binding');await assert.rejects(purchaseDomain(f.q,f.options),{code:'ORDER_SITE_BINDING_UNVERIFIED'});assert.equal(f.calls.length,1);assert.equal(readPurchaseAttempt(owner,f.storage).key,key);});
test('wrong user site or action in server binding is rejected',async()=>{for(const mode of ['wrong-user','wrong-site','action']){const f=fixture(mode);await assert.rejects(purchaseDomain(f.q,f.options),{code:'ORDER_SITE_BINDING_UNVERIFIED'});assert.equal(f.calls.length,1);}});
test('ambiguous binding outage preserves key and target for retry',async()=>{const f=fixture('outage');await assert.rejects(purchaseDomain(f.q,f.options));await assert.rejects(purchaseDomain(f.q,f.options));assert.equal(f.calls.length,2);assert.equal(f.calls[0].body.idempotencyKey,f.calls[1].body.idempotencyKey);assert.equal(readPurchaseAttempt(owner,f.storage).siteId,site);});
test('malformed saved site blocks reading without discarding attempt',()=>{const f=fixture();f.seed('invalid');assert.throws(()=>readPurchaseAttempt(owner,f.storage),{code:'ATTEMPT_UNREADABLE'});assert.ok(f.values.has(storageKey));});
test('invalid requested site makes no API calls',async()=>{const f=fixture();await assert.rejects(purchaseDomain(f.q,{...f.options,siteId:'invalid'}),{code:'INVALID_SITE_ID'});assert.equal(f.calls.length,0);});
test('legacy caller still works without site or binding',async()=>{const f=fixture('legacy');await purchaseDomain(f.q,{...f.options,siteId:null});assert.equal(f.calls[0].headers['x-site-id'],undefined);assert.equal(Object.hasOwn(readPurchaseAttempt(owner,f.storage),'siteId'),false);});
test('legacy caller cannot accept an unexpected bound response',async()=>{const f=fixture();await assert.rejects(purchaseDomain(f.q,{...f.options,siteId:null}),{code:'ORDER_SITE_BINDING_UNVERIFIED'});assert.equal(f.calls.length,1);});
