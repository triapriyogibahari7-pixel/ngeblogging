import {buildDomainSaleQuoteDraft} from './domain-sale-quote-draft.mjs';
import {parseDomainPricingSnapshot} from './domain-pricing-snapshot.mjs';
import {checkCloudflareRegistrar} from './cloudflare-registrar-check.mjs';
import {normalizeRegistrarDomain} from './domain-registrar-quote-router.mjs';
const HOST='feature-domain-stages5-10-integration-20261030-ngeblogging.triapriyogibahari7.workers.dev';
const PREFIX='/api/commerce/domains/quote/';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const PRICING_REASONS=new Set(['PRICING_SNAPSHOT_MISSING','PRICING_SNAPSHOT_TOO_LARGE','INVALID_PRICING_JSON','INVALID_PRICING_SNAPSHOT_SHAPE','INVALID_PRICING_REFERENCE','INVALID_PRICING_TIME','INVALID_PRICING_CLOCK','INVALID_PRICING_ENVIRONMENT','SANDBOX_REQUIRED','PRODUCTION_REQUIRED','INVALID_FX_PAIR','INVALID_FX_RATE','FX_COST_BASIS_UNVERIFIED','FX_SNAPSHOT_EXPIRED','COST_POLICY_UNVERIFIED','INVALID_PRICING_VERSION','COST_POLICY_EXPIRED','INVALID_IDR_COST','MINIMUM_MARGIN_BELOW_REQUIRED','INVALID_PAYMENT_FEE','PRODUCTION_REGISTRAR_INPUT_UNVERIFIED','REGISTRAR_CHECK_NOT_ELIGIBLE','INVALID_QUOTE_DOMAIN','REGISTRAR_CHECK_EXPIRED','UNSUPPORTED_REGISTRAR_PRICE','INVALID_DECIMAL_AMOUNT','INVALID_SNAPSHOT_TIME','INVALID_SOURCE_REFERENCE','INVALID_MARGIN_OR_PAYMENT_FEE','PRICE_OUT_OF_RANGE','MINIMUM_MARGIN_NOT_MET','SNAPSHOT_REFRESH_REQUIRED']);
export function readQuotePricingInputs(env,{now=Date.now(),environment}={}){
 const primary=environment==='production'?'DOMAIN_PRODUCTION_PRICING_SNAPSHOT_JSON':'DOMAIN_PRICING_SNAPSHOT_JSON';
 const text=environment==='production'&&env?.[primary]===undefined?env?.DOMAIN_CUSTOMER_REGISTRATION_PRICING_SNAPSHOT:env?.[primary];
 if(text===undefined)throw Object.assign(new Error('PRICING_SNAPSHOT_MISSING'),{code:'PRICING_SNAPSHOT_MISSING'});
 return parseDomainPricingSnapshot(text,{now,environment});
}
export function quotePricingFailure(error,stage){return {reason:PRICING_REASONS.has(error?.code)?error.code:'PRICING_VALIDATION_FAILED',stage:['snapshot','calculation','breakdown'].includes(stage)?stage:'pricing'};}
async function empty(request){if(!request.body)return true;const reader=request.body.getReader();let timer;try{return (await Promise.race([reader.read(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error()),2000);})])).done===true;}catch{return false;}finally{clearTimeout(timer);reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}}
async function jsonBody(stream,wait,limit=32768){const reader=stream?.getReader();if(!reader)throw Error('INVALID_JSON');try{let size=0;const chunks=[];for(;;){const x=await wait(reader.read());if(x.done)break;size+=x.value.length;if(size>limit)throw Error('BODY_TOO_LARGE');chunks.push(x.value);}const bytes=new Uint8Array(size);let at=0;for(const x of chunks){bytes.set(x,at);at+=x.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}finally{reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}}
export async function domainQuotePreviewResponse(request,env,{fetchImpl=globalThis.fetch,checkImpl=checkCloudflareRegistrar,clock=Date.now,makeId=()=>crypto.randomUUID()}={}){
 const url=new URL(request.url);if(!url.pathname.startsWith(PREFIX))return null;
 const production=url.hostname==='ngeblogging.com',environment=production?'production':'sandbox';
 const reply=(status,code,extra={})=>new Response(JSON.stringify({code,environment,lookupOnly:true,purchaseAllowed:false,checkoutCreated:false,registrationStarted:false,...extra}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff',...(status===405?{allow:'POST'}:{})}});
 if(url.protocol!=='https:'||(!production&&url.hostname!==HOST)||url.port)return reply(404,'NOT_FOUND');
 if(request.method!=='POST')return reply(405,'METHOD_NOT_ALLOWED');
 if(request.headers.get('origin')!==url.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
 // Quote-only activation does not enable the separate order, payment or registration gates.
 const quoteEnabled=production?(env?.DOMAIN_CUSTOMER_PRODUCTION_ENABLED==='true'||env?.DOMAIN_CUSTOMER_CLOUDFLARE_QUOTE_ENABLED==='true'):env?.DOMAIN_QUOTE_PREVIEW_ENABLED==='true';
 if(!quoteEnabled)return reply(503,production?'DOMAIN_PRODUCTION_QUOTE_DISABLED':'DOMAIN_QUOTE_PREVIEW_DISABLED');
 if(env.DOMAIN_ORDER_ENV!==environment)return reply(503,production?'DOMAIN_QUOTE_PRODUCTION_REQUIRED':'DOMAIN_QUOTE_SANDBOX_REQUIRED');
 if(url.search||(request.headers.get('content-length')&&request.headers.get('content-length')!=='0')||!(await empty(request)))return reply(400,'EMPTY_REQUEST_REQUIRED');
 let domain;try{const raw=url.pathname.slice(PREFIX.length);if(raw.length>1200)throw Error();domain=normalizeRegistrarDomain(decodeURIComponent(raw)).domain;}catch{return reply(400,'INVALID_DOMAIN');}
 const auth=request.headers.get('authorization')||'';if(!/^Bearer [^\s]{1,8192}$/.test(auth))return reply(401,'AUTH_REQUIRED');
 if(!production&&(typeof env.REGISTRAR_DIAGNOSTIC_ADMIN_USER_ID!=='string'||!UUID.test(env.REGISTRAR_DIAGNOSTIC_ADMIN_USER_ID)))return reply(503,'DOMAIN_QUOTE_ADMIN_UNCONFIGURED');
 let base;try{base=new URL(env.SUPABASE_URL);if(base.protocol!=='https:'||base.hostname!=='polvmlrhqoiflumibfqs.supabase.co'||base.port||base.username||base.password||base.pathname!=='/'||base.search||base.hash)throw Error();}catch{return reply(503,'DOMAIN_QUOTE_CONFIGURATION_UNAVAILABLE');}
 if(typeof env.SUPABASE_PUBLISHABLE_KEY!=='string'||!env.SUPABASE_PUBLISHABLE_KEY||typeof env.SUPABASE_SERVICE_ROLE_KEY!=='string'||!env.SUPABASE_SERVICE_ROLE_KEY)return reply(503,'DOMAIN_QUOTE_CONFIGURATION_UNAVAILABLE');
 if(request.signal.aborted)return reply(503,'DOMAIN_QUOTE_UNAVAILABLE');
 const controller=new AbortController(),abort=()=>controller.abort();let stop;
 const stopped=new Promise((_,reject)=>{stop=()=>reject(Error('QUOTE_TIMEOUT'));controller.signal.addEventListener('abort',stop,{once:true});});
 const timer=setTimeout(abort,15000),wait=promise=>Promise.race([promise,stopped]);request.signal.addEventListener('abort',abort,{once:true});
 try{
  const verified=await wait(fetchImpl(new Request(new URL('/auth/v1/user',base),{method:'GET',redirect:'manual',headers:{authorization:auth,apikey:env.SUPABASE_PUBLISHABLE_KEY},signal:controller.signal})));
  if([401,403].includes(verified.status))return reply(401,'INVALID_SESSION');if(!verified.ok||verified.status>=300)return reply(503,'AUTH_UNAVAILABLE');
  const user=await jsonBody(verified.body,wait);if(typeof user?.id!=='string'||!UUID.test(user.id))return reply(401,'INVALID_SESSION');
  if(!production&&user.id.toLowerCase()!==env.REGISTRAR_DIAGNOSTIC_ADMIN_USER_ID.toLowerCase())return reply(403,'ADMIN_REQUIRED');
  let inputs;try{inputs=readQuotePricingInputs(env,{now:clock(),environment});}catch(error){return reply(503,'DOMAIN_PRICING_INPUTS_UNAVAILABLE',quotePricingFailure(error,'snapshot'));}
  const check=await wait(checkImpl(env,{domain},{fetchImpl,clock}));
  if(check?.status==='not_registrable'&&['extension_not_supported_via_api','extension_not_supported','extension_disallows_registration'].includes(check.reason))return reply(422,'UNSUPPORTED_EXTENSION');
  if(check?.status==='not_registrable'&&check.reason==='domain_unavailable')return reply(409,'DOMAIN_UNAVAILABLE');
  if(check?.status==='premium_not_supported')return reply(422,'PREMIUM_NOT_SUPPORTED');
  if(check?.status!=='checked'||check.domain!==domain)return reply(502,'REGISTRAR_QUOTE_UNAVAILABLE');
  let row;try{row=buildDomainSaleQuoteDraft(check,{userId:user.id,environment,fx:inputs.fx,policy:inputs.policy,now:clock(),makeId}).row;if(row.environment!==environment||row.user_id!==user.id.toLowerCase()||row.domain!==domain)throw Error();}catch(error){return reply(503,'DOMAIN_PRICING_INPUTS_UNAVAILABLE',quotePricingFailure(error,'calculation'));}
  const pricingBreakdown={version:1,currency:'IDR',registrarCostIdr:row.registrar_cost_idr,taxAndOtherDirectCostsIdr:row.other_direct_costs_idr,paymentCostIdr:row.payment_cost_idr,serviceMarginIdr:row.cost_basis.computed_margin_idr,totalIdr:row.sale_price_idr,minimumMarginIdr:row.cost_basis.minimum_margin_idr,fxRateUsdIdr:row.fx_rate_usd_idr,taxStatus:row.cost_basis.tax_status,paymentFeeMode:row.cost_basis.payment_fee_mode};
  const parts=[pricingBreakdown.registrarCostIdr,pricingBreakdown.taxAndOtherDirectCostsIdr,pricingBreakdown.paymentCostIdr,pricingBreakdown.serviceMarginIdr];
  if(parts.some(value=>!Number.isSafeInteger(value)||value<0)||!Number.isSafeInteger(pricingBreakdown.totalIdr)||!Number.isSafeInteger(pricingBreakdown.minimumMarginIdr)||pricingBreakdown.minimumMarginIdr<25000||pricingBreakdown.serviceMarginIdr<pricingBreakdown.minimumMarginIdr||parts.reduce((sum,value)=>sum+value,0)!==pricingBreakdown.totalIdr)return reply(503,'DOMAIN_PRICING_INPUTS_UNAVAILABLE',{reason:'PRICING_BREAKDOWN_INVALID',stage:'breakdown'});
  if(controller.signal.aborted||Date.parse(row.expires_at)-clock()<5000)return reply(503,'SNAPSHOT_REFRESH_REQUIRED');
  const stored=await wait(fetchImpl(new Request(new URL('/rest/v1/domain_sale_quotes',base),{method:'POST',redirect:'manual',headers:{authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,apikey:env.SUPABASE_SERVICE_ROLE_KEY,'content-type':'application/json',prefer:'return=minimal'},body:JSON.stringify(row),signal:controller.signal})));
  if(![201,204].includes(stored.status))return reply(503,'DOMAIN_QUOTE_STORAGE_UNAVAILABLE');
  if(Date.parse(row.expires_at)<=clock())return reply(409,'QUOTE_EXPIRED');
  return reply(201,production?'DOMAIN_QUOTE_PRODUCTION':'DOMAIN_QUOTE_PREVIEW',{quote:{quoteId:row.id,domain:row.domain,years:1,displayCurrency:'USD',salePriceUsd:row.sale_price_usd,currency:'IDR',amountIdr:row.sale_price_idr,expiresAt:row.expires_at,indicative:!production,pricingBreakdown}});
 }catch{return reply(503,'DOMAIN_QUOTE_UNAVAILABLE');}
 finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',stop);}
}
