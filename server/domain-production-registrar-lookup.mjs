import {customerDomainAuthBridge} from './domain-customer-auth-bridge.mjs';
import {checkCloudflareRegistrar} from './cloudflare-registrar-check.mjs';
import {searchCloudflareRegistrar,normalizeRegistrarSearchQuery} from './cloudflare-registrar-search.mjs';
import {normalizeRegistrarDomain} from './domain-registrar-quote-router.mjs';
import {attachRegistrarCheckOffer} from './registrar-check-result.mjs';
const PREFIX='/api/domains/registrar/';
const HOSTS=new Set(['ngeblogging.com','www.ngeblogging.com']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const reply=(status,code,extra={})=>new Response(JSON.stringify({...extra,code}),{status,headers});
async function emptyBody(request){
 if(request.body===null)return true;
 const reader=request.body.getReader();let timer;
 try{return (await Promise.race([reader.read(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error()),2000);})])).done===true;}
 catch{return false;}
 finally{clearTimeout(timer);reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}
}
export function createProductionRegistrarLookup({fetchImpl=(...args)=>fetch(...args),check=checkCloudflareRegistrar,search=searchCloudflareRegistrar,makeOffer=attachRegistrarCheckOffer,normalizeDomain=normalizeRegistrarDomain,normalizeSearch=normalizeRegistrarSearchQuery,clock=Date.now,timeoutMs=5000}={}){
 const attempts=new Map(),pending=new Set();
 // Best-effort per-isolate protection, not a global quota across Cloudflare locations.
 const admit=key=>{
  const now=clock();if(!Number.isFinite(now))return false;
  for(const [k,v] of attempts)if(now-v.at>=60000)attempts.delete(k);
  let entry=attempts.get(key);
  if(!entry){if(attempts.size>=2048)return false;entry={at:now,count:0};attempts.set(key,entry);}
  if(now<entry.at||entry.count>=10)return false;
  entry.count++;return true;
 };
 async function read(url,auth,key){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const response=await fetchImpl(url,{method:'GET',redirect:'manual',cache:'no-store',headers:{Authorization:auth,apikey:key},signal:controller.signal});
   if(response.status===401||response.status===403)return {denied:true};
   if(!response.ok||response.status>=300&&response.status<400)throw Error('AUTH_UNAVAILABLE');
   return {data:await response.json()};
  }finally{clearTimeout(timer);}
 }
 return async function(request,env){
  const url=new URL(request.url);
  if(!url.pathname.startsWith(PREFIX))return null;
  if(url.protocol!=='https:'||!HOSTS.has(url.hostname)||url.port)return reply(404,'NOT_FOUND');
  if(request.method!=='POST')return reply(405,'METHOD_NOT_ALLOWED');
  if(request.headers.get('origin')!==url.origin)return reply(403,'ORIGIN_NOT_ALLOWED');
  if(url.search||!(await emptyBody(request)))return reply(400,'EMPTY_REQUEST_REQUIRED');
  const siteId=request.headers.get('x-site-id')||'',auth=request.headers.get('authorization')||'';
  if(!UUID.test(siteId))return reply(400,'INVALID_SITE_ID');
  if(!/^Bearer [^\s]{1,8192}$/.test(auth))return reply(401,'AUTH_REQUIRED');
  const match=url.pathname.slice(PREFIX.length).match(/^(check|search)\/(.+)$/);
  if(!match||match[2].length>1200)return reply(400,'INVALID_LOOKUP');
  let value;
  try{const raw=decodeURIComponent(match[2]);value=match[1]==='search'?normalizeSearch(raw):normalizeDomain(raw).domain;}
  catch{return reply(400,match[1]==='search'?'INVALID_SEARCH_QUERY':'INVALID_DOMAIN');}
  let base,key;
  try{
   base=new URL(env?.SUPABASE_URL);key=env?.SUPABASE_PUBLISHABLE_KEY;
   if(base.protocol!=='https:'||!base.hostname.endsWith('.supabase.co')||base.port||base.username||base.password||base.pathname!=='/'||base.search||base.hash||typeof key!=='string'||!key)throw Error();
  }catch{return reply(503,'AUTH_UNAVAILABLE');}
  let user;
  try{
   const verified=await read(new URL('/auth/v1/user',base),auth,key);
   if(verified.denied)return reply(401,'INVALID_SESSION');
   user=verified.data;if(!UUID.test(user?.id))return reply(503,'AUTH_UNAVAILABLE');
   if(!admit(user.id))return reply(429,'LOOKUP_RATE_LIMITED');
   if(pending.has(user.id))return reply(429,'LOOKUP_BUSY');
  }catch{return reply(503,'AUTH_UNAVAILABLE');}
  pending.add(user.id);
  try{
   const siteUrl=new URL('/rest/v1/sites',base);siteUrl.search=new URLSearchParams({id:'eq.'+siteId,select:'id,owner_id',limit:'1'}).toString();
   let found;try{found=await read(siteUrl,auth,key);}catch{return reply(503,'AUTH_UNAVAILABLE');}
   if(found.denied)return reply(403,'SITE_OWNER_REQUIRED');
   const rows=found.data;
   if(!Array.isArray(rows))return reply(503,'AUTH_UNAVAILABLE');
   if(rows.length!==1||rows[0]?.id!==siteId||rows[0]?.owner_id!==user.id)return reply(403,'SITE_OWNER_REQUIRED');
   const isSearch=match[1]==='search';
   let result;
   try{result=isSearch?await search(env,{query:value,limit:50}):makeOffer(await check(env,{domain:value}),{domain:value});}
   catch{return reply(502,'LOOKUP_UNAVAILABLE');}
   if(result?.providerId!=='cloudflare'||result?.lookupOnly!==true||result?.purchaseAllowed!==false||(isSearch?result.query!==value:result.domain!==value))return reply(502,'LOOKUP_UNAVAILABLE');
   if(isSearch&&result.status==='search_results'&&(!Array.isArray(result.domains)||result.domains.length>50))return reply(502,'LOOKUP_UNAVAILABLE');
   const ok=isSearch?result.status==='search_results':['checked','not_registrable','premium_not_supported'].includes(result.status);
   return reply(ok?200:502,isSearch?'REGISTRAR_SEARCH':'REGISTRAR_CHECK',result);
  }finally{pending.delete(user.id);}
 };
}
const legacyProductionRegistrarLookupResponse=createProductionRegistrarLookup();
export async function domainProductionRegistrarLookupResponse(request,env){
 const customer=await customerDomainAuthBridge(request,env);
 return customer??legacyProductionRegistrarLookupResponse(request,env);
}
