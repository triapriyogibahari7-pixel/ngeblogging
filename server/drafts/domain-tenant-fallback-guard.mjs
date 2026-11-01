// Isolated tenant-HTML fallback candidate. Not wired into any Worker.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SITE_STATES=new Set(['draft','active','suspended','archived']);
const DOMAIN_STATES=new Set(['pending','verifying','active','failed','pending_deletion']);
function terminal(request,status){
  const code=status===404?'TENANT_NOT_AVAILABLE':status===405?'METHOD_NOT_ALLOWED':'TENANT_LOOKUP_UNAVAILABLE';
  return new Response(request.method==='HEAD'?null:JSON.stringify({code}),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff',...(status===405?{allow:'GET, HEAD'}:{})}});
}
function fixtureHost(request){
  const url=new URL(request.url),host=url.hostname.toLowerCase().replace(/\.$/,'');
  const local=['localhost','127.0.0.1','[::1]'].includes(host);
  if(url.username||url.password||(!local&&(url.protocol!=='https:'||!host.endsWith('.test')||url.port))||(local&&!['http:','https:'].includes(url.protocol)))return null;
  return host;
}
function cancel(response){try{response?.body?.cancel()?.catch(()=>{});}catch{}}
export function createTestTenantFallbackGuard({enabled=false,environment,readSite,renderTenant}={}){
  if(enabled!==true||environment!=='isolated-test'||typeof readSite!=='function'||typeof renderTenant!=='function')throw new TypeError('ISOLATED_TENANT_GUARD_REQUIRED');
  return async function guarded(request){
    if(!['GET','HEAD'].includes(request.method))return terminal(request,405);
    let host;
    try{host=fixtureHost(request);}catch{return terminal(request,404);}
    if(!host)return terminal(request,404);
    try{
      const response=await readSite(host,{cache:'no-store'});
      if(!response?.ok)return terminal(request,503);
      const rows=await response.json();
      if(!Array.isArray(rows)||rows.length>1)return terminal(request,503);
      if(rows.length===0)return terminal(request,404);
      const row=rows[0];
      if(!row||typeof row!=='object'||!UUID.test(row.site_id||'')||row.hostname!==host||!SITE_STATES.has(row.site_status)||!DOMAIN_STATES.has(row.domain_status)||typeof row.is_public!=='boolean')return terminal(request,503);
      if(row.site_status!=='active'||row.domain_status!=='active'||row.is_public!==true)return terminal(request,404);
      const context=Object.freeze({siteId:row.site_id,hostname:host});
      const result=await renderTenant(request,context);
      if(!result||result.siteId!==context.siteId||result.hostname!==context.hostname||!(result.response instanceof Response)||result.response.status!==200||String(result.response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase()!=='text/html'){
        cancel(result?.response);return terminal(request,503);
      }
      const headers=new Headers(result.response.headers);headers.set('cache-control','no-store');headers.set('x-content-type-options','nosniff');headers.delete('etag');headers.delete('content-length');
      if(request.method==='HEAD')cancel(result.response);
      return new Response(request.method==='HEAD'?null:result.response.body,{status:200,headers});
    }catch{return terminal(request,503);}
  };
}
