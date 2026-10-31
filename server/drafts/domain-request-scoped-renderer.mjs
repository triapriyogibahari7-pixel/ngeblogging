// Isolated metadata/render adapter. Not wired to the active SEO or Worker.
// renderWithFetch is trusted and must consume the supplied transport.
// Metadata identity is not HTML attestation or transaction snapshot proof.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cancel=response=>{try{response?.body?.cancel()?.catch(()=>{});}catch{}};
function fixtureUrl(url){const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);return !url.username&&!url.password&&(local?['http:','https:'].includes(url.protocol):url.protocol==='https:'&&url.hostname.endsWith('.test')&&!url.port);}
export function createRequestScopedTenantRenderer({enabled=false,environment='',origin,fetchImpl,renderWithFetch,timeoutMs=1000}={}){
 if(enabled!==true||environment!=='isolated-test'||typeof fetchImpl!=='function'||typeof renderWithFetch!=='function'||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>5000)throw Error('ISOLATED_SCOPED_RENDERER_REQUIRED');
 const base=new URL(origin);if(!fixtureUrl(base)||base.pathname!=='/'||base.search||base.hash)throw Error('FIXTURE_STORAGE_REQUIRED');
 return async(request,_env,_context,inputIdentity)=>{
  const source=new URL(request.url);
  if(!fixtureUrl(source)||!['GET','HEAD'].includes(request.method)||!UUID.test(inputIdentity?.siteId||'')||inputIdentity?.hostname!==source.hostname)return {kind:'unavailable'};
  const identity=Object.freeze({siteId:inputIdentity.siteId,hostname:inputIdentity.hostname}),controller=new AbortController(),seen=new Set(),responses=[];
  let outcome='public',closed=false,pending=0,timer,response;
  const mark=kind=>{if(kind==='unavailable'||outcome!=='unavailable')outcome=kind;};
  const scopedFetch=(input,init={})=>{
   const task=(async()=>{pending++;try{
    if(closed)throw Error('RENDER_SCOPE_CLOSED');
    const url=new URL(input?.url??String(input)),table=url.pathname.split('/').at(-1),domains=table==='site_domains';
    const keys=domains?['hostname','status','select','limit']:['id','status','is_public','select','limit'];
    if(url.origin!==base.origin||url.pathname!=='/rest/v1/'+table||!['site_domains','sites'].includes(table)||(init.method||'GET')!=='GET'||init.body!=null||url.hash||[...url.searchParams.keys()].some(key=>!keys.includes(key)||url.searchParams.getAll(key).length!==1)||url.searchParams.get('limit')!=='2'||url.searchParams.get('status')!=='eq.active')throw Error('SCOPED_READ_REQUIRED');
    if(domains?url.searchParams.get('hostname')!=='eq.'+identity.hostname:url.searchParams.get('id')!=='eq.'+identity.siteId||url.searchParams.get('is_public')!=='eq.true')throw Error('SCOPED_IDENTITY_REQUIRED');
    const columns=(url.searchParams.get('select')||'').split(','),allowed=domains?['site_id','hostname','status']:['id','status','is_public','name'];
    if(!columns.length||columns.some(column=>!allowed.includes(column)))throw Error('SCOPED_COLUMNS_REQUIRED');
    const headers=new Headers(init.headers);headers.delete('authorization');headers.delete('apikey');headers.set('accept','application/json');
    const result=await fetchImpl(url.href,{...init,method:'GET',headers,cache:'no-store',redirect:'manual',signal:controller.signal});responses.push(result);
    if(closed){cancel(result);throw Error('RENDER_SCOPE_CLOSED');}
    if(!(result instanceof Response))throw Error('RESPONSE_REQUIRED');
    if(!result.ok){mark('unavailable');return result;}
    const rows=await result.clone().json();if(closed)throw Error('RENDER_SCOPE_CLOSED');
    if(!Array.isArray(rows)||rows.length>1)throw Error('METADATA_SHAPE_REQUIRED');
    if(!rows.length){mark('not_visible');return result;}
    const row=rows[0];
    if(domains?row?.site_id!==identity.siteId||row?.hostname!==identity.hostname||row?.status!=='active':row?.id!==identity.siteId||row?.status!=='active'||typeof row?.is_public!=='boolean')throw Error('METADATA_IDENTITY_REQUIRED');
    if(!domains&&row.is_public!==true)mark('not_visible');else seen.add(table);
    return result;
   }catch(error){mark('unavailable');throw error;}finally{pending--;}})();
   task.catch(()=>{});return task;
  };
  const work=Promise.resolve().then(()=>renderWithFetch({request,identity,fetchImpl:scopedFetch}));
  work.then(value=>{if(closed)cancel(value);},()=>{});
  try{
   response=await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('RENDER_TIMEOUT'));},timeoutMs);})]);
   if(pending||outcome==='public'&&(!seen.has('site_domains')||!seen.has('sites')))mark('unavailable');
   if(outcome!=='public'){cancel(response);return {kind:outcome};}
   if(!(response instanceof Response)||response.status!==200||String(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase()!=='text/html')throw Error('HTML_RESPONSE_REQUIRED');
   return {kind:'public',siteId:identity.siteId,hostname:identity.hostname,response};
  }catch{cancel(response);return {kind:'unavailable'};}finally{closed=true;clearTimeout(timer);controller.abort();for(const value of responses)if(!value.bodyUsed)cancel(value);}
 };
}
