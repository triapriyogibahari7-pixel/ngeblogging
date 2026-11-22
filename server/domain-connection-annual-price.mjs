import {DOMAIN_CONNECTION_ANNUAL_PRICE as PRICE} from '../shared/domain-connection-annual-price.mjs';
import {customerHost,customerOptions} from '../shared/customer-domain-connection.mjs';
import {normalizeDomainMidtransServerKey} from './domain-midtrans-server-key.mjs';
import {parseDomainMidtransPaymentMethods} from './domain-midtrans-payment-methods.mjs';
const DB='https://polvmlrhqoiflumibfqs.supabase.co',ROOT='/api/domains/';
const ROUTES=['connection-price','connection-checkout','connection-midtrans-notification','connection-payment-status'];
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,ORDER=/^DCON-[a-f0-9]{32}$/;
const fail=(code,status=503)=>{throw Object.assign(Error(code),{code,status});};
const reply=(status,body)=>Response.json({price:PRICE,paymentProvider:'midtrans',paymentCurrency:'IDR',billingPurpose:PRICE.billingPurpose,environment:'production',registrationStarted:false,publicSiteVerified:false,...body},{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
function secret(v){if(typeof v!=='string'||v.length<16||v.length>1024||v.trim()!==v||/[\x00-\x20\x7f]/.test(v))fail('SIGNATURE_SECRET_REQUIRED');return v;}
function pair(t,u){return typeof t==='string'&&/^[A-Za-z0-9_-]{10,200}$/.test(t)&&['https://app.midtrans.com/snap/v2/vtweb/'+t,'https://app.midtrans.com/snap/v4/redirection/'+t].includes(u);}
function cents(s){if(typeof s!=='string'||!/^\d{1,12}(\.\d{1,2})?$/.test(s))fail('PAYMENT_AMOUNT_INVALID',409);const [a,b='']=s.split('.');return BigInt(a)*100n+BigInt(b.padEnd(2,'0'));}
async function json(source,signal,max=65536){const reader=source.body?.getReader();if(!reader)throw Error('BODY_REQUIRED');const cancel=()=>{reader.cancel().catch(()=>{});};signal.addEventListener('abort',cancel,{once:true});try{let size=0,text='';const d=new TextDecoder('utf-8',{fatal:true});for(;;){if(signal.aborted)throw Error('DEADLINE');const x=await reader.read();if(x.done)break;size+=x.value.byteLength;if(size>max)throw Error('BODY_TOO_LARGE');text+=d.decode(x.value,{stream:true});}if(signal.aborted)throw Error('DEADLINE');return JSON.parse(text+d.decode());}finally{signal.removeEventListener('abort',cancel);cancel();}}
export function domainConnectionAnnualPriceResponse(request,env={}){
 const url=new URL(request.url);if(!ROUTES.some(x=>url.pathname===ROOT+x))return null;
 if(url.protocol!=='https:'||url.hostname!=='ngeblogging.com'||url.port||url.search)return reply(404,{code:'NOT_FOUND'});
 if(url.pathname===ROOT+'connection-price')return request.method==='GET'?reply(200,{checkoutReady:false,paymentRequired:true,requiresLivePreflight:true,service:PRICE.billingPurpose,domainPurchaseIncluded:false}):reply(405,{code:'METHOD_NOT_ALLOWED'});
 if(request.method!=='POST')return reply(405,{code:'METHOD_NOT_ALLOWED'});
 if(url.pathname===ROOT+'connection-checkout'&&(env.DOMAIN_CONNECTION_MIDTRANS_ENABLED!=='true'||env.DOMAIN_CONNECTION_PROVISIONING_READY!=='true'))return reply(503,{code:'DOMAIN_CONNECTION_MIDTRANS_NOT_READY',checkoutReady:false,charged:false,error:'Checkout koneksi domain belum dibuka. Tidak ada pembayaran baru yang dibuat oleh permintaan ini.'});
 return paymentRequest(request,env,url);
}
async function paymentRequest(request,env,url){
 const notify=url.pathname.endsWith('/connection-midtrans-notification'),checkout=url.pathname.endsWith('/connection-checkout');
 if(!notify&&request.headers.get('origin')!==url.origin)return reply(403,{code:'ORIGIN_NOT_ALLOWED'});
 if(!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('content-type')||''))return reply(415,{code:'JSON_REQUIRED'});
 const c=new AbortController(),abort=()=>c.abort(),timer=setTimeout(abort,18000);if(request.signal.aborted)abort();else request.signal.addEventListener('abort',abort,{once:true});
 try{
  if(String(env.SUPABASE_URL||'').replace(/\/$/,'')!==DB||!env.SUPABASE_PUBLISHABLE_KEY||!env.SUPABASE_SERVICE_ROLE_KEY)fail('STORAGE_NOT_READY');
  const key=normalizeDomainMidtransServerKey(env.DOMAIN_MIDTRANS_PRODUCTION_SERVER_KEY,{environment:'production'}),merchant=env.DOMAIN_MIDTRANS_PRODUCTION_MERCHANT_ID;
  if(typeof merchant!=='string'||!/^[A-Za-z0-9_-]{2,100}$/.test(merchant))fail('MERCHANT_NOT_READY');
  const secrets=[secret(env.DOMAIN_CONNECTION_MIDTRANS_SIGNATURE_SECRET)];if(env.DOMAIN_CONNECTION_MIDTRANS_SIGNATURE_SECRET_PREVIOUS)secrets.push(secret(env.DOMAIN_CONNECTION_MIDTRANS_SIGNATURE_SECRET_PREVIOUS));
  const admin={apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY};
  async function call(target,init={},expected=200){const r=await fetch(target,{...init,redirect:'error',signal:c.signal});if(r.status!==expected)fail('PAYMENT_UPSTREAM_UNAVAILABLE');return json(r,c.signal);}
  const rpc=(name,args)=>call(DB+'/rest/v1/rpc/'+name,{method:'POST',headers:{...admin,'content-type':'application/json'},body:JSON.stringify(args)});
  async function ready(){const readiness=await rpc('domain_connection_payment_ready_v2',{});if(readiness?.version!=='connection-midtrans-v2'||readiness.amountIdr!==PRICE.amountIdr||readiness.periodMonths!==12)fail('PAYMENT_LEDGER_NOT_READY');}
  function checked(r){if(!r||!ORDER.test(r.order_id||'')||r.environment!=='production'||r.merchant_id!==merchant||r.purpose!==PRICE.billingPurpose||r.amount_idr!==PRICE.amountIdr||r.currency!=='IDR'||r.period_months!==12||r.includes_www!==true)fail('ORDER_UNVERIFIED');return r;}
  async function stored(id,user){const rs=await call(DB+'/rest/v1/domain_connection_orders?order_id=eq.'+id+(user?'&user_id=eq.'+user:'')+'&select=*&limit=1',{headers:admin});if(!Array.isArray(rs)||rs.length!==1)fail('ORDER_NOT_FOUND',404);return checked(rs[0]);}
  async function hold(r,reason,transaction){const h=await rpc('domain_connection_payment_hold_v2',{p_order:r.order_id,p_reason:reason,p_transaction:transaction||r.transaction_id||null});if(h?.ok!==true||h.orderId!==r.order_id||h.reviewRequired!==true)fail('PAYMENT_HOLD_UNVERIFIED');}
  async function observe(r,hint=''){
   const response=await fetch('https://api.midtrans.com/v2/'+r.order_id+'/status',{redirect:'error',signal:c.signal,headers:{authorization:'Basic '+btoa(key+':'),accept:'application/json'}});
   if(response.status!==200&&response.status!==404)fail('PAYMENT_STATUS_UNAVAILABLE');const s=await json(response,c.signal);
   if(response.status===404||String(s.status_code)==='404'){if(r.grant_expires_at)await hold(r,'status_disappeared');return 'not_started_or_unavailable';}
   if(s.order_id!==r.order_id||s.merchant_id!==merchant||typeof s.transaction_id!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(s.transaction_id)||typeof s.transaction_status!=='string'||!/^\d{3}$/.test(String(s.status_code)))fail('PAYMENT_IDENTITY_MISMATCH',409);
   if(s.currency!=='IDR'||cents(s.gross_amount)!==BigInt(r.amount_idr)*100n){await hold(r,'payment_mismatch',s.transaction_id);return s.transaction_status;}
   if(r.transaction_id&&r.transaction_id!==s.transaction_id){await hold(r,'transaction_changed',s.transaction_id);return s.transaction_status;}
   const refunds=['refund','partial_refund','chargeback','partial_chargeback'];
   if(refunds.includes(hint)&&!refunds.includes(s.transaction_status)){await hold(r,hint,s.transaction_id);fail('REFUND_STATUS_RECONCILIATION_REQUIRED');}
   if(refunds.includes(s.transaction_status)){await hold(r,s.transaction_status,s.transaction_id);return s.transaction_status;}
   const paid=String(s.status_code)==='200'&&['','accept'].includes(s.fraud_status??'')&&(s.transaction_status==='settlement'||s.transaction_status==='capture'&&s.fraud_status==='accept');
   if(['settlement','capture'].includes(hint)&&!paid&&!['deny','cancel','expire','failure'].includes(s.transaction_status)){if(r.grant_expires_at)await hold(r,'status_regression',s.transaction_id);fail('PAYMENT_STATUS_NOT_CURRENT');}
   if(paid){const applied=await rpc('domain_connection_apply_status_v1',{p_order:r.order_id,p_merchant:merchant,p_transaction:s.transaction_id,p_amount:s.gross_amount,p_currency:s.currency,p_status_code:String(s.status_code),p_transaction_status:s.transaction_status,p_fraud_status:s.fraud_status??null});if(applied?.ok!==true)fail('PAYMENT_APPLICATION_UNVERIFIED');}
   else if(r.grant_expires_at)await hold(r,'status_regression',s.transaction_id);
   return s.transaction_status;
  }
  const b=await json(request,c.signal,notify?16384:4096);if(!b||Array.isArray(b)||typeof b!=='object')fail('INVALID_REQUEST',400);
  if(notify){
   if(!ORDER.test(b.order_id||'')||!/^\d{3}$/.test(String(b.status_code))||typeof b.signature_key!=='string'||!/^[a-f0-9]{128}$/i.test(b.signature_key))fail('INVALID_NOTIFICATION',400);cents(b.gross_amount);
   let valid=0;for(const signingSecret of secrets){const digest=await crypto.subtle.digest('SHA-512',new TextEncoder().encode(b.order_id+String(b.status_code)+b.gross_amount+signingSecret));const hex=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');let difference=0;for(let i=0;i<128;i++)difference|=hex.charCodeAt(i)^b.signature_key.toLowerCase().charCodeAt(i);valid|=difference===0?1:0;}if(!valid)fail('INVALID_SIGNATURE',401);
   await ready();const r=await stored(b.order_id);if(cents(b.gross_amount)!==BigInt(r.amount_idr)*100n)fail('NOTIFICATION_AMOUNT_MISMATCH',409);const observed=await observe(r,b.transaction_status);if(observed==='not_started_or_unavailable')fail('PAYMENT_STATUS_UNAVAILABLE');return reply(200,{received:true,orderId:r.order_id});
  }
  const authorization=request.headers.get('authorization')||'';if(!/^Bearer [^\s]{1,8192}$/.test(authorization))fail('AUTH_REQUIRED',401);
  const headers={authorization,apikey:env.SUPABASE_PUBLISHABLE_KEY},user=await call(DB+'/auth/v1/user',{headers});if(!UUID.test(user?.id||''))fail('AUTH_REQUIRED',401);await ready();
  if(!checkout){if(Object.keys(b).length!==1||!ORDER.test(b.orderId||''))fail('INVALID_REQUEST',400);let r=await stored(b.orderId,user.id);const providerPaymentState=await observe(r);r=await stored(b.orderId,user.id);return reply(200,{orderId:r.order_id,userId:r.user_id,siteId:r.site_id,hostname:r.hostname,paymentState:r.payment_state,providerPaymentState,reviewRequired:r.payment_state==='review_required',grantExpiresAt:r.grant_expires_at});}
  if(Object.keys(b).sort().join(',')!=='hostname,idempotencyKey,returnPath,siteId'||!UUID.test(b.siteId||'')||!UUID.test(b.idempotencyKey||''))fail('INVALID_REQUEST',400);
  const hostname=customerHost(b.hostname);if(hostname.startsWith('www.')||hostname.length>249)fail('INVALID_HOSTNAME',400);
  if(typeof b.returnPath!=='string'||!b.returnPath.startsWith('/')||b.returnPath.startsWith('//')||b.returnPath.includes('\\')||b.returnPath.length>2048)fail('INVALID_RETURN_PATH',400);
  const back=new URL(b.returnPath,url.origin);if(back.origin!==url.origin||back.search||back.hash||back.pathname!==b.returnPath)fail('INVALID_RETURN_PATH',400);
  const sites=await call(DB+'/rest/v1/sites?id=eq.'+b.siteId+'&select=id,owner_id,custom_domain,slug&limit=1',{headers});if(!Array.isArray(sites)||sites.length!==1||sites[0].id!==b.siteId)fail('SITE_MANAGER_REQUIRED',403);
  if(sites[0].owner_id!==user.id){const roles=await call(DB+'/rest/v1/site_members?site_id=eq.'+b.siteId+'&user_id=eq.'+user.id+'&role=in.(owner,admin)&select=role&limit=1',{headers});if(!Array.isArray(roles)||!roles.length)fail('SITE_MANAGER_REQUIRED',403);}
  const site=sites[0],freeAddress=typeof site.slug==='string'&&/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(site.slug)&&site.custom_domain===site.slug+'.ngeblogging.com';
  if(site.custom_domain&&!freeAddress)fail('EXISTING_PRIMARY_REQUIRES_REVIEW',409);
  const rights=await call(DB+'/rest/v1/domain_connection_entitlements?hostname=eq.'+hostname+'&select=site_id,expires_at,review_required&limit=1',{headers:admin});if(!Array.isArray(rights))fail('RIGHTS_UNVERIFIED');if(rights.length){const e=rights[0];if(e.site_id!==b.siteId||e.review_required)fail('DOMAIN_REVIEW_REQUIRED',409);if(Date.parse(e.expires_at)>Date.now())return reply(200,{userId:user.id,siteId:b.siteId,hostname,paymentRequired:false,grantExpiresAt:e.expires_at});}
  const options=customerOptions(env);if(!options.configurationReady||!options.apexReady)fail('SAAS_NOT_READY');
  const existing=await call(DB+'/rest/v1/site_domains?or=(hostname.eq.'+hostname+',hostname.eq.www.'+hostname+')&select=site_id,provider&limit=3',{headers:admin});if(!Array.isArray(existing)||existing.some(d=>d.site_id!==b.siteId||!['cloudflare','cloudflare-custom-hostnames'].includes(d.provider)))fail('DOMAIN_MIGRATION_REQUIRED',409);
  const cf='https://api.cloudflare.com/client/v4/zones/'+env.CLOUDFLARE_ZONE_ID,cfHeaders={authorization:'Bearer '+String(env.CLOUDFLARE_DOMAIN_API_TOKEN||env.CLOUDFLARE_API_TOKEN||'').trim()};
  const [zone,fallback,target,capability]=await Promise.all(['','/custom_hostnames/fallback_origin','/dns_records?name='+encodeURIComponent(options.cnameTarget)+'&per_page=2','/custom_hostnames?per_page=1'].map(path=>call(cf+path,{headers:cfHeaders})));
  const origin=fallback.result?.origin;if(zone.success!==true||zone.result?.id!==env.CLOUDFLARE_ZONE_ID||zone.result?.name!=='ngeblogging.com'||zone.result?.account?.id!==env.CLOUDFLARE_ACCOUNT_ID||zone.result?.status!=='active'||fallback.success!==true||fallback.result?.status!=='active'||typeof origin!=='string'||!origin.endsWith('.ngeblogging.com')||origin===options.cnameTarget||!/^[a-z0-9.-]+$/.test(origin)||target.success!==true||!Array.isArray(target.result)||!target.result.some(x=>x.name===options.cnameTarget&&x.proxied===true&&['A','AAAA','CNAME'].includes(x.type))||capability.success!==true||!Array.isArray(capability.result))fail('SAAS_NOT_READY');
  const methods=parseDomainMidtransPaymentMethods(env.DOMAIN_MIDTRANS_PRODUCTION_PAYMENT_METHODS_JSON);
  const reserved=await rpc('domain_connection_reserve_v1',{p_user:user.id,p_site:b.siteId,p_hostname:hostname,p_key:b.idempotencyKey,p_merchant:merchant}),r=checked(reserved?.order);
  if(reserved.ok!==true||r.user_id!==user.id||r.site_id!==b.siteId||r.hostname!==hostname||r.idempotency_key!==b.idempotencyKey)fail('ORDER_BINDING_UNVERIFIED');
  if(reserved.action==='reconcile'&&r.payment_state==='paid'&&Number.isFinite(Date.parse(r.grant_expires_at))&&Date.parse(r.grant_expires_at)<=Date.now())return reply(409,{code:'CONNECTION_RENEWAL_KEY_REQUIRED',newAttemptAllowed:true,userId:user.id,siteId:b.siteId,hostname,error:'Masa layanan lama sudah berakhir. Klik Hubungkan domain kembali untuk membuat tagihan perpanjangan.'});
  if(!['create','reuse'].includes(reserved.action))fail('ORDER_RECONCILIATION_REQUIRED',409);
  const start=Date.parse(r.created_at),end=Date.parse(r.checkout_expires_at);if(!Number.isFinite(start)||!Number.isFinite(end)||start>Date.now()+5000||end-start!==7200000||end-Date.now()<30000)fail('CHECKOUT_WINDOW_EXPIRED',409);
  let token=r.snap_token,checkoutUrl=r.checkout_url;
  if(reserved.action==='create'){const snap=await call('https://app.midtrans.com/snap/v1/transactions',{method:'POST',headers:{authorization:'Basic '+btoa(key+':'),accept:'application/json','content-type':'application/json','X-Override-Notification':url.origin+ROOT+'connection-midtrans-notification'},body:JSON.stringify({transaction_details:{order_id:r.order_id,gross_amount:r.amount_idr},item_details:[{id:PRICE.productId,price:r.amount_idr,quantity:1,name:'Koneksi domain + www 12 bulan'}],enabled_payments:methods,customer_imposed_payment_fee:{enable:false},expiry:{start_time:new Date(start+25200000).toISOString().slice(0,19).replace('T',' ')+' +0700',unit:'minutes',duration:120},callbacks:{finish:back.href+'?domain_connection_order='+r.order_id}})},201);token=snap.token;checkoutUrl=snap.redirect_url;}
  if(!pair(token,checkoutUrl))fail('CHECKOUT_TARGET_UNVERIFIED');
  const saved=await rpc('domain_connection_save_checkout_v1',{p_order:r.order_id,p_user:user.id,p_token:token,p_url:checkoutUrl}),s=checked(saved?.order);
  if(saved.ok!==true||s.order_id!==r.order_id||s.user_id!==user.id||s.site_id!==b.siteId||s.hostname!==hostname||s.payment_state!=='pending'||s.checkout_state!=='ready'||s.snap_token!==token||s.checkout_url!==checkoutUrl||Date.parse(s.checkout_expires_at)!==end||end<=Date.now())fail('CHECKOUT_SAVE_UNVERIFIED');
  return reply(200,{code:'DOMAIN_CONNECTION_CHECKOUT_PRODUCTION',checkoutReady:true,checkoutCreated:true,paymentRequired:true,userId:user.id,siteId:b.siteId,hostname,checkout:{orderId:s.order_id,currency:'IDR',amountIdr:s.amount_idr,expiresAt:s.checkout_expires_at,url:s.checkout_url,snapToken:s.snap_token}});
 }catch(e){return reply([400,401,403,404,409].includes(e.status)?e.status:503,{code:/^[A-Z_]+$/.test(e.code||'')?e.code:'CONNECTION_RECONCILIATION_REQUIRED',newAttemptAllowed:false,error:'Pembayaran atau kesiapan layanan belum dapat dipastikan. Gunakan pesanan yang sama; jangan membuat pembayaran pengganti.'});}
 finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);abort();}
}
