import {normalizeDomainMidtransServerKey} from './domain-midtrans-server-key.mjs';
const PATH='/api/commerce/domains/manage/import/payment-status';
const ORDER=/^IMP-[a-f0-9]{40}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const TX=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const PAY=['qris','bank_transfer','echannel'];
const SUPABASE='https://polvmlrhqoiflumibfqs.supabase.co/';
function deadline(ms){const c=new AbortController();let stop;const stopped=new Promise((_,reject)=>{stop=()=>reject(Error('TIMEOUT'));c.signal.addEventListener('abort',stop,{once:true});});const timer=setTimeout(()=>c.abort(),ms);return {signal:c.signal,abort:()=>c.abort(),wait:p=>Promise.race([p,stopped]),close:()=>{clearTimeout(timer);c.signal.removeEventListener('abort',stop);}};}
async function readJson(stream,wait,limit){const reader=stream?.getReader();if(!reader)throw Error('INVALID_JSON');try{let size=0;const chunks=[];for(;;){const x=await wait(reader.read());if(x.done)break;size+=x.value.length;if(size>limit)throw Error('BODY_TOO_LARGE');chunks.push(x.value);}const bytes=new Uint8Array(size);let pos=0;for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}finally{reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}}
function money(v){if(typeof v!=='string'||!/^[1-9]\d{0,12}(?:\.0{1,2})?$/.test(v))throw Error('INVALID_AMOUNT');const n=Number(v.split('.')[0]);if(n>1000000000000)throw Error('INVALID_AMOUNT');return n;}
export async function domainImportPaymentStatusResponse(request,env,{fetchImpl=globalThis.fetch,warnImpl=x=>console.warn(JSON.stringify(x))}={}){
 const url=new URL(request.url);if(url.pathname!==PATH)return null;
 const reply=(status,code,extra={})=>new Response(JSON.stringify({code,environment:'production',...extra}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...(status===405?{allow:'POST'}:{})}});
 if(url.protocol!=='https:'||url.hostname!=='ngeblogging.com'||url.port)return reply(404,'NOT_FOUND');
 if(request.method!=='POST')return reply(405,'METHOD_NOT_ALLOWED');
 if(url.search)return reply(400,'QUERY_NOT_ALLOWED');
 if(env?.DOMAIN_IMPORT_ENABLED!=='true')return reply(503,'DOMAIN_IMPORT_DISABLED');
 if(env.DOMAIN_PAYMENT_PRODUCTION_ENABLED!=='true'||env.DOMAIN_ORDER_ENV!=='production')return reply(503,'DOMAIN_IMPORT_PAYMENT_NOT_READY');
 if(request.headers.get('origin')!==url.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
 const auth=request.headers.get('authorization')||'';if(!/^Bearer [^\s]{1,8192}$/.test(auth))return reply(401,'AUTH_REQUIRED');
 if(!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('content-type')||''))return reply(415,'JSON_REQUIRED');
 const unavailable=()=>reply(503,'DOMAIN_IMPORT_CONFIGURATION_UNAVAILABLE',{configurationUnavailable:true});
 let key;try{key=normalizeDomainMidtransServerKey(env.DOMAIN_MIDTRANS_PRODUCTION_SERVER_KEY,{environment:'production'});}catch{return unavailable();}
 const merchant=env.DOMAIN_MIDTRANS_PRODUCTION_MERCHANT_ID,srv=env.SUPABASE_SERVICE_ROLE_KEY;
 if(typeof merchant!=='string'||!/^[A-Za-z0-9_-]{2,100}$/.test(merchant)||typeof srv!=='string'||!srv||typeof env.SUPABASE_PUBLISHABLE_KEY!=='string'||!env.SUPABASE_PUBLISHABLE_KEY)return unavailable();
 let base;try{base=new URL(env.SUPABASE_URL);if(base.href!==SUPABASE)throw Error();}catch{return unavailable();}
 const budget=deadline(12000),abort=()=>budget.abort();request.signal?.addEventListener('abort',abort,{once:true});
 let id=null,phase='body';
 const review=reason=>{try{warnImpl({event:'domain_import_payment_status_review',reason,order_id:id});}catch{}return reply(503,'DOMAIN_IMPORT_PAYMENT_REVIEW_REQUIRED');};
 try{
  let b;try{b=await readJson(request.body,budget.wait,1024);}catch(e){return reply(e.message==='BODY_TOO_LARGE'?413:400,e.message==='BODY_TOO_LARGE'?'BODY_TOO_LARGE':'INVALID_BODY');}
  if(!b||Array.isArray(b)||Object.keys(b).length!==1||typeof b.orderId!=='string'||!ORDER.test(b.orderId))return reply(400,'INVALID_REQUEST');id=b.orderId;
  phase='auth';
  const v=await budget.wait(fetchImpl(new URL('/auth/v1/user',base).href,{method:'GET',redirect:'manual',headers:{authorization:auth,apikey:env.SUPABASE_PUBLISHABLE_KEY},signal:budget.signal}));
  if([401,403].includes(v.status))return reply(401,'INVALID_SESSION');if(v.status!==200)return reply(503,'AUTH_UNAVAILABLE');
  const user=await readJson(v.body,budget.wait,32768);if(typeof user?.id!=='string'||!UUID.test(user.id))return reply(401,'INVALID_SESSION');const uid=user.id.toLowerCase();
  const hdr={apikey:srv,authorization:'Bearer '+srv};
  phase='order';
  const t=new URL('/rest/v1/domain_import_orders',base);t.searchParams.set('select','order_id,price_idr,payment_state,import_state,midtrans_order_id');t.searchParams.set('order_id','eq.'+id);t.searchParams.set('user_id','eq.'+uid);t.searchParams.set('limit','1');
  const or=await budget.wait(fetchImpl(t.href,{method:'GET',redirect:'manual',headers:hdr,signal:budget.signal}));if(or.status!==200)throw Error('STORAGE_UNAVAILABLE');
  const rows=await readJson(or.body,budget.wait,32768);const o=Array.isArray(rows)&&rows.length===1&&rows[0].order_id===id?rows[0]:null;
  if(!o)return reply(404,'IMPORT_ORDER_NOT_FOUND');
  if(o.payment_state!=='pending')return reply(200,'DOMAIN_IMPORT_PAYMENT_STATUS',{paymentState:o.payment_state,checkedWithGateway:false});
  if(o.midtrans_order_id!==id||!Number.isSafeInteger(o.price_idr)||o.price_idr<=0)return review('order_not_checked_out');
  phase='status';
  const sr=await budget.wait(fetchImpl('https://api.midtrans.com/v2/'+encodeURIComponent(id)+'/status',{method:'GET',redirect:'manual',headers:{authorization:'Basic '+btoa(key+':'),accept:'application/json'},signal:budget.signal}));
  let g=null;if(sr.status===200||sr.status===404){try{g=await readJson(sr.body,budget.wait,32768);}catch{}}
  if(sr.status!==200&&sr.status!==404)throw Error('UPSTREAM_UNAVAILABLE');
  if(sr.status===404||g?.status_code==='404')return reply(200,'DOMAIN_IMPORT_PAYMENT_STATUS',{paymentState:'pending',checkedWithGateway:true});
  let paid;
  try{if(g?.order_id!==id||typeof g.transaction_id!=='string'||!TX.test(g.transaction_id)||g.currency!=='IDR'||g.merchant_id!==merchant)throw Error();paid=money(g.gross_amount);if(paid!==o.price_idr)throw Error();}catch{return reply(409,'DOMAIN_IMPORT_PAYMENT_IDENTITY_MISMATCH');}
  if((g.refund_amount!==undefined&&(typeof g.refund_amount!=='string'||!/^0(?:\.0{1,2})?$/.test(g.refund_amount)))||(g.refunds!==undefined&&(!Array.isArray(g.refunds)||g.refunds.length>0)))return review('refund_metadata');
  const st=g.transaction_status;let state;
  if(['pending','authorize'].includes(st))return reply(200,'DOMAIN_IMPORT_PAYMENT_STATUS',{paymentState:'pending',checkedWithGateway:true});
  if(['deny','cancel','expire','failure'].includes(st))state='failed';
  else if(g.status_code==='200'&&st==='settlement'&&PAY.includes(g.payment_type)&&(g.fraud_status===undefined||g.fraud_status==='accept'))state='paid';
  else return review('gateway_state');
  phase='record';
  const rr=await budget.wait(fetchImpl(new URL('/rest/v1/rpc/domain_import_apply_payment_v1',base).href,{method:'POST',redirect:'manual',headers:{...hdr,'content-type':'application/json'},body:JSON.stringify({p_order_id:id,p_transaction_id:g.transaction_id,p_gross_amount_idr:paid,p_state:state}),signal:budget.signal}));
  if(rr.status!==200)throw Error('STORAGE_UNAVAILABLE');
  const res=await readJson(rr.body,budget.wait,1024);
  if(state==='paid'&&(res==='paid'||res==='already_paid'))return reply(200,'DOMAIN_IMPORT_PAYMENT_STATUS',{paymentState:'paid',checkedWithGateway:true});
  if(state==='failed'&&['failed','ignored'].includes(res))return reply(200,'DOMAIN_IMPORT_PAYMENT_STATUS',{paymentState:'failed',checkedWithGateway:true});
  return review('recorder_'+String(res));
 }catch(e){if(phase==='body'&&!budget.signal.aborted)return reply(e?.message==='BODY_TOO_LARGE'?413:400,'INVALID_BODY');return reply(503,phase==='status'?'IMPORT_PAYMENT_STATUS_UNAVAILABLE':'IMPORT_UNAVAILABLE');}
 finally{budget.close();request.signal?.removeEventListener('abort',abort);}
}
