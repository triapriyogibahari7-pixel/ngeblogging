import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {withPaidConnectionAccess} from '../server/domain-connection-serving-guard.mjs';
const file=name=>readFileSync(new URL('../server/'+name+'.mjs',import.meta.url),'utf8').split('\n');
const ordinary=(name,needle)=>'('+file(name).find(line=>line.includes(needle)).trim()+')';
const payment=file('domain-connection-annual-price');
const observed=payment.findIndex(line=>line.includes("const response=await fetch('https://api.midtrans.com/v2/"));
const serving=file('domain-connection-serving-guard');
const rights=serving.findIndex(line=>line.includes('const result=await fetchImpl('));
const target='https://upstream.invalid/resource',auth={authorization:'Bearer synthetic-transport-credential'};
const profiles=[
 {name:'checkout and payment RPC',code:ordinary('domain-connection-annual-price','async function call('),args:[target,{method:'POST',headers:auth,body:'{}'}],method:'POST',error:'PAYMENT_UPSTREAM_UNAVAILABLE'},
 {name:'Midtrans status',code:'(async function(){'+payment[observed]+payment[observed+1]+'return s;})',args:[],method:'GET',error:'PAYMENT_STATUS_UNAVAILABLE',status404:true},
 {name:'paid-order fulfillment',code:ordinary('domain-connection-payment-installation','async function get('),args:['domain_connection_orders?limit=1'],method:'GET',error:'FULFILLMENT_LEDGER_UNAVAILABLE'},
 {name:'provider pair installation',code:ordinary('domain-connection-provider-installation','async function call('),args:[target,auth,{method:'POST',body:'{}'}],method:'POST',error:'INSTALL_UPSTREAM_UNAVAILABLE'},
 {name:'registry binding',code:ordinary('domain-connection-install-and-bind','async function call('),args:[target,auth,{method:'POST',body:'{}'}],method:'POST',error:'BIND_UPSTREAM_UNAVAILABLE'},
 {name:'connection refresh',code:ordinary('domain-connection-paid-refresh','async function call('),args:[target,auth,{method:'PATCH',body:'{}'}],method:'PATCH',error:'CONNECTION_READ_OR_UPDATE_UNAVAILABLE'},
 {name:'paid tenant proof',code:'('+file('domain-connection-paid-refresh').find(line=>line.includes('const get=async path=>')).trim().replace(/^const get=/,'').replace(/;$/,'')+')',args:['site_domains?limit=1'],method:'GET',error:'READ_FAILED'},
 {name:'serving authorization',code:'(async function(){'+serving[rights]+serving[rights+1]+'return readJson(result);})',args:[],method:'POST',error:'SERVING_LOOKUP_FAILED'},
];
function fixture(profile,status=200){
 let calls=0,cancelled=0,decoded=0;const c=new AbortController();
 const fetch=async(url,init)=>{
  calls++;if(!['manual','follow'].includes(init.redirect))throw Object.assign(Error('WORKERS_UNSUPPORTED_REDIRECT'),{code:'WORKERS_UNSUPPORTED_REDIRECT'});
  assert.equal(init.redirect,'manual');assert.equal(init.method||'GET',profile.method);assert.ok(init.signal);
  assert.equal(typeof init.headers.authorization,'string');assert.ok(!String(url).includes('untrusted.invalid'));
  if(profile.method!=='GET')assert.equal(typeof init.body,'string');
  if(status>=300&&status<400)return new Response(new ReadableStream({cancel(){cancelled++;}}),{status,headers:{location:'https://untrusted.invalid/collect'}});
  return Response.json({synthetic:'accepted'},{status});
 };
 const decode=async response=>{decoded++;return response.json();};
 const context={fetch,fetchImpl:fetch,AbortSignal,DB:'https://polvmlrhqoiflumibfqs.supabase.co',env:{SUPABASE_SERVICE_ROLE_KEY:'synthetic-transport-credential'},headers:auth,c,controller:c,r:{order_id:'DCON-'+'a'.repeat(32)},key:'synthetic-transport-credential',hostname:'customer.example',btoa,json:decode,readJson:decode,boundedJson:decode,fail:code=>{throw Object.assign(Error(code),{code});}};
 const call=vm.runInNewContext(profile.code,context);
 return {call:()=>call(...profile.args),callWith:(...args)=>call(...args),get calls(){return calls;},get cancelled(){return cancelled;},get decoded(){return decoded;}};
}
for(const profile of profiles){
 test(profile.name+' preserves successful response with Workers-compatible fetch',async()=>{const f=fixture(profile);assert.equal((await f.call()).synthetic,'accepted');assert.equal(f.calls,1);assert.equal(f.decoded,1);});
 for(const status of [301,302,303,307,308,401,403,429,500])test(profile.name+' rejects HTTP '+status+' without following or decoding',async()=>{const f=fixture(profile,status);await assert.rejects(f.call(),e=>e.code===profile.error||e.message===profile.error);assert.equal(f.calls,1);assert.equal(f.decoded,0);if(status>=300&&status<400)assert.equal(f.cancelled,1);});
}
test('Midtrans status 404 remains readable but is not payment success',async()=>{const f=fixture(profiles.find(p=>p.status404),404);assert.equal((await f.call()).synthetic,'accepted');assert.equal(f.decoded,1);});
test('checkout transport preserves expected HTTP 201 for Snap creation',async()=>{const p=profiles[0],f=fixture(p,201);assert.equal((await f.callWith(target,{method:'POST',headers:auth,body:'{}'},201)).synthetic,'accepted');});
const env={SUPABASE_URL:'https://polvmlrhqoiflumibfqs.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'synthetic-service-key'};
const request=()=>new Request('https://customer.example/');
function accessFixture(change){let calls=0,served=0;const row={version:'connection-serving-v1',hostname:'customer.example',applies:true,allowed:true,siteId:'11111111-1111-4111-8111-111111111111',domainId:'22222222-2222-4222-8222-222222222222',providerHostnameId:'a'.repeat(32),orderId:'DCON-'+'b'.repeat(32),expiresAt:new Date(Date.now()+86400000).toISOString()};return {get calls(){return calls;},get served(){return served;},serve:async()=>{served++;return new Response('correct-customer-site',{headers:{etag:'synthetic-etag'}});},fetchImpl:async(url,init)=>{calls++;if(init.redirect!=='manual')throw Error('WORKERS_UNSUPPORTED_REDIRECT');return Response.json(change?change(calls,row):row);}};}
test('full serving guard allows paid domain with two rights checks and no cache',async()=>{const f=accessFixture(),r=await withPaidConnectionAccess(request(),env,f.serve,{fetchImpl:f.fetchImpl});assert.equal(r.status,200);assert.equal(await r.text(),'correct-customer-site');assert.equal(f.calls,2);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.equal(r.headers.get('etag'),null);});
test('full serving guard preserves delegation for a legacy non-paid domain',async()=>{const f=accessFixture((n,r)=>({...r,applies:false,allowed:false})),r=await withPaidConnectionAccess(request(),env,f.serve,{fetchImpl:f.fetchImpl});assert.equal(r.status,200);assert.equal(f.calls,1);assert.equal(f.served,1);});
test('full serving guard rejects expired paid service',async()=>{const f=accessFixture((n,r)=>({...r,expiresAt:'2020-01-01'})),r=await withPaidConnectionAccess(request(),env,f.serve,{fetchImpl:f.fetchImpl});assert.equal(r.status,404);assert.equal(f.served,0);});
test('full serving guard rejects identity change after site response',async()=>{const f=accessFixture((n,r)=>n===2?({...r,siteId:'33333333-3333-4333-8333-333333333333'}):r),r=await withPaidConnectionAccess(request(),env,f.serve,{fetchImpl:f.fetchImpl});assert.equal(r.status,503);assert.equal(f.calls,2);});
test('platform address requires no paid-domain lookup',async()=>{const f=accessFixture(),r=await withPaidConnectionAccess(new Request('https://ngeblogging.com/'),{},f.serve,{fetchImpl:f.fetchImpl});assert.equal(r.status,200);assert.equal(f.calls,0);});
