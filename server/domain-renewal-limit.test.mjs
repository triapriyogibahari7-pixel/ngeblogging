import test from 'node:test';
import assert from 'node:assert/strict';
import {domainRenewalResponse as handle} from './domain-renewal.mjs';
const USER='11111111-2222-3333-4444-555555555555',DOM='DOM-'+'a'.repeat(40),REN='REN-'+'b'.repeat(40),QUOTE='22222222-3333-4444-5555-666666666666',ACCOUNT='095e57b46e7ba7f6b188480d9e4e5fe7',LIMIT=2000000000;
const env=()=>({DOMAIN_CUSTOMER_PRODUCTION_ENABLED:'true',DOMAIN_ORDER_ENV:'production',DOMAIN_PAYMENT_PRODUCTION_ENABLED:'true',SUPABASE_URL:'https://polvmlrhqoiflumibfqs.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'srv',SUPABASE_PUBLISHABLE_KEY:'pub',CLOUDFLARE_REGISTRAR_API_TOKEN:'reg-token',CLOUDFLARE_DOMAIN_API_TOKEN:'zone-token',CLOUDFLARE_ACCOUNT_ID:ACCOUNT});
const J=o=>new Response(JSON.stringify(o),{status:200,headers:{'content-type':'application/json'}});
const order={order_id:DOM,user_id:USER,quote_id:QUOTE,environment:'production',currency:'IDR',amount_idr:285000,payment_state:'paid',registration_state:'registered',midtrans_transaction_id:'tx-1',paid_at:'2026-11-01T00:00:00Z',registered_at:'2026-11-01T01:00:00Z',registrar_domain_ref:'/accounts/'+ACCOUNT+'/registrar/registrations/example.com',review_reason:null};
const quoteFor=cost=>({id:QUOTE,user_id:USER,environment:'production',domain:'example.com',currency:'IDR',sale_price_idr:285000,provider_id:'cloudflare',registrar_cost_idr:cost});
function world(cost){
 const w={rpc:[]};
 w.fetch=async(href,init={})=>{
  const u=new URL(href);
  if(u.pathname==='/auth/v1/user')return J({id:USER});
  if(u.pathname==='/rest/v1/domain_purchase_orders')return J([order]);
  if(u.pathname==='/rest/v1/domain_sale_quotes')return J([quoteFor(cost)]);
  if(u.pathname.startsWith('/client/v4/accounts/')&&u.pathname.includes('/registrar/registrations/'))return J({success:true,result:{domain_name:'example.com',status:'active',created_at:'2026-11-01T01:00:00Z',expires_at:'2027-11-01T01:00:00Z',auto_renew:true}});
  if(u.pathname==='/client/v4/zones')return J({success:true,result:[{name:'example.com',account:{id:ACCOUNT},type:'full',name_servers:['a.ns.cloudflare.com','b.ns.cloudflare.com']}]});
  if(u.pathname.startsWith('/rest/v1/rpc/')){const body=JSON.parse(init.body);w.rpc.push(body);return J(body.p_order_id);}
  if(u.pathname==='/rest/v1/domain_renewal_orders'){const id=(u.searchParams.get('order_id')||'').replace('eq.','')||REN;const last=w.rpc.at(-1)||{};return J([{order_id:id,domain_order_id:DOM,domain:'example.com',price_idr:last.p_price_idr,years:last.p_years,payment_state:'unpaid',renewal_state:'created',paid_at:null,expires_at_before:'2027-11-01T01:00:00Z',expires_at_after:null,completed_at:null,created_at:'2026-11-26T00:00:00Z',midtrans_order_id:null,snap_token:null,checkout_url:null}]);}
  throw Error('unexpected '+href);
 };
 return w;
}
const post=(path,body)=>new Request('https://ngeblogging.com/api/commerce/domains/manage/renewal'+path,{method:'POST',headers:{'content-type':'application/json',origin:'https://ngeblogging.com',authorization:'Bearer token'},body:JSON.stringify(body)});
const ALL=[1,2,3,10];
test('quote never offers a term above the order limit',async()=>{for(const cost of [202580,250000000,900000000,5000000000]){const w=world(cost);const r=await handle(post('/quote',{orderId:DOM}),env(),{fetchImpl:w.fetch});if(r.status!==200){assert.equal(r.status,503);assert.equal((await r.json()).code,'RENEWAL_PRICE_UNAVAILABLE');continue;}const b=await r.json();assert.ok(b.options.length>0);for(const o of b.options)assert.ok(o.amountIdr<=LIMIT);const unit=b.options.find(o=>o.years===1).amountIdr;assert.deepEqual(b.options.map(o=>o.years),ALL.filter(y=>unit*y<=LIMIT));}});
test('an offered term can always be ordered and a hidden one is refused',async()=>{for(const cost of [202580,250000000,900000000]){const q=await handle(post('/quote',{orderId:DOM}),env(),{fetchImpl:world(cost).fetch});if(q.status!==200)continue;const offered=(await q.json()).options.map(o=>o.years);for(const years of ALL){const w=world(cost);const r=await handle(post('/orders',{orderId:DOM,years}),env(),{fetchImpl:w.fetch});if(offered.includes(years)){assert.equal(r.status,201);assert.ok(w.rpc[0].p_price_idr<=LIMIT);}else{assert.equal(r.status,503);assert.equal((await r.json()).code,'RENEWAL_PRICE_UNAVAILABLE');assert.equal(w.rpc.length,0);}}}});
