import test from 'node:test';
import assert from 'node:assert/strict';
import {domainRenewalResponse as handle} from './domain-renewal.mjs';
const USER='11111111-2222-3333-4444-555555555555',DOM='DOM-'+'a'.repeat(40),REN='REN-'+'b'.repeat(40),QUOTE='22222222-3333-4444-5555-666666666666',ACCOUNT='095e57b46e7ba7f6b188480d9e4e5fe7';
const env=(x={})=>({DOMAIN_CUSTOMER_PRODUCTION_ENABLED:'true',DOMAIN_ORDER_ENV:'production',DOMAIN_PAYMENT_PRODUCTION_ENABLED:'true',SUPABASE_URL:'https://polvmlrhqoiflumibfqs.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'srv',SUPABASE_PUBLISHABLE_KEY:'pub',CLOUDFLARE_REGISTRAR_API_TOKEN:'reg-token',CLOUDFLARE_DOMAIN_API_TOKEN:'zone-token',CLOUDFLARE_ACCOUNT_ID:ACCOUNT,...x});
const J=o=>new Response(JSON.stringify(o),{status:200,headers:{'content-type':'application/json'}});
const order=(x={})=>({order_id:DOM,user_id:USER,quote_id:QUOTE,environment:'production',currency:'IDR',amount_idr:285000,payment_state:'paid',registration_state:'registered',midtrans_transaction_id:'tx-1',paid_at:'2026-11-01T00:00:00Z',registered_at:'2026-11-01T01:00:00Z',registrar_domain_ref:'/accounts/'+ACCOUNT+'/registrar/registrations/example.com',review_reason:null,...x});
const quote={id:QUOTE,user_id:USER,environment:'production',domain:'example.com',currency:'IDR',sale_price_idr:285000,provider_id:'cloudflare',registrar_cost_idr:202580};
function world(o={}){
 const w={rpc:[],paths:[]};
 w.fetch=async(href,init={})=>{
  const u=new URL(href);w.paths.push(init.method+' '+u.pathname);
  if(u.pathname==='/auth/v1/user')return J({id:USER});
  if(u.pathname==='/rest/v1/domain_purchase_orders')return J(o.orders??[order()]);
  if(u.pathname==='/rest/v1/domain_sale_quotes')return J(o.quotes??[quote]);
  if(u.pathname.startsWith('/client/v4/accounts/')&&u.pathname.includes('/registrar/registrations/'))return J({success:true,result:{domain_name:'example.com',status:'active',created_at:'2026-11-01T01:00:00Z',expires_at:'2027-11-01T01:00:00Z',auto_renew:true}});
  if(u.pathname==='/client/v4/zones')return J({success:true,result:[{name:'example.com',account:{id:ACCOUNT},type:'full',name_servers:['a.ns.cloudflare.com','b.ns.cloudflare.com']}]});
  if(u.pathname.startsWith('/rest/v1/rpc/')){const body=JSON.parse(init.body);w.rpc.push([u.pathname.split('/').pop(),body]);return J(body.p_order_id);}
  if(u.pathname==='/rest/v1/domain_renewal_orders'){const id=(u.searchParams.get('order_id')||'').replace('eq.','')||REN;const last=w.rpc.at(-1)?.[1]||{};return J([{order_id:id,domain_order_id:DOM,domain:'example.com',price_idr:last.p_price_idr,years:last.p_years,payment_state:'unpaid',renewal_state:'created',paid_at:null,expires_at_before:'2027-11-01T01:00:00Z',expires_at_after:null,completed_at:null,created_at:'2026-11-26T00:00:00Z',midtrans_order_id:null,snap_token:null,checkout_url:null}]);}
  throw Error('unexpected '+href);
 };
 return w;
}
const post=(path,body)=>new Request('https://ngeblogging.com/api/commerce/domains/manage/renewal'+path,{method:'POST',headers:{'content-type':'application/json',origin:'https://ngeblogging.com',authorization:'Bearer token'},body:JSON.stringify(body)});
test('default renewal is one year at reference price plus 50000',async()=>{const w=world();const r=await handle(post('/orders',{orderId:DOM}),env(),{fetchImpl:w.fetch});assert.equal(r.status,201);assert.equal(w.rpc.length,1);assert.equal(w.rpc[0][1].p_years,1);assert.equal(w.rpc[0][1].p_price_idr,335000);});
test('three-year renewal charges three times the one-year price',async()=>{const w=world();const r=await handle(post('/orders',{orderId:DOM,years:3}),env(),{fetchImpl:w.fetch});assert.equal(r.status,201);const b=await r.json();assert.equal(w.rpc[0][1].p_years,3);assert.equal(w.rpc[0][1].p_price_idr,1005000);assert.equal(b.order.years,3);assert.equal(b.order.amountIdr,1005000);});
test('every allowed year count is priced linearly',async()=>{for(const y of [1,2,3,10]){const w=world();const r=await handle(post('/orders',{orderId:DOM,years:y}),env(),{fetchImpl:w.fetch});assert.equal(r.status,201);assert.equal(w.rpc[0][1].p_price_idr,335000*y);}});
test('unsupported or malformed years are rejected before any lookup',async()=>{for(const years of [4,0,-1,5,11,1.5,'3',null,[3]]){const w=world();const r=await handle(post('/orders',{orderId:DOM,years}),env(),{fetchImpl:w.fetch});assert.equal(r.status,400);assert.equal((await r.json()).code,'INVALID_RENEWAL_REQUEST');assert.equal(w.paths.length,0);}});
test('unknown extra fields are rejected',async()=>{const w=world();const r=await handle(post('/orders',{orderId:DOM,years:2,price:1}),env(),{fetchImpl:w.fetch});assert.equal(r.status,400);assert.equal(w.rpc.length,0);});
test('quote lists 1, 2, 3 and 10 years and creates nothing',async()=>{const w=world();const r=await handle(post('/quote',{orderId:DOM}),env(),{fetchImpl:w.fetch});assert.equal(r.status,200);const b=await r.json();assert.equal(b.code,'DOMAIN_RENEWAL_QUOTE');assert.deepEqual(b.options,[{years:1,amountIdr:335000},{years:2,amountIdr:670000},{years:3,amountIdr:1005000},{years:10,amountIdr:3350000}]);assert.equal(w.rpc.length,0);});
test('quote without a registrar cost is refused',async()=>{for(const cost of [null,0,-5]){const w=world({quotes:[{...quote,registrar_cost_idr:cost}]});const r=await handle(post('/quote',{orderId:DOM}),env(),{fetchImpl:w.fetch});assert.equal(r.status,503);assert.equal((await r.json()).code,'RENEWAL_PRICE_UNAVAILABLE');}});
test('quote refuses domains that are not renewable or not owned',async()=>{const a=world({orders:[order({payment_state:'pending'})]});assert.equal((await handle(post('/quote',{orderId:DOM}),env(),{fetchImpl:a.fetch})).status,409);const b=world({orders:[]});assert.equal((await handle(post('/quote',{orderId:DOM}),env(),{fetchImpl:b.fetch})).status,404);});
test('quote rejects extra fields and a missing session',async()=>{const w=world();assert.equal((await handle(post('/quote',{orderId:DOM,years:3}),env(),{fetchImpl:w.fetch})).status,400);const r=await handle(new Request('https://ngeblogging.com/api/commerce/domains/manage/renewal/quote',{method:'POST',headers:{'content-type':'application/json',origin:'https://ngeblogging.com'},body:JSON.stringify({orderId:DOM})}),env(),{fetchImpl:w.fetch});assert.equal(r.status,401);});
