import {buildCustomerDomainSuggestions,checkCustomerDomainSuggestions} from './domain-customer-suggestions.mjs';
import {randomUUID} from 'node:crypto';
import {createRegistrarQuoteRouter,normalizeRegistrarDomain} from './domain-registrar-quote-router.mjs';
import {parseDomainPricingSnapshot} from './domain-pricing-snapshot.mjs';
import {registrarCostInRupiah} from './drafts/domain-money-conversion.mjs';
const PREFIX='/api/domains/commerce/',BASE='https://polvmlrhqoiflumibfqs.supabase.co/';
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
 const build=runtimeFactory|| (async(env,{providerFetch=fetchImpl}={})=>{const m=await import('./opensrs-quote-runtime.mjs');return m.createConfiguredOpenSRSQuoteProvider(env,{deploymentEnvironment:'production',fetchImpl:providerFetch});});
 const admit=(owner,now)=>{for(const [key,value] of attempts)if(now-value.at>=60000)attempts.delete(key);let row=attempts.get(owner);if(!row){if(attempts.size>=2048)return false;row={at:now,count:0};attempts.set(owner,row);}if(now<row.at||row.count>=10)return false;row.count++;return true;};
 return async function(request,env){
  const url=new URL(request.url);if(!url.pathname.startsWith(PREFIX))return null;
  const route=url.pathname.slice(PREFIX.length).match(/^(check|search)\/(.*)$/);if(!route)return null;const searching=route[1]==='search';
  const reply=(status,code,extra={})=>new Response(JSON.stringify({code,...extra}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store',vary:'Authorization, x-site-id','referrer-policy':'no-referrer','x-content-type-options':'nosniff',...(status===405?{allow:'POST'}:{})}});
  if(url.protocol!=='https:'||!['ngeblogging.com','www.ngeblogging.com'].includes(url.hostname)||url.port)return reply(404,'NOT_FOUND');
  if(request.method!=='POST')return reply(405,'METHOD_NOT_ALLOWED');
  if(request.headers.get('origin')!==url.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
  if(url.search)return reply(400,'QUERY_NOT_ALLOWED');
  const auth=request.headers.get('authorization')||'',site=request.headers.get('x-site-id')||'';
  if(!UUID.test(site))return reply(400,'INVALID_SITE_ID');const siteId=site.toLowerCase();
  if(!/^Bearer [^\s]{1,8192}$/.test(auth))return reply(401,'AUTH_REQUIRED');
  let domain,query;
  try{
   const raw=route[2];if(!raw||raw.length>1200)fail();const value=decodeURIComponent(raw).trim();
   if(searching){if(!value||value.length>253||/[^\p{L}\p{M}\p{N} .-]/u.test(value)||(!value.includes('.')&&value.length>100))fail();query=value;}
   else{const name=value.replace(/\.$/,'');if(!name||/[\s\u0000-\u001f\u007f/\\:@?#%]/u.test(name))fail();domain=new URL('https://'+name).hostname.toLowerCase();if(domain.length>253||!domain.includes('.')||/^\d+(?:\.\d+){3}$/.test(domain)||domain.split('.').some(label=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)))fail();}
  }catch{return reply(400,searching?'INVALID_SEARCH_QUERY':'INVALID_DOMAIN');}
  const now=clock();if(!Number.isSafeInteger(now)||Math.abs(now)>8640000000000000||request.signal.aborted)return reply(503,'DOMAIN_PRICE_UNAVAILABLE');
  if(typeof env?.SUPABASE_URL!=='string'||env.SUPABASE_URL.replace(/\/$/,'')+'/'!==BASE||typeof env.SUPABASE_PUBLISHABLE_KEY!=='string'||!env.SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_PUBLISHABLE_KEY.length>8192)return reply(503,'AUTH_UNAVAILABLE');
  const b=budget(request.signal,timeoutMs),wallStarted=performance.now();let owner,held=false;
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
   let requestLimit=0,requestsUsed=0,exhausted=false;
   if(searching){
    if(env.DOMAIN_CUSTOMER_SEARCH_ENABLED!=='true')return reply(503,'DOMAIN_SEARCH_DISABLED');
    const limit=env.DOMAIN_CUSTOMER_SEARCH_HTTP_BUDGET;
    if(typeof limit!=='string'||!/^[1-9]\d{0,2}$/.test(limit)||Number(limit)>256)return reply(503,'DOMAIN_SEARCH_CONFIGURATION_UNAVAILABLE');
    requestLimit=Number(limit);
   }
   const providerFetch=searching?async(target,init)=>{
    if(b.signal.aborted)fail();
    if(String(target)!=='https://rr-n1-tor.opensrs.net:55443/'||init?.method!=='POST')fail();
    if(requestsUsed>=requestLimit){exhausted=true;fail();}requestsUsed++;
    return b.wait(fetchImpl(target,init));
   }:fetchImpl;
   const runtime=await b.wait(Promise.resolve().then(()=>build(env,{providerFetch})));
   if(runtime?.status!=='configured'||runtime.provider?.id!=='opensrs'||runtime.provider.enabled!==true||runtime.provider.quoteEnvironment!=='live')return reply(503,'DOMAIN_SERVICE_UNAVAILABLE');
   const snapshotText=env.DOMAIN_CUSTOMER_REGISTRATION_PRICING_SNAPSHOT;
   if(searching){
    try{buildCustomerDomainSuggestions(query,runtime.provider.extensions);}catch{return reply(400,'INVALID_SEARCH_QUERY');}
    try{parseDomainPricingSnapshot(snapshotText,{now:clock(),environment:'production'});}catch{return reply(503,'DOMAIN_PRICE_UNAVAILABLE');}
   }else{try{domain=normalizeRegistrarDomain(domain,runtime.provider.extensions).domain;}catch{return reply(400,'INVALID_DOMAIN');}}
   const evaluate=async(name,{signal}={})=>{
    if(b.signal.aborted||signal?.aborted)fail();
    if(searching){if(requestsUsed>=requestLimit){exhausted=true;fail();}parseDomainPricingSnapshot(snapshotText,{now:clock(),environment:'production'});}
    const provider={...runtime.provider,lookup:input=>runtime.provider.lookup({...input,signal:AbortSignal.any([input.signal,b.signal,...(signal?[signal]:[])])})};
    const router=createRegistrarQuoteRouter({providers:[provider],clock,makeId,timeoutMs:15000});
    const result=await b.wait(router.lookup({domain:name,years:1,providerId:'opensrs'}));
    const offer=result?.offer;if(result?.status!=='quoted'||offer?.domain!==name||offer.providerEnvironment!=='live')fail();
    const value={code:'DOMAIN_CUSTOMER_PRICE_CHECK',environment:'production',siteId,domain:name,indicative:true,purchaseAllowed:false,checkoutAvailable:false};
    if(offer.availability==='unavailable')return {...value,availability:'unavailable',price:null};
    const price=customerRegistrationPrice(offer,snapshotText,{now:clock()});
    return {...value,availability:'available',price,checkedAt:offer.checkedAt,expiresAt:price.expiresAt};
   };
   if(searching){
    const remaining=Math.floor(timeoutMs-(performance.now()-wallStarted)-25);if(remaining<1)fail();
    const result=await b.wait(checkCustomerDomainSuggestions(query,{extensions:runtime.provider.extensions,siteId,check:evaluate,signal:b.signal,clock,concurrency:3,timeoutMs:Math.min(15000,remaining)}));
    return reply(200,'DOMAIN_CUSTOMER_SEARCH',{environment:'production',...result,limits:{requestsUsed,requestBudget:requestLimit,exhausted}});
   }
   const result=await evaluate(domain);
   return reply(200,result.code,result);
  }catch{return reply(503,'DOMAIN_PRICE_UNAVAILABLE');}
  finally{if(held)pending.delete(owner);b.close();}
 };
}
export const domainCustomerPriceCheckResponse=createDomainCustomerPriceCheck();
