import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import {handleMidtrans,stateOf} from '../server/midtrans-api.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const env={MIDTRANS_ENV:'production',MIDTRANS_SERVER_KEY:'test-only-not-a-real-key',SUPABASE_URL:'https://database.invalid',SUPABASE_PUBLISHABLE_KEY:'test-public',SUPABASE_SERVICE_ROLE_KEY:'test-service',MIDTRANS_PLAN_PRICES_JSON:'{"pro_monthly":101}'};
const json=value=>new Response(JSON.stringify(value),{headers:{'content-type':'application/json'}});
function payload(){
 const p={order_id:'NARA-test',status_code:'200',gross_amount:'101.00'};
 p.signature_key=createHash('sha512').update(`${p.order_id}${p.status_code}${p.gross_amount}${env.MIDTRANS_SERVER_KEY}`).digest('hex');
 return p;
}
function request(p){return new Request('https://merchant.invalid/api/billing/midtrans/webhook',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(p)});}
test('pending and fraud challenge do not become paid',()=>{
 assert.equal(stateOf({status_code:'201',transaction_status:'pending'}),'pending');
 assert.equal(stateOf({status_code:'200',transaction_status:'capture',fraud_status:'challenge'}),'pending');
 assert.equal(stateOf({status_code:'200',transaction_status:'settlement',fraud_status:'accept'}),'paid');
 assert.equal(stateOf({transaction_status:'refund'}),'review_required');
});
test('invalid signature is rejected without upstream calls',async()=>{
 let calls=0;const p=payload();p.signature_key='0'.repeat(128);
 const r=await handleMidtrans(request(p),env,{fetchImpl:async()=>{calls++;throw Error('unexpected network');}});
 assert.equal(r.status,401);assert.equal(calls,0);
});
test('status amount mismatch never reaches activation RPC',async()=>{
 let calls=0;
 const r=await handleMidtrans(request(payload()),env,{fetchImpl:async()=>{calls++;return json({order_id:'NARA-test',currency:'IDR',transaction_id:'tx-test',gross_amount:'102.00'});}});
 assert.equal(r.status,409);assert.equal(calls,1);
});
test('verified settlement passes exact parameters to activation RPC',async()=>{
 const calls=[];
 const r=await handleMidtrans(request(payload()),env,{fetchImpl:async(url,options)=>{
  calls.push({url,options});
  if(calls.length===1){assert.equal(url,'https://api.midtrans.com/v2/NARA-test/status');return json({order_id:'NARA-test',currency:'IDR',transaction_id:'tx-test',gross_amount:'101.00',status_code:'200',transaction_status:'settlement',fraud_status:'accept'});}
  assert.equal(url,'https://database.invalid/rest/v1/rpc/nara_apply_midtrans');
  assert.deepEqual(JSON.parse(options.body),{p_order:'NARA-test',p_transaction:'tx-test',p_amount:'101.00',p_environment:'production',p_state:'paid'});
  return json({ok:true,completed:true});
 }});
 assert.equal(r.status,200);assert.equal(calls.length,2);assert.equal((await r.json()).completed,true);
});
test('database rejection is not reported as successful activation',async()=>{
 let calls=0;
 const r=await handleMidtrans(request(payload()),env,{fetchImpl:async()=>{calls++;return calls===1?json({order_id:'NARA-test',currency:'IDR',transaction_id:'tx-test',gross_amount:'101.00',status_code:'200',transaction_status:'settlement'}):json({ok:false,error:'ORDER_MISMATCH'});}});
 assert.equal(r.status,409);assert.equal((await r.json()).error,'ORDER_MISMATCH');
});
