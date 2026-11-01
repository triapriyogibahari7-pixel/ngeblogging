import test from 'node:test';
import assert from 'node:assert/strict';
import {domainProductionOrderStatusResponse as handler} from '../server/domain-production-order-status-handler.mjs';
const uid='11111111-1111-4111-8111-111111111111',qid='22222222-2222-4222-8222-222222222222',id='DOM-'+'a'.repeat(40);
const env={DOMAIN_ORDER_ENV:'production',SUPABASE_URL:'https://polvmlrhqoiflumibfqs.supabase.co',SUPABASE_PUBLISHABLE_KEY:'fixture-public',SUPABASE_SERVICE_ROLE_KEY:'fixture-private'};
const baseOrder={order_id:id,user_id:uid,quote_id:qid,environment:'production',currency:'IDR',amount_idr:150000,payment_state:'pending',registration_state:'not_started',midtrans_transaction_id:null,paid_at:null,registered_at:null,registrar_domain_ref:null,review_reason:null,created_at:'2026-11-01T00:00:00Z',updated_at:'2026-11-01T00:01:00Z'};
const baseQuote={id:qid,user_id:uid,environment:'production',domain:'example.com',currency:'IDR',sale_price_idr:150000,years:1,operation:'registration'};
function req({token='fixture-token',method='GET'}={}){return new Request('https://ngeblogging.com/api/commerce/domains/orders/'+id,{method,headers:token?{authorization:'Bearer '+token}:{}});}
function fixture({user=uid,order={},quote={},empty=false,authStatus=200}={}){
 const calls=[];const fetchImpl=async(url,init)=>{const u=new URL(url);calls.push({u,init});let data;
 if(u.pathname==='/auth/v1/user')return Response.json({id:user},{status:authStatus});
 if(u.pathname==='/rest/v1/domain_purchase_orders')data=empty?[]:[{...baseOrder,...order}];
 else if(u.pathname==='/rest/v1/domain_sale_quotes')data=[{...baseQuote,...quote}];
 else throw Error('Unexpected network request');return Response.json(data);};
 return {calls,run:(request=req(),config=env)=>handler(request,config,{fetchImpl})};
}
test('standard user and quote UUIDs can read their own pending order',async()=>{const f=fixture(),r=await f.run();assert.equal(r.status,200);const p=await r.json();assert.equal(p.code,'DOMAIN_ORDER_STATUS');assert.equal(p.order.paymentConfirmed,false);assert.equal(p.order.registrationConfirmed,false);for(const c of f.calls.filter(x=>x.u.pathname.startsWith('/rest/')))assert.equal(c.u.searchParams.get('user_id'),'eq.'+uid);assert.equal(r.headers.get('cache-control'),'private, no-store');});
test('missing UUID segment is still rejected as invalid user',async()=>{const f=fixture({user:'11111111-1111-4111-111111111111'});assert.equal((await f.run()).status,401);assert.equal(f.calls.length,1);});
test('malformed quote UUID fails closed',async()=>{const f=fixture({order:{quote_id:'22222222-2222-4222-222222222222'}});assert.equal((await f.run()).status,503);});
test('missing bearer token does not query storage',async()=>{const f=fixture();assert.equal((await f.run(req({token:''}))).status,401);assert.equal(f.calls.length,0);});
test('invalid session does not query storage',async()=>{const f=fixture({authStatus:401});assert.equal((await f.run()).status,401);assert.equal(f.calls.length,1);});
test('missing order returns 404',async()=>{const f=fixture({empty:true});assert.equal((await f.run()).status,404);});
test('foreign order and foreign quote are not disclosed',async()=>{for(const values of [{order:{user_id:'33333333-3333-4333-8333-333333333333'}},{quote:{user_id:'33333333-3333-4333-8333-333333333333'}}]){const r=await fixture(values).run();assert.equal(r.status,503);assert.equal((await r.text()).includes('example.com'),false);}});
test('paid order requires recorded provider payment proof',async()=>{const r=await fixture({order:{payment_state:'paid'}}).run();assert.equal(r.status,503);});
test('paid is not registered',async()=>{const r=await fixture({order:{payment_state:'paid',paid_at:'2026-11-01T00:00:30Z',midtrans_transaction_id:'fixture-transaction'}}).run();assert.equal(r.status,200);const p=await r.json();assert.equal(p.order.paymentConfirmed,true);assert.equal(p.order.registrationConfirmed,false);});
test('registered requires registrar evidence',async()=>{const r=await fixture({order:{payment_state:'paid',paid_at:'2026-11-01T00:00:30Z',midtrans_transaction_id:'fixture-transaction',registration_state:'registered'}}).run();assert.equal(r.status,503);});
test('registered with recorded payment and registrar evidence is confirmed',async()=>{const r=await fixture({order:{payment_state:'paid',paid_at:'2026-11-01T00:00:30Z',midtrans_transaction_id:'fixture-transaction',registration_state:'registered',registered_at:'2026-11-01T00:00:45Z',registrar_domain_ref:'fixture-registration'}}).run();assert.equal(r.status,200);assert.equal((await r.json()).order.registrationConfirmed,true);});
test('status handler has no write requests',async()=>{const f=fixture();await f.run();assert.equal(f.calls.length,3);assert.ok(f.calls.every(x=>x.init.method==='GET'));});
test('non-production environment remains disabled',async()=>{const f=fixture();assert.equal((await f.run(req(),{...env,DOMAIN_ORDER_ENV:'sandbox'})).status,503);assert.equal(f.calls.length,0);});
test('POST remains rejected',async()=>{const f=fixture();assert.equal((await f.run(req({method:'POST'}))).status,405);assert.equal(f.calls.length,0);});
