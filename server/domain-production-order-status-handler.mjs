import {readRegisteredDomainMetadata} from './domain-registered-metadata.mjs';
import {domainNotificationsResponse} from './domain-notifications-handler.mjs';
const PREFIX='/api/commerce/domains/orders/';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const ORDER=/^DOM-[a-f0-9]{40}$/;
const PAYMENTS=['pending','paid','failed','expired','cancelled','review_required','refund_pending','refunded'];
const REGISTRATIONS=['not_started','queued','processing','registered','failed','review_required'];
const validTime=x=>typeof x==='string'&&x.length<=64&&Number.isFinite(Date.parse(x));
async function jsonBody(stream,wait){const reader=stream?.getReader();if(!reader)throw Error('INVALID_JSON');try{let size=0;const chunks=[];for(;;){const x=await wait(reader.read());if(x.done)break;size+=x.value.length;if(size>32768)throw Error('BODY_TOO_LARGE');chunks.push(x.value);}const bytes=new Uint8Array(size);let at=0;for(const x of chunks){bytes.set(x,at);at+=x.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}finally{reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}}
function view(o,q){
 if(!PAYMENTS.includes(o.payment_state)||!REGISTRATIONS.includes(o.registration_state)||!Number.isSafeInteger(o.amount_idr)||o.amount_idr<1||o.amount_idr>1000000000000||!validTime(o.created_at)||!validTime(o.updated_at)||Date.parse(o.updated_at)<Date.parse(o.created_at)||(o.review_reason!==null&&typeof o.review_reason!=='string'))throw Error('INVALID_ORDER');
 const paid=o.payment_state==='paid',registered=o.registration_state==='registered';
 if(paid&&(!validTime(o.paid_at)||typeof o.midtrans_transaction_id!=='string'||!o.midtrans_transaction_id.trim()||o.midtrans_transaction_id.length>128))throw Error('INVALID_PAID_RECORD');
 if(['queued','processing','registered'].includes(o.registration_state)&&!paid)throw Error('INVALID_REGISTRATION');
 if(registered&&(!validTime(o.registered_at)||typeof o.registrar_domain_ref!=='string'||!o.registrar_domain_ref.trim()||o.registrar_domain_ref.length>200))throw Error('INVALID_REGISTRATION');
 if(typeof q.domain!=='string'||q.domain.length>253||q.domain!==q.domain.toLowerCase()||!q.domain.includes('.')||q.domain.split('.').some(x=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x))||q.years!==1||q.operation!=='registration')throw Error('INVALID_QUOTE');
 const needsReview=Boolean(o.review_reason)||o.payment_state==='review_required'||o.registration_state==='review_required'||(paid&&o.registration_state==='failed');
 const resolution=o.payment_state==='refund_pending'?'refund_pending':o.payment_state==='refunded'?'refunded':needsReview?'review_required':'none';
 const messages={pending:'Pembayaran belum terverifikasi.',failed:'Pembayaran tercatat gagal.',expired:'Batas waktu pembayaran sudah berakhir.',cancelled:'Pembayaran tercatat dibatalkan.',review_required:'Pesanan memerlukan peninjauan. Simpan ID pesanan untuk penyelesaian.',refund_pending:'Status pengembalian dana masih tertunda; belum dikonfirmasi selesai.',refunded:'Status pembayaran pesanan tercatat refunded.'};
 let message=messages[o.payment_state]||'Pembayaran terverifikasi; pendaftaran domain belum dimulai.';
 if(paid){if(registered)message='Domain sudah dikonfirmasi terdaftar.';else if(o.registration_state==='queued')message='Pembayaran terverifikasi; pendaftaran domain dalam antrean.';else if(o.registration_state==='processing')message='Pembayaran terverifikasi; pendaftaran domain sedang diproses.';else if(o.registration_state==='failed')message='Pembayaran sudah diterima, tetapi pendaftaran domain gagal. Simpan ID pesanan untuk penanganan; refund belum dikonfirmasi.';}
 if(needsReview&&!(paid&&o.registration_state==='failed'))message+=' Pesanan memerlukan peninjauan; jangan membuat pembayaran ulang.';
 return {orderId:o.order_id,domain:q.domain,years:q.years,currency:'IDR',amountIdr:o.amount_idr,paymentState:o.payment_state,registrationState:o.registration_state,paymentConfirmed:paid,registrationConfirmed:registered,paidAt:paid?o.paid_at:null,registeredAt:registered?o.registered_at:null,createdAt:o.created_at,updatedAt:o.updated_at,resolution,message};
}
export async function domainProductionOrderStatusResponse(request,env,{fetchImpl=globalThis.fetch}={}){
 const notifications=await domainNotificationsResponse(request,env,{fetchImpl});if(notifications)return notifications;
 const url=new URL(request.url);if(!url.pathname.startsWith(PREFIX))return null;
 const reply=(status,code,extra={})=>new Response(JSON.stringify({code,environment:'production',...extra}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','vary':'Authorization','x-content-type-options':'nosniff',...(status===405?{allow:'GET'}:{})}});
 if(url.protocol!=='https:'||url.hostname!=='ngeblogging.com'||url.port)return reply(404,'NOT_FOUND');
 if(request.method!=='GET')return reply(405,'METHOD_NOT_ALLOWED');
 if(url.search)return reply(400,'QUERY_NOT_ALLOWED');
 if(request.headers.has('origin')&&request.headers.get('origin')!==url.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
 const id=url.pathname.slice(PREFIX.length);if(!ORDER.test(id))return reply(400,'INVALID_ORDER_ID');
 if(env?.DOMAIN_ORDER_ENV!=='production')return reply(503,'DOMAIN_PRODUCTION_STATUS_UNAVAILABLE');
 const auth=request.headers.get('authorization')||'';if(!/^Bearer [^\s]{1,8192}$/.test(auth))return reply(401,'AUTH_REQUIRED');
 let base;try{base=new URL(env.SUPABASE_URL);if(base.href!=='https://polvmlrhqoiflumibfqs.supabase.co/'||!env.SUPABASE_PUBLISHABLE_KEY||!env.SUPABASE_SERVICE_ROLE_KEY)throw Error();}catch{return reply(503,'DOMAIN_STATUS_CONFIGURATION_UNAVAILABLE');}
 if(request.signal.aborted)return reply(503,'DOMAIN_STATUS_UNAVAILABLE');
 const c=new AbortController(),abort=()=>c.abort();let stop;
 const ended=new Promise((_,reject)=>{stop=()=>reject(Error('TIMEOUT'));c.signal.addEventListener('abort',stop,{once:true});});const timer=setTimeout(abort,10000),wait=p=>Promise.race([p,ended]);request.signal.addEventListener('abort',abort,{once:true});
 const headers={apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY};
 const fetchJson=async(target,h)=>{const r=await wait(fetchImpl(target,{method:'GET',redirect:'manual',headers:h,signal:c.signal}));if(r.status!==200)throw Error('STORAGE_UNAVAILABLE');return jsonBody(r.body,wait);};
 try{
  const verified=await wait(fetchImpl(new URL('/auth/v1/user',base).href,{method:'GET',redirect:'manual',headers:{authorization:auth,apikey:env.SUPABASE_PUBLISHABLE_KEY},signal:c.signal}));
  if([401,403].includes(verified.status))return reply(401,'INVALID_SESSION');if(verified.status!==200)return reply(503,'AUTH_UNAVAILABLE');
  const user=await jsonBody(verified.body,wait);if(typeof user?.id!=='string'||!UUID.test(user.id))return reply(401,'INVALID_SESSION');const owner=user.id.toLowerCase();
  const target=new URL('/rest/v1/domain_purchase_orders',base);target.searchParams.set('select','order_id,user_id,quote_id,environment,currency,amount_idr,payment_state,registration_state,midtrans_transaction_id,paid_at,registered_at,registrar_domain_ref,review_reason,created_at,updated_at');target.searchParams.set('order_id','eq.'+id);target.searchParams.set('user_id','eq.'+owner);target.searchParams.set('environment','eq.production');target.searchParams.set('limit','1');
  const rows=await fetchJson(target.href,headers);if(Array.isArray(rows)&&rows.length===0)return reply(404,'DOMAIN_ORDER_NOT_FOUND');const o=Array.isArray(rows)&&rows.length===1?rows[0]:null;
  if(o?.order_id!==id||o.user_id!==owner||o.environment!=='production'||o.currency!=='IDR'||typeof o.quote_id!=='string'||!UUID.test(o.quote_id))return reply(503,'DOMAIN_STATUS_UNVERIFIED');
  const quote=new URL('/rest/v1/domain_sale_quotes',base);quote.searchParams.set('select','id,user_id,environment,domain,currency,sale_price_idr,years,operation,provider_id');quote.searchParams.set('id','eq.'+o.quote_id);quote.searchParams.set('user_id','eq.'+owner);quote.searchParams.set('environment','eq.production');quote.searchParams.set('limit','1');
  const quotes=await fetchJson(quote.href,headers);const q=Array.isArray(quotes)&&quotes.length===1?quotes[0]:null;if(q?.id!==o.quote_id||q.user_id!==owner||q.environment!=='production'||q.currency!=='IDR'||q.sale_price_idr!==o.amount_idr)return reply(503,'DOMAIN_STATUS_UNVERIFIED');
  const order=view(o,q);
  const registrar=await wait(readRegisteredDomainMetadata(env,o,q,{owner,fetchImpl,signal:c.signal}));
  return reply(200,'DOMAIN_ORDER_STATUS',{order:{...order,registrar}});
 }catch{return reply(503,'DOMAIN_STATUS_UNAVAILABLE');}
 finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);c.signal.removeEventListener('abort',stop);}
}
