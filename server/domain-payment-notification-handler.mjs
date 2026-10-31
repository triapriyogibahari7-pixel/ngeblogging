const HOST='feature-domain-stages5-10-integration-20261030-ngeblogging.triapriyogibahari7.workers.dev';
const PATH='/api/commerce/domains/midtrans/notification';
const ORDER=/^DOM-[a-f0-9]{40}$/;
function amount(value){if(typeof value!=='string'||!/^[1-9]\d{0,12}(?:\.0{1,2})?$/.test(value))throw Error('INVALID_AMOUNT');const n=BigInt(value.split('.')[0]);if(n>1000000000000n)throw Error('INVALID_AMOUNT');return n;}
async function jsonBody(body,wait){const reader=body?.getReader();if(!reader)throw Error('INVALID_JSON');let size=0;const chunks=[];try{while(true){const v=await wait(reader.read());if(v.done)break;size+=v.value.length;if(size>32768)throw Error('BODY_TOO_LARGE');chunks.push(v.value);}const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}finally{reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}}
export async function domainPaymentNotificationResponse(request,env,{fetchImpl=globalThis.fetch,timeoutMs=10000,warnImpl=x=>console.warn(JSON.stringify(x))}={}){
 const url=new URL(request.url);if(url.pathname!==PATH)return null;
 const reply=(status,code,confirmed=false,extra={})=>new Response(JSON.stringify({code,recordingConfirmed:confirmed,registrationActionTaken:false,...extra}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...(status===405?{allow:'POST'}:{})}});
 if(url.protocol!=='https:'||url.hostname!==HOST)return reply(404,'NOT_FOUND');
 if(request.method!=='POST')return reply(405,'METHOD_NOT_ALLOWED');
 if(url.search)return reply(400,'QUERY_NOT_ALLOWED');
 if(env?.DOMAIN_PAYMENT_NOTIFICATION_PREVIEW_ENABLED!=='true')return reply(503,'DOMAIN_PAYMENT_NOTIFICATION_DISABLED');
 if(env.DOMAIN_ORDER_ENV!=='sandbox')return reply(503,'DOMAIN_PAYMENT_SANDBOX_REQUIRED');
 if(!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('content-type')||''))return reply(415,'JSON_REQUIRED');
 const key=env.DOMAIN_MIDTRANS_SANDBOX_SERVER_KEY;
 if(typeof key!=='string'||!/^[\x21-\x39\x3b-\x7e]{8,512}$/.test(key)||typeof env.SUPABASE_SERVICE_ROLE_KEY!=='string'||!env.SUPABASE_SERVICE_ROLE_KEY||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>10000)return reply(503,'DOMAIN_PAYMENT_CONFIGURATION_UNAVAILABLE');
 let base;try{base=new URL(env.SUPABASE_URL);if(base.protocol!=='https:'||!base.hostname.endsWith('.supabase.co')||base.port||base.username||base.password||base.pathname!=='/'||base.search||base.hash)throw Error();}catch{return reply(503,'DOMAIN_PAYMENT_CONFIGURATION_UNAVAILABLE');}
 if(request.signal.aborted)return reply(503,'DOMAIN_PAYMENT_UNAVAILABLE');
 const controller=new AbortController(),abort=()=>controller.abort();let stop,phase='body',orderId;
 const stopped=new Promise((_,reject)=>{stop=()=>reject(Error('TIMEOUT'));controller.signal.addEventListener('abort',stop,{once:true});});const timer=setTimeout(abort,timeoutMs),wait=p=>Promise.race([p,stopped]);request.signal.addEventListener('abort',abort,{once:true});
 const review=reason=>{try{warnImpl({event:'domain_sandbox_payment_review',reason,order_id:orderId});}catch{}return reply(503,'DOMAIN_PAYMENT_REVIEW_REQUIRED');};
 const call=async req=>{const r=await wait(fetchImpl(req));if(r.status!==200)throw Error('UPSTREAM_UNAVAILABLE');return jsonBody(r.body,wait);};
 try{
  const n=await jsonBody(request.body,wait);let paidAmount;
  try{if(!n||Array.isArray(n)||typeof n.order_id!=='string'||!ORDER.test(n.order_id)||typeof n.status_code!=='string'||!/^\d{3}$/.test(n.status_code)||typeof n.signature_key!=='string'||!/^[a-f0-9]{128}$/i.test(n.signature_key)||typeof n.transaction_id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(n.transaction_id)||(n.currency!==undefined&&n.currency!=='IDR'))throw Error();paidAmount=amount(n.gross_amount);}catch{return reply(400,'INVALID_NOTIFICATION');}
  orderId=n.order_id;phase='signature';
  const bytes=await wait(crypto.subtle.digest('SHA-512',new TextEncoder().encode(n.order_id+n.status_code+n.gross_amount+key)));const expected=Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join(''),provided=n.signature_key.toLowerCase();let diff=0;for(let i=0;i<128;i++)diff|=expected.charCodeAt(i)^provided.charCodeAt(i);if(diff!==0)return reply(401,'INVALID_SIGNATURE');
  phase='status';
  const g=await call(new Request('https://api.sandbox.midtrans.com/v2/'+encodeURIComponent(orderId)+'/status',{method:'GET',redirect:'manual',headers:{authorization:'Basic '+btoa(key+':'),accept:'application/json'},signal:controller.signal}));
  if(g?.order_id!==orderId||g.transaction_id!==n.transaction_id||amount(g.gross_amount)!==paidAmount||(g.currency!==undefined&&g.currency!=='IDR')||(typeof n.merchant_id==='string'&&typeof g.merchant_id==='string'&&n.merchant_id!==g.merchant_id))return reply(409,'DOMAIN_PAYMENT_IDENTITY_MISMATCH');
  if((g.refund_amount!==undefined&&(typeof g.refund_amount!=='string'||!/^0(?:\.0{1,2})?$/.test(g.refund_amount)))||(g.refunds!==undefined&&(!Array.isArray(g.refunds)||g.refunds.length>0)))return review('gateway_refund_metadata_requires_review');
  if(['pending','authorize','deny','cancel','expire','failure'].includes(g.transaction_status))return reply(200,'DOMAIN_PAYMENT_NOT_CONFIRMED');
  if(g.status_code!=='200'||!['settlement','capture'].includes(g.transaction_status)||typeof g.payment_type!=='string'||!/^[a-z0-9_]{2,40}$/.test(g.payment_type)||(g.fraud_status!==undefined&&g.fraud_status!=='accept')||(g.transaction_status==='capture'&&(g.payment_type!=='credit_card'||g.fraud_status!=='accept')))return review('gateway_state_requires_review');
  phase='order';
  const target=new URL('/rest/v1/domain_purchase_orders',base);target.searchParams.set('select','order_id,environment,currency,amount_idr,payment_state,midtrans_transaction_id');target.searchParams.set('order_id','eq.'+orderId);target.searchParams.set('environment','eq.sandbox');target.searchParams.set('limit','1');
  const headers={apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY};
  const rows=await call(new Request(target,{method:'GET',redirect:'manual',headers,signal:controller.signal}));if(Array.isArray(rows)&&rows.length===0)return reply(404,'DOMAIN_ORDER_NOT_FOUND');
  const o=Array.isArray(rows)&&rows.length===1?rows[0]:null;if(o?.order_id!==orderId||o.environment!=='sandbox'||o.currency!=='IDR'||!Number.isSafeInteger(o.amount_idr)||BigInt(o.amount_idr)!==paidAmount||(o.midtrans_transaction_id!==null&&o.midtrans_transaction_id!==g.transaction_id))return reply(409,'DOMAIN_PAYMENT_ORDER_MISMATCH');
  if(!['pending','paid'].includes(o.payment_state))return review('order_state_requires_review');
  phase='record';
  const r=await call(new Request(new URL('/rest/v1/rpc/domain_record_sandbox_payment',base),{method:'POST',redirect:'manual',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({p_order_id:orderId,p_amount_idr:o.amount_idr,p_transaction_id:g.transaction_id}),signal:controller.signal}));
  if(r?.ok!==true)return review('payment_recorder_rejected');
  if(r.order_id!==orderId||r.environment!=='sandbox'||r.currency!=='IDR'||r.amount_idr!==o.amount_idr||r.payment_state!=='paid'||r.registration_action_taken!==false||typeof r.event_reused!=='boolean'||typeof r.payment_updated!=='boolean'||typeof r.event_key!=='string'||!/^[a-f0-9]{64}$/.test(r.event_key))return reply(503,'DOMAIN_PAYMENT_RECORD_UNCONFIRMED');
  return reply(200,'DOMAIN_SANDBOX_PAYMENT_RECORDED',true,{eventReused:r.event_reused});
 }catch(error){if(phase==='body'&&!controller.signal.aborted)return reply(error?.message==='BODY_TOO_LARGE'?413:400,'INVALID_NOTIFICATION');return reply(503,'DOMAIN_PAYMENT_UNAVAILABLE');}
 finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',stop);}
}
