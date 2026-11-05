import {normalizeDomainMidtransServerKey} from './domain-midtrans-server-key.mjs';
const PATH='/api/commerce/domains/order-reconcile',BASE='https://polvmlrhqoiflumibfqs.supabase.co',ORDER=/^DOM-[a-f0-9]{40}$/,UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
export async function domainGatewayReconcileResponse(request,env,{fetchImpl=globalThis.fetch}={}){
 const url=new URL(request.url);if(url.pathname!==PATH)return null;
 const reply=(status,code,extra={})=>Response.json({code,environment:'production',observationConfirmed:false,gatewayActionTaken:false,registrationActionTaken:false,...extra},{status,headers:{'cache-control':'private, no-store','x-content-type-options':'nosniff'}});
 if(url.origin!=='https://ngeblogging.com'||url.search)return reply(404,'NOT_FOUND');
 if(request.method!=='POST')return reply(405,'METHOD_NOT_ALLOWED');
 if(request.headers.get('origin')!==url.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
 if(env?.DOMAIN_ORDER_ENV!=='production'||env.DOMAIN_CUSTOMER_PRODUCTION_ENABLED!=='true'||env.DOMAIN_PAYMENT_PRODUCTION_ENABLED!=='true')return reply(503,'DOMAIN_RECONCILIATION_DISABLED');
 const auth=request.headers.get('authorization')||'';
 if(!/^Bearer \S{1,8192}$/.test(auth))return reply(401,'INVALID_SESSION');
 if(!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('content-type')||''))return reply(415,'JSON_REQUIRED');
 let key;try{key=normalizeDomainMidtransServerKey(env.DOMAIN_MIDTRANS_PRODUCTION_SERVER_KEY);}catch{return reply(503,'GATEWAY_CONFIGURATION_UNAVAILABLE');}
 const merchant=env.DOMAIN_MIDTRANS_PRODUCTION_MERCHANT_ID;
 if(env.SUPABASE_URL?.replace(/\/$/,'')!==BASE||!env.SUPABASE_PUBLISHABLE_KEY||!env.SUPABASE_SERVICE_ROLE_KEY||typeof merchant!=='string'||!/^[A-Za-z0-9_-]{2,100}$/.test(merchant))return reply(503,'GATEWAY_CONFIGURATION_UNAVAILABLE');
 const c=new AbortController(),abort=()=>c.abort();let stop;
 const ended=new Promise((_,reject)=>{stop=()=>reject(Error('REQUEST_UNCONFIRMED'));c.signal.addEventListener('abort',stop,{once:true});});
 const wait=value=>Promise.race([value,ended]),timer=setTimeout(abort,12000);request.signal.addEventListener('abort',abort,{once:true});
 async function read(stream,limit){const reader=stream?.getReader();if(!reader)throw Error();try{const parts=[];let size=0;for(;;){const part=await wait(reader.read());if(part.done)break;size+=part.value.length;if(size>limit)throw Error();parts.push(part.value);}const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}finally{try{await reader.cancel();}catch{}try{reader.releaseLock();}catch{}}}
 async function call(target,options){if(c.signal.aborted)throw Error();const response=await wait(fetchImpl(target,{...options,redirect:'manual',cache:'no-store',signal:c.signal}));if(response.status!==200||!/^application\/json(?:\s*;.*)?$/i.test(response.headers.get('content-type')||'')){try{await response.body?.cancel();}catch{}throw Error();}return read(response.body,32768);}
 try{
  if(request.signal.aborted)throw Error();
  const input=await read(request.body,1024);
  if(!input||Array.isArray(input)||Object.keys(input).length!==1||!ORDER.test(input.orderId||''))return reply(400,'INVALID_RECONCILIATION_REQUEST');
  const user=await call(BASE+'/auth/v1/user',{method:'GET',headers:{authorization:auth,apikey:env.SUPABASE_PUBLISHABLE_KEY}});
  if(!UUID.test(user?.id||''))return reply(401,'INVALID_SESSION');
  const headers={apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY};
  const target=new URL(BASE+'/rest/v1/domain_purchase_orders');
  for(const [name,value] of Object.entries({select:'order_id,user_id,environment,currency,amount_idr,payment_state,registration_state,midtrans_transaction_id,paid_at,review_reason',order_id:'eq.'+input.orderId,user_id:'eq.'+user.id,environment:'eq.production',limit:'1'}))target.searchParams.set(name,value);
  const rows=await call(target.href,{method:'GET',headers}),o=Array.isArray(rows)&&rows.length===1?rows[0]:null;
  if(!o)return reply(404,'DOMAIN_ORDER_NOT_FOUND');
  if(o.order_id!==input.orderId||o.user_id!==user.id||o.environment!=='production'||o.currency!=='IDR'||!Number.isSafeInteger(o.amount_idr)||o.amount_idr<1||o.amount_idr>1000000000000)return reply(409,'ORDER_UNVERIFIED');
  if(o.payment_state!=='pending'||o.registration_state!=='not_started'||o.paid_at!==null||o.review_reason!==null)return reply(409,'ORDER_ALREADY_PROCESSED');
  const g=await call('https://api.midtrans.com/v2/'+encodeURIComponent(o.order_id)+'/status',{method:'GET',headers:{authorization:'Basic '+btoa(key+':'),accept:'application/json'}});
  if(g?.status_code==='404')return reply(409,'GATEWAY_STATUS_UNCONFIRMED');
  if(g?.order_id!==o.order_id||g.merchant_id!==merchant||g.currency!=='IDR'||typeof g.gross_amount!=='string'||!/^[1-9]\d{0,12}(?:\.0{1,2})?$/.test(g.gross_amount)||Number(g.gross_amount)!==o.amount_idr||typeof g.transaction_id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(g.transaction_id)||(o.midtrans_transaction_id!==null&&o.midtrans_transaction_id!==g.transaction_id))return reply(409,'GATEWAY_IDENTITY_UNVERIFIED');
  if(['pending','authorize'].includes(g.transaction_status))return reply(409,'GATEWAY_PAYMENT_PENDING');
  const terminal={expire:'expired',cancel:'cancelled',deny:'failed',failure:'failed'},state=Object.hasOwn(terminal,g.transaction_status)?terminal[g.transaction_status]:null;
  if(!state||(g.refund_amount!==undefined&&!/^0(?:\.0{1,2})?$/.test(String(g.refund_amount)))||(g.refunds!==undefined&&(!Array.isArray(g.refunds)||g.refunds.length)))return reply(409,'GATEWAY_PAYMENT_REVIEW_REQUIRED');
  const r=await call(BASE+'/rest/v1/rpc/domain_observe_production_payment',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({p_order_id:o.order_id,p_amount_idr:o.amount_idr,p_transaction_id:g.transaction_id,p_gateway_state:g.transaction_status,p_review_reason:null})});
  if(r?.ok!==true||r.order_id!==o.order_id||r.environment!=='production'||r.currency!=='IDR'||r.amount_idr!==o.amount_idr||r.payment_state!==state||r.observation_recorded!==true||r.review_required!==false||r.registration_action_taken!==false||typeof r.event_reused!=='boolean'||typeof r.order_updated!=='boolean'||typeof r.event_key!=='string'||!/^[a-f0-9]{64}$/.test(r.event_key))return reply(503,'RECONCILIATION_UNCONFIRMED');
  const updated=await call(target.href,{method:'GET',headers}),fresh=Array.isArray(updated)&&updated.length===1?updated[0]:null;
  if(fresh?.order_id!==o.order_id||fresh.user_id!==user.id||fresh.environment!=='production'||fresh.currency!=='IDR'||fresh.amount_idr!==o.amount_idr||fresh.payment_state!==state||fresh.registration_state!=='not_started'||fresh.paid_at!==null||fresh.review_reason!==null)return reply(503,'RECONCILIATION_UNCONFIRMED');
  return reply(200,'DOMAIN_GATEWAY_TERMINAL_RECONCILED',{observationConfirmed:true,orderId:o.order_id,currency:'IDR',amountIdr:o.amount_idr,paymentState:state});
 }catch{return reply(503,'RECONCILIATION_UNCONFIRMED');}
 finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);c.signal.removeEventListener('abort',stop);c.abort();}
}
