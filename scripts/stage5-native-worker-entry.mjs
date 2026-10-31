import {createPublicTenantLookup,createTenantHtmlBoundary} from '../server/drafts/domain-tenant-html-boundary.mjs';
import {createFreshOnlyTestResolver} from '../server/drafts/domain-transfer-fresh-only-test-resolver.mjs';
const origin='https://storage.test';
const terminal=(request,status)=>new Response(request.method==='HEAD'?null:status===404?'Not found':'Service unavailable',{status,headers:{'cache-control':'no-store'}});
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export default {async fetch(request,env){
 const u=new URL(request.url);
 if(u.pathname==='/auth/v1/user'&&request.method==='GET')return env.BACKEND.fetch(new Request(origin+u.pathname,request));
 if(u.pathname==='/rest/v1/rpc/move_site_domain_v2'&&request.method==='POST')return env.BACKEND.fetch(new Request(origin+u.pathname,request));
 if(u.pathname==='/__shared.js'&&request.method==='GET')return new Response('export const shared=true;',{headers:{'content-type':'application/javascript','cache-control':'no-store'}});
 if(u.pathname.startsWith('/auth/')||u.pathname.startsWith('/rest/')||u.pathname.startsWith('/api/'))return terminal(request,404);
 const fetchImpl=(input,options)=>env.BACKEND.fetch(input,options);
 const resolveTenant=createPublicTenantLookup({origin,key:'local-adapter-only',fetchImpl});
 const resolveRedirect=createFreshOnlyTestResolver({enabled:true,environment:'isolated-test',origin,fetchImpl,cache:{get(){throw Error('CACHE_FORBIDDEN');},set(){throw Error('CACHE_FORBIDDEN');}},namespace:'native-worker-acceptance',timeoutMs:5000});
 const boundary=createTenantHtmlBoundary({enabled:true,environment:'isolated-test',matchesTenantHtml:r=>['example.test','source.ngeblogging.com'].includes(new URL(r.url).hostname),resolveRedirect,resolveTenant,renderTenant:async(r,e,c,id)=>{
  const url=new URL('/rest/v1/tenant_render_probe',origin);url.search=new URLSearchParams({hostname:'eq.'+id.hostname,site_id:'eq.'+id.siteId,select:'site_id,hostname,marker',limit:'2'});
  const response=await fetchImpl(url.href,{method:'GET',cache:'no-store'});if(!response.ok)return terminal(r,503);const rows=await response.json();
  if(!Array.isArray(rows)||rows.length>1)return terminal(r,503);if(!rows.length)return terminal(r,404);const row=rows[0];
  if(row.site_id!==id.siteId||row.hostname!==id.hostname)return terminal(r,503);
  return new Response('<!doctype html><main data-site-id="'+escape(id.siteId)+'">'+escape(row.marker)+'</main>',{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
 }});
 const result=await boundary(request,env,{});return result===null?terminal(request,404):result;
}};
