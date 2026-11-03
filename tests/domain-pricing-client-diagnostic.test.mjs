import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchPurchaseQuote,readPricingDiagnostic} from '../src/domain-purchase-model.mjs';
const code='DOMAIN_PRICING_INPUTS_UNAVAILABLE';
test('quote HTTP 503 preserves safe reason and stage without changing primary code',async()=>{let calls=0;await assert.rejects(()=>fetchPurchaseQuote('example.com','test-token',{fetchImpl:async(path,init)=>{calls++;assert.equal(path,'/api/commerce/domains/quote/example.com');assert.equal(init.method,'POST');return new Response(JSON.stringify({code,reason:'PRICING_SNAPSHOT_MISSING',stage:'snapshot',secret:'never-copy'}),{status:503});}}),error=>{assert.equal(error.code,code);assert.equal(error.status,503);assert.equal(error.reason,'PRICING_SNAPSHOT_MISSING');assert.equal(error.stage,'snapshot');assert.equal(error.secret,undefined);assert.equal(error.message,'REQUEST_REJECTED');return true;});assert.equal(calls,1);});
test('unknown reason and stage are discarded',()=>{assert.deepEqual(readPricingDiagnostic({code,reason:'secret-value',stage:'secret-value',message:'secret-value'}),{});});
test('unrelated errors cannot inject pricing diagnosis',()=>{assert.deepEqual(readPricingDiagnostic({code:'AUTH_UNAVAILABLE',reason:'FX_SNAPSHOT_EXPIRED',stage:'snapshot'}),{});});
test('old response without reason remains compatible',async()=>{await assert.rejects(()=>fetchPurchaseQuote('example.com','test-token',{fetchImpl:async()=>new Response(JSON.stringify({code}),{status:503})}),error=>error.code===code&&error.status===503&&error.reason===undefined&&error.stage===undefined);});
