import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {domainImportPaymentStatusResponse as handle} from './domain-import-payment-status.mjs';
import {domainImportRouterResponse as route} from './domain-import-router.mjs';
const ID='IMP-'+'a'.repeat(40),USER='11111111-2222-3333-4444-555555555555',KEY='Mid-server-'+'k'.repeat(20);
const env=(x={})=>({DOMAIN_IMPORT_ENABLED:'true',DOMAIN_PAYMENT_PRODUCTION_ENABLED:'true',DOMAIN_ORDER_ENV:'production',DOMAIN_MIDTRANS_PRODUCTION_SERVER_KEY:KEY,DOMAIN_MIDTRANS_PRODUCTION_MERCHANT_ID:'M1',SUPABASE_URL:'https://polvmlrhqoiflumibfqs.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'srv',SUPABASE_PUBLISHABLE_KEY:'pub',...x});
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s});
const pending=(o={})=>({order_id:ID,price_idr:30000,payment_state:'pending',import_state:'created',midtrans_order_id:ID,...o});
function world(o={}){
 const calls={rpc:[],status:0};const order=o.order===undefined?pending():o.order;
 const f=async(u,opt={})=>{const t=new URL(String(u));
  if(t.pathname==='/auth/v1/user')return J({id:USER});
  if(t.pathname==='/rest/v1/domain_import_orders'){if(o.readFail)return J({},500);return J(order&&t.searchParams.get('user_id')==='eq.'+(o.owner??USER)?[order]:[]);}
  if(t.pathname.startsWith('/rest/v1/rpc/')){calls.rpc.push(JSON.parse(opt.body));if(o.rpcFail)return J({},500);return J(o.rpcResult??'paid');}
  if(t.hostname==='api.midtrans.com'){calls.status++;if(o.gwDown)return J({},503);if(o.gw404)return J({status_code:'404',status_message:'not found'},404);if(o.gw404Body)return J({status_code:'404'});return J({order_id:ID,transaction_id:'tx-1',currency:'IDR',merchant_id:'M1',gross_amount:'30000.00',status_code:'200',transaction_status:'settlement',payment_type:'qris',fraud_status:'accept',...o.gateway});}
  throw Error('unexpected '+t);};
 return {f,calls};
}
const req=(b={orderId:ID},h={})=>new Request('https://ngeblogging.com/api/commerce/domains/manage/import/payment-status',{method:'POST',headers:{origin:'https://ngeblogging.com',authorization:'Bearer t','content-type':'application/json',...h},body:JSON.stringify(b)});
const run=(r,e,w)=>handle(r,e,{fetchImpl:w.f,warnImpl:()=>{}});
test('other paths are not handled',async()=>{assert.equal(await handle(new Request('https://ngeblogging.com/api/commerce/domains/manage/import/checkout',{method:'POST'}),env(),{}),null);});
test('gates',async()=>{const w=world();assert.equal((await run(req(),env({DOMAIN_IMPORT_ENABLED:'false'}),w)).status,503);assert.equal((await run(req(undefined,{origin:'https://evil.test'}),env(),w)).status,403);assert.equal((await run(req(undefined,{authorization:''}),env(),w)).status,401);assert.equal((await run(req({orderId:'DOM-'+'a'.repeat(40)}),env(),w)).status,400);assert.equal((await run(req(),env({DOMAIN_MIDTRANS_PRODUCTION_SERVER_KEY:'x'}),w)).status,503);assert.equal(w.calls.status+w.calls.rpc.length,0);});
test('foreign or unknown order is 404 and never reaches Midtrans',async()=>{const w=world({owner:'99999999-2222-3333-4444-555555555555'});assert.equal((await run(req(),env(),w)).status,404);assert.equal(w.calls.status,0);});
test('paid, unpaid and failed orders are reported without calling Midtrans',async()=>{for(const s of ['paid','unpaid','failed']){const w=world({order:pending({payment_state:s})});const r=await run(req(),env(),w);assert.equal(r.status,200);const b=await r.json();assert.equal(b.paymentState,s);assert.equal(b.checkedWithGateway,false);assert.equal(w.calls.status+w.calls.rpc.length,0);}});
test('late settlement is recorded with the amount from our own order',async()=>{const w=world();const r=await run(req(),env(),w);assert.equal(r.status,200);assert.equal((await r.json()).paymentState,'paid');assert.equal(w.calls.status,1);assert.deepEqual(w.calls.rpc,[{p_order_id:ID,p_transaction_id:'tx-1',p_gross_amount_idr:30000,p_state:'paid'}]);});
test('still pending or no transaction yet changes nothing',async()=>{for(const o of [{gateway:{transaction_status:'pending',status_code:'201'}},{gw404:true},{gw404Body:true}]){const w=world(o);const r=await run(req(),env(),w);assert.equal(r.status,200);assert.equal((await r.json()).paymentState,'pending');assert.equal(w.calls.rpc.length,0);}});
test('expired transaction marks the order failed',async()=>{const w=world({gateway:{transaction_status:'expire',status_code:'407'},rpcResult:'failed'});const r=await run(req(),env(),w);assert.equal(r.status,200);assert.equal((await r.json()).paymentState,'failed');assert.equal(w.calls.rpc[0].p_state,'failed');});
test('identity or amount mismatch is rejected before storage',async()=>{for(const g of [{merchant_id:'OTHER'},{gross_amount:'1000.00'},{transaction_id:'bad id'},{order_id:'IMP-'+'b'.repeat(40)},{currency:'USD'}]){const w=world({gateway:g});const r=await run(req(),env(),w);assert.equal(r.status,409);assert.equal(w.calls.rpc.length,0);}});
test('refund, odd gateway state and recorder refusals need review',async()=>{for(const o of [{gateway:{refund_amount:'100.00'}},{gateway:{fraud_status:'challenge'}},{gateway:{payment_type:'credit_card'}},{rpcResult:'amount_mismatch'},{rpcResult:'conflict'}]){const w=world(o);const r=await run(req(),env(),w);assert.equal(r.status,503);assert.equal((await r.json()).code,'DOMAIN_IMPORT_PAYMENT_REVIEW_REQUIRED');}});
test('pending order that was never checked out is held for review',async()=>{const w=world({order:pending({midtrans_order_id:null})});assert.equal((await run(req(),env(),w)).status,503);assert.equal(w.calls.status+w.calls.rpc.length,0);});
test('gateway or storage outage is a plain 503 and records nothing',async()=>{let w=world({gwDown:true});let r=await run(req(),env(),w);assert.equal(r.status,503);assert.equal((await r.json()).code,'IMPORT_PAYMENT_STATUS_UNAVAILABLE');assert.equal(w.calls.rpc.length,0);w=world({readFail:true});assert.equal((await run(req(),env(),w)).status,503);assert.equal(w.calls.status,0);});
test('router reaches the status module for payment-status without zone guard',async()=>{let zone=0,status=0;const deps={fetchImpl:world().f,zoneExists:async()=>{zone++;return true;},orders:async()=>null,payment:async()=>null,status:async()=>{status++;return new Response('{}',{status:200});},zone:async()=>null};const r=await route(req(),env(),deps);assert.equal(r.status,200);assert.equal(status,1);assert.equal(zone,0);});
test('module never touches purchase tables or purchase RPCs',()=>{const s=readFileSync(new URL('./domain-import-payment-status.mjs',import.meta.url),'utf8');assert.equal(/domain_purchase|domain_record_production|domain_begin_|domain_observe|DOMAIN_CUSTOMER_PRODUCTION|cloudflare/i.test(s),false);});
