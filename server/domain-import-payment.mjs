import {normalizeDomainMidtransServerKey} from './domain-midtrans-server-key.mjs';
import {parseDomainMidtransPaymentMethods} from './domain-midtrans-payment-methods.mjs';
import {domainMidtransPopupClientKey} from './domain-midtrans-presentation.mjs';
const BASE='/api/commerce/domains/manage/import';
const ORDER=/^IMP-[a-f0-9]{40}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const TX=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const PAY=['qris','bank_transfer','echannel'];
const SUPABASE='https://polvmlrhqoiflumibfqs.supabase.co/';
const reply=(status,code,extra={})=>new Response(JSON.stringify({code,environment:'production',...extra}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...(status===405?{allow:'POST'}:{})}});
function deadline(ms){const c=new AbortController();let stop;const stopped=new Promise((_,reject)=>{stop=()=>reject(Error('TIMEOUT'));c.signal.addEventListener('abort',stop,{once:true});});const timer=setTimeout(()=>c.abort(),ms);return {signal:c.signal,abort:()=>c.abort(),wait:p=>Promise.race([p,stopped]),close:()=>{clearTimeout(timer);c.signal.removeEventListener('abort',stop);}};}
async function readJson(stream,wait,limit){const reader=stream?.getReader();if(!reader)throw Error('INVALID_JSON');try{let size=0;const chunks=[];for(;;){const x=await wait(reader.read());if(x.done)break;size+=x.value.length;if(size>limit)throw Error('BODY_TOO_LARGE');chunks.push(x.value);}const bytes=new Uint8Array(size);let pos=0;for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}finally{reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}}
function tokenPair(token,url){return typeof token==='string'&&/^[A-Za-z0-9_-]{10,200}$/.test(token)&&['https://app.midtrans.com/snap/v2/vtweb/'+token,'https://app.midtrans.com/snap/v4/redirection/'+token].includes(url);}
function money(v){if(typeof v!=='string'||!/^[1-9]\d{0,12}(?:\.0{1,2})?$/.test(v))throw Error('INVALID_AMOUNT');const n=Number(v.split('.')[0]);if(n>1000000000000)throw Error('INVALID_AMOUNT');return n;}
function precheck(request,url,env){
 if(url.protocol!=='https:'||url.hostname!=='ngeblogging.com'||url.port)return {res:reply(404,'NOT_FOUND')};
 if(request.method!=='POST')return {res:reply(405,'METHOD_NOT_ALLOWED')};
 if(url.search)return {res:reply(400,'QUERY_NOT_ALLOWED')};
 if(env?.DOMAIN_IMPORT_ENABLED!=='true')return {res:reply(503,'DOMAIN_IMPORT_DISABLED')};
 if(env.DOMAIN_PAYMENT_PRODUCTION_ENABLED!=='true'||env.DOMAIN_ORDER_ENV!=='production')return {res:reply(503,'DOMAIN_IMPORT_PAYMENT_NOT_READY')};
 if(!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('content-type')||''))return {res:reply(415,'JSON_REQUIRED')};
 const unavailable=()=>({res:reply(503,'DOMAIN_IMPORT_CONFIGURATION_UNAVAILABLE',{configurationUnavailable:true})});
 let key;try{key=normalizeDomainMidtransServerKey(env.DOMAIN_MIDTRANS_PRODUCTION_SERVER_KEY,{environment:'production'});}catch{return unavailable();}
 const merchant=env.DOMAIN_MIDTRANS_PRODUCTION_MERCHANT_ID;
 if(typeof merchant!=='string'||!/^[A-Za-z0-9_-]{2,100}$/.test(merchant)||typeof env.SUPABASE_SERVICE_ROLE_KEY!=='string'||!env.SUPABASE_SERVICE_ROLE_KEY)return unavailable();
 let base;try{base=new URL(env.SUPABASE_URL);if(base.href!==SUPABASE)throw Error();}catch{return unavailable();}
 return {key,merchant,base,unavailable};
}
function storage(base,env,fetchImpl,budget){
 const h={apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY};
 const send=async(target,options)=>{const r=await budget.wait(fetchImpl(target,{...options,redirect:'manual',signal:budget.signal}));if(r.status===204)return null;if(r.status!==200)throw Error('UPSTREAM_UNAVAILABLE');return readJson(r.body,budget.wait,32768);};
 return {
  rpc:(name,args)=>send(new URL('/rest/v1/rpc/'+name,base).href,{method:'POST',headers:{...h,'content-type':'application/json'},body:JSON.stringify(args)}),
  order:async(orderId,userId)=>{const t=new URL('/rest/v1/domain_import_orders',base);t.searchParams.set('select','order_id,user_id,mode,price_idr,payment_state,import_state,midtrans_order_id,snap_token,checkout_url');t.searchParams.set('order_id','eq.'+orderId);if(userId)t.searchParams.set('user_id','eq.'+userId);t.searchParams.set('limit','1');const rows=await send(t.href,{method:'GET',headers:h});return Array.isArray(rows)&&rows.length===1&&rows[0].order_id===orderId?rows[0]:null;}
 };
}
async function checkout(request,url,env,{fetchImpl,now,warnImpl}){
 if(request.headers.get('origin')!==url.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
 const p=precheck(request,url,env);if(p.res)return p.res;
 const auth=request.headers.get('authorization')||'';if(!/^Bearer [^\s]{1,8192}$/.test(auth))return reply(401,'AUTH_REQUIRED');
 if(!env.SUPABASE_PUBLISHABLE_KEY)return p.unavailable().res;
 let methods;try{methods=parseDomainMidtransPaymentMethods(env.DOMAIN_MIDTRANS_PRODUCTION_PAYMENT_METHODS_JSON);}catch{return p.unavailable().res;}
 const budget=deadline(18000),abort=()=>budget.abort();request.signal?.addEventListener('abort',abort,{once:true});
 let id=null,snapAttempted=false;
 try{
  let b;try{b=await readJson(request.body,budget.wait,1024);}catch(e){return reply(e.message==='BODY_TOO_LARGE'?413:400,e.message==='BODY_TOO_LARGE'?'BODY_TOO_LARGE':'INVALID_BODY');}
  if(!b||Array.isArray(b)||Object.keys(b).length!==1||typeof b.orderId!=='string'||!ORDER.test(b.orderId))return reply(400,'INVALID_CHECKOUT_REQUEST');id=b.orderId;
  const v=await budget.wait(fetchImpl(new URL('/auth/v1/user',p.base).href,{method:'GET',redirect:'manual',headers:{authorization:auth,apikey:env.SUPABASE_PUBLISHABLE_KEY},signal:budget.signal}));
  if([401,403].includes(v.status))return reply(401,'INVALID_SESSION');if(v.status!==200)return reply(503,'AUTH_UNAVAILABLE');
  const user=await readJson(v.body,budget.wait,32768);if(typeof user?.id!=='string'||!UUID.test(user.id))return reply(401,'INVALID_SESSION');const userId=user.id.toLowerCase();
  const db=storage(p.base,env,fetchImpl,budget);
  const o=await db.order(id,userId);if(!o)return reply(404,'IMPORT_ORDER_NOT_FOUND');
  if(o.payment_state==='paid')return reply(409,'IMPORT_ORDER_ALREADY_PAID');
  if(o.import_state!=='created')return reply(409,'IMPORT_ORDER_NOT_PAYABLE');
  if(!Number.isSafeInteger(o.price_idr)||o.price_idr<=0||o.price_idr>1000000000000)return reply(409,'IMPORT_PRICE_NOT_SET');
  const view=(token,link)=>({orderId:id,currency:'IDR',amountIdr:o.price_idr,url:link,snapToken:token,clientKey:domainMidtransPopupClientKey(env,true)});
  if(o.payment_state==='pending'){if(!tokenPair(o.snap_token,o.checkout_url))throw Error('CHECKOUT_REUSE_UNVERIFIED');return reply(200,'DOMAIN_IMPORT_CHECKOUT',{reused:true,checkout:view(o.snap_token,o.checkout_url)});}
  if(o.payment_state!=='unpaid')return reply(409,'IMPORT_ORDER_NOT_PAYABLE');
  const start=new Date(now()+25200000).toISOString().slice(0,19).replace('T',' ')+' +0700';
  snapAttempted=true;
  const r=await budget.wait(fetchImpl('https://app.midtrans.com/snap/v1/transactions',{method:'POST',redirect:'manual',headers:{authorization:'Basic '+btoa(p.key+':'),accept:'application/json','content-type':'application/json','X-Override-Notification':url.origin+BASE+'/notification'},body:JSON.stringify({transaction_details:{order_id:id,gross_amount:o.price_idr},enabled_payments:methods,customer_imposed_payment_fee:{enable:false},expiry:{start_time:start,unit:'minutes',duration:120}}),signal:budget.signal}));
  if(r.status!==201)throw Error('SNAP_RESULT_UNCLEAR');const s=await readJson(r.body,budget.wait,8192);if(!tokenPair(s?.token,s?.redirect_url))throw Error('SNAP_RESULT_UNCLEAR');
  await db.rpc('domain_import_start_checkout_v1',{p_user_id:userId,p_order_id:id,p_snap_token:s.token,p_checkout_url:s.redirect_url});
  return reply(201,'DOMAIN_IMPORT_CHECKOUT',{reused:false,checkout:view(s.token,s.redirect_url)});
 }catch{
  if(snapAttempted){try{warnImpl({event:'domain_import_checkout_reconciliation',order_id:id});}catch{}return reply(503,'IMPORT_CHECKOUT_RECONCILIATION_REQUIRED');}
  return reply(503,'IMPORT_CHECKOUT_UNAVAILABLE');
 }finally{budget.close();request.signal?.removeEventListener('abort',abort);}
}
async function notification(request,url,env,{fetchImpl,warnImpl}){
 const p=precheck(request,url,env);if(p.res)return p.res;
 const budget=deadline(10000),abort=()=>budget.abort();request.signal?.addEventListener('abort',abort,{once:true});
 let orderId=null,signed=false;
 const review=(reason)=>{try{warnImpl({event:'domain_import_payment_review',reason,order_id:orderId,signed});}catch{}return reply(503,'DOMAIN_IMPORT_PAYMENT_REVIEW_REQUIRED');};
 let phase='body';
 try{
  const n=await readJson(request.body,budget.wait,32768);let paid;
  try{if(!n||Array.isArray(n)||typeof n.order_id!=='string'||!ORDER.test(n.order_id)||typeof n.status_code!=='string'||!/^\d{3}$/.test(n.status_code)||typeof n.signature_key!=='string'||!/^[a-f0-9]{128}$/i.test(n.signature_key)||typeof n.transaction_id!=='string'||!TX.test(n.transaction_id)||n.currency!=='IDR'||n.merchant_id!==p.merchant)throw Error();paid=money(n.gross_amount);}catch{return reply(400,'INVALID_NOTIFICATION');}
  orderId=n.order_id;phase='signature';
  const bytes=await budget.wait(crypto.subtle.digest('SHA-512',new TextEncoder().encode(n.order_id+n.status_code+n.gross_amount+p.key)));
  const expected=Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join(''),given=n.signature_key.toLowerCase();let diff=0;for(let i=0;i<128;i++)diff|=expected.charCodeAt(i)^given.charCodeAt(i);if(diff)return reply(401,'INVALID_SIGNATURE');signed=true;
  phase='status';
  const sr=await budget.wait(fetchImpl('https://api.midtrans.com/v2/'+encodeURIComponent(orderId)+'/status',{method:'GET',redirect:'manual',headers:{authorization:'Basic '+btoa(p.key+':'),accept:'application/json'},signal:budget.signal}));
  if(sr.status!==200)throw Error('UPSTREAM_UNAVAILABLE');const g=await readJson(sr.body,budget.wait,32768);
  if(g?.order_id!==orderId||g.transaction_id!==n.transaction_id||g.currency!=='IDR'||g.merchant_id!==p.merchant||money(g.gross_amount)!==paid)return reply(409,'DOMAIN_IMPORT_PAYMENT_IDENTITY_MISMATCH');
  phase='order';const db=storage(p.base,env,fetchImpl,budget);const o=await db.order(orderId,null);
  if(!o)return reply(404,'IMPORT_ORDER_NOT_FOUND');
  if(o.midtrans_order_id!==orderId)return review('order_not_checked_out');
  if((g.refund_amount!==undefined&&(typeof g.refund_amount!=='string'||!/^0(?:\.0{1,2})?$/.test(g.refund_amount)))||(g.refunds!==undefined&&(!Array.isArray(g.refunds)||g.refunds.length>0)))return review('refund_metadata');
  const st=g.transaction_status;let state;
  if(['pending','authorize'].includes(st))return reply(200,'DOMAIN_IMPORT_PAYMENT_PENDING',{recordingConfirmed:false});
  if(['deny','cancel','expire','failure'].includes(st))state='failed';
  else if(g.status_code==='200'&&st==='settlement'&&PAY.includes(g.payment_type)&&(g.fraud_status===undefined||g.fraud_status==='accept'))state='paid';
  else return review('gateway_state');
  phase='record';
  const res=await db.rpc('domain_import_apply_payment_v1',{p_order_id:orderId,p_transaction_id:g.transaction_id,p_gross_amount_idr:paid,p_state:state});
  if(state==='paid'&&(res==='paid'||res==='already_paid'))return reply(200,'DOMAIN_IMPORT_PAYMENT_RECORDED',{recordingConfirmed:true,alreadyRecorded:res==='already_paid'});
  if(state==='failed'&&['failed','ignored'].includes(res))return reply(200,'DOMAIN_IMPORT_PAYMENT_STATUS_RECORDED',{recordingConfirmed:false,paymentState:'failed'});
  return review('recorder_'+String(res));
 }catch(e){if(phase==='body'&&!budget.signal.aborted)return reply(e?.message==='BODY_TOO_LARGE'?413:400,'INVALID_NOTIFICATION');return review(phase==='status'?'status_unavailable':'storage_unavailable');}
 finally{budget.close();request.signal?.removeEventListener('abort',abort);}
}
export async function domainImportPaymentResponse(request,env,{fetchImpl=globalThis.fetch,now=()=>Date.now(),warnImpl=x=>console.warn(JSON.stringify(x))}={}){
 const url=new URL(request.url);
 if(url.pathname===BASE+'/checkout')return checkout(request,url,env,{fetchImpl,now,warnImpl});
 if(url.pathname===BASE+'/notification')return notification(request,url,env,{fetchImpl,warnImpl});
 return null;
}
