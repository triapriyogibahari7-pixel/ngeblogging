import test from 'node:test';
import assert from 'node:assert/strict';
import {domainOrderRecoveryQuoteResponse as handle} from '../server/domain-order-recovery-quote-handler.mjs';
const now=Date.parse('2026-11-05T02:00:00Z'),owner='11111111-1111-4111-8111-111111111111',oldQuote='22222222-2222-4222-8222-222222222222',newQuote='33333333-3333-4333-8333-333333333333',site='44444444-4444-4444-8444-444444444444',id='DOM-'+ 'a'.repeat(40);
const env={DOMAIN_CUSTOMER_PRODUCTION_ENABLED:'true',DOMAIN_ORDER_ENV:'production',SUPABASE_URL:'https://polvmlrhqoiflumibfqs.supabase.co',SUPABASE_PUBLISHABLE_KEY:'fixture-public',SUPABASE_SERVICE_ROLE_KEY:'fixture-service'};
const req=()=>new Request('https://ngeblogging.com/api/commerce/domains/order-recovery-quote',{method:'POST',headers:{origin:'https://ngeblogging.com',authorization:'Bearer fixture-token','content-type':'application/json'},body:JSON.stringify({orderId:id})});
const preflight=()=>({ok:true,code:'DOMAIN_ORDER_RECOVERY_QUOTE_REVIEW_REQUIRED',version:'same-order-recovery-preflight-v1',environment:'production',order_id:id,site_id:site,domain:'example.com',quote_id:oldQuote,currency:'IDR',amount_idr:285000,order_updated_at:new Date(now-3600000).toISOString(),checked_at:new Date(now).toISOString(),quote_review_allowed:true,fresh_quote_required:true,price_consent_required:true,registrant_revalidation_required:true,gateway_status_verified:false,recovery_allowed:false,payment_allowed:false,replacement_order_allowed:false,order_changed:false,checkout_created:false,registration_action_taken:false});
function fetcher(snapshot){return async(url,options)=>{const path=new URL(url).pathname;if(path==='/auth/v1/user'){assert.equal(options.method,'GET');return Response.json({id:owner});}assert.equal(path,'/rest/v1/rpc/domain_order_recovery_preflight_v1');assert.deepEqual(JSON.parse(options.body),{p_user_id:owner,p_order_id:id});return Response.json(snapshot);};}
test('quote review preserves same order and never authorizes payment',async()=>{
 let calls=0;const response=await handle(req(),env,{clock:()=>now,fetchImpl:fetcher(preflight()),quoteHandler:async request=>{calls++;assert.equal(new URL(request.url).pathname,'/api/commerce/domains/quote/example.com');assert.equal(request.body,null);return Response.json({code:'DOMAIN_QUOTE_PRODUCTION',environment:'production',purchaseAllowed:false,checkoutCreated:false,registrationStarted:false,quote:{quoteId:newQuote,domain:'example.com',years:1,currency:'IDR',amountIdr:290000,expiresAt:new Date(now+60000).toISOString(),indicative:false,actualCostsVerified:false,merchantAbsorbsOverrun:true}},{status:201});}});
 assert.equal(response.status,201);const body=await response.json();assert.equal(body.orderId,id);assert.equal(body.previousAmountIdr,285000);assert.equal(body.quote.amountIdr,290000);assert.equal(body.quote.actualCostsVerified,false);assert.equal(body.priceConsentRequired,true);assert.equal(body.orderChanged,false);assert.equal(body.paymentAllowed,false);assert.equal(body.recoveryAllowed,false);assert.equal(body.checkoutCreated,false);assert.equal(calls,1);
});
test('gateway evidence blocks quote issuance',async()=>{
 const response=await handle(req(),env,{clock:()=>now,fetchImpl:fetcher({ok:false,error:'GATEWAY_RECONCILIATION_REQUIRED'}),quoteHandler:()=>assert.fail('No quote allowed')});assert.equal(response.status,409);assert.equal((await response.json()).code,'GATEWAY_RECONCILIATION_REQUIRED');
});
test('stale preflight never issues quote',async()=>{
 const s=preflight();s.checked_at=new Date(now-11000).toISOString();const response=await handle(req(),env,{clock:()=>now,fetchImpl:fetcher(s),quoteHandler:()=>assert.fail('No quote allowed')});assert.equal(response.status,503);
});
test('cross-origin request never accesses database',async()=>{
 const request=req();request.headers.set('origin','https://example.org');const response=await handle(request,env,{fetchImpl:()=>assert.fail('No network allowed')});assert.equal(response.status,403);
});
