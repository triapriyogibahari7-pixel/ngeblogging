const PATH='/api/commerce/domains/midtrans/production-notification';
const ORDER=/^DOM-[a-f0-9]{40}$/;
function amount(v){if(typeof v!=='string'||!/^[1-9]\d{0,12}(?:\.0{1,2})?$/.test(v))throw Error('INVALID_AMOUNT');const n=BigInt(v.split('.')[0]);if(n>1000000000000n)throw Error('INVALID_AMOUNT');return n;}
async function body(stream,wait){const reader=stream?.getReader();if(!reader)throw Error('INVALID_JSON');try{let size=0;const chunks=[];for(;;){const x=await wait(reader.read());if(x.done)break;size+=x.value.length;if(size>32768)throw Error('BODY_TOO_LARGE');chunks.push(x.value);}const bytes=new Uint8Array(size);let offset=0;for(const x of chunks){bytes.set(x,offset);offset+=x.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}finally{reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}}
export async function domainProductionPaymentNotificationResponse(request,env,{fetchImpl=globalThis.fetch,warnImpl=x=>console.warn(JSON.stringify(x))}={}){
 const url=new URL(request.url);if(url.pathname!==PATH)return null;
 const reply=(status,code,extra={})=>new Response(JSON.stringify({code,environment:'production',recordingConfirmed:false,registrationActionTaken:false,...extra}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...(status===405?{allow:'POST'}:{})}});
 if(url.protocol!=='https:'||url.hostname!=='ngeblogging.com'||url.port)return reply(404,'NOT_FOUND');
 if(request.method!=='POST')return reply(405,'METHOD_NOT_ALLOWED');
 if(url.search)return reply(400,'QUERY_NOT_ALLOWED');
 if(env?.DOMAIN_PAYMENT_PRODUCTION_ENABLED!=='true'||env.DOMAIN_ORDER_ENV!=='production')return reply(503,'DOMAIN_PRODUCTION_PAYMENT_DISABLED');
 if(!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('content-type')||''))return reply(415,'JSON_REQUIRED');
 const key=env.DOMAIN_MIDTRANS_PRODUCTION_SERVER_KEY,merchant=env.DOMAIN_MIDTRANS_PRODUCTION_MERCHANT_ID;
 if(typeof key!=='string'||!/^Mid-server-[A-Za-z0-9_-]{10,200}$/.test(key)||typeof merchant!=='string'||! /^[A-Za-z0-9_-]{2,100}$/.test(merchant)||typeof env.SUPABASE_SERVICE_ROLE_KEY!=='string'||!env.SUPABASE_SERVICE_ROLE_KEY)return reply(503,'DOMAIN_PRODUCTION_PAYMENT_CONFIGURATION_UNAVAILABLE');
 let base;try{base=new URL(env.SUPABASE_URL);if(base.href!=='https://polvmlrhqoiflumibfqs.supabase.co/')throw Error();}catch{return reply(503,'DOMAIN_PRODUCTION_PAYMENT_CONFIGURATION_UNAVAILABLE');}
 if(request.signal.aborted)return reply(503,'DOMAIN_PAYMENT_UNAVAILABLE');
 const controller=new AbortController(),abort=()=>controller.abort();let stop,phase='body',orderId;
 const stopped=new Promise((_,reject)=>{stop=()=>reject(Error('TIMEOUT'));controller.signal.addEventListener('abort',stop,{once:true});});const timer=setTimeout(abort,10000),wait=p=>Promise.race([p,stopped]);request.signal.addEventListener('abort',abort,{once:true});
 const review=reason=>{try{warnImpl({event:'domain_production_payment_review',reason,order_id:orderId});}catch{}return reply(503,'DOMAIN_PAYMENT_REVIEW_REQUIRED');};
 const get=async(target,options)=>{const r=await wait(fetchImpl(target,{...options,redirect:'manual',signal:controller.signal}));if(r.status!==200)throw Error('UPSTREAM_UNAVAILABLE');return body(r.body,wait);};
 try{
  const n=await body(request.body,wait);let paidAmount;
  try{if(!n||Array.isArray(n)||!ORDER.test(n.order_id)||typeof n.order_id!=='string'||typeof n.status_code!=='string'||!/^\d{3}$/.test(n.status_code)||typeof n.signature_key!=='string'||!/^[a-f0-9]{128}$/i.test(n.signature_key)||typeof n.transaction_id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(n.transaction_id)||n.currency!=='IDR'||n.merchant_id!==merchant)throw Error();paidAmount=amount(n.gross_amount);}catch{return reply(400,'INVALID_NOTIFICATION');}
  orderId=n.order_id;phase='signature';
  const bytes=await wait(crypto.subtle.digest('SHA-512',new TextEncoder().encode(n.order_id+n.status_code+n.gross_amount+key)));const expected=Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join(''),provided=n.signature_key.toLowerCase();let diff=0;for(let i=0;i<128;i++)diff|=expected.charCodeAt(i)^provided.charCodeAt(i);if(diff)return reply(401,'INVALID_SIGNATURE');
  phase='status';
  const g=await get('https://api.midtrans.com/v2/'+encodeURIComponent(orderId)+'/status',{method:'GET',headers:{authorization:'Basic '+btoa(key+':'),accept:'application/json'}});
  if(g?.order_id!==orderId||g.transaction_id!==n.transaction_id||g.currency!=='IDR'||g.merchant_id!==merchant||amount(g.gross_amount)!==paidAmount)return reply(409,'DOMAIN_PAYMENT_IDENTITY_MISMATCH');
  phase='order';
  const target=new URL('/rest/v1/domain_purchase_orders',base);target.searchParams.set('select','order_id,environment,currency,amount_idr,payment_state,midtrans_transaction_id');target.searchParams.set('order_id','eq.'+orderId);target.searchParams.set('environment','eq.production');target.searchParams.set('limit','1');
  const headers={apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY};
  const rows=await get(target.href,{method:'GET',headers});if(Array.isArray(rows)&&rows.length===0)return reply(404,'DOMAIN_ORDER_NOT_FOUND');
  const o=Array.isArray(rows)&&rows.length===1?rows[0]:null;if(o?.order_id!==orderId||o.environment!=='production'||o.currency!=='IDR'||!Number.isSafeInteger(o.amount_idr)||BigInt(o.amount_idr)!==paidAmount||(o.midtrans_transaction_id!==null&&o.midtrans_transaction_id!==g.transaction_id))return reply(409,'DOMAIN_PAYMENT_ORDER_MISMATCH');
  if((g.refund_amount!==undefined&&(typeof g.refund_amount!=='string'||!/^0(?:\.0{1,2})?$/.test(g.refund_amount)))||(g.refunds!==undefined&&(!Array.isArray(g.refunds)||g.refunds.length>0)))return review('refund_metadata');
  if(!['pending','paid'].includes(o.payment_state))return review('order_state');
  if(['pending','authorize','deny','cancel','expire','failure'].includes(g.transaction_status)){if(o.payment_state==='paid')return review('paid_order_gateway_conflict');return reply(200,'DOMAIN_PAYMENT_NOT_CONFIRMED',{gatewayStatus:g.transaction_status});}
  if(g.status_code!=='200'||g.transaction_status!=='settlement'||!['qris','bank_transfer','echannel'].includes(g.payment_type)||(g.fraud_status!==undefined&&g.fraud_status!=='accept'))return review('gateway_state');
  phase='record';
  const r=await get(new URL('/rest/v1/rpc/domain_record_production_payment',base).href,{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({p_order_id:orderId,p_amount_idr:o.amount_idr,p_transaction_id:g.transaction_id})});
  if(r?.ok!==true)return review('recorder_rejected');
  if(r.order_id!==orderId||r.environment!=='production'||r.currency!=='IDR'||r.amount_idr!==o.amount_idr||r.payment_state!=='paid'||r.registration_action_taken!==false||typeof r.event_reused!=='boolean'||typeof r.payment_updated!=='boolean'||typeof r.event_key!=='string'||!/^[a-f0-9]{64}$/.test(r.event_key))return reply(503,'DOMAIN_PAYMENT_RECORD_UNCONFIRMED');
  return reply(200,'DOMAIN_PRODUCTION_PAYMENT_RECORDED',{recordingConfirmed:true,eventReused:r.event_reused});
 }catch(e){if(phase==='body'&&!controller.signal.aborted)return reply(e?.message==='BODY_TOO_LARGE'?413:400,'INVALID_NOTIFICATION');return review('verification_or_storage_unavailable');}
 finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',stop);}
}
