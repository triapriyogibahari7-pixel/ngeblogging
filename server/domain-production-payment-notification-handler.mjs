import {normalizeDomainMidtransServerKey} from './domain-midtrans-server-key.mjs';
const PATH='/api/commerce/domains/midtrans/production-notification';
const ORDER=/^DOM-[a-f0-9]{40}$/;
const STATES=['pending','paid','failed','expired','cancelled','review_required','refund_pending','refunded'];
function amount(v){if(typeof v!=='string'||!/^[1-9]\d{0,12}(?:\.0{1,2})?$/.test(v))throw Error('INVALID_AMOUNT');const n=BigInt(v.split('.')[0]);if(n>1000000000000n)throw Error('INVALID_AMOUNT');return n;}
async function body(stream,wait){const reader=stream?.getReader();if(!reader)throw Error('INVALID_JSON');try{let size=0;const chunks=[];for(;;){const x=await wait(reader.read());if(x.done)break;size+=x.value.length;if(size>32768)throw Error('BODY_TOO_LARGE');chunks.push(x.value);}const bytes=new Uint8Array(size);let offset=0;for(const x of chunks){bytes.set(x,offset);offset+=x.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}finally{reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}}
function deadline(ms){const c=new AbortController();let stop;const stopped=new Promise((_,reject)=>{stop=()=>reject(Error('TIMEOUT'));c.signal.addEventListener('abort',stop,{once:true});});const timer=setTimeout(()=>c.abort(),ms);return {signal:c.signal,abort:()=>c.abort(),wait:p=>Promise.race([p,stopped]),close:()=>{clearTimeout(timer);c.signal.removeEventListener('abort',stop);}};}
export async function domainProductionPaymentNotificationResponse(request,env,{fetchImpl=globalThis.fetch,warnImpl=x=>console.warn(JSON.stringify(x))}={}){
 const url=new URL(request.url);if(url.pathname!==PATH)return null;
 const reply=(status,code,extra={})=>new Response(JSON.stringify({code,environment:'production',recordingConfirmed:false,registrationActionTaken:false,...extra}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...(status===405?{allow:'POST'}:{})}});
 if(url.protocol!=='https:'||url.hostname!=='ngeblogging.com'||url.port)return reply(404,'NOT_FOUND');
 if(request.method!=='POST')return reply(405,'METHOD_NOT_ALLOWED');
 if(url.search)return reply(400,'QUERY_NOT_ALLOWED');
 if(env?.DOMAIN_PAYMENT_PRODUCTION_ENABLED!=='true'||env.DOMAIN_ORDER_ENV!=='production')return reply(503,'DOMAIN_PRODUCTION_PAYMENT_DISABLED');
 if(!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('content-type')||''))return reply(415,'JSON_REQUIRED');
 let key;try{key=normalizeDomainMidtransServerKey(env.DOMAIN_MIDTRANS_PRODUCTION_SERVER_KEY,{environment:'production'});}catch{return reply(503,'DOMAIN_PRODUCTION_PAYMENT_CONFIGURATION_UNAVAILABLE');}
 const merchant=env.DOMAIN_MIDTRANS_PRODUCTION_MERCHANT_ID;
 if(typeof merchant!=='string'||!/^[A-Za-z0-9_-]{2,100}$/.test(merchant)||typeof env.SUPABASE_SERVICE_ROLE_KEY!=='string'||!env.SUPABASE_SERVICE_ROLE_KEY)return reply(503,'DOMAIN_PRODUCTION_PAYMENT_CONFIGURATION_UNAVAILABLE');
 let base;try{base=new URL(env.SUPABASE_URL);if(base.href!=='https://polvmlrhqoiflumibfqs.supabase.co/')throw Error();}catch{return reply(503,'DOMAIN_PRODUCTION_PAYMENT_CONFIGURATION_UNAVAILABLE');}
 if(request.signal.aborted)return reply(503,'DOMAIN_PAYMENT_UNAVAILABLE');
 const budget=deadline(10000),abort=()=>budget.abort();let phase='body',orderId,signed=false,paidAmount,orderVerified=false;
 request.signal.addEventListener('abort',abort,{once:true});
 const headers={apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY};
 const call=async(target,options,b=budget)=>{const r=await b.wait(fetchImpl(target,{...options,redirect:'manual',signal:b.signal}));if(r.status!==200)throw Error('UPSTREAM_UNAVAILABLE');return body(r.body,b.wait);};
 const rpc=(name,args,b=budget)=>call(new URL('/rest/v1/rpc/'+name,base).href,{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify(args)},b);
 const orders=()=>{const target=new URL('/rest/v1/domain_purchase_orders',base);target.searchParams.set('select','order_id,environment,currency,amount_idr,payment_state,midtrans_transaction_id');target.searchParams.set('order_id','eq.'+orderId);target.searchParams.set('environment','eq.production');target.searchParams.set('limit','1');return target.href;};
 const review=async reason=>{let recorded=false;if(signed){const cleanup=deadline(4000);try{let eligible=orderVerified;if(!eligible){const rows=await call(orders(),{method:'GET',headers},cleanup);const o=Array.isArray(rows)&&rows.length===1?rows[0]:null;eligible=o?.order_id===orderId&&o.environment==='production'&&o.currency==='IDR'&&Number.isSafeInteger(o.amount_idr)&&BigInt(o.amount_idr)===paidAmount;}if(eligible){const r=await rpc('domain_observe_production_payment',{p_order_id:orderId,p_amount_idr:null,p_transaction_id:null,p_gateway_state:'review_required',p_review_reason:reason},cleanup);recorded=r?.ok===true&&r.order_id===orderId&&r.environment==='production'&&r.currency==='IDR'&&Number.isSafeInteger(r.amount_idr)&&BigInt(r.amount_idr)===paidAmount&&r.observation_recorded===true&&r.review_required===true&&r.registration_action_taken===false&&STATES.includes(r.payment_state);}}catch{}finally{cleanup.close();}}try{warnImpl({event:'domain_production_payment_review',reason,order_id:orderId,review_recorded:recorded});}catch{}return reply(503,'DOMAIN_PAYMENT_REVIEW_REQUIRED',{reviewRecorded:recorded});};
 try{
  const n=await body(request.body,budget.wait);
  try{if(!n||Array.isArray(n)||typeof n.order_id!=='string'||!ORDER.test(n.order_id)||typeof n.status_code!=='string'||!/^\d{3}$/.test(n.status_code)||typeof n.signature_key!=='string'||!/^[a-f0-9]{128}$/i.test(n.signature_key)||typeof n.transaction_id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(n.transaction_id)||n.currency!=='IDR'||n.merchant_id!==merchant)throw Error();paidAmount=amount(n.gross_amount);}catch{return reply(400,'INVALID_NOTIFICATION');}
  orderId=n.order_id;phase='signature';
  const bytes=await budget.wait(crypto.subtle.digest('SHA-512',new TextEncoder().encode(n.order_id+n.status_code+n.gross_amount+key)));const expected=Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join(''),provided=n.signature_key.toLowerCase();let diff=0;for(let i=0;i<128;i++)diff|=expected.charCodeAt(i)^provided.charCodeAt(i);if(diff)return reply(401,'INVALID_SIGNATURE');signed=true;
  phase='status';
  const g=await call('https://api.midtrans.com/v2/'+encodeURIComponent(orderId)+'/status',{method:'GET',headers:{authorization:'Basic '+btoa(key+':'),accept:'application/json'}});
  if(g?.order_id!==orderId||g.transaction_id!==n.transaction_id||g.currency!=='IDR'||g.merchant_id!==merchant||amount(g.gross_amount)!==paidAmount)return reply(409,'DOMAIN_PAYMENT_IDENTITY_MISMATCH');
  phase='order';
  const rows=await call(orders(),{method:'GET',headers});if(Array.isArray(rows)&&rows.length===0)return reply(404,'DOMAIN_ORDER_NOT_FOUND');
  const o=Array.isArray(rows)&&rows.length===1?rows[0]:null;if(o?.order_id!==orderId||o.environment!=='production'||o.currency!=='IDR'||!Number.isSafeInteger(o.amount_idr)||BigInt(o.amount_idr)!==paidAmount||(o.midtrans_transaction_id!==null&&o.midtrans_transaction_id!==g.transaction_id))return reply(409,'DOMAIN_PAYMENT_ORDER_MISMATCH');orderVerified=true;
  if((g.refund_amount!==undefined&&(typeof g.refund_amount!=='string'||!/^0(?:\.0{1,2})?$/.test(g.refund_amount)))||(g.refunds!==undefined&&(!Array.isArray(g.refunds)||g.refunds.length>0)))return await review('refund_metadata');
  if(!STATES.includes(o.payment_state))return await review('order_mismatch');
  if(['pending','authorize','deny','cancel','expire','failure'].includes(g.transaction_status)){
   phase='observe';const r=await rpc('domain_observe_production_payment',{p_order_id:orderId,p_amount_idr:o.amount_idr,p_transaction_id:g.transaction_id,p_gateway_state:g.transaction_status,p_review_reason:null});
   const expectedState={pending:'pending',authorize:'pending',deny:'failed',cancel:'cancelled',expire:'expired',failure:'failed'}[g.transaction_status];
   if(r?.ok!==true||r.order_id!==orderId||r.environment!=='production'||r.currency!=='IDR'||r.amount_idr!==o.amount_idr||r.observation_recorded!==true||r.registration_action_taken!==false||typeof r.review_required!=='boolean'||typeof r.event_reused!=='boolean'||typeof r.order_updated!=='boolean'||typeof r.event_key!=='string'||!/^[a-f0-9]{64}$/.test(r.event_key)||!STATES.includes(r.payment_state)||(o.payment_state!=='pending'&&r.payment_state!==o.payment_state)||(o.payment_state==='pending'&&![expectedState,'review_required'].includes(r.payment_state)))return await review('storage_unavailable');
   if(r.review_required)return reply(503,'DOMAIN_PAYMENT_REVIEW_REQUIRED',{reviewRecorded:true});
   return reply(200,'DOMAIN_PAYMENT_STATUS_RECORDED',{observationRecorded:true,paymentState:r.payment_state,gatewayStatus:g.transaction_status,eventReused:r.event_reused});
  }
  if(!['pending','paid'].includes(o.payment_state))return await review('order_mismatch');
  if(g.status_code!=='200'||g.transaction_status!=='settlement'||!['qris','bank_transfer','echannel'].includes(g.payment_type)||(g.fraud_status!==undefined&&g.fraud_status!=='accept'))return await review('gateway_state');
  phase='record';
  const r=await rpc('domain_record_production_payment',{p_order_id:orderId,p_amount_idr:o.amount_idr,p_transaction_id:g.transaction_id});
  if(r?.ok!==true)return await review('recorder_rejected');
  if(r.order_id!==orderId||r.environment!=='production'||r.currency!=='IDR'||r.amount_idr!==o.amount_idr||r.payment_state!=='paid'||r.registration_action_taken!==false||typeof r.event_reused!=='boolean'||typeof r.payment_updated!=='boolean'||typeof r.event_key!=='string'||!/^[a-f0-9]{64}$/.test(r.event_key))return await review('storage_unavailable');
  return reply(200,'DOMAIN_PRODUCTION_PAYMENT_RECORDED',{recordingConfirmed:true,eventReused:r.event_reused});
 }catch(e){if(phase==='body'&&!budget.signal.aborted)return reply(e?.message==='BODY_TOO_LARGE'?413:400,'INVALID_NOTIFICATION');return await review(phase==='status'?'status_unavailable':'storage_unavailable');}
 finally{budget.close();request.signal.removeEventListener('abort',abort);}
}
