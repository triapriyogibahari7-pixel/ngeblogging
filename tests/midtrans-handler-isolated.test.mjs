import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import {handleMidtrans,stateOf} from '../server/midtrans-api.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const env={MIDTRANS_ENV:'production',MIDTRANS_SERVER_KEY:'test-only-server-key',SUPABASE_URL:'https://db.invalid',SUPABASE_PUBLISHABLE_KEY:'test-public',SUPABASE_SERVICE_ROLE_KEY:'test-service',MIDTRANS_PLAN_PRICES_JSON:JSON.stringify({pro_monthly:300000,pro_yearly:3000000})};
const uid='11111111-1111-4111-8111-111111111111';
const key='22222222-2222-4222-8222-222222222222';
const orderId='NARA-'+createHash('sha256').update(`production:${uid}:${key}`).digest('hex').slice(0,40);
const j=(data,status=200)=>new Response(JSON.stringify(data),{status});
function req(path,body,auth=false){return new Request('https://site.invalid/api/billing/midtrans/'+path,{method:body===undefined?'GET':'POST',headers:{...(auth?{authorization:'Bearer test-session'}:{}),'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});}
const noFetch=()=>{throw Error('Unexpected network');};
function mockCheckout({redirect='https://app.midtrans.com/snap/v1/transactions/test',stored=null,status='pending',owner=uid}={}){
 const calls=[];
 const fetchImpl=async(url,opts={})=>{
  calls.push({url,opts});
  if(url.endsWith('/auth/v1/user'))return j({id:uid,email:'test@example.invalid'});
  if(url.includes('/nara_midtrans_orders?on_conflict='))return j(null);
  if(url.includes('&select=*'))return j([{user_id:owner,plan_id:'pro_monthly',environment:'production',status,amount:300000,checkout_url:stored}]);
  if(url==='https://app.midtrans.com/snap/v1/transactions')return j({redirect_url:redirect});
  if(opts.method==='PATCH')return j(null);
  throw Error('Unexpected request '+url);
 };return {fetchImpl,calls};
}
function payload(){const p={order_id:'NARA-test',status_code:'200',gross_amount:'300000.00'};p.signature_key=createHash('sha512').update(p.order_id+p.status_code+p.gross_amount+env.MIDTRANS_SERVER_KEY).digest('hex');return p;}
function mockWebhook(overrides={},applied={ok:true,completed:true}){
 const calls=[];
 const fetchImpl=async(url,opts={})=>{calls.push({url,opts});
  if(url.startsWith('https://api.midtrans.com/v2/'))return j({order_id:'NARA-test',currency:'IDR',transaction_id:'test-transaction',gross_amount:'300000.00',status_code:'200',transaction_status:'settlement',...overrides});
  if(url.endsWith('/rpc/nara_apply_midtrans'))return j(applied);
  throw Error('Unexpected request '+url);
 };return {fetchImpl,calls};
}
test('config is presence-only and exposes no keys',async()=>{const r=await handleMidtrans(req('config'),env,{fetchImpl:noFetch});const b=await r.json();assert.equal(b.ready,true);assert.equal(JSON.stringify(b).includes(env.MIDTRANS_SERVER_KEY),false);assert.equal(JSON.stringify(b).includes(env.SUPABASE_SERVICE_ROLE_KEY),false);});
test('missing server binding blocks checkout',async()=>{const r=await handleMidtrans(req('create',{},true),{...env,SUPABASE_SERVICE_ROLE_KEY:''},{fetchImpl:noFetch});assert.equal(r.status,503);assert.equal((await r.json()).error,'MIDTRANS_NOT_CONFIGURED');});
test('checkout without session denied before upstream',async()=>{const r=await handleMidtrans(req('create',{}),env,{fetchImpl:noFetch});assert.equal(r.status,401);});
test('orders without session denied before upstream',async()=>{const r=await handleMidtrans(req('orders'),env,{fetchImpl:noFetch});assert.equal(r.status,401);});
test('checkout uses server price not client amount',async()=>{const m=mockCheckout();const r=await handleMidtrans(req('create',{planId:'pro_monthly',idempotencyKey:key,amount:1},true),env,m);assert.equal(r.status,200);assert.equal((await r.json()).orderId,orderId);const snap=m.calls.find(x=>x.url==='https://app.midtrans.com/snap/v1/transactions');assert.equal(JSON.parse(snap.opts.body).transaction_details.gross_amount,300000);});
test('reuses stored checkout without creating another Snap request',async()=>{const m=mockCheckout({stored:'https://app.midtrans.com/snap/existing'});const r=await handleMidtrans(req('create',{planId:'pro_monthly',idempotencyKey:key},true),env,m);assert.equal(r.status,200);assert.equal((await r.json()).reused,true);assert.equal(m.calls.some(x=>x.url==='https://app.midtrans.com/snap/v1/transactions'),false);});
test('foreign checkout redirect rejected',async()=>{const m=mockCheckout({redirect:'https://evil.invalid/pay'});const r=await handleMidtrans(req('create',{planId:'pro_monthly',idempotencyKey:key},true),env,m);assert.equal(r.status,502);assert.equal(m.calls.some(x=>x.opts.method==='PATCH'),false);});
test('another user stored order rejected',async()=>{const m=mockCheckout({owner:'33333333-3333-4333-8333-333333333333'});const r=await handleMidtrans(req('create',{planId:'pro_monthly',idempotencyKey:key},true),env,m);assert.equal(r.status,409);assert.equal((await r.json()).error,'IDEMPOTENCY_CONFLICT');});
test('invalid webhook signature rejected without upstream',async()=>{const p=payload();p.signature_key='0'.repeat(128);const r=await handleMidtrans(req('webhook',p),env,{fetchImpl:noFetch});assert.equal(r.status,401);});
test('valid webhook rechecks status and requests paid activation',async()=>{const m=mockWebhook();const r=await handleMidtrans(req('webhook',payload()),env,m);assert.equal(r.status,200);assert.equal((await r.json()).completed,true);assert.equal(m.calls.length,2);const rpc=JSON.parse(m.calls[1].opts.body);assert.equal(rpc.p_state,'paid');assert.equal(rpc.p_environment,'production');});
test('webhook amount mismatch blocks activation',async()=>{const m=mockWebhook({gross_amount:'1.00'});const r=await handleMidtrans(req('webhook',payload()),env,m);assert.equal(r.status,409);assert.equal(m.calls.length,1);});
test('webhook currency mismatch blocks activation',async()=>{const m=mockWebhook({currency:'USD'});const r=await handleMidtrans(req('webhook',payload()),env,m);assert.equal(r.status,409);assert.equal(m.calls.length,1);});
test('database rejection is not reported as success',async()=>{const m=mockWebhook({},{ok:false,error:'ORDER_MISMATCH'});const r=await handleMidtrans(req('webhook',payload()),env,m);assert.equal(r.status,409);});
test('refund and chargeback require review',()=>{for(const transaction_status of ['refund','partial_refund','chargeback','partial_chargeback'])assert.equal(stateOf({transaction_status}),'review_required');});
test('pending and challenged capture do not activate',()=>{assert.equal(stateOf({status_code:'200',transaction_status:'pending'}),'pending');assert.equal(stateOf({status_code:'200',transaction_status:'capture',fraud_status:'challenge'}),'pending');});
