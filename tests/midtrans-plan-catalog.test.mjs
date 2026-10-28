import test from 'node:test';
import assert from 'node:assert/strict';
import {configuredMidtransPlans} from '../server/midtrans-plan-catalog.mjs';

test('missing or malformed configuration exposes no payable plans',()=>{
  for(const raw of [undefined,'','{','null','[]','42','true']) assert.deepEqual(configuredMidtransPlans(raw),[]);
});
test('prices must be positive bounded integer numbers',()=>{
  for(const value of [0,-1,1.5,'300000',null,true,100000001]) assert.deepEqual(configuredMidtransPlans(JSON.stringify({max_monthly:value})),[]);
});
test('all four configured products retain server prices and distinct entitlements',()=>{
  const prices={pro_monthly:101,pro_yearly:202,max_monthly:303,max_yearly:404};
  const plans=configuredMidtransPlans(JSON.stringify(prices));
  assert.deepEqual(plans.map(p=>p.id),Object.keys(prices));
  for(const p of plans){
    assert.equal(p.amount,prices[p.id]);
    assert.equal(p.currency,'IDR');
    assert.equal(p.durationDays,p.id.endsWith('_monthly')?31:366);
    assert.equal(p.entitlement,p.id.startsWith('max_')?'nara_max':'nara_pro');
  }
});
test('no implicit Max price and no unknown product',()=>{
  const raw=JSON.stringify({pro_monthly:101,unexpected:505});
  assert.deepEqual(configuredMidtransPlans(raw).map(p=>p.id),['pro_monthly']);
});
test('returned objects cannot mutate later results',()=>{
  const raw=JSON.stringify({max_yearly:404});
  configuredMidtransPlans(raw)[0].entitlement='nara_pro';
  assert.equal(configuredMidtransPlans(raw)[0].entitlement,'nara_max');
});
