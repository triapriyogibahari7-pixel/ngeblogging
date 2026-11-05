import test from 'node:test';
import assert from 'node:assert/strict';
import {orderActionAvailability,performExistingOrderAction} from '../src/domain-order-actions.mjs';
const created=Date.parse('2026-11-05T01:00:00Z');
const order={orderId:'DOM-'+ 'a'.repeat(40),domain:'example.com',currency:'IDR',amountIdr:285000,paymentState:'pending',registrationState:'not_started',resolution:'none',createdAt:new Date(created).toISOString()};
test('normal payment remains eligible after fifteen minutes until the two-hour cutoff',()=>{
 for(const elapsed of [900000,1800000,7199999]){
  const result=orderActionAvailability(order,created+elapsed);
  assert.equal(result.pay,true);assert.equal(result.cancel,true);assert.match(result.reason,/2 jam/);assert.doesNotMatch(result.reason,/pemulihan|15 menit|belum berlaku/i);
 }
});
test('clock before creation is distinguished from an elapsed window',()=>{
 const result=orderActionAvailability(order,created-1);assert.equal(result.pay,false);assert.match(result.reason,/Waktu perangkat/);
});
test('two-hour boundary closes payment without permitting paid or reviewed orders',()=>{
 assert.equal(orderActionAvailability(order,created+7199999).pay,true);
 for(const elapsed of [7200000,7200001,10800000]){const r=orderActionAvailability(order,created+elapsed);assert.equal(r.pay,false);assert.equal(r.cancel,true);assert.match(r.reason,/2 jam/);}
 assert.equal(orderActionAvailability({...order,paymentState:'paid'},created+1).pay,false);
 assert.equal(orderActionAvailability({...order,resolution:'review_required'},created+1).cancel,false);
});
test('expired same-order action never posts to checkout or creates replacement',async()=>{
 await assert.rejects(()=>performExistingOrderAction('pay',order,'fixture-token',{now:()=>created+7200000,loadStatus:async id=>{assert.equal(id,order.orderId);return order;},fetchImpl:()=>assert.fail('No checkout or replacement request permitted')}),error=>error.code==='CHECKOUT_WINDOW_EXPIRED');
});
