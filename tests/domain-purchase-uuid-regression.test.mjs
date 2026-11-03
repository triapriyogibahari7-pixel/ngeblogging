import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePurchaseQuote,readPurchaseAttempt,fetchPurchaseQuote} from '../src/domain-purchase-model.mjs';
const valid='12345678-1234-4234-8234-123456789abc',invalid='12345678-1234-4234-123456789abc',now=Date.parse('2026-11-03T10:00:00Z');
function quote(quoteId=valid){return {quoteId,domain:'example.com',years:1,displayCurrency:'USD',salePriceUsd:'10.00',currency:'IDR',amountIdr:150000,expiresAt:new Date(now+60000).toISOString(),indicative:false};}
test('standard five-group UUID quote is accepted and normalized',()=>{assert.equal(parsePurchaseQuote(quote(valid.toUpperCase()),{domain:'example.com',now}).quoteId,valid);});
test('four-group malformed UUID quote is rejected',()=>{assert.throws(()=>parsePurchaseQuote(quote(invalid),{domain:'example.com',now}),{code:'QUOTE_UNVERIFIED'});});
test('standard owner UUID can read empty attempt storage',()=>{let calls=0;assert.equal(readPurchaseAttempt(valid.toUpperCase(),{getItem(key){calls++;assert.equal(key,'ngeblogging:domain-purchase:v1:'+valid);return null;}}),null);assert.equal(calls,1);});
test('malformed owner UUID is rejected before reading storage',()=>{assert.throws(()=>readPurchaseAttempt(invalid,{getItem(){assert.fail('must not read storage');}}),{code:'INVALID_SESSION'});});
test('standard site UUID reaches quote request without purchasing anything',async()=>{let calls=0;await assert.rejects(()=>fetchPurchaseQuote('example.com','test-token',{siteId:valid,fetchImpl:async(path,init)=>{calls++;assert.equal(path,'/api/commerce/domains/quote/example.com');assert.equal(init.headers['x-site-id'],valid);return new Response(JSON.stringify({code:'DOMAIN_PRICING_INPUTS_UNAVAILABLE',reason:'PRICING_SNAPSHOT_MISSING',stage:'snapshot'}),{status:503});}}),error=>error.code==='DOMAIN_PRICING_INPUTS_UNAVAILABLE'&&error.reason==='PRICING_SNAPSHOT_MISSING');assert.equal(calls,1);});
