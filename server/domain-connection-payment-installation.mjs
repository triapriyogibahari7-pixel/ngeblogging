import {domainConnectionAnnualPriceResponse} from './domain-connection-annual-price.mjs';
import {installAndBindPaidConnectionPair} from './domain-connection-install-and-bind.mjs';
import {DOMAIN_CONNECTION_ANNUAL_PRICE as PRICE} from '../shared/domain-connection-annual-price.mjs';
import {customerHost} from '../shared/customer-domain-connection.mjs';

const DB='https://polvmlrhqoiflumibfqs.supabase.co',ROOT='/api/domains/';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,ORDER=/^DCON-[a-f0-9]{32}$/;
const fail=code=>{throw Object.assign(Error(code),{code});};
const safeCode=e=>/^[A-Z_]{1,100}$/.test(e?.code||'')?e.code:'CONNECTION_INSTALLATION_PENDING';
const reply=(status,body)=>Response.json({price:PRICE,paymentProvider:'midtrans',paymentCurrency:'IDR',billingPurpose:PRICE.billingPurpose,environment:'production',registrationStarted:false,publicSiteVerified:false,primaryChanged:false,...body},{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
async function readJson(response){
 const reader=response.body?.getReader();if(!reader)fail('FULFILLMENT_BODY_REQUIRED');
 try{const decoder=new TextDecoder('utf-8',{fatal:true});let text='',size=0;for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>65536)fail('FULFILLMENT_BODY_TOO_LARGE');text+=decoder.decode(part.value,{stream:true});}return JSON.parse(text+decoder.decode());}
 finally{reader.cancel().catch(()=>{});}
}

