import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// Adapter unit tests double only the purchase engine; target validation uses the real helper.
const raw=readFileSync(new URL('../src/domain-midtrans-checkout.mjs',import.meta.url),'utf8');
const href=new URL('../src/domain-midtrans-payment-target.mjs',import.meta.url).href;
const source=raw.replace("import {purchaseDomain} from './domain-purchase-model.mjs';","const purchaseDomain=()=>{throw Error('Unexpected default purchase call');};").replace("'./domain-midtrans-payment-target.mjs'",JSON.stringify(href));
const {purchaseDomainForPopup:buy}=await import('data:text/javascript,'+encodeURIComponent(source));
const id='DOM-'+'a'.repeat(40),amount=285000,token='12345678-1234-4123-8123-123456789abc',url='https://app.midtrans.com/snap/v4/redirection/'+token;
const payload=()=>({code:'DOMAIN_CHECKOUT_PRODUCTION',environment:'production',purchaseAllowed:true,checkoutCreated:true,registrationStarted:false,checkout:{orderId:id,currency:'IDR',amountIdr:amount,expiresAt:new Date(Date.now()+120000).toISOString(),url,snapToken:token,clientKey:'Mid-client-fixture_1234567890'}});
function fixture(change=x=>x,{rawBody=null,status=201,resultUrl=url,signal}={}){
 let purchases=0,requests=0,originalReadable=false;
 const fetchImpl=async()=>{requests++;return new Response(rawBody??JSON.stringify(change(payload())),{status,headers:{'content-type':'application/json'}});};
 const engine=async(q,options)=>{purchases++;const r=await options.fetchImpl('/api/commerce/domains/checkout',{method:'POST',signal});if(rawBody===null){const v=await r.json();originalReadable=Boolean(v.checkout);}return {orderId:id,url:resultUrl};};
 return {run:()=>buy({amountIdr:amount},{fetchImpl,signal},engine),counts:()=>({purchases,requests,originalReadable})};
}
test('one purchase and one observed checkout; original body remains readable',async()=>{const f=fixture(),p=await f.run();assert.equal(p.orderId,id);assert.equal(p.url,url);assert.equal(p.snapToken,token);assert.deepEqual(f.counts(),{purchases:1,requests:1,originalReadable:true});});
test('legacy response without popup metadata still yields same hosted target',async()=>{const f=fixture(x=>{delete x.checkout.snapToken;delete x.checkout.clientKey;return x;}),p=await f.run();assert.equal(p.snapToken,token);assert.equal(p.clientKey,null);assert.equal(f.counts().requests,1);});
test('wrong saved amount is rejected without a second request',async()=>{const f=fixture(x=>{x.checkout.amountIdr++;return x;});await assert.rejects(f.run(),{code:'DOMAIN_PAYMENT_TARGET_UNVERIFIED'});assert.equal(f.counts().requests,1);});
test('wrong environment or permission flags are rejected',async()=>{for(const change of [x=>({...x,environment:'sandbox'}),x=>({...x,purchaseAllowed:false}),x=>({...x,registrationStarted:true})])await assert.rejects(fixture(change).run(),{code:'PAYMENT_DETAILS_UNAVAILABLE'});});
test('observed URL must match the verified purchase result',async()=>{await assert.rejects(fixture(x=>x,{resultUrl:url+'other'}).run(),{code:'PAYMENT_DETAILS_UNAVAILABLE'});});
test('malformed presentation cannot cause another purchase',async()=>{const f=fixture(x=>x,{rawBody:'{broken'});await assert.rejects(f.run(),{code:'PAYMENT_DETAILS_UNAVAILABLE'});assert.equal(f.counts().purchases,1);assert.equal(f.counts().requests,1);});
test('oversized response is rejected',async()=>{const f=fixture(x=>x,{rawBody:' '.repeat(32769)});await assert.rejects(f.run(),{code:'PAYMENT_DETAILS_UNAVAILABLE'});assert.equal(f.counts().requests,1);});
test('failed checkout response is not presented as a payment target',async()=>await assert.rejects(fixture(x=>x,{status:503}).run(),{code:'PAYMENT_DETAILS_UNAVAILABLE'}));
