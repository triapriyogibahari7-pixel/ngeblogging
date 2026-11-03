import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createDomainCustomerPriceCheck as create,customerRegistrationPrice as price} from '../server/domain-customer-price-check.mjs';
const owner='11111111-1111-4111-8111-111111111111',site='22222222-2222-4222-8222-222222222222',now=Date.parse('2026-11-01T00:00:00Z'),iso=delta=>new Date(now+delta).toISOString();
const snapshot=()=>({environment:'production',fx:{base:'USD',quote:'IDR',rate:'16000',observedAt:iso(-1000),expiresAt:iso(3600000),source:'fixture-fx',costBasisVerified:true},policy:{taxStatus:'verified',costScope:'registration_year_1',paymentFeeMode:'conservative_ceiling',sourceRef:'fixture-policy',taxSourceRef:'fixture-tax',paymentFeeSourceRef:'fixture-fee',version:'fixture-v1',verifiedAt:iso(-1000),expiresAt:iso(3600000),otherDirectCostsIdr:0,paymentFixedCostIdr:0,minimumMarginIdr:25000,paymentFeeBasisPoints:0}});
const offer=()=>({providerId:'opensrs',providerEnvironment:'live',domain:'example.com',availability:'available',years:1,indicative:true,mustRecheckBeforePurchase:true,checkedAt:iso(0),expiresAt:iso(60000),prices:{registration:{supported:true,amount:'10.00',currency:'USD',termYears:1,taxIncluded:false}}});
const env=()=>({SUPABASE_URL:'https://polvmlrhqoiflumibfqs.supabase.co',SUPABASE_PUBLISHABLE_KEY:'fixture-public',DOMAIN_CUSTOMER_REGISTRATION_PRICING_SNAPSHOT:JSON.stringify(snapshot())});
const request=(path='/api/domains/commerce/check/example.com',{method='POST',token='fixture-user-token',siteId=site,origin='https://ngeblogging.com',host='https://ngeblogging.com',body}={})=>new Request(host+path,{method,headers:{origin,'x-site-id':siteId,...(token?{authorization:'Bearer '+token}:{})},...(body?{body}:{})});
function fixture({user=owner,rows=[{id:site,owner_id:owner}],authStatus=200,runtimeStatus='configured',mode='live',available=true,timeoutMs=1000}={}){
 const calls=[];let builds=0,lookups=0;
 const handler=create({clock:()=>now,makeId:()=> 'fixture-quote-0001',timeoutMs,
  fetchImpl:async(url,init)=>{calls.push({url:String(url),init});return String(url).includes('/auth/v1/user')?Response.json({id:user},{status:authStatus}):Response.json(rows);},
  runtimeFactory:async()=>{
   builds++;
   const provider={id:'opensrs',enabled:true,quoteEnvironment:mode,extensions:['com'],lookup:async({domain,signal})=>{
    lookups++;assert.equal(signal.aborted,false);
    return {domain,availability:available?'available':'unavailable',prices:{registration:available?offer().prices.registration:{supported:false},renewal:{supported:false},transfer:{supported:false}}};
   }};
   return {status:runtimeStatus,provider};
  }
 });
 return {handler,calls,builds:()=>builds,lookups:()=>lookups};
}
test('owned site gets sale price rather than wholesale cost',async()=>{const f=fixture(),r=await f.handler(request(),env());assert.equal(r.status,200);const p=await r.json();assert.equal(p.siteId,site);assert.equal(p.price.amountIdr,185000);assert.equal(p.price.currency,'IDR');assert.equal(p.indicative,true);assert.equal(p.purchaseAllowed,false);assert.equal(p.checkoutAvailable,false);const text=JSON.stringify(p);for(const secret of ['registrarCost','minimumMargin','fixture-policy','opensrs','fixture-user-token'])assert.equal(text.includes(secret),false);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.equal(f.lookups(),1);assert.ok(f.calls.every(c=>c.init.method==='GET'&&c.init.headers.authorization==='Bearer fixture-user-token'));assert.equal(new URL(f.calls[1].url).searchParams.get('id'),'eq.'+site);});
test('taken domain has no fabricated sale price',async()=>{const f=fixture({available:false}),r=await f.handler(request(),env());assert.equal(r.status,200);assert.equal((await r.json()).price,null);});
test('missing login never reaches provider',async()=>{const f=fixture();assert.equal((await f.handler(request(undefined,{token:''}),env())).status,401);assert.equal(f.calls.length,0);assert.equal(f.builds(),0);});
test('expired session never reaches provider',async()=>{const f=fixture({authStatus:401});assert.equal((await f.handler(request(),env())).status,401);assert.equal(f.builds(),0);});
for(const rows of [[],[{id:site,owner_id:'33333333-3333-4333-8333-333333333333'}],[{id:owner,owner_id:owner}]])test('site ownership mismatch is rejected '+JSON.stringify(rows),async()=>{const f=fixture({rows}),r=await f.handler(request(),env());assert.equal(r.status,403);assert.equal((await r.json()).code,'SITE_OWNER_REQUIRED');assert.equal(f.builds(),0);assert.equal(f.lookups(),0);});
test('duplicate site rows fail closed as an invalid upstream response',async()=>{const f=fixture({rows:[{id:site,owner_id:owner},{id:site,owner_id:owner}]}),r=await f.handler(request(),env());assert.equal(r.status,503);assert.equal((await r.json()).code,'AUTH_UNAVAILABLE');assert.equal(f.builds(),0);assert.equal(f.lookups(),0);});
for(const options of [{method:'GET'},{origin:'https://example.com'},{siteId:'bad'},{host:'https://example.com'}])test('reject invalid request '+JSON.stringify(options),async()=>{const f=fixture();const r=await f.handler(request(undefined,options),env());assert.ok([400,403,404,405].includes(r.status));assert.equal(f.builds(),0);});
test('client cannot submit its own price',async()=>{const f=fixture();assert.equal((await f.handler(request(undefined,{body:'{"amountIdr":1}'}),env())).status,400);assert.equal(f.calls.length,0);});
test('query parameters cannot override provider or price',async()=>{const f=fixture();assert.equal((await f.handler(request('/api/domains/commerce/check/example.com?amount=1'),env())).status,400);assert.equal(f.calls.length,0);});
test('disabled runtime never performs domain lookup',async()=>{const f=fixture({runtimeStatus:'disabled'});assert.equal((await f.handler(request(),env())).status,503);assert.equal(f.lookups(),0);});
test('test provider cannot be used in production endpoint',async()=>{const f=fixture({mode:'test'});assert.equal((await f.handler(request(),env())).status,503);assert.equal(f.lookups(),0);});
test('foreign auth project is not called',async()=>{const f=fixture();assert.equal((await f.handler(request(),{...env(),SUPABASE_URL:'https://other.supabase.co'})).status,503);assert.equal(f.calls.length,0);});
test('prior registrar and other application paths remain untouched',async()=>{const f=fixture();for(const path of ['/api/domains/registrar/check/example.com','/domains','/api/commerce/domains/order'])assert.equal(await f.handler(request(path),env()),null);});
test('per-isolate request budget is enforced',async()=>{const f=fixture();for(let i=0;i<10;i++)assert.equal((await f.handler(request(),env())).status,200);assert.equal((await f.handler(request(),env())).status,429);assert.equal(f.lookups(),10);});
test('invalid or expired pricing snapshot yields no price',async()=>{const f=fixture();const s=snapshot();s.fx.expiresAt=iso(-1);const r=await f.handler(request(),{...env(),DOMAIN_CUSTOMER_REGISTRATION_PRICING_SNAPSHOT:JSON.stringify(s)});assert.equal(r.status,503);assert.equal((await r.text()).includes('16000'),false);});
test('price honors higher configured margin',()=>{const s=snapshot();s.policy.minimumMarginIdr=50000;assert.equal(price(offer(),JSON.stringify(s),{now}).amountIdr,210000);});
test('fixed and percentage fees are included conservatively',()=>{const s=snapshot();s.policy.paymentFeeBasisPoints=290;s.policy.paymentFixedCostIdr=2000;const r=price(offer(),JSON.stringify(s),{now});assert.ok(r.amountIdr-160000-2000-Math.ceil(r.amountIdr*290/10000)>=25000);});
for(const patch of [{providerEnvironment:'test'},{years:2},{availability:'unavailable'},{expiresAt:iso(0)},{checkedAt:iso(1)}])test('reject unsafe quote projection '+JSON.stringify(patch),()=>assert.throws(()=>price({...offer(),...patch},JSON.stringify(snapshot()),{now})));
test('pricing scope must be registration year one',()=>{const s=snapshot();s.policy.costScope='renewal';assert.throws(()=>price(offer(),JSON.stringify(s),{now}));});
test('no invented exchange rate',()=>assert.throws(()=>price(offer(),undefined,{now})));
test('deadline interrupts auth that ignores signal',async()=>{const h=create({timeoutMs:10,clock:()=>now,fetchImpl:()=>new Promise(()=>{})});assert.equal((await h(request(),env())).status,503);});
test('active entry dispatches new handler before legacy without removing it',async()=>{const text=await readFile(new URL('../server/domain-production-registrar-lookup.mjs',import.meta.url),'utf8');assert.ok(text.includes("import {domainCustomerPriceCheckResponse} from './domain-customer-price-check.mjs'"));assert.ok(text.includes('customerPrice??legacyProductionRegistrarLookupResponse(request,env)'));assert.ok(text.includes('export function createProductionRegistrarLookup'));});
test('malformed auth project value fails closed',async()=>{const f=fixture();assert.equal((await f.handler(request(),{...env(),SUPABASE_URL:{}})).status,503);assert.equal(f.calls.length,0);});
test('subdomain is rejected after verified extension context',async()=>{const f=fixture();assert.equal((await f.handler(request('/api/domains/commerce/check/sub.example.com'),env())).status,400);assert.equal(f.lookups(),0);});
for(const field of ['taxStatus','costScope','paymentFeeMode'])test('unverified cost field '+field+' cannot yield a price',()=>{const s=snapshot();s.policy[field]='unverified';assert.throws(()=>price(offer(),JSON.stringify(s),{now}));});
test('FX verification is required',()=>{const s=snapshot();s.fx.costBasisVerified=false;assert.throws(()=>price(offer(),JSON.stringify(s),{now}));});
test('minimum margin below required floor is rejected',()=>{const s=snapshot();s.policy.minimumMarginIdr=24999;assert.throws(()=>price(offer(),JSON.stringify(s),{now}));});
test('price validity cannot outlive the cost policy',()=>{const s=snapshot();s.policy.expiresAt=iso(10000);assert.equal(price(offer(),JSON.stringify(s),{now}).expiresAt,iso(10000));});
