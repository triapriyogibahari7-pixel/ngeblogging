import {parseDomainMidtransPaymentMethods} from './domain-midtrans-payment-methods.mjs';
import {MIDTRANS_KEY_DIAGNOSTIC_VERSION,diagnoseDomainMidtransKey} from './domain-midtrans-key-diagnostic.mjs';
import {normalizeDomainMidtransServerKey} from './domain-midtrans-server-key.mjs';
import {domainMidtransPopupClientKey} from './domain-midtrans-presentation.mjs';
import {validateRecoveryWindow,RECOVERY_POLICY} from '../shared/domain-recovery-policy-v2.mjs';
import {validateStandardCheckoutWindow,STANDARD_CHECKOUT_POLICY} from '../shared/domain-standard-checkout-window.mjs';
const HOST='feature-domain-stages5-10-integration-20261030-ngeblogging.triapriyogibahari7.workers.dev';
const PATH='/api/commerce/domains/checkout';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const ORDER=/^DOM-[a-f0-9]{40}$/;
function tokenPair(token,url,production){const host=production?'app.midtrans.com':'app.sandbox.midtrans.com';return typeof token==='string'&&/^[A-Za-z0-9_-]{10,200}$/.test(token)&&['https://'+host+'/snap/v2/vtweb/'+token,'https://'+host+'/snap/v4/redirection/'+token].includes(url);}
async function bounded(promise,signal){if(signal.aborted)throw Error('TIMEOUT');let stop;const ended=new Promise((_,reject)=>{stop=()=>reject(Error('TIMEOUT'));signal.addEventListener('abort',stop,{once:true});});try{return await Promise.race([promise,ended]);}finally{signal.removeEventListener('abort',stop);}}
async function jsonBody(body,signal,limit){const reader=body?.getReader();if(!reader)throw Error('INVALID_BODY');try{let size=0;const chunks=[];for(;;){const x=await bounded(reader.read(),signal);if(x.done)break;size+=x.value.length;if(size>limit)throw Error('BODY_TOO_LARGE');chunks.push(x.value);}const bytes=new Uint8Array(size);let pos=0;for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}finally{reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}}
function snapshot(s,id,now,production,recoveryEnabled=false){const standard=production&&s?.payment_window_policy===STANDARD_CHECKOUT_POLICY,recovery=production&&recoveryEnabled&&s?.payment_window_policy===RECOVERY_POLICY;if(standard){validateStandardCheckoutWindow(s,now);if(Date.parse(s.expiry_anchor_at)!==Date.parse(s.order_created_at)||Date.parse(s.expires_at)!==Date.parse(s.payment_window_expires_at)||(s.action==='create'&&s.duration_minutes!==120))throw Error('STANDARD_CHECKOUT_WINDOW_UNVERIFIED');}if(recovery)validateRecoveryWindow(s,now);const environment=production?'production':'sandbox',anchor=Date.parse(s?.expiry_anchor_at),expires=Date.parse(s?.expires_at);if(s?.ok!==true||!['create','reuse'].includes(s.action)||s.order_id!==id||s.environment!==environment||s.currency!=='IDR'||!Number.isSafeInteger(s.amount_idr)||s.amount_idr<=0||s.amount_idr>1000000000000||typeof s.attempt_id!=='string'||!UUID.test(s.attempt_id)||!Number.isFinite(anchor)||!Number.isFinite(expires)||anchor>now+5000||expires<=now||expires<=anchor||expires-anchor>((standard||recovery)?7200000:900000))throw Error('SNAPSHOT_UNVERIFIED');if(s.action==='create'&&(s.fixture_only!==false||!Number.isInteger(s.duration_minutes)||s.duration_minutes<(production?1:5)||s.duration_minutes>((standard||recovery)?120:15)||expires-anchor!==s.duration_minutes*60000||expires-now<(production?30000:300000)))throw Error('CHECKOUT_WINDOW_UNSUPPORTED');if(s.action==='reuse'&&!tokenPair(s.snap_token,s.checkout_url,production))throw Error('SNAPSHOT_UNVERIFIED');return s;}
const errors={DOMAIN_ORDER_NOT_FOUND:404,ORDER_ALREADY_PROCESSED:409,CHECKOUT_IN_PROGRESS:409,CHECKOUT_RECONCILIATION_REQUIRED:409,CHECKOUT_EXPIRED:409,CHECKOUT_WINDOW_EXPIRED:409,INVALID_CHECKOUT_REQUEST:400,PRODUCTION_QUOTE_UNVERIFIED:503,ORDER_SITE_BINDING_REQUIRED:409,ORDER_SITE_BINDING_UNVERIFIED:503,SITE_OWNER_REQUIRED:403,REGISTRANT_DETAILS_REQUIRED:409,QUOTE_SNAPSHOT_MISMATCH:409,CHECKOUT_SESSION_CONFLICT:409,GATEWAY_RECONCILIATION_REQUIRED:409};
export async function domainCheckoutPreviewResponse(request,env,{fetchImpl=globalThis.fetch,now=()=>Date.now()}={}){
 const url=new URL(request.url);if(url.pathname!==PATH)return null;
 const production=url.hostname==='ngeblogging.com',environment=production?'production':'sandbox';
 const reply=(status,code,extra={})=>new Response(JSON.stringify({code,environment,diagnosticVersion:MIDTRANS_KEY_DIAGNOSTIC_VERSION,purchaseAllowed:false,registrationStarted:false,...extra}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...(status===405?{allow:'POST'}:{})}});
 if(url.protocol!=='https:'||(!production&&url.hostname!==HOST)||url.port)return reply(404,'NOT_FOUND');
 if(request.method!=='POST')return reply(405,'METHOD_NOT_ALLOWED');
 if(request.headers.get('origin')!==url.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
 if(url.search)return reply(400,'QUERY_NOT_ALLOWED');
 if(production?env?.DOMAIN_CUSTOMER_PRODUCTION_ENABLED!=='true':env?.DOMAIN_CHECKOUT_PREVIEW_ENABLED!=='true')return reply(503,production?'DOMAIN_PRODUCTION_CHECKOUT_DISABLED':'DOMAIN_CHECKOUT_PREVIEW_DISABLED');
 if(env.DOMAIN_ORDER_ENV!==environment||(production?env.DOMAIN_PAYMENT_PRODUCTION_ENABLED!=='true':env.DOMAIN_PAYMENT_NOTIFICATION_PREVIEW_ENABLED!=='true'))return reply(503,production?'DOMAIN_PRODUCTION_CHECKOUT_NOT_READY':'DOMAIN_CHECKOUT_SANDBOX_NOT_READY');
 const auth=request.headers.get('authorization')||'';if(!/^Bearer [^\s]{1,8192}$/.test(auth))return reply(401,'AUTH_REQUIRED');
 if(!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('content-type')||''))return reply(415,'JSON_REQUIRED');
 const configFailure=code=>reply(503,code,{configurationUnavailable:true});
 let base;try{base=new URL(env.SUPABASE_URL);if(base.protocol!=='https:'||base.hostname!=='polvmlrhqoiflumibfqs.supabase.co'||base.port||base.username||base.password||base.pathname!=='/'||base.search||base.hash)throw Error();}catch{return configFailure('CHECKOUT_SUPABASE_URL_INVALID');}
 const rawKey=production?env.DOMAIN_MIDTRANS_PRODUCTION_SERVER_KEY:env.DOMAIN_MIDTRANS_SANDBOX_SERVER_KEY;
 if(!production&&!UUID.test(env.REGISTRAR_DIAGNOSTIC_ADMIN_USER_ID||''))return configFailure('CHECKOUT_ADMIN_CONFIGURATION_INVALID');
 if(!env.SUPABASE_PUBLISHABLE_KEY)return configFailure('CHECKOUT_SUPABASE_PUBLIC_KEY_MISSING');
 if(!env.SUPABASE_SERVICE_ROLE_KEY)return configFailure('CHECKOUT_SUPABASE_SERVICE_KEY_MISSING');
 let key;try{key=normalizeDomainMidtransServerKey(rawKey,{environment});}catch(error){return reply(503,error?.code==='MIDTRANS_SERVER_KEY_MISSING'?'CHECKOUT_MIDTRANS_SERVER_KEY_MISSING':'CHECKOUT_MIDTRANS_SERVER_KEY_INVALID',{configurationUnavailable:true,keyDiagnostic:diagnoseDomainMidtransKey(rawKey,{environment})});}
 let methods;if(production){
  try{methods=parseDomainMidtransPaymentMethods(env.DOMAIN_MIDTRANS_PRODUCTION_PAYMENT_METHODS_JSON);}catch(error){return configFailure(error?.code==='CHECKOUT_PAYMENT_METHODS_MISSING'?'CHECKOUT_PAYMENT_METHODS_MISSING':'CHECKOUT_PAYMENT_METHODS_INVALID');}
  const merchant=env.DOMAIN_MIDTRANS_PRODUCTION_MERCHANT_ID;
  if(merchant===undefined||merchant===null||merchant==='')return configFailure('CHECKOUT_MERCHANT_ID_MISSING');
  if(typeof merchant!=='string'||!/^[A-Za-z0-9_-]{2,100}$/.test(merchant))return configFailure('CHECKOUT_MERCHANT_ID_INVALID');
 }
 const c=new AbortController(),abort=()=>c.abort(),timer=setTimeout(abort,18000);if(request.signal.aborted)abort();else request.signal.addEventListener('abort',abort,{once:true});
 let userId=null,id=null,attempt=null;
 const rpc=async(name,args,signal=c.signal)=>{const r=await bounded(fetchImpl(new URL('/rest/v1/rpc/'+name,base).href,{method:'POST',redirect:'manual',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'content-type':'application/json'},body:JSON.stringify(args),signal}),signal);if(!r.ok||r.status>=300)throw Error('STORAGE_UNAVAILABLE');return jsonBody(r.body,signal,32768);};
 const review=async()=>{if(!attempt)return false;const cleanup=new AbortController(),t=setTimeout(()=>cleanup.abort(),4000);try{const r=await rpc('domain_review_'+environment+'_checkout',{p_user_id:userId,p_order_id:id,p_attempt_id:attempt},cleanup.signal);return r?.ok===true&&r.order_id===id&&r.environment===environment&&['ready','review_required'].includes(r.state)&&r.new_attempt_allowed===false;}catch{return false;}finally{clearTimeout(t);}};
 try{
  let b;try{b=await jsonBody(request.body,c.signal,1024);}catch(e){return reply(e.message==='BODY_TOO_LARGE'?413:400,e.message==='BODY_TOO_LARGE'?'BODY_TOO_LARGE':'INVALID_BODY');}
  if(!b||Array.isArray(b)||Object.keys(b).length!==1||typeof b.orderId!=='string'||!ORDER.test(b.orderId))return reply(400,'INVALID_CHECKOUT_REQUEST');id=b.orderId;
  const verified=await bounded(fetchImpl(new URL('/auth/v1/user',base).href,{method:'GET',redirect:'manual',headers:{authorization:auth,apikey:env.SUPABASE_PUBLISHABLE_KEY},signal:c.signal}),c.signal);
  if([401,403].includes(verified.status))return reply(401,'INVALID_SESSION');if(!verified.ok||verified.status>=300)return reply(503,'AUTH_UNAVAILABLE');
  const user=await jsonBody(verified.body,c.signal,32768);if(typeof user?.id!=='string'||!UUID.test(user.id))return reply(401,'INVALID_SESSION');userId=user.id.toLowerCase();if(!production&&userId!==env.REGISTRAR_DIAGNOSTIC_ADMIN_USER_ID.toLowerCase())return reply(403,'ADMIN_REQUIRED');
  const s=await rpc(production&&env.DOMAIN_ORDER_RECOVERY_ENABLED==='true'?'domain_begin_recovery_checkout_v2':production&&env.DOMAIN_ORDER_SITE_BINDING_ENABLED==='true'?'domain_begin_site_production_checkout':'domain_begin_'+environment+'_checkout',{p_user_id:userId,p_order_id:id});
  if(s?.ok===false){const known=Object.hasOwn(errors,s.error);return reply(known?errors[s.error]:503,known?s.error:'CHECKOUT_STORAGE_UNAVAILABLE');}
  if(s?.action==='create'&&s.order_id===id&&typeof s.attempt_id==='string'&&UUID.test(s.attempt_id))attempt=s.attempt_id;
  snapshot(s,id,now(),production,env.DOMAIN_ORDER_RECOVERY_ENABLED==='true');
  let token=s.snap_token,checkoutUrl=s.checkout_url;
  if(s.action==='create'){
   const start=new Date(Date.parse(s.expiry_anchor_at)+25200000).toISOString().slice(0,19).replace('T',' ')+' +0700';
   const r=await bounded(fetchImpl('https://'+(production?'app.midtrans.com':'app.sandbox.midtrans.com')+'/snap/v1/transactions',{method:'POST',redirect:'manual',headers:{authorization:'Basic '+btoa(key+':'),accept:'application/json','content-type':'application/json','X-Override-Notification':url.origin+'/api/commerce/domains/midtrans/'+(production?'production-notification':'notification')},body:JSON.stringify({transaction_details:{order_id:id,gross_amount:s.amount_idr},...(production?{enabled_payments:methods}:{credit_card:{secure:true}}),customer_imposed_payment_fee:{enable:false},expiry:{start_time:start,unit:'minutes',duration:s.duration_minutes},callbacks:{finish:production?url.origin+'/domains/orders/'+id:url.origin+'/assets/registrar-diagnostic-stage6'}}),signal:c.signal}),c.signal);
   if(r.status!==201)throw Error('SNAP_RESULT_UNCLEAR');const result=await jsonBody(r.body,c.signal,8192);if(!tokenPair(result?.token,result?.redirect_url,production))throw Error('SNAP_RESULT_UNCLEAR');token=result.token;checkoutUrl=result.redirect_url;
  }
  const saved=await rpc('domain_complete_'+environment+'_checkout',{p_user_id:userId,p_order_id:id,p_attempt_id:s.attempt_id,p_snap_token:token,p_checkout_url:checkoutUrl});
  if(saved?.ok!==true||saved.order_id!==id||saved.environment!==environment||saved.currency!=='IDR'||saved.amount_idr!==s.amount_idr||saved.attempt_id!==s.attempt_id||saved.state!=='ready'||saved.registration_action_taken!==false||typeof saved.reused!=='boolean'||Date.parse(saved.expires_at)!==Date.parse(s.expires_at))throw Error('CHECKOUT_SAVE_UNVERIFIED');
  if(saved.checkout_available===false){attempt=null;return reply(409,'CHECKOUT_NOT_AVAILABLE');}
  if(saved.checkout_available!==true||saved.payment_state!=='pending'||saved.snap_token!==token||saved.checkout_url!==checkoutUrl||Date.parse(saved.expires_at)<=now())throw Error('CHECKOUT_SAVE_UNVERIFIED');
  attempt=null;return reply(s.action==='reuse'?200:201,production?'DOMAIN_CHECKOUT_PRODUCTION':'DOMAIN_CHECKOUT_SANDBOX',{purchaseAllowed:production,checkoutCreated:true,reused:s.action==='reuse',checkout:{orderId:id,currency:'IDR',amountIdr:saved.amount_idr,expiresAt:saved.expires_at,url:saved.checkout_url,...(production?{snapToken:saved.snap_token,clientKey:domainMidtransPopupClientKey(env,true)}:{})}});
 }catch{const marked=await review();return reply(503,'CHECKOUT_RECONCILIATION_REQUIRED',{newAttemptAllowed:false,reviewRecorded:marked});}
 finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);}
}
