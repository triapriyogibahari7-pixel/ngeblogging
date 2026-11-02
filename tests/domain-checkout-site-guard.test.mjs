import test from 'node:test';
import assert from 'node:assert/strict';
import {domainCheckoutPreviewResponse as handle} from '../server/domain-checkout-preview-handler.mjs';
globalThis.fetch=()=>{throw Error('LIVE_NETWORK_FORBIDDEN');};
const id='DOM-'+'a'.repeat(40),owner='11111111-1111-1111-1111-111111111111',attempt='22222222-2222-2222-2222-222222222222',now=Date.parse('2026-11-02T07:30:00Z');
function fixture(mode='good',production=true){
 const calls=[],env={DOMAIN_CUSTOMER_PRODUCTION_ENABLED:'true',DOMAIN_PAYMENT_PRODUCTION_ENABLED:'true',DOMAIN_ORDER_ENV:production?'production':'sandbox',DOMAIN_ORDER_SITE_BINDING_ENABLED:'true',DOMAIN_CHECKOUT_PREVIEW_ENABLED:'true',DOMAIN_PAYMENT_NOTIFICATION_PREVIEW_ENABLED:'true',SUPABASE_URL:'https://polvmlrhqoiflumibfqs.supabase.co',SUPABASE_PUBLISHABLE_KEY:'fixture-public',SUPABASE_SERVICE_ROLE_KEY:'fixture-service',DOMAIN_MIDTRANS_PRODUCTION_SERVER_KEY:'Mid-server-fixture_key_12345',DOMAIN_MIDTRANS_SANDBOX_SERVER_KEY:'SB-Mid-server-fixture_key_12345',DOMAIN_MIDTRANS_PRODUCTION_PAYMENT_METHODS_JSON:'["qris"]',DOMAIN_MIDTRANS_PRODUCTION_MERCHANT_ID:'fixture-merchant',REGISTRAR_DIAGNOSTIC_ADMIN_USER_ID:owner};
 const environment=production?'production':'sandbox',host=production?'app.midtrans.com':'app.sandbox.midtrans.com',token='fixture-token-123456',checkoutUrl='https://'+host+'/snap/v2/vtweb/'+token,expires=new Date(now+300000).toISOString();
 const fetchImpl=async(target,options)=>{const u=new URL(target),body=options.body?JSON.parse(options.body):null;calls.push({host:u.hostname,path:u.pathname,body});assert.equal(options.redirect,'manual');
  if(u.pathname==='/auth/v1/user')return Response.json({id:owner});
  if(u.pathname.includes('/domain_begin_')){
   assert.deepEqual(body,{p_user_id:owner,p_order_id:id});
   if(mode==='binding-required')return Response.json({ok:false,error:'ORDER_SITE_BINDING_REQUIRED'});
   if(mode==='owner-changed')return Response.json({ok:false,error:'SITE_OWNER_REQUIRED'});
   if(mode==='binding-invalid')return Response.json({ok:false,error:'ORDER_SITE_BINDING_UNVERIFIED'});
   if(mode==='storage-down')return Response.json({code:'not-installed'},{status:503});
   return Response.json({ok:true,action:mode==='reuse'?'reuse':'create',order_id:id,environment,currency:'IDR',amount_idr:350000,attempt_id:attempt,expiry_anchor_at:new Date(now).toISOString(),expires_at:expires,fixture_only:false,duration_minutes:5,...(mode==='reuse'?{snap_token:token,checkout_url:checkoutUrl}:{})});
  }
  if(u.hostname===host){assert.equal(u.pathname,'/snap/v1/transactions');return Response.json({token,redirect_url:checkoutUrl},{status:201});}
  if(u.pathname.includes('/domain_complete_'))return Response.json({ok:true,order_id:id,environment,currency:'IDR',amount_idr:350000,attempt_id:attempt,state:'ready',registration_action_taken:false,reused:mode==='reuse',expires_at:expires,checkout_available:true,payment_state:'pending',snap_token:token,checkout_url:checkoutUrl});
  throw Error('unexpected mock request');
 };
 const origin=production?'https://ngeblogging.com':'https://feature-domain-stages5-10-integration-20261030-ngeblogging.triapriyogibahari7.workers.dev';
 const run=async(body={orderId:id})=>{const r=await handle(new Request(origin+'/api/commerce/domains/checkout',{method:'POST',headers:{origin,authorization:'Bearer fixture-session','content-type':'application/json'},body:JSON.stringify(body)}),env,{fetchImpl,now:()=>now});return {status:r.status,value:await r.json()};};return {calls,env,run};
}
const gatewayCalls=f=>f.calls.filter(c=>c.host==='app.midtrans.com'||c.host==='app.sandbox.midtrans.com');
test('enabled production uses bound checkout RPC before mock gateway creation',async()=>{const f=fixture(),r=await f.run();assert.equal(r.status,201);assert.equal(f.calls[1].path,'/rest/v1/rpc/domain_begin_site_production_checkout');assert.equal(gatewayCalls(f).length,1);assert.equal(r.value.registrationStarted,false);});
test('missing binding stops before gateway or checkout completion',async()=>{const f=fixture('binding-required'),r=await f.run();assert.equal(r.status,409);assert.equal(r.value.code,'ORDER_SITE_BINDING_REQUIRED');assert.equal(gatewayCalls(f).length,0);assert.equal(f.calls.length,2);});
test('changed site owner stops before gateway',async()=>{const f=fixture('owner-changed'),r=await f.run();assert.equal(r.status,403);assert.equal(gatewayCalls(f).length,0);});
test('invalid binding stops before gateway',async()=>{const f=fixture('binding-invalid'),r=await f.run();assert.equal(r.status,503);assert.equal(r.value.code,'ORDER_SITE_BINDING_UNVERIFIED');assert.equal(gatewayCalls(f).length,0);});
test('disabled binding keeps legacy production RPC',async()=>{const f=fixture();delete f.env.DOMAIN_ORDER_SITE_BINDING_ENABLED;assert.equal((await f.run()).status,201);assert.equal(f.calls[1].path,'/rest/v1/rpc/domain_begin_production_checkout');});
test('sandbox cannot invoke production site wrapper',async()=>{const f=fixture('good',false);assert.equal((await f.run()).status,201);assert.equal(f.calls[1].path,'/rest/v1/rpc/domain_begin_sandbox_checkout');});
test('unavailable wrapper never falls back to unbound checkout',async()=>{const f=fixture('storage-down'),r=await f.run();assert.equal(r.status,503);assert.equal(r.value.newAttemptAllowed,false);assert.equal(gatewayCalls(f).length,0);assert.ok(!f.calls.some(c=>c.path==='/rest/v1/rpc/domain_begin_production_checkout'));});
test('reused checkout still goes through site guard without new gateway transaction',async()=>{const f=fixture('reuse'),r=await f.run();assert.equal(r.status,200);assert.equal(r.value.reused,true);assert.equal(f.calls[1].path,'/rest/v1/rpc/domain_begin_site_production_checkout');assert.equal(gatewayCalls(f).length,0);});
test('browser cannot substitute a new destination in checkout body',async()=>{const f=fixture(),r=await f.run({orderId:id,siteId:'33333333-3333-3333-3333-333333333333'});assert.equal(r.status,400);assert.equal(f.calls.length,0);});
