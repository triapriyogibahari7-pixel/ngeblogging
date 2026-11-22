const DB='https://polvmlrhqoiflumibfqs.supabase.co';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const PID=/^(?:[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/;
const terminal=(request,status)=>new Response(request.method==='HEAD'?null:JSON.stringify({code:status===404?'CONNECTION_NOT_AVAILABLE':status===501?'CONNECTION_UPGRADE_NOT_SUPPORTED':'CONNECTION_ACCESS_UNAVAILABLE'}),{status,headers:{'content-type':'application/json','cache-control':'private, no-store','cdn-cache-control':'no-store','cloudflare-cdn-cache-control':'no-store','x-content-type-options':'nosniff'}});
const cancel=response=>{try{response?.body?.cancel()?.catch(()=>{});}catch{}};
async function readJson(response){
 const reader=response.body?.getReader();if(!reader)throw Error('SERVING_BODY_REQUIRED');
 try{const decoder=new TextDecoder('utf-8',{fatal:true});let text='',size=0;for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>8192)throw Error('SERVING_BODY_TOO_LARGE');text+=decoder.decode(part.value,{stream:true});}return JSON.parse(text+decoder.decode());}
 finally{reader.cancel().catch(()=>{});}
}
export async function withPaidConnectionAccess(request,env,serve,{fetchImpl=globalThis.fetch}={}){
 const url=new URL(request.url),hostname=url.hostname.toLowerCase().replace(/\.$/,'');
 if(hostname==='ngeblogging.com'||hostname.endsWith('.ngeblogging.com')||['localhost','127.0.0.1','[::1]'].includes(hostname))return serve();
 if(hostname.length>253||!hostname.includes('.')||hostname.split('.').some(label=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)))return terminal(request,404);
 let response;
 try{
  if(String(env.SUPABASE_URL||env.VITE_SUPABASE_URL||'').replace(/\/$/,'')!==DB||!env.SUPABASE_SERVICE_ROLE_KEY)throw Error('SERVING_STORAGE_REQUIRED');
  async function authorize(){
   const result=await fetchImpl(DB+'/rest/v1/rpc/domain_connection_serving_v1',{method:'POST',redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(5000),headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'content-type':'application/json'},body:JSON.stringify({p_hostname:hostname})});
   if(result.status!==200){try{result.body?.cancel()?.catch(()=>{});}catch{}throw Error('SERVING_LOOKUP_FAILED');}
   const row=await readJson(result);
   if(row?.version!=='connection-serving-v1'||row.hostname!==hostname||typeof row.applies!=='boolean'||typeof row.allowed!=='boolean')throw Error('SERVING_LOOKUP_UNVERIFIED');
   if(row.applies&&row.allowed&&(!UUID.test(row.siteId||'')||!UUID.test(row.domainId||'')||!PID.test(row.providerHostnameId||'')||!/^DCON-[a-f0-9]{32}$/.test(row.orderId||'')||!Number.isFinite(Date.parse(row.expiresAt))))throw Error('SERVING_IDENTITY_UNVERIFIED');
   return row;
  }
  const before=await authorize();
  if(!before.applies)return serve();
  if(!before.allowed||Date.parse(before.expiresAt)<=Date.now())return terminal(request,404);
  if(url.protocol!=='https:'||url.port)return terminal(request,404);
  if(request.headers.has('upgrade'))return terminal(request,501);
  response=await serve();
  if(!(response instanceof Response)||response.status===101)throw Error('SERVING_RESPONSE_REQUIRED');
  const after=await authorize();
  if(!after.applies||!after.allowed||Date.parse(after.expiresAt)<=Date.now()){cancel(response);return terminal(request,404);}
  if(['siteId','domainId','providerHostnameId','orderId','expiresAt'].some(key=>after[key]!==before[key]))throw Error('SERVING_IDENTITY_CHANGED');
  const headers=new Headers(response.headers);
  headers.set('cache-control','private, no-store');headers.set('cdn-cache-control','no-store');headers.set('cloudflare-cdn-cache-control','no-store');headers.set('pragma','no-cache');headers.set('expires','0');
  for(const key of ['etag','last-modified','age','content-length'])headers.delete(key);
  const empty=request.method==='HEAD'||[204,205,304].includes(response.status);if(empty)cancel(response);
  return new Response(empty?null:response.body,{status:response.status,statusText:response.statusText,headers});
 }catch{cancel(response);return terminal(request,503);}
}
