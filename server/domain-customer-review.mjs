import {Buffer} from 'node:buffer';
import {issueProviderDomainReviewReceipt} from './domain-provider-review-receipt.mjs';
import {resolveCustomerRegistrarContext} from './domain-customer-provider-context.mjs';
import {readCustomerCurrencyContext} from '../shared/domain-currency-display.mjs';
const PREFIX='/api/domains/commerce/review/',BASE='https://polvmlrhqoiflumibfqs.supabase.co/';
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const fail=()=>{throw Error('DOMAIN_REVIEW_UNAVAILABLE');};
function keyReady(key){if(typeof key!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(key))return false;const bytes=Buffer.from(key,'base64url');return bytes.length===32&&bytes.toString('base64url')===key;}
async function readJson(response,wait){const reader=response.body?.getReader();if(!reader)fail();try{if(response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')fail();let size=0;const chunks=[];for(;;){const p=await wait(reader.read());if(p.done)break;if(!(p.value instanceof Uint8Array))fail();size+=p.value.byteLength;if(size>32768)fail();chunks.push(p.value);}const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.byteLength;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}finally{try{Promise.resolve(reader.cancel()).catch(()=>{});}catch{}try{reader.releaseLock();}catch{}}}
async function empty(request,wait){if(request.body===null)return true;const reader=request.body.getReader();try{return (await wait(reader.read())).done===true;}finally{try{Promise.resolve(reader.cancel()).catch(()=>{});}catch{}try{reader.releaseLock();}catch{}}}
export function createDomainCustomerReview({fetchImpl=globalThis.fetch,priceCheck,clock=Date.now,timeoutMs=25000}={}){
 if(typeof fetchImpl!=='function'||typeof clock!=='function'||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000||(priceCheck!==undefined&&typeof priceCheck!=='function'))throw Error('INVALID_REVIEW_HANDLER_CONFIG');
 const check=priceCheck||(async(request,env)=>{const m=await import('./domain-customer-price-check.mjs');return m.domainCustomerPriceCheckResponse(request,env);});
 return async function(request,env){
  const url=new URL(request.url);if(!url.pathname.startsWith(PREFIX))return null;
  const reply=(status,code,extra={})=>new Response(JSON.stringify({code,...extra}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store',vary:'Authorization, x-site-id','referrer-policy':'no-referrer','x-content-type-options':'nosniff',...(status===405?{allow:'POST'}:{})}});
  if(url.protocol!=='https:'||!['ngeblogging.com','www.ngeblogging.com'].includes(url.hostname)||url.port)return reply(404,'NOT_FOUND');
  if(request.method!=='POST')return reply(405,'METHOD_NOT_ALLOWED');
  if(request.headers.get('origin')!==url.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
  if(url.search||url.hash)return reply(400,'QUERY_NOT_ALLOWED');
  const auth=request.headers.get('authorization')||'',rawSite=request.headers.get('x-site-id')||'';
  if(!UUID.test(rawSite))return reply(400,'INVALID_SITE_ID');const siteId=rawSite.toLowerCase();
  if(!/^Bearer [^\s]{1,8192}$/.test(auth))return reply(401,'AUTH_REQUIRED');
  let domain;try{const raw=url.pathname.slice(PREFIX.length);if(!raw||raw.length>1200)fail();const value=decodeURIComponent(raw).trim().replace(/\.$/,'');if(!value||/[\s\u0000-\u001f\u007f/\\:@?#%]/u.test(value))fail();domain=new URL('https://'+value).hostname.toLowerCase();if(domain.length>253||!domain.includes('.')||/^\d+(?:\.\d+){3}$/.test(domain)||domain.split('.').some(label=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)))fail();}catch{return reply(400,'INVALID_DOMAIN');}
  if(env?.DOMAIN_CUSTOMER_REVIEW_ENABLED!=='true')return reply(503,'DOMAIN_REVIEW_DISABLED');
  const signingKey=env.DOMAIN_CUSTOMER_REVIEW_SIGNING_KEY;let context;
  try{context=resolveCustomerRegistrarContext(env);}catch{return reply(503,'DOMAIN_REVIEW_CONFIGURATION_UNAVAILABLE');}
  if(!keyReady(signingKey))return reply(503,'DOMAIN_REVIEW_CONFIGURATION_UNAVAILABLE');
  if(typeof env.SUPABASE_URL!=='string'||env.SUPABASE_URL.replace(/\/$/,'')+'/'!==BASE||typeof env.SUPABASE_PUBLISHABLE_KEY!=='string'||!env.SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_PUBLISHABLE_KEY.length>8192||request.signal.aborted)return reply(503,'AUTH_UNAVAILABLE');
  const controller=new AbortController();let stop;
  const ended=new Promise((_,reject)=>{stop=()=>reject(Error('DEADLINE'));controller.signal.addEventListener('abort',stop,{once:true});});
  const abort=()=>controller.abort(),timer=setTimeout(abort,timeoutMs),wait=p=>Promise.race([p,ended]);request.signal.addEventListener('abort',abort,{once:true});
  try{
   if(!await empty(request,wait))return reply(400,'EMPTY_REQUEST_REQUIRED');
   const response=await wait(fetchImpl(BASE+'auth/v1/user',{method:'GET',redirect:'error',cache:'no-store',headers:{authorization:auth,apikey:env.SUPABASE_PUBLISHABLE_KEY,accept:'application/json'},signal:controller.signal}));
   if(response.status!==200){try{Promise.resolve(response.body?.cancel()).catch(()=>{});}catch{}return reply([401,403].includes(response.status)?401:503,[401,403].includes(response.status)?'INVALID_SESSION':'AUTH_UNAVAILABLE');}
   const user=await readJson(response,wait);if(typeof user?.id!=='string'||!UUID.test(user.id))return reply(503,'AUTH_UNAVAILABLE');
   const headers=new Headers(request.headers);headers.set('x-site-id',siteId);headers.delete('content-length');headers.delete('content-type');
   const target=new URL('/api/domains/commerce/check/'+encodeURIComponent(domain),url.origin);
   const delegated=await wait(check(new Request(target,{method:'POST',headers,signal:controller.signal,cache:'no-store',credentials:'omit',redirect:'error'}),env));
   if(delegated?.status!==200){try{Promise.resolve(delegated?.body?.cancel()).catch(()=>{});}catch{}const status=[400,401,403,409,429].includes(delegated?.status)?delegated.status:503;return reply(status,status===401?'INVALID_SESSION':status===403?'SITE_OWNER_REQUIRED':status===429?'LOOKUP_RATE_LIMITED':'DOMAIN_REVIEW_UNAVAILABLE');}
   const result=await readJson(delegated,wait);
   if(result?.code!=='DOMAIN_CUSTOMER_PRICE_CHECK'||result.siteId!==siteId||result.domain!==domain||result.legacyReviewReceiptCompatible!==(context.providerId==='opensrs'))return reply(503,'DOMAIN_REVIEW_UNAVAILABLE');
   if(result.availability==='unavailable')return reply(409,'DOMAIN_REVIEW_UNAVAILABLE');
   if(controller.signal.aborted||request.signal.aborted)fail();
   const now=clock();let currencyContext=null;
   if(Object.hasOwn(result,'currencyContext')){
    currencyContext=readCustomerCurrencyContext(result.currencyContext);
    const observed=Date.parse(currencyContext.observedAt),expires=Date.parse(currencyContext.expiresAt),checked=Date.parse(result.checkedAt),priceExpires=Date.parse(result.price?.expiresAt);
    if(!Number.isSafeInteger(now)||!Number.isFinite(checked)||!Number.isFinite(priceExpires)||observed>checked||observed>now||expires<=now||priceExpires>expires)fail();
   }
   const receipt=issueProviderDomainReviewReceipt({...result,quoteContext:context},{key:signingKey,userId:user.id.toLowerCase(),siteId,...context,now});
   return reply(200,'DOMAIN_CUSTOMER_REVIEW',{environment:'production',siteId,domain,reviewReceiptVersion:2,reviewOnly:true,orderCreated:false,paymentStarted:false,purchaseAllowed:false,checkoutAvailable:false,...(currencyContext?{currencyContext}:{}),review:receipt});
  }catch{return reply(503,'DOMAIN_REVIEW_UNAVAILABLE');}
  finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',stop);controller.abort();}
 };
}
export const domainCustomerReviewResponse=createDomainCustomerReview();
