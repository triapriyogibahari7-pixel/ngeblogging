const BLOCKED=new Set(['blocked','deleted','pending_deletion','test_blocked','test_failed']);
export function domainManagementView(row={},siteId=null){
 const provider=typeof row.provider==='string'?row.provider:null;
 const providerFamily=provider==='cloudflare-full-zone'?'managed-zone':['cloudflare','cloudflare-custom-hostnames'].includes(provider)?'saas-custom-hostname':'unknown';
 const status=typeof row.status==='string'?row.status:'unknown';
 const aliases=Array.isArray(row.ownership_verification?.additional_hostnames)?row.ownership_verification.additional_hostnames:[];
 return {contractVersion:1,service:'ngeblogging-custom-domain',domainId:row.id||null,siteId:row.site_id||siteId,hostname:row.hostname||null,status,provider,providerFamily,targetProvider:'cloudflare-custom-hostnames',migrationRequired:providerFamily==='managed-zone'?true:providerFamily==='saas-custom-hostname'?false:null,automaticMigrationAllowed:false,nextStep:BLOCKED.has(status)?'review-blocked':providerFamily==='managed-zone'?'review-migration':providerFamily==='saas-custom-hostname'?'refresh':'review-provider',isPrimary:typeof row.is_primary==='boolean'?row.is_primary:null,aliases:aliases.filter(x=>x&&typeof x.hostname==='string').map(x=>({hostname:x.hostname,enabled:x.enabled!==false})),publicSiteVerified:false,siteContentVerified:false};
}
export async function normalizeDomainManagementResponse(request,response){
 if(!new URL(request.url).pathname.startsWith('/api/domains/')||!response?.ok||!response.headers.get('content-type')?.toLowerCase().includes('application/json'))return response;
 try{
  const payload=await response.clone().json();
  if(!payload||typeof payload!=='object'||Array.isArray(payload))return response;
  const enrich=row=>row&&typeof row==='object'&&!Array.isArray(row)&&typeof row.hostname==='string'?{...row,connection:domainManagementView(row,payload.siteId||null)}:row;
  const hasDomain=payload.domain&&typeof payload.domain==='object'&&!Array.isArray(payload.domain)&&typeof payload.domain.hostname==='string';
  const hasDomains=Array.isArray(payload.domains);
  if(!hasDomain&&!hasDomains)return response;
  const headers=new Headers(response.headers);for(const key of ['content-length','content-encoding','etag','content-md5','digest'])headers.delete(key);headers.set('cache-control','no-store');
  return new Response(JSON.stringify({...payload,connectionContractVersion:1,...(hasDomain?{domain:enrich(payload.domain)}:{}),...(hasDomains?{domains:payload.domains.map(enrich)}:{})}),{status:response.status,statusText:response.statusText,headers});
 }catch{return response;}
}
