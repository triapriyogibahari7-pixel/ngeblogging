import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {domainRenewalResponse as handle} from './domain-renewal.mjs';
const USER='11111111-2222-3333-4444-555555555555',DOM='DOM-'+'a'.repeat(40),REN='REN-'+'b'.repeat(40),QUOTE='22222222-3333-4444-5555-666666666666';
const KEY='Mid-server-'+'k'.repeat(20),ACCOUNT='095e57b46e7ba7f6b188480d9e4e5fe7';
const env=(x={})=>({DOMAIN_CUSTOMER_PRODUCTION_ENABLED:'true',DOMAIN_ORDER_ENV:'production',DOMAIN_PAYMENT_PRODUCTION_ENABLED:'true',DOMAIN_MIDTRANS_PRODUCTION_SERVER_KEY:KEY,DOMAIN_MIDTRANS_PRODUCTION_MERCHANT_ID:'M1',SUPABASE_URL:'https://polvmlrhqoiflumibfqs.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'srv',SUPABASE_PUBLISHABLE_KEY:'pub',CLOUDFLARE_REGISTRAR_API_TOKEN:'reg-token',CLOUDFLARE_DOMAIN_API_TOKEN:'zone-token',CLOUDFLARE_ACCOUNT_ID:ACCOUNT,...x});
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json'}});
const order=(x={})=>({order_id:DOM,user_id:USER,quote_id:QUOTE,environment:'production',currency:'IDR',amount_idr:285000,payment_state:'paid',registration_state:'registered',midtrans_transaction_id:'tx-1',paid_at:'2026-11-01T00:00:00Z',registered_at:'2026-11-01T01:00:00Z',registrar_domain_ref:'/accounts/'+ACCOUNT+'/registrar/registrations/example.com',review_reason:null,...x});
const quote={id:QUOTE,user_id:USER,environment:'production',domain:'example.com',currency:'IDR',sale_price_idr:285000,provider_id:'cloudflare',registrar_cost_idr:202580};
const row={order_id:REN,domain_order_id:DOM,domain:'example.com',price_idr:285000,payment_state:'unpaid',renewal_state:'created',paid_at:null,expires_at_before:'2027-11-01T01:00:00Z',expires_at_after:null,completed_at:null,created_at:'2026-11-26T00:00:00Z'};
function world(o={}){
 const w={rpc:[],paths:[]};
 w.fetch=async(href,init={})=>{
  const u=new URL(href);w.paths.push(init.method+' '+u.pathname);
  if(u.pathname==='/auth/v1/user')return J({id:USER});
  if(u.pathname==='/rest/v1/domain_purchase_orders')return J(o.orders??[order()]);
  if(u.pathname==='/rest/v1/domain_sale_quotes')return J(o.quotes??[quote]);
  if(u.pathname.startsWith('/client/v4/accounts/')&&u.pathname.includes('/registrar/registrations/'))return J({success:true,result:{domain_name:'example.com',status:'active',created_at:'2026-11-01T01:00:00Z',expires_at:'2027-11-01T01:00:00Z',auto_renew:true}});
  if(u.pathname==='/client/v4/zones')return J({success:true,result:[{name:'example.com',account:{id:ACCOUNT},type:'full',name_servers:['a.ns.cloudflare.com','b.ns.cloudflare.com']}]});
  if(u.pathname.startsWith('/rest/v1/rpc/')){const body=JSON.parse(init.body);w.rpc.push([u.pathname.split('/').pop(),body]);if(u.pathname.endsWith('create_v1'))return J(body.p_order_id);return J(o.rpcResult??'paid');}
  if(u.pathname==='/rest/v1/domain_renewal_orders'){const sel=u.searchParams.get('select')||'',id=(u.searchParams.get('order_id')||'').replace('eq.','')||REN;return J(sel.includes('midtrans_order_id')&&!sel.includes('snap_token')?[{order_id:id,midtrans_order_id:id}]:[{...row,order_id:id,midtrans_order_id:id,snap_token:null,checkout_url:null}]);}
  if(u.hostname==='api.midtrans.com')return J({order_id:REN,transaction_id:'tx-9',currency:'IDR',merchant_id:'M1',gross_amount:'285000.00',status_code:'200',transaction_status:'settlement',payment_type:'qris',fraud_status:'accept'});
  throw Error('unexpected '+href);
 };
 return w;
}
const post=(path,body,headers={})=>new Request('https://ngeblogging.com/api/commerce/domains/manage/renewal'+path,{method:'POST',headers:{'content-type':'application/json',origin:'https://ngeblogging.com',authorization:'Bearer token',...headers},body:JSON.stringify(body)});
test('feature is off by default',async()=>{const w=world();const r=await handle(post('/orders',{orderId:DOM}),env({DOMAIN_CUSTOMER_PRODUCTION_ENABLED:undefined}),{fetchImpl:w.fetch});assert.equal(r.status,503);assert.equal((await r.json()).code,'DOMAIN_RENEWAL_DISABLED');assert.equal(w.paths.length,0);});
test('missing auth is rejected before any lookup',async()=>{const w=world();const r=await handle(post('/orders',{orderId:DOM},{authorization:''}),env(),{fetchImpl:w.fetch});assert.equal(r.status,401);assert.equal(w.rpc.length,0);});
test('owned paid and registered domain is refused without a verified renewal price',async()=>{const w=world();const r=await handle(post('/orders',{orderId:DOM}),env(),{fetchImpl:w.fetch});assert.equal(r.status,503);const b=await r.json();assert.equal(b.code,'RENEWAL_PRICE_UNAVAILABLE');assert.equal(w.rpc.length,0);});
test('unpaid or unregistered orders cannot be renewed',async()=>{for(const o of [order({payment_state:'pending'}),order({registration_state:'processing'}),order({review_reason:'X'})]){const w=world({orders:[o]});const r=await handle(post('/orders',{orderId:DOM}),env(),{fetchImpl:w.fetch});assert.equal(r.status,409);assert.equal(w.rpc.length,0);}});
test('foreign order is 404 and creates nothing',async()=>{const w=world({orders:[]});const r=await handle(post('/orders',{orderId:DOM}),env(),{fetchImpl:w.fetch});assert.equal(r.status,404);assert.equal(w.rpc.length,0);});
const note=(sig)=>{const body={order_id:REN,status_code:'200',gross_amount:'285000.00',transaction_id:'tx-9',currency:'IDR',merchant_id:'M1'};body.signature_key=sig??createHash('sha512').update(REN+'200'+'285000.00'+KEY).digest('hex');return new Request('https://ngeblogging.com/api/commerce/domains/manage/renewal/notification',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});};
test('notification with a bad signature records nothing',async()=>{const w=world();const r=await handle(note('0'.repeat(128)),env(),{fetchImpl:w.fetch});assert.equal(r.status,401);assert.equal(w.rpc.length,0);});
test('verified settlement is recorded once through the renewal recorder',async()=>{const w=world();const r=await handle(note(),env(),{fetchImpl:w.fetch,warnImpl:()=>{}});assert.equal(r.status,200);assert.equal((await r.json()).code,'DOMAIN_RENEWAL_PAYMENT_RECORDED');assert.deepEqual(w.rpc.map(x=>x[0]),['domain_renewal_apply_payment_v1']);assert.equal(w.rpc[0][1].p_state,'paid');assert.equal(w.rpc[0][1].p_gross_amount_idr,285000);});
test('mismatching gateway amount is rejected before storage',async()=>{const w=world();const bad=new Request('https://ngeblogging.com/api/commerce/domains/manage/renewal/notification',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({order_id:REN,status_code:'200',gross_amount:'1000.00',transaction_id:'tx-9',currency:'IDR',merchant_id:'M1',signature_key:createHash('sha512').update(REN+'200'+'1000.00'+KEY).digest('hex')})});const r=await handle(bad,env(),{fetchImpl:w.fetch,warnImpl:()=>{}});assert.equal(r.status,409);assert.equal(w.rpc.length,0);});
test('module never touches purchase or import write paths',()=>{const s=readFileSync(new URL('./domain-renewal.mjs',import.meta.url),'utf8');assert.equal(/domain_record_production|domain_begin_|domain_observe|domain_import_|method:'(PATCH|PUT|DELETE)'/i.test(s),false);assert.equal(/console\.(log|info|error)/.test(s),false);});
