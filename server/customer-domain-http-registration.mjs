import {createWorkerRedirectSafeFetch} from './domain-worker-fetch.mjs';
import {handleDomainRequest} from './domain-handler.mjs';
import {customerHost} from '../shared/customer-domain-connection.mjs';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const FIELDS='id,site_id,hostname,status,provider,provider_hostname_id,provider_status,ssl_status,ownership_verification,ssl_validation,is_primary,last_checked_at,error_message';
const reply=(status,body)=>Response.json({...body,publicSiteVerified:false,siteContentVerified:false},{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
async function readJson(r,limit=65536,signal){const reader=r.body?.getReader();if(!reader)throw Error('RESPONSE_BODY_REQUIRED');const cancel=()=>{reader.cancel().catch(()=>{});};signal?.addEventListener('abort',cancel,{once:true});let size=0,text='';const decoder=new TextDecoder();try{for(;;){if(signal?.aborted)throw Error('REQUEST_ABORTED');const p=await reader.read();if(signal?.aborted)throw Error('REQUEST_ABORTED');if(p.done)break;size+=p.value.byteLength;if(size>limit)throw Error('BODY_TOO_LARGE');text+=decoder.decode(p.value,{stream:true});}return JSON.parse(text+decoder.decode());}finally{signal?.removeEventListener('abort',cancel);await reader.cancel().catch(()=>{});}}
export function createSaasHttpRegistration({legacyHandler=handleDomainRequest,fetchImpl=(...args)=>globalThis.fetch(...args)}={}){
 const transport=createWorkerRedirectSafeFetch(fetchImpl);
 return async function(request,env){
  if(request.method!=='POST'||new URL(request.url).pathname!=='/api/domains/register'||env.CUSTOM_DOMAIN_PROVIDER!=='cloudflare-custom-hostnames')return legacyHandler(request,env);
  const authorization=request.headers.get('authorization')||'';
  if(!/^Bearer \S+$/.test(authorization)||authorization.length>4096)return reply(401,{code:'AUTH_REQUIRED'});
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return reply(415,{code:'JSON_REQUIRED'});
  const db=String(env.SUPABASE_URL||env.VITE_SUPABASE_URL||'').replace(/\/$/,''),key=env.SUPABASE_PUBLISHABLE_KEY||env.VITE_SUPABASE_PUBLISHABLE_KEY||env.VITE_SUPABASE_ANON_KEY;
  const apiToken=String(env.CLOUDFLARE_DOMAIN_API_TOKEN||env.CLOUDFLARE_API_TOKEN||'').trim(),zone=env.CLOUDFLARE_ZONE_ID,origin=String(env.CLOUDFLARE_CUSTOM_ORIGIN||'').toLowerCase(),target=String(env.CLOUDFLARE_CUSTOM_HOSTNAME_TARGET||'').toLowerCase();
  const platformHost=s=>s.endsWith('.ngeblogging.com')&&s.length<=253&&s.split('.').every(x=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x));
  if(db!=='https://polvmlrhqoiflumibfqs.supabase.co'||!key||!/^[a-f0-9]{32}$/i.test(zone||'')||!apiToken||!platformHost(origin)||!platformHost(target))return reply(503,{code:'SAAS_HTTP_CONFIGURATION_REQUIRED'});
  const controller=new AbortController(),abort=()=>controller.abort();let providerSent=false;
  request.signal.addEventListener('abort',abort,{once:true});if(request.signal.aborted)abort();
  const timer=setTimeout(abort,25000),dbHeaders={apikey:key,authorization,accept:'application/json','content-type':'application/json'};
  const call=async(url,init={})=>{if(controller.signal.aborted)throw Error('REQUEST_ABORTED');const r=await transport(url,{...init,signal:controller.signal});const data=await readJson(r,65536,controller.signal);if(!r.ok)throw Object.assign(Error('UPSTREAM_REJECTED'),{status:r.status,db:url.startsWith(db+'/')});return data;};
  const get=path=>call(db+path,{method:'GET',headers:dbHeaders});
  try{
   const body=await readJson(request,4096,controller.signal);if(!UUID.test(body.siteId||''))return reply(400,{code:'INVALID_SITE'});
   let hostname;try{hostname=customerHost(body.hostname);}catch{return reply(400,{code:'INVALID_CUSTOMER_DOMAIN'});}
   const user=await get('/auth/v1/user');if(!UUID.test(user?.id||''))return reply(401,{code:'AUTH_REQUIRED'});
   const sites=await get('/rest/v1/sites?id=eq.'+body.siteId+'&select=id,owner_id&limit=1');
   if(!Array.isArray(sites)||sites.length!==1||sites[0].id!==body.siteId)return reply(403,{code:'SITE_MANAGER_REQUIRED'});
   if(sites[0].owner_id!==user.id){const roles=await get('/rest/v1/site_members?site_id=eq.'+body.siteId+'&user_id=eq.'+user.id+'&role=in.(owner,admin)&select=role&limit=1');if(!Array.isArray(roles)||!roles.some(r=>['owner','admin'].includes(r.role)))return reply(403,{code:'SITE_MANAGER_REQUIRED'});}
   const rows=await get('/rest/v1/site_domains?hostname=eq.'+encodeURIComponent(hostname)+'&select='+FIELDS+'&limit=2');
   if(!Array.isArray(rows)||rows.length>1)return reply(503,{code:'DOMAIN_SNAPSHOT_UNVERIFIED'});
   const existing=rows[0];
   if(existing){
    if(existing.site_id!==body.siteId)return reply(409,{code:'DOMAIN_ALREADY_USED'});
    if(!['cloudflare','cloudflare-custom-hostnames'].includes(existing.provider))return reply(409,{code:'DOMAIN_PROVIDER_MIGRATION_REQUIRED'});
    if(['pending_deletion','deleted','blocked','failed'].includes(existing.status))return reply(409,{code:'DOMAIN_RECOVERY_REQUIRED'});
    if(existing.provider_hostname_id)return reply(200,{domain:existing,reused:true,cnameTarget:target,certificatePolicy:'preserve-existing'});
    return reply(409,{code:'DOMAIN_RECOVERY_REQUIRED'});
   }
   const providerUrl='https://api.cloudflare.com/client/v4/zones/'+zone+'/custom_hostnames',headers={authorization:'Bearer '+apiToken,accept:'application/json','content-type':'application/json'};
   const snapshot=await call(providerUrl+'?hostname.exact='+encodeURIComponent(hostname),{method:'GET',headers});
   if(snapshot.success!==true||!Array.isArray(snapshot.result))return reply(503,{code:'PROVIDER_SNAPSHOT_UNVERIFIED'});
   if(snapshot.result.length)return reply(409,{code:'PROVIDER_HOSTNAME_ALREADY_EXISTS',error:'Hostname sudah ada di provider. Perlu rekonsiliasi, bukan didaftarkan ulang.'});
   providerSent=true;
   const created=await call(providerUrl,{method:'POST',headers,body:JSON.stringify({hostname,custom_origin_server:origin,ssl:{method:'http',type:'dv',bundle_method:'ubiquitous',settings:{min_tls_version:'1.2',tls_1_3:'on',http2:'on'}}})});
   const h=created.result;
   if(created.success!==true||h?.hostname!==hostname||!UUID.test(h.id||'')||!h.ssl||h.ssl.method!=='http')return reply(502,{code:'SAAS_HTTP_CREATION_UNVERIFIED',mayHaveChangedProvider:true});
   const now=new Date().toISOString(),state={site_id:body.siteId,hostname,provider:'cloudflare',provider_hostname_id:h.id,provider_status:h.status||'pending',ssl_status:h.ssl.status||'pending',status:'verifying',is_primary:false,ownership_verification:h.ownership_verification||{},ssl_validation:Array.isArray(h.ssl.validation_records)?h.ssl.validation_records:[],last_checked_at:now,updated_at:now,error_message:null};
   const saved=await call(db+'/rest/v1/site_domains?select='+FIELDS,{method:'POST',headers:{...dbHeaders,prefer:'return=representation'},body:JSON.stringify(state)});
   if(!Array.isArray(saved)||saved.length!==1||!UUID.test(saved[0].id||'')||saved[0].site_id!==body.siteId||saved[0].hostname!==hostname||saved[0].provider_hostname_id!==h.id)return reply(503,{code:'DOMAIN_STORAGE_UNVERIFIED',mayHaveChangedProvider:true});
   return reply(201,{domain:saved[0],cnameTarget:target,certificatePolicy:'http-first',requiresNameserverChange:false});
  }catch(error){return reply(error.db&&error.status===401?401:503,{code:error.db&&error.status===401?'AUTH_REQUIRED':providerSent?'SAAS_REGISTRATION_OUTCOME_UNKNOWN':'SAAS_REGISTRATION_UNAVAILABLE',mayHaveChangedProvider:providerSent});}
  finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);controller.abort();}
 };
}
export const handleSaasHttpRegistration=createSaasHttpRegistration();
