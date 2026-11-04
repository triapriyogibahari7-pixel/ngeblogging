import test from 'node:test';
import assert from 'node:assert/strict';
import {domainCheckoutPreviewResponse as checkout} from '../server/domain-checkout-preview-handler.mjs';
const now=Date.parse('2026-11-04T00:00:00Z'),id='DOM-'+'a'.repeat(40),user='11111111-1111-4111-8111-111111111111',attempt='22222222-2222-4222-8222-222222222222',token='12345678-1234-4123-8123-123456789abc';
const serverKey='Mid-server-fixture_1234567890',clientKey='Mid-client-fixture_1234567890',amount=285000;
const paymentUrl='https://app.midtrans.com/snap/v4/redirection/'+token;
function fixture({action='create',patchEnv={},badSave=false,authStatus=200}={}){
 const calls=[];
 const env={DOMAIN_CUSTOMER_PRODUCTION_ENABLED:'true',DOMAIN_ORDER_ENV:'production',DOMAIN_PAYMENT_PRODUCTION_ENABLED:'true',SUPABASE_URL:'https://polvmlrhqoiflumibfqs.supabase.co',SUPABASE_PUBLISHABLE_KEY:'fixture-public',SUPABASE_SERVICE_ROLE_KEY:'fixture-service-role',DOMAIN_MIDTRANS_PRODUCTION_SERVER_KEY:serverKey,DOMAIN_MIDTRANS_PRODUCTION_PAYMENT_METHODS_JSON:'["qris"]',DOMAIN_MIDTRANS_PRODUCTION_MERCHANT_ID:'fixture-merchant',MIDTRANS_ENV:'production',MIDTRANS_SERVER_KEY:serverKey,MIDTRANS_CLIENT_KEY:clientKey,...patchEnv};
 const snapshot={ok:true,action,order_id:id,environment:'production',currency:'IDR',amount_idr:amount,attempt_id:attempt,expiry_anchor_at:new Date(now).toISOString(),expires_at:new Date(now+180000).toISOString(),duration_minutes:3,fixture_only:false,...(action==='reuse'?{snap_token:token,checkout_url:paymentUrl}:{})};
 const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
 const fetchImpl=async(value,init={})=>{
  const url=new URL(String(value));calls.push({url:url.href,method:init.method,body:init.body?JSON.parse(init.body):null});
  if(url.pathname==='/auth/v1/user')return json({id:user},authStatus);
  if(url.pathname.endsWith('/domain_begin_production_checkout'))return json(snapshot);
  if(url.origin==='https://app.midtrans.com'&&url.pathname==='/snap/v1/transactions')return json({token,redirect_url:paymentUrl},201);
  if(url.pathname.endsWith('/domain_complete_production_checkout'))return json({ok:true,order_id:id,environment:'production',currency:'IDR',amount_idr:badSave?amount+1:amount,attempt_id:attempt,state:'ready',registration_action_taken:false,reused:action==='reuse',expires_at:snapshot.expires_at,checkout_available:true,payment_state:'pending',snap_token:token,checkout_url:paymentUrl});
  if(url.pathname.endsWith('/domain_review_production_checkout'))return json({ok:true,order_id:id,environment:'production',state:'review_required',new_attempt_allowed:false});
  throw Error('Unexpected mocked request '+url.href);
 };
 const request=()=>new Request('https://ngeblogging.com/api/commerce/domains/checkout',{method:'POST',headers:{origin:'https://ngeblogging.com',authorization:'Bearer fixture-session','content-type':'application/json'},body:JSON.stringify({orderId:id})});
 return {calls,run:()=>checkout(request(),env,{fetchImpl,now:()=>now})};
}
test('create returns saved token and matching public key, never server secrets',async()=>{const f=fixture(),r=await f.run(),b=await r.json();assert.equal(r.status,201);assert.equal(b.checkout.snapToken,token);assert.equal(b.checkout.clientKey,clientKey);assert.equal(b.checkout.url,paymentUrl);assert.equal(b.checkout.amountIdr,amount);const text=JSON.stringify(b);assert(!text.includes(serverKey));assert(!text.includes('fixture-service-role'));const snap=f.calls.filter(x=>x.url.startsWith('https://app.midtrans.com/'));assert.equal(snap.length,1);assert.equal(snap[0].body.transaction_details.order_id,id);assert.equal(snap[0].body.transaction_details.gross_amount,amount);});
test('reuse returns same payment and never creates another Snap transaction',async()=>{const f=fixture({action:'reuse'}),r=await f.run(),b=await r.json();assert.equal(r.status,200);assert.equal(b.reused,true);assert.equal(b.checkout.snapToken,token);assert.equal(b.checkout.url,paymentUrl);assert.equal(f.calls.filter(x=>x.url.startsWith('https://app.midtrans.com/')).length,0);});
test('missing public key keeps official hosted checkout usable',async()=>{const f=fixture({patchEnv:{MIDTRANS_CLIENT_KEY:undefined}}),r=await f.run(),b=await r.json();assert.equal(r.status,201);assert.equal(b.checkout.clientKey,null);assert.equal(b.checkout.url,paymentUrl);});
test('different Nara server key prevents public-key reuse',async()=>{const r=await fixture({patchEnv:{MIDTRANS_SERVER_KEY:serverKey+'other'}}).run(),b=await r.json();assert.equal(r.status,201);assert.equal(b.checkout.clientKey,null);});
test('explicit domain public key is used without changing Nara',async()=>{const key='Mid-client-domain_fixture_1234567890',r=await fixture({patchEnv:{DOMAIN_MIDTRANS_PRODUCTION_CLIENT_KEY:key,MIDTRANS_SERVER_KEY:serverKey+'other'}}).run(),b=await r.json();assert.equal(b.checkout.clientKey,key);});
test('mismatched saved amount is rejected without leaking checkout',async()=>{const f=fixture({badSave:true}),r=await f.run(),b=await r.json();assert.equal(r.status,503);assert.equal(b.code,'CHECKOUT_RECONCILIATION_REQUIRED');assert.equal(b.checkout,undefined);assert.equal(b.newAttemptAllowed,false);assert(f.calls.some(x=>x.url.endsWith('/domain_review_production_checkout')));});
test('invalid session stops before checkout RPC and Snap',async()=>{const f=fixture({authStatus:401}),r=await f.run(),b=await r.json();assert.equal(r.status,401);assert.equal(b.code,'INVALID_SESSION');assert.equal(f.calls.length,1);});
