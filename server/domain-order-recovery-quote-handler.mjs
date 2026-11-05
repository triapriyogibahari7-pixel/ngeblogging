import {domainQuotePreviewResponse} from './domain-quote-preview-handler.mjs';
const PATH='/api/commerce/domains/order-recovery-quote',BASE='https://polvmlrhqoiflumibfqs.supabase.co';
const ORDER=/^DOM-[a-f0-9]{40}$/,UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
async function read(stream,signal){
 const reader=stream?.getReader();if(!reader)throw Error('BODY_UNAVAILABLE');
 try{let size=0;const chunks=[];for(;;){if(signal.aborted)throw Error('ABORTED');const x=await reader.read();if(x.done)break;size+=x.value.length;if(size>32768)throw Error('BODY_TOO_LARGE');chunks.push(x.value);}const bytes=new Uint8Array(size);let at=0;for(const x of chunks){bytes.set(x,at);at+=x.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
 finally{reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}
}
// Component only: do not route until acceptance RPC, consent UI and SQL tests are complete.
export async function domainOrderRecoveryQuoteResponse(request,env,{fetchImpl=globalThis.fetch,quoteHandler=domainQuotePreviewResponse,clock=Date.now}={}){
 const url=new URL(request.url);if(url.pathname!==PATH)return null;
 const reply=(status,code,extra={})=>new Response(JSON.stringify({code,environment:'production',orderChanged:false,checkoutCreated:false,registrationStarted:false,paymentAllowed:false,recoveryAllowed:false,replacementOrderAllowed:false,...extra}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store',vary:'Authorization','x-content-type-options':'nosniff',...(status===405?{allow:'POST'}:{})}});
 if(url.protocol!=='https:'||url.hostname!=='ngeblogging.com'||url.port||url.search)return reply(404,'NOT_FOUND');
 if(request.method!=='POST')return reply(405,'METHOD_NOT_ALLOWED');
 if(request.headers.get('origin')!==url.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
 if(env?.DOMAIN_CUSTOMER_PRODUCTION_ENABLED!=='true'||env.DOMAIN_ORDER_ENV!=='production')return reply(503,'DOMAIN_RECOVERY_DISABLED');
 if(env.SUPABASE_URL?.replace(/\/$/,'')!==BASE||!env.SUPABASE_PUBLISHABLE_KEY||!env.SUPABASE_SERVICE_ROLE_KEY)return reply(503,'DOMAIN_RECOVERY_CONFIGURATION_UNAVAILABLE');
 const auth=request.headers.get('authorization')||'';if(!/^Bearer [^\s]{1,8192}$/.test(auth))return reply(401,'AUTH_REQUIRED');
 if(!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('content-type')||''))return reply(415,'JSON_REQUIRED');
 if(request.signal.aborted)return reply(503,'DOMAIN_RECOVERY_UNAVAILABLE');
 const c=new AbortController(),abort=()=>c.abort();let stop;
 const ended=new Promise((_,reject)=>{stop=()=>reject(Error('TIMEOUT'));c.signal.addEventListener('abort',stop,{once:true});}),wait=p=>Promise.race([p,ended]);
 const timer=setTimeout(abort,25000);request.signal.addEventListener('abort',abort,{once:true});
 try{
  let input;try{input=await wait(read(request.body,c.signal));}catch{return reply(400,'INVALID_RECOVERY_REQUEST');}
  if(!input||Array.isArray(input)||Object.keys(input).length!==1||!ORDER.test(input.orderId||''))return reply(400,'INVALID_RECOVERY_REQUEST');
  const a=await wait(fetchImpl(BASE+'/auth/v1/user',{method:'GET',redirect:'manual',headers:{authorization:auth,apikey:env.SUPABASE_PUBLISHABLE_KEY},signal:c.signal}));
  if([401,403].includes(a.status))return reply(401,'INVALID_SESSION');if(a.status!==200)throw Error('AUTH_UNAVAILABLE');
  const user=await wait(read(a.body,c.signal));if(typeof user?.id!=='string'||!UUID.test(user.id))return reply(401,'INVALID_SESSION');
  const r=await wait(fetchImpl(BASE+'/rest/v1/rpc/domain_order_recovery_preflight_v1',{method:'POST',redirect:'manual',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'content-type':'application/json'},body:JSON.stringify({p_user_id:user.id.toLowerCase(),p_order_id:input.orderId}),signal:c.signal}));
  if(r.status!==200)throw Error('PREFLIGHT_UNAVAILABLE');const s=await wait(read(r.body,c.signal));
  const blocked=new Set(['DOMAIN_ORDER_NOT_FOUND','ORDER_RECOVERY_REVIEW_REQUIRED','GATEWAY_RECONCILIATION_REQUIRED','ORDER_ALREADY_CANCELLED','ORDER_SITE_BINDING_REQUIRED','ORDER_SITE_BINDING_UNVERIFIED','SITE_OWNER_REQUIRED','QUOTE_SNAPSHOT_MISMATCH','REGISTRATION_RECONCILIATION_REQUIRED','CHECKOUT_CLOCK_UNAVAILABLE','RECOVERY_NOT_REQUIRED']);
  if(s?.ok===false&&blocked.has(s.error))return reply(s.error==='DOMAIN_ORDER_NOT_FOUND'?404:s.error==='SITE_OWNER_REQUIRED'?403:409,s.error);
  const now=clock(),checked=Date.parse(s?.checked_at),updated=Date.parse(s?.order_updated_at);
  if(s?.ok!==true||s.code!=='DOMAIN_ORDER_RECOVERY_QUOTE_REVIEW_REQUIRED'||s.version!=='same-order-recovery-preflight-v1'||s.environment!=='production'||s.order_id!==input.orderId||!UUID.test(s.site_id||'')||!UUID.test(s.quote_id||'')||s.currency!=='IDR'||!Number.isSafeInteger(s.amount_idr)||s.amount_idr<1||s.amount_idr>1000000000000||!Number.isSafeInteger(now)||!Number.isFinite(checked)||checked>now+5000||now-checked>10000||!Number.isFinite(updated)||updated>now+5000||s.quote_review_allowed!==true||s.fresh_quote_required!==true||s.price_consent_required!==true||s.registrant_revalidation_required!==true||s.gateway_status_verified!==false||s.recovery_allowed!==false||s.payment_allowed!==false||s.replacement_order_allowed!==false||s.order_changed!==false||s.checkout_created!==false||s.registration_action_taken!==false||typeof s.domain!=='string'||s.domain.length>253||s.domain.split('.').length!==2||s.domain.split('.').some(x=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x)))throw Error('PREFLIGHT_UNVERIFIED');
  const quoteRequest=new Request(url.origin+'/api/commerce/domains/quote/'+encodeURIComponent(s.domain),{method:'POST',headers:{authorization:auth,origin:url.origin,accept:'application/json'},signal:c.signal});
  const qr=await wait(quoteHandler(quoteRequest,env,{fetchImpl,clock}));if(!qr||qr.status!==201||!/^application\/json(?:\s*;.*)?$/i.test(qr.headers.get('content-type')||''))return reply(503,'RECOVERY_FRESH_QUOTE_UNAVAILABLE');
  const value=await wait(read(qr.body,c.signal)),q=value?.quote;
  if(value?.code!=='DOMAIN_QUOTE_PRODUCTION'||value.environment!=='production'||value.purchaseAllowed!==false||value.checkoutCreated!==false||value.registrationStarted!==false||!q||!UUID.test(q.quoteId||'')||q.quoteId===s.quote_id||q.domain!==s.domain||q.currency!=='IDR'||q.years!==1||q.indicative!==false||!Number.isSafeInteger(q.amountIdr)||q.amountIdr<1||q.amountIdr>1000000000000||!Number.isFinite(Date.parse(q.expiresAt))||Date.parse(q.expiresAt)<=clock())throw Error('QUOTE_UNVERIFIED');
  return reply(201,'DOMAIN_ORDER_RECOVERY_QUOTE_REVIEW',{orderId:s.order_id,siteId:s.site_id,domain:s.domain,previousQuoteId:s.quote_id,previousAmountIdr:s.amount_idr,expectedOrderUpdatedAt:s.order_updated_at,quote:q,priceConsentRequired:true,registrantRevalidationRequired:true,gatewayStatusVerified:false});
 }catch{return reply(503,'DOMAIN_RECOVERY_UNAVAILABLE');}
 finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);c.signal.removeEventListener('abort',stop);}
}
