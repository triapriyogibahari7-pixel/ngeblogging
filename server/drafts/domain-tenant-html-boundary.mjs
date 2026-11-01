const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const unavailable=()=>({kind:'unavailable'});
const hidden=()=>({kind:'not_visible'});
export function createPublicTenantLookup({origin,key,fetchImpl=fetch,timeoutMs=5000}){
 const base=new URL(origin);if(base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash)throw Error('INVALID_STORAGE_ORIGIN');
 if(!key||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>30000)throw Error('INVALID_LOOKUP_CONFIGURATION');
 return async request=>{
  const host=new URL(request.url).hostname.toLowerCase();
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  const read=async(table,params)=>{const url=new URL('/rest/v1/'+table,base);url.search=new URLSearchParams(params);const r=await fetchImpl(url.href,{method:'GET',headers:{apikey:key,authorization:'Bearer '+key,accept:'application/json'},cache:'no-store',signal:controller.signal});if(!r.ok)throw Error('LOOKUP_HTTP_FAILURE');const rows=await r.json();if(!Array.isArray(rows)||rows.length>1)throw Error('LOOKUP_SHAPE_FAILURE');return rows;};
  try{
   const domains=await read('site_domains',{hostname:'eq.'+host,status:'eq.active',select:'site_id,hostname',limit:'2'});
   if(!domains.length)return hidden();const d=domains[0];if(!d||!uuid.test(d.site_id)||d.hostname!==host)return unavailable();
   const sites=await read('sites',{id:'eq.'+d.site_id,status:'eq.active',is_public:'eq.true',select:'id,status,is_public',limit:'2'});
   if(!sites.length)return hidden();const s=sites[0];
   if(!s||s.id!==d.site_id||s.status!=='active'||s.is_public!==true)return unavailable();
   return {kind:'public',identity:Object.freeze({siteId:s.id,hostname:host})};
  }catch{return unavailable();}finally{clearTimeout(timer);}
 };
}
function terminal(request,status){return new Response(request.method==='HEAD'?null:status===404?'Not found':'Service unavailable',{status,headers:{'cache-control':'no-store','content-type':'text/plain; charset=utf-8','x-content-type-options':'nosniff'}});}
export function createTenantHtmlBoundary({enabled=false,environment='',matchesTenantHtml,resolveRedirect,resolveTenant,renderTenant}){
 if(enabled&&(environment!=='isolated-test'||![matchesTenantHtml,resolveRedirect,resolveTenant,renderTenant].every(x=>typeof x==='function')))throw Error('ISOLATED_BOUNDARY_CONFIGURATION_REQUIRED');
 return async(request,env,context)=>{
  if(!enabled)return null;
  if(!['GET','HEAD'].includes(request.method))return null;
  try{
   if(!await matchesTenantHtml(request))return null;
   const redirect=await resolveRedirect(request,env,context);
   if(redirect!==null){if(!(redirect instanceof Response)||![307,308].includes(redirect.status))return terminal(request,503);const target=new URL(redirect.headers.get('location'));if(target.protocol!=='https:'||target.username||target.password||target.port)return terminal(request,503);const headers=new Headers(redirect.headers);headers.set('cache-control','no-store');return new Response(null,{status:redirect.status,headers});}
   const tenant=await resolveTenant(request,env,context);
   if(tenant?.kind==='not_visible')return terminal(request,404);
   const identity=tenant?.identity,host=new URL(request.url).hostname.toLowerCase();
   if(tenant?.kind!=='public'||!identity||!uuid.test(identity.siteId)||identity.hostname!==host)return terminal(request,503);
   const validated=Object.freeze({siteId:identity.siteId,hostname:host});
   const response=await renderTenant(request,env,context,validated);
   if(!(response instanceof Response))return terminal(request,503);
   const headers=new Headers(response.headers);headers.set('cache-control','no-store');
   return new Response(request.method==='HEAD'?null:response.body,{status:response.status,statusText:response.statusText,headers});
  }catch{return terminal(request,503);}
 };
}
