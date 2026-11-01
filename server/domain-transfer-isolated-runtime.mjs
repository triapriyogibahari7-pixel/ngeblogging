import {createDomainTransferHandler} from './domain-transfer-handler.mjs';
import {createTransferStateHandler} from './domain-transfer-state-handler.mjs';
import {createIsolatedTransferAdapters} from './domain-transfer-supabase-adapter.mjs';

// Dedicated test runtime only. No production environment-variable fallback.
const PATHS=new Set(['/api/domains/move','/api/domains/move-state']);
const reply=(status,code)=>new Response(JSON.stringify({code}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
export function createIsolatedTransferRuntime({enabled=false,environment='',allowedOrigin='',databaseUrl,publishableKey,approvedDatabaseOrigin,fetchImpl=fetch,requestId=()=>crypto.randomUUID()}={}){
  if(enabled!==true||environment!=='isolated-test')return request=>reply(PATHS.has(new URL(request.url).pathname)?503:404,PATHS.has(new URL(request.url).pathname)?'STAGE5_DISABLED':'NOT_FOUND');
  let origin;try{origin=new URL(allowedOrigin);}catch{throw new Error('ISOLATED_ALLOWED_ORIGIN_REQUIRED');}
  const local=['localhost','127.0.0.1','[::1]'].includes(origin.hostname);
  if(origin.origin!==allowedOrigin||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash||(!local&&origin.protocol!=='https:')||(local&&!['http:','https:'].includes(origin.protocol))||origin.hostname==='ngeblogging.com'||origin.hostname.endsWith('.ngeblogging.com')||origin.hostname==='ngeblogging.triapriyogibahari7.workers.dev')throw new Error('ISOLATED_ALLOWED_ORIGIN_REQUIRED');
  if(typeof requestId!=='function')throw new Error('REQUEST_ID_FACTORY_REQUIRED');
  const adapter=createIsolatedTransferAdapters({environment,databaseUrl,publishableKey,approvedTestOrigin:approvedDatabaseOrigin,fetchImpl});
  const move=createDomainTransferHandler({...adapter,enabled:true,environment,allowedOrigin,requestId}),read=createTransferStateHandler({...adapter,enabled:true,environment,allowedOrigin,requestId});
  return request=>{
    const url=new URL(request.url);
    if(!PATHS.has(url.pathname))return reply(404,'NOT_FOUND');
    if(url.origin!==allowedOrigin)return reply(403,'REQUEST_ORIGIN_NOT_ALLOWED');
    return url.pathname==='/api/domains/move'?move(request):read(request);
  };
}
