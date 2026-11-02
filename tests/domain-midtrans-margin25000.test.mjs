import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateDomainMidtransAmount as calculate} from '../server/domain-midtrans-margin25000.mjs';
const fixture=()=>({currency:'IDR',registrarCostIdr:100000,otherDirectCostsIdr:0,paymentFixedCostIdr:0,paymentFeeBasisPoints:0});
test('synthetic zero-fee example keeps target margin without authorizing payment',()=>{
 const input=fixture(),out=calculate(input);assert.equal(out.amountIdr,125000);assert.equal(out.minimumMarginIdr,25000);assert.equal(out.marginAfterEstimatedCostsIdr,25000);
 for(const key of ['checkoutCreated','paymentStarted','registrationStarted'])assert.equal(out[key],false);
 assert.equal(out.costVerification,'required_from_caller');assert.ok(Object.isFrozen(out));assert.deepEqual(input,fixture());
});
test('percentage and fixed fees are covered with integer rounding',()=>{
 for(const cost of [1,999,100000,9999999])for(const other of [0,777])for(const fixed of [0,2000])for(const rate of [0,1,100,290,9999]){
  const out=calculate({currency:'IDR',registrarCostIdr:cost,otherDirectCostsIdr:other,paymentFixedCostIdr:fixed,paymentFeeBasisPoints:rate});
  const a=BigInt(out.amountIdr),fee=BigInt(fixed)+(a*BigInt(rate)+9999n)/10000n;
  assert.equal(BigInt(out.paymentFeeCeilingIdr),fee);assert.ok(a-BigInt(cost)-BigInt(other)-fee>=25000n);
  const previous=a-1n,previousFee=BigInt(fixed)+(previous*BigInt(rate)+9999n)/10000n;
  assert.ok(previous-BigInt(cost)-BigInt(other)-previousFee<25000n);
 }
});
test('USD, missing fee inputs and malformed costs are rejected',()=>{
 for(const patch of [{currency:'USD'},{registrarCostIdr:0},{registrarCostIdr:1.5},{otherDirectCostsIdr:-1},{paymentFixedCostIdr:undefined},{paymentFeeBasisPoints:undefined},{paymentFeeBasisPoints:10000},{paymentFeeBasisPoints:'290'},{registrarCostIdr:Number.MAX_SAFE_INTEGER}])assert.throws(()=>calculate({...fixture(),...patch}));
});
test('oversized sale amount is rejected',()=>assert.throws(()=>calculate({...fixture(),registrarCostIdr:1000000000000})));
