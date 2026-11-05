import test from 'node:test';
import assert from 'node:assert/strict';
import {orderActionAvailability,performExistingOrderAction} from '../src/domain-order-actions.mjs';
const created=Date.parse('2026-11-05T01:00:00Z');
const order={orderId:'DOM-'+ 'a'.repeat(40),domain:'example.com',currency:'IDR',amountIdr:285000,paymentState:'pending',registrationState:'not_started',resolution:'none',createdAt:new Date(created).toISOString()};
test('elapsed legacy window explains disabled payment without extending it',()=>{
 for(const elapsed of [900000,1800000,7200000]){
  const result=orderActionAvailability(order,created+elapsed);
  assert.equal(result.pay,false);assert.equal(result.cancel,true);
  assert.match(result.reason,/15 menit/);assert.match(result.reason,/2 jam belum berlaku/);assert.match(result.reason,/pemeriksaan server/);
 }
});
test('clock before creation is distinguished from an elapsed window',()=>{
 const result=orderActionAvailability(order,created-1);
 assert.equal(result.pay,false);assert.match(result.reason,/Waktu perangkat/);
});
test('last millisecond before cutoff retains existing eligibility only',()=>{
 assert.equal(orderActionAvailability(order,created+899999).pay,true);
 assert.equal(orderActionAvailability({...order,paymentState:'paid'},created+1).pay,false);
 assert.equal(orderActionAvailability({...order,resolution:'review_required'},created+1).cancel,false);
});
test('expired same-order action never posts to checkout or creates replacement',async()=>{
 await assert.rejects(()=>performExistingOrderAction('pay',order,'fixture-token',{now:()=>created+900000,loadStatus:async id=>{assert.equal(id,order.orderId);return order;},fetchImpl:()=>assert.fail('No checkout or replacement request permitted')}),error=>error.code==='CHECKOUT_WINDOW_EXPIRED');
});
