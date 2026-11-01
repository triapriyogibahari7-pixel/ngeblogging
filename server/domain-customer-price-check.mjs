import {randomUUID} from 'node:crypto';
import {createRegistrarQuoteRouter,normalizeRegistrarDomain} from './domain-registrar-quote-router.mjs';
import {parseDomainPricingSnapshot} from './domain-pricing-snapshot.mjs';
import {registrarCostInRupiah} from './drafts/domain-money-conversion.mjs';
const PREFIX='/api/domains/commerce/check/',BASE='https://polvmlrhqoiflumibfqs.supabase.co/';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const fail=()=>{throw Error('DOMAIN_PRICE_UNAVAILABLE');};
function budget(signal,ms){const c=new AbortController();let stop;const ended=new Promise((_,reject)=>{stop=()=>reject(Error('DEADLINE'));c.signal.addEventListener('abort',stop,{once:true});});const abort=()=>c.abort(),timer=setTimeout(abort,ms);signal.addEventListener('abort',abort,{once:true});return {signal:c.signal,wait:p=>Promise.race([p,ended]),close:()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);c.signal.removeEventListener('abort',stop);c.abort();}};}
async function json(response,b){const reader=response.body?.getReader();if(!reader)fail();try{let size=0;const chunks=[];for(;;){const p=await b.wait(reader.read());if(p.done)break;size+=p.value.byteLength;if(size>32768)fail();chunks.push(p.value);}const bytes=new Uint8Array(size);let at=0;for(const part of chunks){bytes.set(part,at);at+=part.byteLength;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}finally{try{Promise.resolve(reader.cancel()).catch(()=>{});}catch{}try{reader.releaseLock();}catch{}}}
async function empty(request,b){if(request.body===null)return true;const reader=request.body.getReader();try{return (await b.wait(reader.read())).done===true;}finally{try{Promise.resolve(reader.cancel()).catch(()=>{});}catch{}try{reader.releaseLock();}catch{}}}
export function customerRegistrationPrice(offer,snapshotText,{now=Date.now()}={}){
 if(offer?.providerId!=='opensrs'||offer.providerEnvironment!=='live'||offer.availability!=='available'||offer.years!==1||offer.indicative!==true||offer.mustRecheckBeforePurchase!==true)fail();
 const checked=Date.parse(offer.checkedAt),expiry=Date.parse(offer.expiresAt),p=offer.prices?.registration;
 if(!Number.isSafeInteger(now)||!Number.isFinite(checked)||!Number.isFinite(expiry)||checked>now||expiry<=now||expiry<=checked||expiry-checked>300000||p?.supported!==true||p.termYears!==1||typeof p.taxIncluded!=='boolean')fail();
 const snapshot=parseDomainPricingSnapshot(snapshotText,{now,environment:'production'}),policy=snapshot.policy;
 const cost=BigInt(registrarCostInRupiah({amount:p.amount,currency:p.currency,fx:snapshot.fx},now).amountIdr),other=BigInt(policy.otherDirectCostsIdr),fixed=BigInt(policy.paymentFixedCostIdr),target=BigInt(policy.minimumMarginIdr),rate=BigInt(policy.paymentFeeBasisPoints);
 const ceil=(n,d)=>(n+d-1n)/d,total=ceil((cost+other+fixed+target)*10000n,10000n-rate),fee=fixed+ceil(total*rate,10000n);
 if(total<1n||total>1000000000000n||total-cost-other-fee<target)fail();
 return Object.freeze({currency:'IDR',amountIdr:Number(total),termYears:1,expiresAt:new Date(Math.min(expiry,Date.parse(snapshot.fx.expiresAt),Date.parse(policy.expiresAt))).toISOString(),indicative:true,purchaseAllowed:false});
}
export function createDomainCustomerPriceCheck({fetchImpl=globalThis.fetch,clock=Date.now,makeId=randomUUID,timeoutMs=20000,runtimeFactory}={}){
 if(typeof fetchImpl!=='function'||typeof clock!=='function'||typeof makeId!=='function'||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)throw Error('INVALID_CUSTOMER_PRICE_HANDLER_CONFIG');
 const pending=new Set(),attempts=new Map();
 const build=runtimeFactory|| (async env=>{const m=await import('./opensrs-quote-runtime.mjs');return m.createConfiguredOpenSRSQuoteProvider(env,{deploymentEnvironment:'production',fetchImpl});});
 const admit=(owner,now)=>{for(const [key,value] of attempts)if(now-value.at>=60000)attempts.delete(key);let row=attempts.get(owner);if(!row){if(attempts.size>=2048)return false;row={at:now,count:0};attempts.set(owner,row);}if(now<row.at||row.count>=10)return false;row.count++;return true;};
 return async function(request,env){
  const url=new URL(request.url);if(!url.pathname.startsWith(PREFIX))return null;
  const reply=(status,code,extra={})=>new Response(JSON.stringify({code,...extra}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store',vary:'Authorization, x-site-id','referrer-policy':'no-referrer','x-content-type-options':'nosniff',...(status===405?{allow:'POST'}:{})}});
  if(url.protocol!=='https:'||!['ngeblogging.com','www.ngeblogging.com'].includes(url.hostname)||url.port)return reply(404,'NOT_FOUND');
  if(request.method!=='POST')return reply(405,'METHOD_NOT_ALLOWED');
  if(request.headers.get('origin')!==url.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
  if(url.search)return reply(400,'QUERY_NOT_ALLOWED');
  const auth=request.headers.get('authorization')||'',site=request.headers.get('x-site-id')||'';
  if(!UUID.test(site))return reply(400,'INVALID_SITE_ID');const siteId=site.toLowerCase();
  if(!/^Bearer [^\s]{1,8192}$/.test(auth))return reply(401,'AUTH_REQUIRED');
  let domain;try{const raw=url.pathname.slice(PREFIX.length);if(!raw||raw.length>1200)fail();const value=decodeURIComponent(raw).trim().replace(/\.$/,'');if(!value||/[\s\u0000-\u001f\u007f/\\:@?#%]/u.test(value))fail();domain=new URL('https://'+value).hostname.toLowerCase();if(domain.length>253||!domain.includes('.')||/^\d+(?:\.\d+){3}$/.test(domain)||domain.split('.').some(label=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)))fail();}catch{return reply(400,'INVALID_DOMAIN');}
  const now=clock();if(!Number.isSafeInteger(now)||Math.abs(now)>8640000000000000||request.signal.aborted)return reply(503,'DOMAIN_PRICE_UNAVAILABLE');
  if(typeof env?.SUPABASE_URL!=='string'||env.SUPABASE_URL.replace(/\/$/,'')+'/'!==BASE||typeof env.SUPABASE_PUBLISHABLE_KEY!=='string'||!env.SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_PUBLISHABLE_KEY.length>8192)return reply(503,'AUTH_UNAVAILABLE');
  const b=budget(request.signal,timeoutMs);let owner,held=false;
  try{
   if(!await empty(request,b))return reply(400,'EMPTY_REQUEST_REQUIRED');
   const read=async target=>b.wait(fetchImpl(target,{method:'GET',redirect:'error',cache:'no-store',headers:{authorization:auth,apikey:env.SUPABASE_PUBLISHABLE_KEY,accept:'application/json'},signal:b.signal}));
   const verified=await read(BASE+'auth/v1/user');
   if([401,403].includes(verified.status)){try{Promise.resolve(verified.body?.cancel()).catch(()=>{});}catch{}return reply(401,'INVALID_SESSION');}
   if(verified.status!==200)return reply(503,'AUTH_UNAVAILABLE');
   const user=await json(verified,b);if(typeof user?.id!=='string'||!UUID.test(user.id))return reply(503,'AUTH_UNAVAILABLE');owner=user.id.toLowerCase();
   if(!admit(owner,now))return reply(429,'LOOKUP_RATE_LIMITED');if(pending.has(owner))return reply(429,'LOOKUP_BUSY');pending.add(owner);held=true;
   const target=new URL('rest/v1/sites',BASE);target.search=new URLSearchParams({id:'eq.'+siteId,select:'id,owner_id',limit:'1'}).toString();
   const siteResponse=await read(target.href);if([401,403].includes(siteResponse.status))return reply(403,'SITE_OWNER_REQUIRED');if(siteResponse.status!==200)return reply(503,'AUTH_UNAVAILABLE');
   const rows=await json(siteResponse,b);if(!Array.isArray(rows)||rows.length!==1||rows[0]?.id!==siteId||rows[0]?.owner_id!==owner)return reply(403,'SITE_OWNER_REQUIRED');
   const runtime=await b.wait(Promise.resolve().then(()=>build(env)));
   if(runtime?.status!=='configured'||runtime.provider?.id!=='opensrs'||runtime.provider.enabled!==true||runtime.provider.quoteEnvironment!=='live')return reply(503,'DOMAIN_SERVICE_UNAVAILABLE');
   try{domain=normalizeRegistrarDomain(domain,runtime.provider.extensions).domain;}catch{return reply(400,'INVALID_DOMAIN');}
   const provider={...runtime.provider,lookup:input=>runtime.provider.lookup({...input,signal:AbortSignal.any([input.signal,b.signal])})};
   const router=createRegistrarQuoteRouter({providers:[provider],clock,makeId,timeoutMs:15000});
   const result=await b.wait(router.lookup({domain,years:1,providerId:'opensrs'}));
   const offer=result?.offer;if(result?.status!=='quoted'||offer?.domain!==domain||offer.providerEnvironment!=='live')return reply(503,'DOMAIN_PRICE_UNAVAILABLE');
   const base={environment:'production',siteId,domain,indicative:true,purchaseAllowed:false,checkoutAvailable:false};
   if(offer.availability==='unavailable')return reply(200,'DOMAIN_CUSTOMER_PRICE_CHECK',{...base,availability:'unavailable',price:null});
   const price=customerRegistrationPrice(offer,env.DOMAIN_CUSTOMER_REGISTRATION_PRICING_SNAPSHOT,{now:clock()});
   return reply(200,'DOMAIN_CUSTOMER_PRICE_CHECK',{...base,availability:'available',price,checkedAt:offer.checkedAt,expiresAt:price.expiresAt});
  }catch{return reply(503,'DOMAIN_PRICE_UNAVAILABLE');}
  finally{if(held)pending.delete(owner);b.close();}
 };
}
export const domainCustomerPriceCheckResponse=createDomainCustomerPriceCheck();
