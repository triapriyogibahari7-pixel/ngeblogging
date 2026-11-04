import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchPurchaseQuote,readPricingDiagnostic} from '../src/domain-purchase-model.mjs';
const code='DOMAIN_PRICING_INPUTS_UNAVAILABLE';
for(const reason of ['REFERENCE_FX_UNAVAILABLE','REFERENCE_QUOTE_INVALID']){
 test('preserves safe production reason '+reason,()=>{assert.deepEqual(readPricingDiagnostic({code,reason,stage:'calculation',secret:'never-copy'}),{reason,stage:'calculation'});});
 test('quote request propagates '+reason+' without purchase calls',async()=>{let calls=0;await assert.rejects(()=>fetchPurchaseQuote('example.com','test-token',{fetchImpl:async(path,init)=>{calls++;assert.equal(path,'/api/commerce/domains/quote/example.com');assert.equal(init.method,'POST');return Response.json({code,reason,stage:'calculation',secret:'never-copy'},{status:503});}}),error=>{assert.equal(error.code,code);assert.equal(error.status,503);assert.equal(error.reason,reason);assert.equal(error.stage,'calculation');assert.equal(error.secret,undefined);assert.equal(error.message,'REQUEST_REJECTED');return true;});assert.equal(calls,1);});
}
test('unknown reason and stage stay excluded',()=>{assert.deepEqual(readPricingDiagnostic({code,reason:'secret-value',stage:'secret-value'}),{});});
test('reference reason cannot attach to unrelated error',()=>{assert.deepEqual(readPricingDiagnostic({code:'AUTH_UNAVAILABLE',reason:'REFERENCE_FX_UNAVAILABLE',stage:'calculation'}),{});});
test('existing snapshot diagnosis remains supported',()=>{assert.deepEqual(readPricingDiagnostic({code,reason:'PRICING_SNAPSHOT_MISSING',stage:'snapshot'}),{reason:'PRICING_SNAPSHOT_MISSING',stage:'snapshot'});});
