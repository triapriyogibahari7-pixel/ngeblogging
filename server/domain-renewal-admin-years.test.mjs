import test from 'node:test';
import assert from 'node:assert/strict';
import {domainRenewalAdminResponse as handle} from './domain-renewal-admin.mjs';
const ADMIN='91d4b436-6d7a-4e46-93f5-1ecdc6d33fb3',USER='11111111-2222-3333-4444-555555555555',DOM='DOM-'+'a'.repeat(40),REN='REN-'+'b'.repeat(40),QUOTE='22222222-3333-4444-5555-666666666666';
const env={DOMAIN_CUSTOMER_PRODUCTION_ENABLED:'true',DOMAIN_PAYMENT_PRODUCTION_ENABLED:'true',DOMAIN_ORDER_ENV:'production',SUPABASE_URL:'https://polvmlrhqoiflumibfqs.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'srv',SUPABASE_PUBLISHABLE_KEY:'pub'};
const J=o=>new Response(JSON.stringify(o),{status:200,headers:{'content-type':'application/json'}});
const admin={id:ADMIN,email:'triapriyogibahari7@gmail.com',email_confirmed_at:'2026-01-01T00:00:00Z'};
const row=x=>({order_id:REN,user_id:USER,domain_order_id:DOM,domain:'example.com',price_idr:1005000,years:3,payment_state:'paid',renewal_state:'awaiting_admin',paid_at:'2026-11-26T00:00:00Z',expires_at_before:'2027-01-05T00:00:00Z',expires_at_after:null,completed_at:null,created_at:'2026-11-26T00:00:00Z',review_reason:null,...x});
function world(r){const w={rpc:[]};w.fetch=async(href,init={})=>{const u=new URL(href);
 if(u.pathname==='/auth/v1/user')return J(admin);
 if(u.pathname==='/rest/v1/domain_renewal_orders')return J([r]);
 if(u.pathname==='/rest/v1/domain_purchase_orders')return J([{order_id:DOM,user_id:USER,quote_id:QUOTE}]);
 if(u.pathname==='/rest/v1/domain_sale_quotes')return J([{id:QUOTE,user_id:USER,domain:'example.com'}]);
 if(u.pathname.endsWith('/domain_renewal_complete_v1')){w.rpc.push(JSON.parse(init.body));return J('completed');}
 throw Error('unexpected '+href);};return w;}
const req=(path,method='GET',body)=>new Request('https://ngeblogging.com/api/commerce/domains/manage/renewal-admin'+path,{method,headers:{authorization:'Bearer t',origin:'https://ngeblogging.com',...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
const meta=expiresAt=>async()=>({status:'observed',expiresAt});
const complete=(r,expiresAt)=>{const w=world(r);return handle(req('/complete','POST',{orderId:REN}),env,{fetchImpl:w.fetch,readMetadata:meta(expiresAt)}).then(res=>({res,w}));};
test('three-year order is not completed after only one year was added',async()=>{const {res,w}=await complete(row(),'2028-01-05T00:00:00Z');assert.equal(res.status,409);const b=await res.json();assert.equal(b.code,'RENEWAL_NOT_YET_EXTENDED');assert.equal(b.years,3);assert.equal(w.rpc.length,0);});
test('three-year order completes once the registrar added about three years',async()=>{const {res,w}=await complete(row(),'2030-01-05T00:00:00Z');assert.equal(res.status,200);const b=await res.json();assert.equal(b.code,'DOMAIN_RENEWAL_COMPLETED');assert.equal(b.years,3);assert.equal(w.rpc.length,1);assert.equal(w.rpc[0].p_expires_after,'2030-01-05T00:00:00Z');});
test('ten-year order is not completed after three years',async()=>{const {res,w}=await complete(row({years:10}),'2030-01-05T00:00:00Z');assert.equal(res.status,409);assert.equal(w.rpc.length,0);});
test('one-year order keeps the previous rule',async()=>{const a=await complete(row({years:1}),'2027-06-01T00:00:00Z');assert.equal(a.res.status,409);const b=await complete(row({years:1}),'2028-01-05T00:00:00Z');assert.equal(b.res.status,200);});
test('order without years is treated as one year',async()=>{const x=row();delete x.years;const {res}=await complete(x,'2028-01-05T00:00:00Z');assert.equal(res.status,200);});
test('unsupported years value never completes',async()=>{const {res,w}=await complete(row({years:5}),'2040-01-05T00:00:00Z');assert.equal(res.status,503);assert.equal(w.rpc.length,0);});
test('admin queue shows the number of years',async()=>{const w=world(row());const r=await handle(req('/orders'),env,{fetchImpl:w.fetch});assert.equal(r.status,200);assert.equal((await r.json()).orders[0].years,3);});
