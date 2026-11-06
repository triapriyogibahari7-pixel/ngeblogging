import {handleDomainRequest as handleDomainRequestOriginal} from './domain-handler.mjs';
import {guardSaasRequest,saasReadiness} from './domain-saas-readiness-stage5.mjs';
import {PUBLIC_AUDIT_RELEASE,auditPublicTargets,summarizePublicAudit} from './domain-public-audit.mjs';
import {createPublicAuditFetch} from './domain-public-audit-transport.mjs';
const RELEASE='domain-all-site-addresses-20261106';
async function handleDomainRequestBase(request,env,requestId){return guardSaasRequest(request,env,requestId)||handleDomainRequestOriginal(request,env,requestId);}
function response(status,body,requestId=''){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-ngeblogging-domain-authority':RELEASE,...(requestId?{'x-request-id':requestId}:{})}});}
function bearer(request){const value=request.headers.get('authorization')||'';return value.startsWith('Bearer ')?value.slice(7).trim():'';}
function supabaseConfig(env){return {url:String(env.SUPABASE_URL||env.VITE_SUPABASE_URL||'').replace(/\/$/,''),key:String(env.SUPABASE_PUBLISHABLE_KEY||env.VITE_SUPABASE_PUBLISHABLE_KEY||env.VITE_SUPABASE_ANON_KEY||'')};}
function domainRank(domain){const active=domain?.status==='active'&&domain?.provider_status==='active'&&domain?.ssl_status==='active';const created=Date.parse(domain?.created_at||'');return [active?0:1,domain?.is_primary?0:1,domain?.status==='pending_deletion'?1:0,Number.isFinite(created)?-created:0];}
function canonicalDomains(domains,siteId){
 return (Array.isArray(domains)?domains:[]).filter(domain=>Boolean(siteId)&&String(domain?.site_id||'')===String(siteId)).sort((left,right)=>{const a=domainRank(left),b=domainRank(right);for(let index=0;index<a.length;index++)if(a[index]!==b[index])return a[index]-b[index];return String(left?.hostname||'').localeCompare(String(right?.hostname||''));});
}
async function baseList(request,env,requestId,siteId){const url=new URL(request.url);url.pathname='/api/domains/list';url.search='?siteId='+encodeURIComponent(siteId);return handleDomainRequestBase(new Request(url,{method:'GET',headers:{authorization:request.headers.get('authorization')||'',accept:'application/json','cache-control':'no-cache'}}),env,requestId);}
async function readSite(request,env,siteId){
 const config=supabaseConfig(env),token=bearer(request);if(!config.url||!config.key||!token)return null;
 const controller=new AbortController();let timer;
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('SITE_LOOKUP_TIMEOUT'));},5000);});
 try{return await Promise.race([(async()=>{const result=await fetch(config.url+'/rest/v1/sites?id=eq.'+encodeURIComponent(siteId)+'&select=id,name,slug,status,is_public&limit=1',{headers:{apikey:config.key,authorization:'Bearer '+token,accept:'application/json','cache-control':'no-cache'},cache:'no-store',signal:controller.signal});if(!result.ok)return null;const rows=await result.json().catch(()=>[]);return rows?.[0]||null;})(),deadline]);}finally{clearTimeout(timer);controller.abort();}
}
function additionalAddresses(domain){const rows=domain?.ownership_verification?.additional_hostnames;return (Array.isArray(rows)?rows:[]).filter(item=>item?.hostname&&item.enabled!==false).map(item=>({label:item.host==='www'?'Alamat www':'Alamat tambahan',kind:item.host==='www'?'www':'additional',hostname:String(item.hostname).trim().toLowerCase().replace(/\.$/,'' )}));}
async function handleAudit(request,env,requestId){
 const body=await request.clone().json().catch(()=>({})),siteId=String(body.siteId||'');
 const listResponse=await baseList(request,env,requestId,siteId);if(!listResponse.ok)return listResponse;
 const payload=await listResponse.json().catch(()=>({})),domains=canonicalDomains(payload.domains,siteId),domain=domains[0]||null;
 let site;try{site=await readSite(request,env,siteId);}catch{return response(503,{code:'AUDIT_SITE_LOOKUP_UNAVAILABLE',error:'Audit belum dapat membaca situs aktif. Status koneksi domain tidak diubah.'},requestId);}
 if(!site?.id||site.id!==siteId||!site?.slug)return response(404,{code:'SITE_NOT_FOUND',error:'Situs aktif tidak ditemukan.'},requestId);
 const published=site.status==='active'&&site.is_public===true;
 const targets=[{label:'Subdomain gratis',kind:'free',hostname:site.slug+'.ngeblogging.com',connectionStatus:published?'published':'draft'}];
 for(const current of domains){
  if(!current?.hostname||['pending_deletion','deleted','blocked','test_blocked','test_failed'].includes(current.status))continue;
  const connectionStatus=current.status==='active'&&current.provider_status==='active'&&current.ssl_status==='active'?'connected':'pending';
  targets.push({label:current.is_primary?'Domain utama':'Custom domain',kind:'root',hostname:String(current.hostname).trim().toLowerCase().replace(/\.$/,''),connectionStatus});
  targets.push(...additionalAddresses(current).map(target=>({...target,connectionStatus})));
 }
 const seen=new Set(),unique=targets.filter(target=>{if(seen.has(target.hostname))return false;seen.add(target.hostname);return true;});
 if(unique.length>14)return response(409,{code:'AUDIT_ADDRESS_LIMIT',error:'Situs ini memiliki lebih dari 14 alamat. Audit belum dijalankan; diperlukan audit bertahap agar tidak ada alamat terlewat.',addressCount:unique.length},requestId);
 const results=await auditPublicTargets(unique,{published,fetchImpl:createPublicAuditFetch(env)});
 if(results.length!==unique.length)return response(503,{code:'AUDIT_INCOMPLETE',error:'Hasil audit belum mencakup seluruh alamat. Status koneksi tidak diubah.'},requestId);
 return response(200,{release:RELEASE,auditRelease:PUBLIC_AUDIT_RELEASE,site:{id:site.id,name:site.name,slug:site.slug,status:site.status,isPublic:site.is_public},domain:domain?{id:domain.id,hostname:domain.hostname,status:domain.status,providerStatus:domain.provider_status,sslStatus:domain.ssl_status}:null,checkedAt:new Date().toISOString(),...summarizePublicAudit(results),results},requestId);
}
export async function handleDomainRequest(request,env,requestId=crypto.randomUUID()){
 const url=new URL(request.url);
 if(request.method==='POST'&&url.pathname==='/api/domains/audit')return handleAudit(request,env,requestId);
 const result=await handleDomainRequestBase(request,env,requestId);
 if(request.method==='GET'&&url.pathname==='/api/domains/list'&&result.ok){const payload=await result.clone().json().catch(()=>({})),siteId=url.searchParams.get('siteId')||'';return response(result.status,{...payload,domains:canonicalDomains(payload.domains,siteId),release:RELEASE,saasReadiness:saasReadiness(env)},requestId);}
 return result;
}
