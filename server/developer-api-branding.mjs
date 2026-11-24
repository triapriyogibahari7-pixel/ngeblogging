const PREFIX='/api/developer';
const HOSTS=new Set(['ngeblogging.com','www.ngeblogging.com']);
const CORS={'access-control-allow-origin':'*','access-control-allow-headers':'authorization, content-type, x-client-info','access-control-allow-methods':'GET, OPTIONS','access-control-max-age':'86400','cache-control':'no-store','x-content-type-options':'nosniff'};
const json=(status,body)=>new Response(JSON.stringify(body),{status,headers:{...CORS,'content-type':'application/json; charset=utf-8'}});
export async function developerApiResponse(request,env={},fetcher=fetch){
 const url=new URL(request.url);
 if(url.protocol!=='https:'||!HOSTS.has(url.hostname)||(url.pathname!==PREFIX&&!url.pathname.startsWith(PREFIX+'/')))return null;
 const path=url.pathname.slice(PREFIX.length)||'/v1/me';
 if(!/^\/(?:v1(?:\/me|\/sites(?:\/[0-9a-f-]{36}(?:\/content)?)?)?)?$/i.test(path))return json(404,{code:'ENDPOINT_NOT_FOUND',error:'Endpoint API tidak ditemukan.'});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});
 if(request.method!=='GET')return json(405,{code:'METHOD_NOT_ALLOWED',error:'Gunakan metode GET.'});
 try{
  const upstream=new URL('/functions/v1/ngeblogging-api'+path,env.SUPABASE_URL||'https://polvmlrhqoiflumibfqs.supabase.co');
  if(upstream.protocol!=='https:')throw Error('INVALID_UPSTREAM');
  upstream.search=url.search;
  const headers=new Headers({accept:'application/json'});
  const authorization=request.headers.get('authorization');
  if(authorization)headers.set('authorization',authorization);
  const response=await fetcher(upstream.toString(),{method:'GET',headers,redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(response.status>=300&&response.status<400||!response.headers.get('content-type')?.includes('application/json'))throw Error('INVALID_UPSTREAM_RESPONSE');
  return new Response(response.body,{status:response.status,headers:{...CORS,'content-type':'application/json; charset=utf-8'}});
 }catch{return json(502,{code:'API_UNAVAILABLE',error:'Layanan API Ngeblogging sementara tidak tersedia.'});}
}
