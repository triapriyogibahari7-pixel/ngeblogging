import {normalizeDomainMidtransServerKey} from './domain-midtrans-server-key.mjs';
import {parseDomainMidtransPaymentMethods} from './domain-midtrans-payment-methods.mjs';
import {domainMidtransPopupClientKey} from './domain-midtrans-presentation.mjs';
import {buildDomainReferenceSalePrice} from './domain-reference-sale-price.mjs';
import {readRegisteredDomainMetadata} from './domain-registered-metadata.mjs';
const BASE='/api/commerce/domains/manage/renewal';
const REN=/^REN-[a-f0-9]{40}$/;
const DOM=/^DOM-[a-f0-9]{40}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const TX=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const PAY=['qris','bank_transfer','echannel'];
const SUPABASE='https://polvmlrhqoiflumibfqs.supabase.co/';
const VIEW='order_id,domain_order_id,domain,price_idr,payment_state,renewal_state,paid_at,expires_at_before,expires_at_after,completed_at,created_at';
const reply=(status,code,extra={},headers={})=>new Response(JSON.stringify({code,environment:'production',...extra}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store',vary:'Authorization','x-content-type-options':'nosniff',...headers}});
function deadline(ms){const c=new AbortController();let stop;const stopped=new Promise((_,reject)=>{stop=()=>reject(Error('TIMEOUT'));c.signal.addEventListener('abort',stop,{once:true});});stopped.catch(()=>{});const timer=setTimeout(()=>c.abort(),ms);return {signal:c.signal,abort:()=>c.abort(),wait:p=>Promise.race([p,stopped]),close:()=>{clearTimeout(timer);c.signal.removeEventListener('abort',stop);}};}
async function readJson(stream,wait,limit){const reader=stream?.getReader();if(!reader)throw Error('INVALID_JSON');try{let size=0;const chunks=[];for(;;){const x=await wait(reader.read());if(x.done)break;size+=x.value.length;if(size>limit)throw Error('BODY_TOO_LARGE');chunks.push(x.value);}const bytes=new Uint8Array(size);let pos=0;for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}finally{reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}}
const tokenPair=(token,url)=>typeof token==='string'&&/^[A-Za-z0-9_-]{10,200}$/.test(token)&&['https://app.midtrans.com/snap/v2/vtweb/'+token,'https://app.midtrans.com/snap/v4/redirection/'+token].includes(url);
function money(v){if(typeof v!=='string'||!/^[1-9]\d{0,12}(?:\.0{1,2})?$/.test(v))throw Error('INVALID_AMOUNT');const n=Number(v.split('.')[0]);if(n>1000000000000)throw Error('INVALID_AMOUNT');return n;}
const view=r=>({orderId:r.order_id,domainOrderId:r.domain_order_id,domain:r.domain,amountIdr:r.price_idr,currency:'IDR',paymentState:r.payment_state,renewalState:r.renewal_state,paidAt:r.paid_at,expiresAtBefore:r.expires_at_before,expiresAtAfter:r.expires_at_after,completedAt:r.completed_at,createdAt:r.created_at});
function config(env){
 if(env?.DOMAIN_ORDER_ENV!=='production')return null;
 let base;try{base=new URL(env.SUPABASE_URL);if(base.href!==SUPABASE||!env.SUPABASE_SERVICE_ROLE_KEY)throw Error();}catch{return null;}
 return {base};
}
function payConfig(env){
 if(env.DOMAIN_PAYMENT_PRODUCTION_ENABLED!=='true')return null;
 let key;try{key=normalizeDomainMidtransServerKey(env.DOMAIN_MIDTRANS_PRODUCTION_SERVER_KEY,{environment:'production'});}catch{return null;}
 const merchant=env.DOMAIN_MIDTRANS_PRODUCTION_MERCHANT_ID;
 if(typeof merchant!=='string'||!/^[A-Za-z0-9_-]{2,100}$/.test(merchant))return null;
 return {key,merchant};
}
function storage(base,env,fetchImpl,budget){
 const h={apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY};
 const send=async(target,options)=>{const r=await budget.wait(fetchImpl(target,{...options,redirect:'manual',signal:budget.signal}));if(r.status===204)return null;if(r.status!==200)throw Error('UPSTREAM_UNAVAILABLE');return readJson(r.body,budget.wait,65536);};
 return {
  rpc:(name,args)=>send(new URL('/rest/v1/rpc/'+name,base).href,{method:'POST',headers:{...h,'content-type':'application/json'},body:JSON.stringify(args)}),
  select:async(table,params)=>{const t=new URL('/rest/v1/'+table,base);for(const [k,v] of Object.entries(params))t.searchParams.set(k,v);const rows=await send(t.href,{method:'GET',headers:h});return Array.isArray(rows)?rows:[];}
 };
}
async function sessionUser(request,env,base,fetchImpl,budget){
 const auth=request.headers.get('authorization')||'';if(!/^Bearer [^\s]{1,8192}$/.test(auth))return {res:reply(401,'AUTH_REQUIRED')};
 if(!env.SUPABASE_PUBLISHABLE_KEY)return {res:reply(503,'DOMAIN_RENEWAL_CONFIGURATION_UNAVAILABLE')};
 const v=await budget.wait(fetchImpl(new URL('/auth/v1/user',base).href,{method:'GET',redirect:'manual',headers:{authorization:auth,apikey:env.SUPABASE_PUBLISHABLE_KEY},signal:budget.signal}));
 if([401,403].includes(v.status))return {res:reply(401,'INVALID_SESSION')};if(v.status!==200)return {res:reply(503,'AUTH_UNAVAILABLE')};
 const user=await readJson(v.body,budget.wait,32768);if(typeof user?.id!=='string'||!UUID.test(user.id))return {res:reply(401,'INVALID_SESSION')};
 return {userId:user.id.toLowerCase()};
}
async function ownRenewal(db,orderId,userId){const rows=await db.select('domain_renewal_orders',{select:VIEW+',midtrans_order_id,snap_token,checkout_url',order_id:'eq.'+orderId,user_id:'eq.'+userId,limit:'1'});return rows.length===1&&rows[0].order_id===orderId?rows[0]:null;}
async function reconcile(orderId,{pay,db,budget,fetchImpl,expectTx,expectPaid}){
 const sr=await budget.wait(fetchImpl('https://api.midtrans.com/v2/'+encodeURIComponent(orderId)+'/status',{method:'GET',redirect:'manual',headers:{authorization:'Basic '+btoa(pay.key+':'),accept:'application/json'},signal:budget.signal}));
 if(sr.status===404)return {kind:'pending'};
 if(sr.status!==200)throw Error('UPSTREAM_UNAVAILABLE');
 const g=await readJson(sr.body,budget.wait,32768);
 if(g?.status_code==='404')return {kind:'pending'};
 if(g?.order_id!==orderId||g.currency!=='IDR'||g.merchant_id!==pay.merchant||typeof g.transaction_id!=='string'||!TX.test(g.transaction_id)||(expectTx&&g.transaction_id!==expectTx))return {kind:'mismatch'};
 let paid;try{paid=money(g.gross_amount);}catch{return {kind:'mismatch'};}
 if(expectPaid!==undefined&&paid!==expectPaid)return {kind:'mismatch'};
 const rows=await db.select('domain_renewal_orders',{select:'order_id,midtrans_order_id',order_id:'eq.'+orderId,limit:'1'});
 const o=rows.length===1?rows[0]:null;if(!o)return {kind:'missing'};
 if(o.midtrans_order_id!==orderId)return {kind:'review',reason:'order_not_checked_out'};
 if((g.refund_amount!==undefined&&(typeof g.refund_amount!=='string'||!/^0(?:\.0{1,2})?$/.test(g.refund_amount)))||(g.refunds!==undefined&&(!Array.isArray(g.refunds)||g.refunds.length>0)))return {kind:'review',reason:'refund_metadata'};
 const st=g.transaction_status;let state;
 if(['pending','authorize'].includes(st))return {kind:'pending'};
 if(['deny','cancel','expire','failure'].includes(st))state='failed';
 else if(g.status_code==='200'&&st==='settlement'&&PAY.includes(g.payment_type)&&(g.fraud_status===undefined||g.fraud_status==='accept'))state='paid';
 else return {kind:'review',reason:'gateway_state'};
 const res=await db.rpc('domain_renewal_apply_payment_v1',{p_order_id:orderId,p_transaction_id:g.transaction_id,p_gross_amount_idr:paid,p_state:state});
 if(state==='paid'&&(res==='paid'||res==='already_paid'))return {kind:'paid',already:res==='already_paid'};
 if(state==='failed'&&['failed','ignored'].includes(res))return {kind:'failed'};
 return {kind:'review',reason:'recorder_'+String(res)};
}
async function createOrder(request,env,ctx){
 const {base,fetchImpl,budget}=ctx;
 let b;try{b=await readJson(request.body,budget.wait,1024);}catch{return reply(400,'INVALID_BODY');}
 if(!b||Array.isArray(b)||Object.keys(b).length!==1||typeof b.orderId!=='string'||!DOM.test(b.orderId))return reply(400,'INVALID_RENEWAL_REQUEST');
 const s=await sessionUser(request,env,base,fetchImpl,budget);if(s.res)return s.res;const owner=s.userId,db=storage(base,env,fetchImpl,budget);
 const os=await db.select('domain_purchase_orders',{select:'order_id,user_id,quote_id,environment,currency,amount_idr,payment_state,registration_state,midtrans_transaction_id,paid_at,registered_at,registrar_domain_ref,review_reason',order_id:'eq.'+b.orderId,user_id:'eq.'+owner,environment:'eq.production',limit:'2'});
 if(!os.length)return reply(404,'DOMAIN_ORDER_NOT_FOUND');
 const o=os.length===1?os[0]:null;if(!o||o.order_id!==b.orderId||o.user_id!==owner||!UUID.test(o.quote_id||''))return reply(503,'RENEWAL_DOMAIN_UNVERIFIED');
 if(o.payment_state!=='paid'||o.registration_state!=='registered'||o.review_reason!==null)return reply(409,'DOMAIN_NOT_RENEWABLE');
 const qs=await db.select('domain_sale_quotes',{select:'id,user_id,environment,domain,currency,sale_price_idr,provider_id,registrar_cost_idr',id:'eq.'+o.quote_id,user_id:'eq.'+owner,environment:'eq.production',limit:'2'});
 const q=qs.length===1?qs[0]:null;
 if(!q||q.id!==o.quote_id||q.provider_id!=='cloudflare'||!Number.isSafeInteger(q.registrar_cost_idr)||q.registrar_cost_idr<=0)return reply(503,'RENEWAL_DOMAIN_UNVERIFIED');
 const meta=await readRegisteredDomainMetadata(env,o,q,{owner,fetchImpl,signal:budget.signal});
 if(meta.status!=='observed'||typeof meta.expiresAt!=='string')return reply(503,'RENEWAL_DOMAIN_UNVERIFIED');
 let price;try{price=buildDomainReferenceSalePrice({referenceRegistrarCostIdr:q.registrar_cost_idr});}catch{return reply(503,'RENEWAL_PRICE_UNAVAILABLE');}
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('renewal:'+owner+':'+b.orderId+':'+crypto.randomUUID()));
 const id='REN-'+Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('').slice(0,40);
 const got=await db.rpc('domain_renewal_create_v1',{p_user_id:owner,p_order_id:id,p_domain_order_id:b.orderId,p_domain:q.domain,p_price_idr:price.amountIdr,p_expires_before:meta.expiresAt});
 if(typeof got!=='string'||!REN.test(got))throw Error('RENEWAL_CREATE_UNCONFIRMED');
 const row=await ownRenewal(db,got,owner);if(!row)throw Error('RENEWAL_CREATE_UNCONFIRMED');
 return reply(got===id?201:200,'DOMAIN_RENEWAL_ORDER',{reused:got!==id,order:view(row)});
}
async function listOrders(request,env,ctx){
 const {base,fetchImpl,budget}=ctx;const s=await sessionUser(request,env,base,fetchImpl,budget);if(s.res)return s.res;
 const db=storage(base,env,fetchImpl,budget);
 const rows=await db.select('domain_renewal_orders',{select:VIEW,user_id:'eq.'+s.userId,order:'created_at.desc,order_id.desc',limit:'50'});
 return reply(200,'DOMAIN_RENEWAL_ORDERS',{orders:rows.map(view)});
}
async function checkout(request,url,env,ctx){
 const {base,fetchImpl,budget,now}=ctx;const pay=payConfig(env);let methods;
 if(!pay)return reply(503,'DOMAIN_RENEWAL_PAYMENT_NOT_READY');
 try{methods=parseDomainMidtransPaymentMethods(env.DOMAIN_MIDTRANS_PRODUCTION_PAYMENT_METHODS_JSON);}catch{return reply(503,'DOMAIN_RENEWAL_PAYMENT_NOT_READY');}
 let b;try{b=await readJson(request.body,budget.wait,1024);}catch{return reply(400,'INVALID_BODY');}
 if(!b||Array.isArray(b)||Object.keys(b).length!==1||typeof b.orderId!=='string'||!REN.test(b.orderId))return reply(400,'INVALID_CHECKOUT_REQUEST');
 const s=await sessionUser(request,env,base,fetchImpl,budget);if(s.res)return s.res;const db=storage(base,env,fetchImpl,budget);
 const o=await ownRenewal(db,b.orderId,s.userId);if(!o)return reply(404,'RENEWAL_ORDER_NOT_FOUND');
 if(o.payment_state==='paid')return reply(409,'RENEWAL_ORDER_ALREADY_PAID');
 if(o.renewal_state!=='created')return reply(409,'RENEWAL_ORDER_NOT_PAYABLE');
 if(!Number.isSafeInteger(o.price_idr)||o.price_idr<=0)return reply(409,'RENEWAL_PRICE_NOT_SET');
 const out=(token,link)=>({orderId:o.order_id,currency:'IDR',amountIdr:o.price_idr,url:link,snapToken:token,clientKey:domainMidtransPopupClientKey(env,true)});
 if(o.payment_state==='pending'){if(!tokenPair(o.snap_token,o.checkout_url))throw Error('CHECKOUT_REUSE_UNVERIFIED');return reply(200,'DOMAIN_RENEWAL_CHECKOUT',{reused:true,checkout:out(o.snap_token,o.checkout_url)});}
 if(o.payment_state!=='unpaid')return reply(409,'RENEWAL_ORDER_NOT_PAYABLE');
 const start=new Date(now()+25200000).toISOString().slice(0,19).replace('T',' ')+' +0700';
 ctx.snapAttempted=true;
 const r=await budget.wait(fetchImpl('https://app.midtrans.com/snap/v1/transactions',{method:'POST',redirect:'manual',headers:{authorization:'Basic '+btoa(pay.key+':'),accept:'application/json','content-type':'application/json','X-Override-Notification':url.origin+BASE+'/notification'},body:JSON.stringify({transaction_details:{order_id:o.order_id,gross_amount:o.price_idr},enabled_payments:methods,customer_imposed_payment_fee:{enable:false},expiry:{start_time:start,unit:'minutes',duration:120}}),signal:budget.signal}));
 if(r.status!==201)throw Error('SNAP_RESULT_UNCLEAR');const sn=await readJson(r.body,budget.wait,8192);if(!tokenPair(sn?.token,sn?.redirect_url))throw Error('SNAP_RESULT_UNCLEAR');
 await db.rpc('domain_renewal_start_checkout_v1',{p_user_id:s.userId,p_order_id:o.order_id,p_snap_token:sn.token,p_checkout_url:sn.redirect_url});
 return reply(201,'DOMAIN_RENEWAL_CHECKOUT',{reused:false,checkout:out(sn.token,sn.redirect_url)});
}
async function paymentStatus(request,env,ctx){
 const {base,fetchImpl,budget}=ctx;const pay=payConfig(env);if(!pay)return reply(503,'DOMAIN_RENEWAL_PAYMENT_NOT_READY');
 let b;try{b=await readJson(request.body,budget.wait,1024);}catch{return reply(400,'INVALID_BODY');}
 if(!b||Array.isArray(b)||Object.keys(b).length!==1||typeof b.orderId!=='string'||!REN.test(b.orderId))return reply(400,'INVALID_STATUS_REQUEST');
 const s=await sessionUser(request,env,base,fetchImpl,budget);if(s.res)return s.res;const db=storage(base,env,fetchImpl,budget);
 const o=await ownRenewal(db,b.orderId,s.userId);if(!o)return reply(404,'RENEWAL_ORDER_NOT_FOUND');
 if(o.payment_state==='paid'||o.payment_state==='failed'||o.payment_state==='unpaid')return reply(200,'DOMAIN_RENEWAL_STATUS',{checkedWithGateway:false,order:view(o)});
 const r=await reconcile(o.order_id,{pay,db,budget,fetchImpl,expectPaid:o.price_idr});
 if(r.kind==='mismatch'||r.kind==='review'||r.kind==='missing')return reply(409,'DOMAIN_RENEWAL_PAYMENT_REVIEW_REQUIRED');
 const fresh=await ownRenewal(db,o.order_id,s.userId);
 return reply(200,'DOMAIN_RENEWAL_STATUS',{checkedWithGateway:true,order:view(fresh||o)});
}
async function notification(request,env,ctx){
 const {base,fetchImpl,budget,warnImpl}=ctx;const pay=payConfig(env);if(!pay)return reply(503,'DOMAIN_RENEWAL_PAYMENT_NOT_READY');
 let orderId=null,signed=false,phase='body';
 const review=reason=>{try{warnImpl({event:'domain_renewal_payment_review',reason,order_id:orderId,signed});}catch{}return reply(503,'DOMAIN_RENEWAL_PAYMENT_REVIEW_REQUIRED');};
 try{
  const n=await readJson(request.body,budget.wait,32768);let paid;
  try{if(!n||Array.isArray(n)||typeof n.order_id!=='string'||!REN.test(n.order_id)||typeof n.status_code!=='string'||!/^\d{3}$/.test(n.status_code)||typeof n.signature_key!=='string'||!/^[a-f0-9]{128}$/i.test(n.signature_key)||typeof n.transaction_id!=='string'||!TX.test(n.transaction_id)||n.currency!=='IDR'||n.merchant_id!==pay.merchant)throw Error();paid=money(n.gross_amount);}catch{return reply(400,'INVALID_NOTIFICATION');}
  orderId=n.order_id;phase='signature';
  const bytes=await budget.wait(crypto.subtle.digest('SHA-512',new TextEncoder().encode(n.order_id+n.status_code+n.gross_amount+pay.key)));
  const expected=Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join(''),given=n.signature_key.toLowerCase();let diff=0;for(let i=0;i<128;i++)diff|=expected.charCodeAt(i)^given.charCodeAt(i);if(diff)return reply(401,'INVALID_SIGNATURE');signed=true;
  phase='status';const db=storage(base,env,fetchImpl,budget);
  const r=await reconcile(orderId,{pay,db,budget,fetchImpl,expectTx:n.transaction_id,expectPaid:paid});
  if(r.kind==='mismatch')return reply(409,'DOMAIN_RENEWAL_PAYMENT_IDENTITY_MISMATCH');
  if(r.kind==='missing')return reply(404,'RENEWAL_ORDER_NOT_FOUND');
  if(r.kind==='review')return review(r.reason);
  if(r.kind==='pending')return reply(200,'DOMAIN_RENEWAL_PAYMENT_PENDING',{recordingConfirmed:false});
  if(r.kind==='paid')return reply(200,'DOMAIN_RENEWAL_PAYMENT_RECORDED',{recordingConfirmed:true,alreadyRecorded:r.already});
  return reply(200,'DOMAIN_RENEWAL_PAYMENT_STATUS_RECORDED',{recordingConfirmed:false,paymentState:'failed'});
 }catch(e){if(phase==='body'&&!budget.signal.aborted)return reply(e?.message==='BODY_TOO_LARGE'?413:400,e?.message==='BODY_TOO_LARGE'?'BODY_TOO_LARGE':'INVALID_NOTIFICATION');return review(phase==='status'?'status_unavailable':'storage_unavailable');}
}
export async function domainRenewalResponse(request,env,{fetchImpl=globalThis.fetch,now=()=>Date.now(),warnImpl=x=>console.warn(JSON.stringify(x))}={}){
 const url=new URL(request.url);
 if(!url.pathname.startsWith(BASE+'/'))return null;
 const sub=url.pathname.slice(BASE.length);
 const routes={'/orders':{GET:'list',POST:'create'},'/checkout':{POST:'checkout'},'/payment-status':{POST:'status'},'/notification':{POST:'notification'}};
 const route=routes[sub];if(!route)return reply(404,'NOT_FOUND');
 const action=route[request.method];if(!action)return reply(405,'METHOD_NOT_ALLOWED',{},{allow:Object.keys(route).join(', ')});
 if(url.protocol!=='https:'||url.hostname!=='ngeblogging.com'||url.port||url.search)return reply(404,'NOT_FOUND');
 const hook=action==='notification';
 if(!hook){
  if(env?.DOMAIN_RENEWAL_ENABLED!=='true')return reply(503,'DOMAIN_RENEWAL_DISABLED');
  if(request.method!=='GET'&&request.headers.get('origin')!==url.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
  if(request.headers.has('origin')&&request.headers.get('origin')!==url.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
 }
 if(request.method==='POST'&&!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('content-type')||''))return reply(415,'JSON_REQUIRED');
 const cfg=config(env);if(!cfg)return reply(503,'DOMAIN_RENEWAL_CONFIGURATION_UNAVAILABLE');
 const budget=deadline(hook?10000:20000),abort=()=>budget.abort();request.signal?.addEventListener('abort',abort,{once:true});
 const ctx={base:cfg.base,fetchImpl,budget,now,warnImpl,snapAttempted:false};
 try{
  if(action==='list')return await listOrders(request,env,ctx);
  if(action==='create')return await createOrder(request,env,ctx);
  if(action==='checkout')return await checkout(request,url,env,ctx);
  if(action==='status')return await paymentStatus(request,env,ctx);
  return await notification(request,env,ctx);
 }catch{
  if(ctx.snapAttempted){try{warnImpl({event:'domain_renewal_checkout_reconciliation'});}catch{}return reply(503,'RENEWAL_CHECKOUT_RECONCILIATION_REQUIRED');}
  return reply(503,hook?'DOMAIN_RENEWAL_PAYMENT_REVIEW_REQUIRED':'DOMAIN_RENEWAL_UNAVAILABLE');
 }finally{budget.close();request.signal?.removeEventListener('abort',abort);}
}
