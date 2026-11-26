import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {domainRenewalAdminResponse as handle} from './domain-renewal-admin.mjs';
const ADMIN='91d4b436-6d7a-4e46-93f5-1ecdc6d33fb3',USER='11111111-2222-3333-4444-555555555555',DOM='DOM-'+'a'.repeat(40),REN='REN-'+'b'.repeat(40),QUOTE='22222222-3333-4444-5555-666666666666';
const env=(x={})=>({DOMAIN_CUSTOMER_PRODUCTION_ENABLED:'true',DOMAIN_PAYMENT_PRODUCTION_ENABLED:'true',DOMAIN_ORDER_ENV:'production',SUPABASE_URL:'https://polvmlrhqoiflumibfqs.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'srv',SUPABASE_PUBLISHABLE_KEY:'pub',...x});
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json'}});
const admin={id:ADMIN,email:'triapriyogibahari7@gmail.com',email_confirmed_at:'2026-01-01T00:00:00Z'};
const row=(x={})=>({order_id:REN,user_id:USER,domain_order_id:DOM,domain:'example.com',price_idr:285000,payment_state:'paid',renewal_state:'awaiting_admin',paid_at:'2026-11-26T00:00:00Z',expires_at_before:'2027-01-05T00:00:00Z',expires_at_after:null,completed_at:null,created_at:'2026-11-26T00:00:00Z',review_reason:null,...x});
function world(o={}){const w={rpc:[],paths:[]};w.fetch=async(href,init={})=>{const u=new URL(href);w.paths.push(init.method+' '+u.pathname);
 if(u.pathname==='/auth/v1/user')return J(o.user??admin);
 if(u.pathname==='/rest/v1/domain_renewal_orders')return J(o.rows??[row()]);
 if(u.pathname==='/rest/v1/domain_purchase_orders')return J([{order_id:DOM,user_id:USER,quote_id:QUOTE}]);
 if(u.pathname==='/rest/v1/domain_sale_quotes')return J([{id:QUOTE,user_id:USER,domain:'example.com'}]);
 if(u.pathname.endsWith('/domain_renewal_complete_v1')){w.rpc.push(JSON.parse(init.body));return J(o.rpcResult??'completed');}
 throw Error('unexpected '+href);};return w;}
const req=(path,method='GET',body)=>new Request('https://ngeblogging.com/api/commerce/domains/manage/renewal-admin'+path,{method,headers:{authorization:'Bearer t',origin:'https://ngeblogging.com',...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
const meta=expiresAt=>async()=>({status:'observed',expiresAt});
test('non-admin is rejected before any order lookup',async()=>{const w=world({user:{...admin,id:USER}});const r=await handle(req('/orders'),env(),{fetchImpl:w.fetch});assert.equal(r.status,403);assert.equal((await r.json()).code,'ADMIN_REQUIRED');assert.equal(w.paths.length,1);});
test('unconfirmed admin email is rejected',async()=>{const w=world({user:{...admin,email_confirmed_at:null}});const r=await handle(req('/orders'),env(),{fetchImpl:w.fetch});assert.equal(r.status,403);});
test('disabled flag blocks admin routes',async()=>{const w=world();const r=await handle(req('/orders'),env({DOMAIN_CUSTOMER_PRODUCTION_ENABLED:undefined}),{fetchImpl:w.fetch});assert.equal(r.status,503);assert.equal(w.paths.length,0);});
test('admin lists the queue',async()=>{const w=world();const r=await handle(req('/orders'),env(),{fetchImpl:w.fetch});assert.equal(r.status,200);const b=await r.json();assert.equal(b.orders.length,1);assert.equal(b.orders[0].orderId,REN);});
test('completion refused while registrar expiry has not moved',async()=>{const w=world();const r=await handle(req('/complete','POST',{orderId:REN}),env(),{fetchImpl:w.fetch,readMetadata:meta('2027-01-05T00:00:00Z')});assert.equal(r.status,409);assert.equal((await r.json()).code,'RENEWAL_NOT_YET_EXTENDED');assert.equal(w.rpc.length,0);});
test('completion records the registrar expiry once it moved a year',async()=>{const w=world();const r=await handle(req('/complete','POST',{orderId:REN}),env(),{fetchImpl:w.fetch,readMetadata:meta('2028-01-05T00:00:00Z')});assert.equal(r.status,200);assert.equal((await r.json()).code,'DOMAIN_RENEWAL_COMPLETED');assert.equal(w.rpc.length,1);assert.equal(w.rpc[0].p_order_id,REN);assert.equal(w.rpc[0].p_expires_after,'2028-01-05T00:00:00Z');});
test('only paid orders awaiting admin can be completed',async()=>{for(const x of [{renewal_state:'created'},{payment_state:'unpaid'},{renewal_state:'review_required'}]){const w=world({rows:[row(x)]});const r=await handle(req('/complete','POST',{orderId:REN}),env(),{fetchImpl:w.fetch,readMetadata:meta('2028-01-05T00:00:00Z')});assert.equal(r.status,409);assert.equal(w.rpc.length,0);}});
test('unreadable registrar state never completes',async()=>{const w=world();const r=await handle(req('/complete','POST',{orderId:REN}),env(),{fetchImpl:w.fetch,readMetadata:async()=>({status:'unavailable'})});assert.equal(r.status,503);assert.equal(w.rpc.length,0);});
test('admin module never touches purchase or import write paths',()=>{const s=readFileSync(new URL('./domain-renewal-admin.mjs',import.meta.url),'utf8');assert.equal(/domain_record_production|domain_begin_|domain_observe|domain_import_|method:'(PATCH|PUT|DELETE)'/i.test(s),false);});
