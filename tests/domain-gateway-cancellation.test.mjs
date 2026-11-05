import test from 'node:test';
import assert from 'node:assert/strict';
import {cancelDomainAtGateway as cancel} from '../server/domain-gateway-cancellation.mjs';
const actorId='00000000-0000-4000-8000-000000000001';
const order={ownerId:actorId,orderId:'DOM-'+'a'.repeat(40),environment:'production',currency:'IDR',amountIdr:285000,paymentState:'pending',registrationState:'not_started',resolution:'none'};
function fixture(states=['pending','cancel'],{claim=true,postThrows=false,patch={},http=200}={}){
 const calls=[];let claims=0,index=0;
 const fetchImpl=async(url,options)=>{
  const u=new URL(url);assert.equal(u.origin,'https://api.midtrans.com');assert.equal(options.redirect,'error');calls.push(options.method+' '+u.pathname.split('/').at(-1));
  if(options.method==='POST'){if(postThrows)throw Error('transport unknown');return Response.json({status_code:'200'});}
  return Response.json({status_code:'200',order_id:order.orderId,transaction_id:'fixture-transaction',gross_amount:'285000.00',transaction_status:states[Math.min(index++,states.length-1)],...patch},{status:http});
 };
 return {calls,get claims(){return claims;},options:{actorId,confirmed:true,serverKey:'fixture-production-only',fetchImpl,claimAttempt:async value=>{claims++;assert.equal(value.orderId,order.orderId);return claim;}}};
}
test('pending cancellation requires independent final status',async()=>{const f=fixture();const r=await cancel(order,f.options);assert.equal(r.paymentState,'cancelled');assert.equal(r.gatewayConfirmed,true);assert.deepEqual(f.calls,['GET status','POST cancel','GET status']);assert.equal(f.claims,1);});
test('already expired reconciles without POST',async()=>{const f=fixture(['expire']);const r=await cancel(order,f.options);assert.equal(r.paymentState,'expired');assert.equal(r.cancelAttempted,false);assert.equal(f.claims,0);assert.deepEqual(f.calls,['GET status']);});
test('settled funds are never cancelled',async()=>{const f=fixture(['settlement']);await assert.rejects(()=>cancel(order,f.options),{code:'PAYMENT_PROTECTED_FROM_CANCELLATION'});assert.equal(f.claims,0);assert.deepEqual(f.calls,['GET status']);});
test('Core API 404 is not absence of Snap',async()=>{const f=fixture(['pending'],{http:404,patch:{status_code:'404'}});await assert.rejects(()=>cancel(order,f.options),{code:'SNAP_RECONCILIATION_REQUIRED'});assert.equal(f.claims,0);});
test('wrong amount prevents cancellation',async()=>{const f=fixture(['pending'],{patch:{gross_amount:'1.00'}});await assert.rejects(()=>cancel(order,f.options),{code:'GATEWAY_IDENTITY_MISMATCH'});assert.equal(f.claims,0);});
test('ambiguous POST is not retried',async()=>{const f=fixture(['pending','pending'],{postThrows:true});await assert.rejects(()=>cancel(order,f.options),{code:'GATEWAY_CANCELLATION_UNCONFIRMED'});assert.deepEqual(f.calls,['GET status','POST cancel','GET status']);});
test('payment race cannot be called cancellation',async()=>{const f=fixture(['pending','settlement']);await assert.rejects(()=>cancel(order,f.options),{code:'PAYMENT_PROTECTED_FROM_CANCELLATION'});});
test('existing durable claim blocks another POST',async()=>{const f=fixture(['pending'],{claim:false});await assert.rejects(()=>cancel(order,f.options),{code:'GATEWAY_CANCELLATION_IN_PROGRESS'});assert.deepEqual(f.calls,['GET status']);});
test('wrong owner fails before network',async()=>{const f=fixture();await assert.rejects(()=>cancel(order,{...f.options,actorId:'00000000-0000-4000-8000-000000000002'}),{code:'ORDER_OWNER_REQUIRED'});assert.equal(f.calls.length,0);});
test('explicit confirmation is required',async()=>{const f=fixture();await assert.rejects(()=>cancel(order,{...f.options,confirmed:false}),{code:'CANCELLATION_CONFIRMATION_REQUIRED'});assert.equal(f.calls.length,0);});
