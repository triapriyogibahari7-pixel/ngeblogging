import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {handleMidtrans} from '../server/midtrans-api.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const id='00000000-0000-4000-8000-000000000001';
const env={MIDTRANS_ENV:'production',MIDTRANS_SERVER_KEY:'test-only',SUPABASE_URL:'https://db.invalid',SUPABASE_PUBLISHABLE_KEY:'test-public',SUPABASE_SERVICE_ROLE_KEY:'test-service',MIDTRANS_PLAN_PRICES_JSON:JSON.stringify({pro_monthly:101,pro_yearly:202,max_monthly:303,max_yearly:404})};
const json=v=>new Response(JSON.stringify(v),{headers:{'content-type':'application/json'}});
function backend(profile){
 const calls=[];let order;
 return {calls,fetchImpl:async(url,options={})=>{
  calls.push({url,options});
  if(url.endsWith('/auth/v1/user'))return json({id,email:'test@example.invalid'});
  if(url.includes('/rest/v1/profiles?'))return json(profile?[{id,...profile}]:[]);
  if(url.includes('/rest/v1/nara_midtrans_orders?')){
   if(options.method==='POST'){order={...JSON.parse(options.body),status:'pending'};return json(null);}
   if(options.method==='PATCH')return json(null);
   return json([order]);
  }
  if(url==='https://app.midtrans.com/snap/v1/transactions')return json({redirect_url:'https://app.midtrans.com/snap/v2/test-checkout'});
  throw Error('Unexpected upstream: '+url);
 }};
}
function request(planId){return new Request('https://merchant.invalid/api/billing/midtrans/create',{method:'POST',headers:{authorization:'Bearer test-session','content-type':'application/json'},body:JSON.stringify({planId,idempotencyKey:id,amount:999999})});}
test('config exposes four explicitly priced products',async()=>{
 const r=await handleMidtrans(new Request('https://merchant.invalid/api/billing/midtrans/config'),env);
 assert.deepEqual((await r.json()).plans.map(p=>p.id),['pro_monthly','pro_yearly','max_monthly','max_yearly']);
});
test('Max checkout uses server price rather than client amount',async()=>{
 const mock=backend({plan:'free',plan_expires_at:null});
 const r=await handleMidtrans(request('max_monthly'),env,mock);
 assert.equal(r.status,200);
 const snap=mock.calls.find(c=>c.url.endsWith('/snap/v1/transactions'));
 assert.ok(snap);assert.equal(JSON.parse(snap.options.body).transaction_details.gross_amount,303);
});
for(const [current,target] of [['pro','max_yearly'],['business','pro_monthly']])test('active '+current+' cannot be charged for unsupported tier change',async()=>{
 const mock=backend({plan:current,plan_expires_at:'2999-01-01T00:00:00Z'});
 const r=await handleMidtrans(request(target),env,mock);
 assert.equal(r.status,409);assert.equal((await r.json()).error,'EXISTING_ENTITLEMENT_REQUIRES_REVIEW');
 assert.equal(mock.calls.filter(c=>c.options.method==='POST').length,0);
});
test('missing profile is rejected before any order write',async()=>{
 const mock=backend(null);const r=await handleMidtrans(request('max_yearly'),env,mock);
 assert.equal(r.status,409);assert.equal(mock.calls.filter(c=>c.options.method==='POST').length,0);
});
test('expired Pro can buy Max',async()=>{
 const mock=backend({plan:'pro',plan_expires_at:'2000-01-01T00:00:00Z'});
 const r=await handleMidtrans(request('max_yearly'),env,mock);assert.equal(r.status,200);
});
