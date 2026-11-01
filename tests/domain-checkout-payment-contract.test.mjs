import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {domainCheckoutPreviewResponse} from '../server/domain-checkout-preview-handler.mjs';
import {domainPaymentNotificationResponse} from '../server/domain-payment-notification-handler.mjs';

// Contract integration only: HTTP, database RPCs, and locks below are in-memory fixtures.
// No real Supabase, Midtrans, PostgreSQL contention, registrar, or DNS is exercised.
const origin='https://feature-domain-stages5-10-integration-20261030-ngeblogging.triapriyogibahari7.workers.dev';
const user='91d4b436-6d7a-4e46-93f5-1ecdc6d33fb3',attempt='11111111-1111-4111-8111-111111111111';
const id='DOM-'+'a'.repeat(40),token='fixture_sandbox_token_123',tx='fixture-transaction-123';
const key='SB-Mid-server-fixture_only_not_a_real_key',base='https://polvmlrhqoiflumibfqs.supabase.co';
const env={DOMAIN_CHECKOUT_PREVIEW_ENABLED:'true',DOMAIN_PAYMENT_NOTIFICATION_PREVIEW_ENABLED:'true',DOMAIN_ORDER_ENV:'sandbox',DOMAIN_MIDTRANS_SANDBOX_SERVER_KEY:key,SUPABASE_URL:base,SUPABASE_PUBLISHABLE_KEY:'fixture-public',SUPABASE_SERVICE_ROLE_KEY:'fixture-service',REGISTRAR_DIAGNOSTIC_ADMIN_USER_ID:user};
function fixture(options={}){
 let clock=Date.parse('2026-11-01T01:00:00Z'),session=null,saveLost=!!options.saveLost,recordLost=!!options.recordLost;
 const order={order_id:id,environment:'sandbox',currency:'IDR',amount_idr:175000,payment_state:'pending',midtrans_transaction_id:null};
 const calls=[],events=new Map(),warnings=[];
 const gateway={order_id:id,transaction_id:tx,gross_amount:'175000.00',currency:'IDR',status_code:'200',transaction_status:'pending',payment_type:'bank_transfer',...options.gateway};
 const checkoutUrl='https://app.sandbox.midtrans.com/snap/v2/vtweb/'+token;
 const snapshot=()=>({ok:true,order_id:id,environment:'sandbox',currency:'IDR',amount_idr:order.amount_idr,attempt_id:attempt,expiry_anchor_at:session.anchor,expires_at:session.expires});
 const fetchImpl=async(input,init)=>{
  const req=input instanceof Request?input:new Request(input,init),url=new URL(req.url),body=req.method==='POST'?await req.json():null;
  calls.push({url:req.url,method:req.method,body});
  if(url.origin===base){
   if(url.pathname==='/auth/v1/user'){assert.equal(req.headers.get('authorization'),'Bearer fixture-session');return Response.json({id:options.nonAdmin?attempt:user});}
   assert.equal(req.headers.get('authorization'),'Bearer fixture-service');
   assert.equal(req.headers.get('apikey'),'fixture-service');
   if(url.pathname==='/rest/v1/domain_purchase_orders'){
    assert.equal(url.searchParams.get('order_id'),'eq.'+id);assert.equal(url.searchParams.get('environment'),'eq.sandbox');return Response.json([{...order}]);
   }
   if(url.pathname.endsWith('/domain_begin_sandbox_checkout')){
    assert.deepEqual(body,{p_user_id:user,p_order_id:id});
    if(order.payment_state!=='pending')return Response.json({ok:false,error:'ORDER_ALREADY_PROCESSED'});
    if(session){if(session.state==='ready')return Response.json(clock>=Date.parse(session.expires)?{ok:false,error:'CHECKOUT_EXPIRED'}:{...snapshot(),action:'reuse',snap_token:token,checkout_url:checkoutUrl});return Response.json({ok:false,error:session.state==='creating'?'CHECKOUT_IN_PROGRESS':'CHECKOUT_RECONCILIATION_REQUIRED'});}
    session={state:'creating',anchor:new Date(clock).toISOString(),expires:new Date(clock+600000).toISOString()};
    return Response.json({...snapshot(),action:'create',duration_minutes:10,fixture_only:!!options.fixtureQuote});
   }
   if(url.pathname.endsWith('/domain_complete_sandbox_checkout')){
    assert.deepEqual(body,{p_user_id:user,p_order_id:id,p_attempt_id:attempt,p_snap_token:token,p_checkout_url:checkoutUrl});
    const reused=session.state==='ready';session.state='ready';
    if(saveLost){saveLost=false;throw Error('fixture response lost after save');}
    const available=order.payment_state==='pending'&&clock<Date.parse(session.expires);
    return Response.json({...snapshot(),reused,state:'ready',payment_state:order.payment_state,checkout_available:available,snap_token:available?token:null,checkout_url:available?checkoutUrl:null,registration_action_taken:false});
   }
   if(url.pathname.endsWith('/domain_review_sandbox_checkout')){
    assert.deepEqual(body,{p_user_id:user,p_order_id:id,p_attempt_id:attempt});if(session.state!=='ready')session.state='review_required';
    return Response.json({ok:true,order_id:id,state:session.state,new_attempt_allowed:false});
   }
   if(url.pathname.endsWith('/domain_record_sandbox_payment')){
    assert.deepEqual(body,{p_order_id:id,p_amount_idr:175000,p_transaction_id:tx});
    const reused=events.has(tx),eventKey=createHash('sha256').update('fixture:'+tx).digest('hex');
    events.set(tx,eventKey);order.payment_state='paid';order.midtrans_transaction_id=tx;
    if(recordLost){recordLost=false;throw Error('fixture response lost after record');}
    return Response.json({ok:true,order_id:id,environment:'sandbox',currency:'IDR',amount_idr:175000,payment_state:'paid',registration_action_taken:false,event_reused:reused,payment_updated:!reused,event_key:eventKey});
   }
  }
  if(url.href==='https://app.sandbox.midtrans.com/snap/v1/transactions'){
   assert.equal(req.method,'POST');assert.equal(req.redirect,'manual');assert.equal(req.headers.get('authorization'),'Basic '+btoa(key+':'));
   assert.equal(req.headers.get('X-Override-Notification'),origin+'/api/commerce/domains/midtrans/notification');
   assert.deepEqual(body.transaction_details,{order_id:id,gross_amount:175000});
   assert.deepEqual(body.expiry,{start_time:'2026-11-01 08:00:00 +0700',unit:'minutes',duration:10});
   if(options.snapWait)await options.snapWait;if(options.snapFailure)throw Error('fixture ambiguous Snap response');
   if(options.paidDuringSnap)order.payment_state='paid';
   return Response.json({token,redirect_url:checkoutUrl},{status:201});
  }
  if(url.href==='https://api.sandbox.midtrans.com/v2/'+id+'/status'){
   assert.equal(req.method,'GET');assert.equal(req.headers.get('authorization'),'Basic '+btoa(key+':'));return Response.json({...gateway});
  }
  throw Error('Unexpected fixture upstream: '+req.method+' '+req.url);
 };
 const unpack=async r=>({status:r.status,data:await r.json()});
 const checkout=async(extra={})=>unpack(await domainCheckoutPreviewResponse(new Request(origin+'/api/commerce/domains/checkout',{method:'POST',headers:{origin,authorization:'Bearer fixture-session','content-type':'application/json'},body:JSON.stringify({orderId:id,...extra})}),env,{fetchImpl,now:()=>clock}));
 const notify=async(overrides={})=>{
  const n={order_id:id,transaction_id:tx,gross_amount:'175000.00',currency:'IDR',status_code:'200',transaction_status:'settlement',...overrides};
  n.signature_key=overrides.signature_key||createHash('sha512').update(n.order_id+n.status_code+n.gross_amount+key).digest('hex');
  return unpack(await domainPaymentNotificationResponse(new Request(origin+'/api/commerce/domains/midtrans/notification',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(n)}),env,{fetchImpl,warnImpl:w=>warnings.push(w)}));
 };
 const count=part=>calls.filter(c=>c.url.includes(part)).length;
 return {checkout,notify,order,gateway,events,warnings,calls,count,state:()=>session?.state,expire:()=>{clock+=700000;}};
}
test('stored order -> checkout -> reuse -> pending -> paid -> duplicate; no registration',async()=>{
 const f=fixture();const a=await f.checkout();assert.equal(a.status,201);assert.equal(a.data.registrationStarted,false);
 assert.equal((await f.checkout()).data.reused,true);assert.equal(f.count('/snap/v1/transactions'),1);
 assert.equal((await f.notify()).data.code,'DOMAIN_PAYMENT_NOT_CONFIRMED');assert.equal(f.order.payment_state,'pending');
 f.gateway.transaction_status='settlement';const paid=await f.notify();assert.equal(paid.data.recordingConfirmed,true);assert.equal(paid.data.registrationActionTaken,false);
 assert.equal((await f.notify()).data.eventReused,true);assert.equal(f.events.size,1);assert.equal(f.order.payment_state,'paid');
 assert.equal((await f.checkout()).data.code,'ORDER_ALREADY_PROCESSED');assert.equal(f.count('/snap/v1/transactions'),1);
 assert.equal(f.calls.some(c=>/registrar|cloudflare\.com|nara|dns/.test(c.url)),false);
});
test('parallel handler requests obey the fixture lock; this is not PostgreSQL contention evidence',async()=>{
 let release;const wait=new Promise(r=>{release=r;});const f=fixture({snapWait:wait});
 const first=f.checkout(),second=f.checkout();await new Promise(r=>setImmediate(r));release();
 const results=await Promise.all([first,second]);assert.deepEqual(results.map(x=>x.status).sort(),[201,409]);assert.equal(f.count('/snap/v1/transactions'),1);
});
test('ambiguous Snap result holds review and does not create another attempt',async()=>{const f=fixture({snapFailure:true});assert.equal((await f.checkout()).status,503);assert.equal(f.state(),'review_required');assert.equal((await f.checkout()).data.code,'CHECKOUT_RECONCILIATION_REQUIRED');assert.equal(f.count('/snap/v1/transactions'),1);});
test('response lost after token storage recovers by reuse',async()=>{const f=fixture({saveLost:true});assert.equal((await f.checkout()).status,503);assert.equal(f.state(),'ready');assert.equal((await f.checkout()).data.reused,true);assert.equal(f.count('/snap/v1/transactions'),1);});
test('invalid signature never queries status or records payment',async()=>{const f=fixture();await f.checkout();assert.equal((await f.notify({signature_key:'0'.repeat(128)})).status,401);assert.equal(f.count('/status'),0);assert.equal(f.events.size,0);});
test('signed amount mismatch is rejected against current gateway state',async()=>{const f=fixture();await f.checkout();f.gateway.transaction_status='settlement';assert.equal((await f.notify({gross_amount:'1.00'})).status,409);assert.equal(f.events.size,0);});
test('current pending state overrides an older settlement notification',async()=>{const f=fixture();await f.checkout();assert.equal((await f.notify()).data.code,'DOMAIN_PAYMENT_NOT_CONFIRMED');assert.equal(f.events.size,0);assert.equal(f.order.payment_state,'pending');});
test('refund metadata requires review, not paid recording',async()=>{const f=fixture({gateway:{transaction_status:'settlement',refund_amount:'1000.00'}});await f.checkout();assert.equal((await f.notify()).data.code,'DOMAIN_PAYMENT_REVIEW_REQUIRED');assert.equal(f.events.size,0);assert.equal(f.warnings.length,1);});
test('non-admin cannot create a checkout attempt',async()=>{const f=fixture({nonAdmin:true});assert.equal((await f.checkout()).status,403);assert.equal(f.state(),undefined);assert.equal(f.count('/snap/v1/transactions'),0);});
test('fixture-marked quote never reaches Snap',async()=>{const f=fixture({fixtureQuote:true});assert.equal((await f.checkout()).status,503);assert.equal(f.count('/snap/v1/transactions'),0);});
test('payment during Snap creation suppresses payment link',async()=>{const f=fixture({paidDuringSnap:true});const r=await f.checkout();assert.equal(r.data.code,'CHECKOUT_NOT_AVAILABLE');assert.equal(r.data.checkout,undefined);assert.equal((await f.checkout()).data.code,'ORDER_ALREADY_PROCESSED');assert.equal(f.count('/snap/v1/transactions'),1);});
test('response lost after paid recording is recovered with one fixture event',async()=>{const f=fixture({recordLost:true,gateway:{transaction_status:'settlement'}});await f.checkout();assert.equal((await f.notify()).status,503);assert.equal(f.events.size,1);assert.equal((await f.notify()).data.eventReused,true);assert.equal(f.events.size,1);});
test('expired checkout cannot create a replacement token',async()=>{const f=fixture();await f.checkout();f.expire();assert.equal((await f.checkout()).data.code,'CHECKOUT_EXPIRED');assert.equal(f.count('/snap/v1/transactions'),1);});
test('gateway transaction identity mismatch cannot mark order paid',async()=>{const f=fixture({gateway:{transaction_status:'settlement',transaction_id:'different-fixture-transaction'}});await f.checkout();assert.equal((await f.notify()).status,409);assert.equal(f.events.size,0);});