export function domainConnectionPaymentInstallationResponse(request,env={},context){
 const url=new URL(request.url),canonical=url.protocol==='https:'&&url.hostname==='ngeblogging.com'&&!url.port&&!url.search;
 if(canonical&&request.method==='POST'&&url.pathname===ROOT+'connection-checkout'){
  // Serving enforcement is wired at the Worker entry point. Keep checkout closed
  // until the operator has verified SQL, SaaS, installation and payment readiness.
  const flags=['CUSTOM_DOMAIN_BYOD_ENABLED','CUSTOM_DOMAIN_BYOD_SAAS_READY','DOMAIN_CONNECTION_INSTALLER_ENABLED','DOMAIN_CONNECTION_PROOF_ENABLED','DOMAIN_CONNECTION_MIDTRANS_ENABLED','DOMAIN_CONNECTION_PROVISIONING_READY'];
  const proofKey=env.DOMAIN_CONNECTION_PROOF_SECRET;
  // The paid pair installer currently supports apex CNAME flattening only.
  // Reject unsupported or implicit modes before delegating to payment preflight.
  const apexSupported=env.CLOUDFLARE_SAAS_APEX_MODE==='cname-flattening';
  const ready=apexSupported&&flags.every(name=>env[name]==='true')&&typeof proofKey==='string'&&proofKey.length>=32&&proofKey.length<=4096&&proofKey.trim()===proofKey;
  if(!ready)return reply(503,{code:'DOMAIN_CONNECTION_FULFILLMENT_NOT_READY',checkoutReady:false,charged:false,newAttemptAllowed:false,error:'Checkout koneksi domain belum dibuka. Pemasangan dan penegakan masa layanan harus siap lebih dahulu.'});
  // The existing payment handler still performs authentication, ledger and SaaS
  // preflight before creating a checkout. Never install a domain before payment.
  return domainConnectionAnnualPriceResponse(request,env);
 }
 const notify=url.pathname===ROOT+'connection-midtrans-notification',status=url.pathname===ROOT+'connection-payment-status';
 if(!canonical||request.method!=='POST'||(!notify&&!status)||env.DOMAIN_CONNECTION_INSTALLER_ENABLED!=='true')return domainConnectionAnnualPriceResponse(request,env);
 return paymentThenInstallation(request,env,context,notify);
}
async function paymentThenInstallation(request,env,context,notify){
 let accepted;
 try{
  if(typeof context?.waitUntil!=='function')fail('FULFILLMENT_BACKGROUND_CONTEXT_REQUIRED');
  // The existing handler validates notification signatures or user authentication,
  // independently checks Midtrans, and commits payment observation first.
  const response=await domainConnectionAnnualPriceResponse(request,env);
  if(!response||response.status!==200)return response;
  accepted=await readJson(response);
  if(!ORDER.test(accepted?.orderId||'')||notify&&accepted.received!==true)fail('FULFILLMENT_PAYMENT_RESPONSE_UNVERIFIED');
  if(!notify&&accepted.paymentState!=='paid')return reply(200,accepted);
  const task=fulfillStoredOrder(accepted.orderId,env,notify?null:accepted);
  context.waitUntil(task.then(()=>undefined,error=>{console.error('DOMAIN_CONNECTION_INSTALLATION_PENDING',{orderId:accepted.orderId,code:safeCode(error)});}));
  const installation=await task;
  return reply(200,{...accepted,connectionInstallation:installation});
 }catch(error){
  return reply(503,{...(accepted||{}),code:safeCode(error),newAttemptAllowed:false,retrySameOrderOnly:true,connectionInstallation:{state:'pending-or-review',activationChecked:false},error:'Pemasangan belum dapat dipastikan. Gunakan pesanan yang sama; jangan membuat pembayaran pengganti.'});
 }
}
async function fulfillStoredOrder(orderId,env,expected){
 if(String(env.SUPABASE_URL||'').replace(/\/$/,'')!==DB||!env.SUPABASE_SERVICE_ROLE_KEY)fail('FULFILLMENT_STORAGE_REQUIRED');
 const headers={apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,accept:'application/json'};
 async function get(path){const response=await fetch(DB+'/rest/v1/'+path,{headers,redirect:'error',signal:AbortSignal.timeout(8000)});if(!response.ok)fail('FULFILLMENT_LEDGER_UNAVAILABLE');return readJson(response);}
 const orders=await get('domain_connection_orders?order_id=eq.'+orderId+'&select=order_id,user_id,site_id,hostname,environment,merchant_id,purpose,payment_state,grant_expires_at,amount_idr,currency,period_months,includes_www&limit=1');
 const r=Array.isArray(orders)&&orders.length===1?orders[0]:null;
 if(!r||r.order_id!==orderId||!UUID.test(r.user_id||'')||!UUID.test(r.site_id||'')||r.environment!=='production'||typeof env.DOMAIN_MIDTRANS_PRODUCTION_MERCHANT_ID!=='string'||!/^[A-Za-z0-9_-]{2,100}$/.test(env.DOMAIN_MIDTRANS_PRODUCTION_MERCHANT_ID)||r.merchant_id!==env.DOMAIN_MIDTRANS_PRODUCTION_MERCHANT_ID||r.purpose!==PRICE.billingPurpose||r.amount_idr!==PRICE.amountIdr||r.currency!=='IDR'||r.period_months!==12||r.includes_www!==true||typeof r.hostname!=='string'||customerHost(r.hostname)!==r.hostname||r.hostname.startsWith('www.')||r.hostname.length>249)fail('FULFILLMENT_ORDER_UNVERIFIED');
 if(expected&&(expected.userId!==r.user_id||expected.siteId!==r.site_id||expected.hostname!==r.hostname))fail('FULFILLMENT_ORDER_SCOPE_CHANGED');
 if(r.payment_state!=='paid')return {state:r.payment_state==='review_required'?'review-required':'not-paid',activationChecked:false};
 if(!Number.isFinite(Date.parse(r.grant_expires_at)))fail('FULFILLMENT_GRANT_UNVERIFIED');
 if(Date.parse(r.grant_expires_at)<=Date.now())return {state:'expired',activationChecked:false};
 const rights=await get('domain_connection_entitlements?hostname=eq.'+encodeURIComponent(r.hostname)+'&select=hostname,site_id,last_order_id,expires_at,review_required&limit=1');
 const e=Array.isArray(rights)&&rights.length===1?rights[0]:null;
 if(!e||e.hostname!==r.hostname||!ORDER.test(e.last_order_id||'')||typeof e.review_required!=='boolean'||!Number.isFinite(Date.parse(e.expires_at)))fail('FULFILLMENT_ENTITLEMENT_UNVERIFIED');
 if(e.last_order_id!==orderId)return {state:'superseded',activationChecked:false};
 if(e.site_id!==r.site_id)fail('FULFILLMENT_ENTITLEMENT_SCOPE_CHANGED');
 if(e.review_required)return {state:'review-required',activationChecked:false};
 if(Date.parse(e.expires_at)<=Date.now())return {state:'expired',activationChecked:false};
 const result=await installAndBindPaidConnectionPair({orderId,userId:r.user_id,siteId:r.site_id},env);
 if(result.orderId!==orderId||result.siteId!==r.site_id||result.hostname!==r.hostname||result.registryBindingCompleted!==true||result.primaryChanged!==false||!Array.isArray(result.domains)||result.domains.length!==2)fail('FULFILLMENT_BINDING_UNVERIFIED');
 return {state:'registry-bound',registryBindingCompleted:true,activationChecked:false,serviceActive:null,primaryChanged:false,domains:result.domains,instructions:result.instructions};
}
