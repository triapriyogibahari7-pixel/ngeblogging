// Isolated composition candidate, not an active Worker entry.
// Classifier and renderer are trusted injections. Returned identity is cooperative,
// not proof of HTML ownership or snapshot consistency. No production rollout.
import {createTenantHtmlBoundary} from './domain-tenant-html-boundary.mjs';
const cancel=response=>{try{response?.body?.cancel()?.catch(()=>{});}catch{}};
const terminal=(request,status)=>new Response(request.method==='HEAD'?null:status===405?'Method not allowed':'Service unavailable',{status,headers:{'cache-control':'no-store','content-type':'text/plain; charset=utf-8','x-content-type-options':'nosniff',...(status===405?{allow:'GET, HEAD'}:{})}});
const mime=response=>String(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
export function createGuardedWorkerCandidate({enabled=false,environment='',worker,classifyRequest,resolveRedirect,resolveTenant,renderTenant}={}){
 if(typeof worker?.fetch!=='function')throw Error('WORKER_REQUIRED');
 if(enabled!==false&&enabled!==true)throw Error('BOOLEAN_OPT_IN_REQUIRED');
 if(!enabled)return {fetch:(request,env,context)=>worker.fetch(request,env,context)};
 if(environment!=='isolated-test'||![classifyRequest,resolveRedirect,resolveTenant,renderTenant].every(fn=>typeof fn==='function'))throw Error('ISOLATED_COMPOSITION_REQUIRED');
 const boundary=createTenantHtmlBoundary({enabled:true,environment,matchesTenantHtml:()=>true,resolveRedirect,resolveTenant,renderTenant:async(request,env,context,identity)=>{
  const result=await renderTenant(request,env,context,identity,()=>worker.fetch(request,env,context));
  if(result?.siteId!==identity.siteId||result?.hostname!==identity.hostname||!(result?.response instanceof Response)||result.response.status!==200||mime(result.response)!=='text/html'){cancel(result?.response);throw Error('TENANT_RENDER_CONTRACT_MISMATCH');}
  return result.response;
 }});
 return {async fetch(request,env,context){
  try{
   const url=new URL(request.url),local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
   if(url.username||url.password||(!local&&(url.protocol!=='https:'||!url.hostname.endsWith('.test')||url.port))||(local&&!['http:','https:'].includes(url.protocol)))return terminal(request,503);
   const route=await classifyRequest(request);
   if(route==='system')return await worker.fetch(request,env,context);
   if(route==='shared-asset'){const response=await worker.fetch(request,env,context);if(!(response instanceof Response))return terminal(request,503);if(['text/html','application/xhtml+xml'].includes(mime(response))){cancel(response);return terminal(request,503);}return response;}
   if(route!=='tenant-html')return terminal(request,503);
   if(!['GET','HEAD'].includes(request.method))return terminal(request,405);
   return await boundary(request,env,context);
  }catch{return terminal(request,503);}
 }};
}
