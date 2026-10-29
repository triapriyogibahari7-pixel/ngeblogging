import test from 'node:test';
import assert from 'node:assert/strict';
import {makeQrisClient,qrisImageUrl,qrisState,validateQrisTransaction,validateQrisOrder} from '../server/midtrans-qris-core.mjs';
const tid='11111111-1111-4111-8111-111111111111';
const order={order_id:'NARA-'+'a'.repeat(40),plan_id:'pro_monthly',environment:'sandbox',status:'pending',amount:'300000.00'};
const data={order_id:order.order_id,transaction_id:tid,currency:'IDR',payment_type:'qris',gross_amount:'300000.00',status_code:'201',transaction_status:'pending',actions:[{name:'generate-qr-code',method:'GET',url:`https://api.sandbox.midtrans.com/v2/qris/${tid}/qr-code`}]};
const response=value=>new Response(JSON.stringify(value),{status:200});
for(const plan_id of ['pro_monthly','pro_yearly','max_monthly','max_yearly']) test(`${plan_id}: charge uses stored amount and returns provider QR`,async()=>{
 let calls=0;
 const client=makeQrisClient({environment:'sandbox',serverKey:'SB-Mid-server-test-only',fetchImpl:async(url,init)=>{calls++;assert.equal(url,'https://api.sandbox.midtrans.com/v2/charge');assert.equal(init.redirect,'error');const body=JSON.parse(init.body);assert.equal(body.transaction_details.gross_amount,300000);assert.equal(body.transaction_details.order_id,order.order_id);assert.equal(body.payment_type,'qris');return response(data);}});
 assert.equal((await client.chargeReservedOrder({...order,plan_id})).qrUrl,data.actions[0].url);assert.equal(calls,1);
});
test('rejects invalid stored prices and identifiers',()=>{
 for(const amount of [0,-1,1.5,'NaN','1e5','100000001','30.01']) assert.throws(()=>validateQrisOrder({...order,amount}));
 assert.throws(()=>validateQrisOrder({...order,order_id:'external'}));
});
test('QR image URL rejects other origins, environments, credentials, query and wrong path',()=>{
 const good=data.actions[0].url;assert.equal(qrisImageUrl(good,'sandbox'),good);
 for(const url of [good.replace('api.sandbox.midtrans.com','evil.example'),good.replace('api.sandbox.midtrans.com','api.midtrans.com'),good+'?leak=1',good+'#x',good.replace('/v2/qris/','/redirect/'),good.replace('https://','https://user:pass@')]) assert.equal(qrisImageUrl(url,'sandbox'),null);
});
test('rejects mismatched amount, order, currency, type and transaction',()=>{
 for(const change of [{gross_amount:'1.00'},{order_id:'other'},{currency:'USD'},{payment_type:'credit_card'},{transaction_id:'invalid'}]) assert.throws(()=>validateQrisTransaction({...data,...change},order));
 assert.throws(()=>validateQrisTransaction(data,{...order,transaction_id:'22222222-2222-4222-8222-222222222222'}));
});
test('settlement only: pending and capture cannot activate QRIS',()=>{
 assert.equal(qrisState({...data,status_code:'200',transaction_status:'settlement'}),'paid');
 for(const status of ['pending','capture']) assert.equal(qrisState({...data,status_code:'200',transaction_status:status}),'pending');
 assert.equal(qrisState({...data,status_code:'200',transaction_status:'settlement',fraud_status:'challenge'}),'pending');
 assert.equal(qrisState({...data,transaction_status:'expire'}),'failed');assert.equal(qrisState({...data,transaction_status:'refund'}),'review_required');
});
test('never charges an existing Snap or processed order',async()=>{
 let calls=0;const c=makeQrisClient({environment:'sandbox',serverKey:'SB-test',fetchImpl:async()=>{calls++;return response(data);}});
 for(const change of [{snap_token:'existing'},{checkout_url:'https://app.midtrans.com'},{transaction_id:tid},{status:'completed'},{environment:'production'}]) await assert.rejects(c.chargeReservedOrder({...order,...change}));
 assert.equal(calls,0);
});
test('ambiguous creation is not retried automatically',async()=>{
 let calls=0;const c=makeQrisClient({environment:'sandbox',serverKey:'SB-test',fetchImpl:async()=>{calls++;throw Error('network failure with secret');}});
 await assert.rejects(c.chargeReservedOrder(order),e=>e.code==='QRIS_CREATION_UNKNOWN_RECONCILE'&&e.uncertain&&!e.message.includes('secret'));assert.equal(calls,1);
});
test('status request is read-only and validates provider data',async()=>{
 const c=makeQrisClient({environment:'sandbox',serverKey:'SB-test',fetchImpl:async(url,init)=>{assert.equal(init.method,'GET');assert.equal(init.body,undefined);assert.ok(url.endsWith('/'+order.order_id+'/status'));return response({...data,status_code:'200',transaction_status:'settlement'});}});
 assert.equal((await c.status(order)).state,'paid');
});
test('rejects missing QR and provider denial without exposing details',async()=>{
 const c=makeQrisClient({environment:'sandbox',serverKey:'SB-test',fetchImpl:async()=>response({...data,actions:[]})});
 await assert.rejects(c.chargeReservedOrder(order),e=>e.uncertain&&e.code==='QRIS_RESPONSE_REQUIRES_RECONCILIATION');
 const denied=makeQrisClient({environment:'sandbox',serverKey:'SB-test',fetchImpl:async()=>new Response('{"secret":"private"}',{status:403})});
 await assert.rejects(denied.chargeReservedOrder(order),e=>e.code==='QRIS_ACCESS_DENIED'&&!e.message.includes('private'));
});
test('environment and server key must match',()=>{
 assert.throws(()=>makeQrisClient({environment:'production',serverKey:'SB-test'}));assert.throws(()=>makeQrisClient({environment:'sandbox',serverKey:'production-test'}));assert.throws(()=>makeQrisClient({environment:'other',serverKey:'x'}));
});
