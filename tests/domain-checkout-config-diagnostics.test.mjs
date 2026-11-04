import test from 'node:test';
import assert from 'node:assert/strict';
import {domainCheckoutPreviewResponse as handle} from '../server/domain-checkout-preview-handler.mjs';
const fixture=()=>({DOMAIN_CUSTOMER_PRODUCTION_ENABLED:'true',DOMAIN_ORDER_ENV:'production',DOMAIN_PAYMENT_PRODUCTION_ENABLED:'true',SUPABASE_URL:'https://polvmlrhqoiflumibfqs.supabase.co',SUPABASE_PUBLISHABLE_KEY:'fixture-public',SUPABASE_SERVICE_ROLE_KEY:'fixture-private',DOMAIN_MIDTRANS_PRODUCTION_SERVER_KEY:'Mid-server-fixture_1234567890',DOMAIN_MIDTRANS_PRODUCTION_PAYMENT_METHODS_JSON:'["qris"]',DOMAIN_MIDTRANS_PRODUCTION_MERCHANT_ID:'fixture-merchant'});
const req=()=>new Request('https://ngeblogging.com/api/commerce/domains/checkout',{method:'POST',headers:{origin:'https://ngeblogging.com',authorization:'Bearer fixture-session','content-type':'application/json'},body:JSON.stringify({orderId:'DOM-'+'a'.repeat(40)})});
for(const [name,value,code] of [
 ['SUPABASE_URL','https://wrong.example','CHECKOUT_SUPABASE_URL_INVALID'],
 ['SUPABASE_PUBLISHABLE_KEY',undefined,'CHECKOUT_SUPABASE_PUBLIC_KEY_MISSING'],
 ['SUPABASE_SERVICE_ROLE_KEY',undefined,'CHECKOUT_SUPABASE_SERVICE_KEY_MISSING'],
 ['DOMAIN_MIDTRANS_PRODUCTION_SERVER_KEY',undefined,'CHECKOUT_MIDTRANS_SERVER_KEY_MISSING'],
 ['DOMAIN_MIDTRANS_PRODUCTION_SERVER_KEY','SB-Mid-server-fixture_1234567890','CHECKOUT_MIDTRANS_SERVER_KEY_INVALID'],
 ['DOMAIN_MIDTRANS_PRODUCTION_PAYMENT_METHODS_JSON',undefined,'CHECKOUT_PAYMENT_METHODS_MISSING'],
 ['DOMAIN_MIDTRANS_PRODUCTION_PAYMENT_METHODS_JSON','invalid','CHECKOUT_PAYMENT_METHODS_INVALID'],
 ['DOMAIN_MIDTRANS_PRODUCTION_PAYMENT_METHODS_JSON','["qris","qris"]','CHECKOUT_PAYMENT_METHODS_INVALID'],
 ['DOMAIN_MIDTRANS_PRODUCTION_PAYMENT_METHODS_JSON','["unsupported"]','CHECKOUT_PAYMENT_METHODS_INVALID'],
 ['DOMAIN_MIDTRANS_PRODUCTION_MERCHANT_ID',undefined,'CHECKOUT_MERCHANT_ID_MISSING'],
 ['DOMAIN_MIDTRANS_PRODUCTION_MERCHANT_ID','bad merchant','CHECKOUT_MERCHANT_ID_INVALID']
])test(code+': '+name+' '+String(value),async()=>{const env={...fixture(),[name]:value};const response=await handle(req(),env,{fetchImpl:()=>assert.fail('No network permitted for invalid configuration')});assert.equal(response.status,503);const body=await response.json();assert.equal(body.code,code);assert.equal(body.configurationUnavailable,true);assert.equal(body.purchaseAllowed,false);assert.equal(body.registrationStarted,false);const text=JSON.stringify(body);assert(!text.includes('fixture-private'));assert(!text.includes('Mid-server-'));assert(!text.includes('fixture-merchant'));});
test('valid configuration proceeds to session verification without bypass',async()=>{let calls=0;const response=await handle(req(),fixture(),{fetchImpl:async target=>{calls++;assert.equal(new URL(target).pathname,'/auth/v1/user');return Response.json({},{status:401});}});assert.equal(response.status,401);assert.equal((await response.json()).code,'INVALID_SESSION');assert.equal(calls,1);});
