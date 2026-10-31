import {buildDomainSaleQuoteDraft} from './domain-sale-quote-draft.mjs';
import {checkCloudflareRegistrar} from './cloudflare-registrar-check.mjs';
import {normalizeRegistrarDomain} from './domain-registrar-quote-router.mjs';
const HOST='feature-domain-stages5-10-integration-20261030-ngeblogging.triapriyogibahari7.workers.dev';
const PREFIX='/api/commerce/domains/quote/';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
async function empty(request){if(!request.body)return true;const reader=request.body.getReader();let timer;try{return (await Promise.race([reader.read(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error()),2000);})])).done===true;}catch{return false;}finally{clearTimeout(timer);reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}}
export async function domainQuotePreviewResponse(request,env,{fetchImpl=globalThis.fetch,checkImpl=checkCloudflareRegistrar,clock=Date.now,makeId=()=>crypto.randomUUID()}={}){
 const url=new URL(request.url);if(!url.pathname.startsWith(PREFIX))return null;
 const reply=(status,code,extra={})=>new Response(JSON.stringify({code,lookupOnly:true,purchaseAllowed:false,checkoutCreated:false,registrationStarted:false,...extra}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff',...(status===405?{allow:'POST'}:{})}});
 if(url.protocol!=='https:'||url.hostname!==HOST)return reply(404,'NOT_FOUND');
 if(request.method!=='POST')return reply(405,'METHOD_NOT_ALLOWED');
 if(request.headers.get('origin')!==url.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
 if(env?.DOMAIN_QUOTE_PREVIEW_ENABLED!=='true')return reply(503,'DOMAIN_QUOTE_PREVIEW_DISABLED');
 if(env.DOMAIN_ORDER_ENV!=='sandbox')return reply(503,'DOMAIN_QUOTE_SANDBOX_REQUIRED');
 if(url.search||(request.headers.get('content-length')&&request.headers.get('content-length')!=='0')||!(await empty(request)))return reply(400,'EMPTY_REQUEST_REQUIRED');
 let domain;try{const raw=url.pathname.slice(PREFIX.length);if(raw.length>1200)throw Error();domain=normalizeRegistrarDomain(decodeURIComponent(raw)).domain;}catch{return reply(400,'INVALID_DOMAIN');}
 const auth=request.headers.get('authorization')||'';if(!/^Bearer [^\s]{1,8192}$/.test(auth))return reply(401,'AUTH_REQUIRED');
 if(typeof env.REGISTRAR_DIAGNOSTIC_ADMIN_USER_ID!=='string'||!UUID.test(env.REGISTRAR_DIAGNOSTIC_ADMIN_USER_ID))return reply(503,'DOMAIN_QUOTE_ADMIN_UNCONFIGURED');
 let base;try{base=new URL(env.SUPABASE_URL);if(base.protocol!=='https:'||!base.hostname.endsWith('.supabase.co')||base.port||base.username||base.password||base.pathname!=='/'||base.search||base.hash)throw Error();}catch{return reply(503,'DOMAIN_QUOTE_CONFIGURATION_UNAVAILABLE');}
 if(typeof env.SUPABASE_PUBLISHABLE_KEY!=='string'||!env.SUPABASE_PUBLISHABLE_KEY||typeof env.SUPABASE_SERVICE_ROLE_KEY!=='string'||!env.SUPABASE_SERVICE_ROLE_KEY)return reply(503,'DOMAIN_QUOTE_CONFIGURATION_UNAVAILABLE');
 if(request.signal.aborted)return reply(503,'DOMAIN_QUOTE_UNAVAILABLE');
 const controller=new AbortController(),abort=()=>controller.abort();let stop;
 const stopped=new Promise((_,reject)=>{stop=()=>reject(Error('QUOTE_TIMEOUT'));controller.signal.addEventListener('abort',stop,{once:true});});
 const timer=setTimeout(abort,15000),wait=promise=>Promise.race([promise,stopped]);request.signal.addEventListener('abort',abort,{once:true});
 try{
  const verified=await wait(fetchImpl(new Request(new URL('/auth/v1/user',base),{method:'GET',redirect:'manual',headers:{authorization:auth,apikey:env.SUPABASE_PUBLISHABLE_KEY},signal:controller.signal})));
  if([401,403].includes(verified.status))return reply(401,'INVALID_SESSION');if(!verified.ok)return reply(503,'AUTH_UNAVAILABLE');
  const user=await wait(verified.json());if(typeof user?.id!=='string'||!UUID.test(user.id))return reply(401,'INVALID_SESSION');
  if(user.id.toLowerCase()!==env.REGISTRAR_DIAGNOSTIC_ADMIN_USER_ID.toLowerCase())return reply(403,'ADMIN_REQUIRED');
  let inputs;try{const raw=env.DOMAIN_PRICING_SNAPSHOT_JSON;if(typeof raw!=='string'||raw.length>16384)throw Error();inputs=JSON.parse(raw);if(inputs?.environment!=='sandbox'||inputs.fx?.costBasisVerified!==true||inputs.policy?.minimumMarginIdr<25000||!Number.isSafeInteger(inputs.policy?.minimumMarginIdr))throw Error();}catch{return reply(503,'DOMAIN_PRICING_INPUTS_UNAVAILABLE');}
  const check=await wait(checkImpl(env,{domain},{fetchImpl,clock}));
  if(check?.status==='not_registrable'&&['extension_not_supported_via_api','extension_not_supported','extension_disallows_registration'].includes(check.reason))return reply(422,'UNSUPPORTED_EXTENSION');
  if(check?.status==='not_registrable'&&check.reason==='domain_unavailable')return reply(409,'DOMAIN_UNAVAILABLE');
  if(check?.status==='premium_not_supported')return reply(422,'PREMIUM_NOT_SUPPORTED');
  if(check?.status!=='checked'||check.domain!==domain)return reply(502,'REGISTRAR_QUOTE_UNAVAILABLE');
  let row;try{row=buildDomainSaleQuoteDraft(check,{userId:user.id,environment:'sandbox',fx:inputs.fx,policy:inputs.policy,now:clock(),makeId}).row;}catch{return reply(503,'DOMAIN_PRICING_INPUTS_UNAVAILABLE');}
  if(controller.signal.aborted||Date.parse(row.expires_at)-clock()<5000)return reply(503,'SNAPSHOT_REFRESH_REQUIRED');
  const stored=await wait(fetchImpl(new Request(new URL('/rest/v1/domain_sale_quotes',base),{method:'POST',redirect:'manual',headers:{authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,apikey:env.SUPABASE_SERVICE_ROLE_KEY,'content-type':'application/json',prefer:'return=minimal'},body:JSON.stringify(row),signal:controller.signal})));
  if(![201,204].includes(stored.status))return reply(503,'DOMAIN_QUOTE_STORAGE_UNAVAILABLE');
  if(Date.parse(row.expires_at)<=clock())return reply(409,'QUOTE_EXPIRED');
  return reply(201,'DOMAIN_QUOTE_PREVIEW',{quote:{quoteId:row.id,domain:row.domain,years:1,displayCurrency:'USD',salePriceUsd:row.sale_price_usd,currency:'IDR',amountIdr:row.sale_price_idr,expiresAt:row.expires_at,indicative:true}});
 }catch{return reply(503,'DOMAIN_QUOTE_UNAVAILABLE');}
 finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',stop);}
}
