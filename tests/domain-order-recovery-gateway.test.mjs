import test from 'node:test';
import assert from 'node:assert/strict';
import {observeDomainRecoveryGateway as observe} from '../server/domain-order-recovery-gateway.mjs';
const id='DOM-'+ 'a'.repeat(40),now=Date.parse('2026-11-05T02:00:00Z');
const env={DOMAIN_ORDER_ENV:'production',DOMAIN_MIDTRANS_PRODUCTION_MERCHANT_ID:'fixture-merchant',DOMAIN_MIDTRANS_PRODUCTION_SERVER_KEY:'Mid-server-fixture-private-12345'};
const input={orderId:id,amountIdr:285000};
const existing=()=>({order_id:id,merchant_id:'fixture-merchant',currency:'IDR',gross_amount:'285000.00',transaction_id:'fixture-transaction',transaction_status:'pending',status_code:'201'});
function fetcher(body,status=200){return async(url,options)=>{assert.equal(url,'https://api.midtrans.com/v2/'+id+'/status');assert.equal(options.method,'GET');assert.equal(options.redirect,'error');assert.equal(options.body,undefined);return Response.json(body,{status});};}
test('Core 404 with HTTP 200 never proves Snap absence',async()=>{const r=await observe(env,input,{clock:()=>now,fetchImpl:fetcher({status_code:'404'})});assert.equal(r.code,'GATEWAY_SNAP_ABSENCE_UNPROVEN');assert.equal(r.recoveryAllowed,false);assert.equal(r.gatewayStatus,'unknown');});
test('HTTP 404 JSON never permits repricing',async()=>{const r=await observe(env,input,{clock:()=>now,fetchImpl:fetcher({status_code:'404'},404)});assert.equal(r.recoveryAllowed,false);assert.equal(r.code,'GATEWAY_SNAP_ABSENCE_UNPROVEN');});
test('known transaction requires reconciliation regardless of state',async()=>{for(const transaction_status of ['pending','settlement','expire','cancel']){const r=await observe(env,input,{clock:()=>now,fetchImpl:fetcher({...existing(),transaction_status})});assert.equal(r.code,'GATEWAY_EXISTING_TRANSACTION');assert.equal(r.recoveryAllowed,false);}});
test('wrong merchant is never trusted',async()=>{const r=await observe(env,input,{clock:()=>now,fetchImpl:fetcher({...existing(),merchant_id:'other'})});assert.equal(r.code,'GATEWAY_IDENTITY_UNVERIFIED');});
test('unauthorized gateway does not become absence',async()=>{const r=await observe(env,input,{fetchImpl:fetcher({status_code:'401'},401)});assert.equal(r.code,'GATEWAY_AUTH_REJECTED');assert.equal(r.recoveryAllowed,false);});
test('HTML 404 is unverified',async()=>{const r=await observe(env,input,{fetchImpl:async()=>new Response('<html>404</html>',{status:404,headers:{'content-type':'text/html'}})});assert.equal(r.code,'GATEWAY_STATUS_UNAVAILABLE');});
test('invalid request never reaches gateway',async()=>{const r=await observe(env,{...input,amountIdr:0},{fetchImpl:()=>assert.fail('No network')});assert.equal(r.code,'INVALID_RECOVERY_REQUEST');});
test('output never exposes credentials or raw gateway payload',async()=>{const r=await observe(env,input,{clock:()=>now,fetchImpl:fetcher(existing())});const text=JSON.stringify(r);assert(!text.includes(env.DOMAIN_MIDTRANS_PRODUCTION_SERVER_KEY));assert(!text.includes('fixture-transaction'));assert(!text.includes('gross_amount'));});
