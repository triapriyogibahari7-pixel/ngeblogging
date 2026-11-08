import { createConnectorEndpoint } from './nara-connector-endpoint.mjs';
import { requireConnectorAdminIdentity } from './nara-connector-admin-identity.mjs';
import { normalizeConnection } from '../shared/nara-connector-registry.mjs';
import { sealCredential, openCredential } from './nara-connector-credentials.mjs';
import { readConnectorMetadata } from './nara-connector-providers.mjs';
import { naraSpendApprovalResponse } from './nara-spend-approval-endpoint.mjs';
const BASE='https://polvmlrhqoiflumibfqs.supabase.co';
async function json(fetcher,url,options){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
  const response=await fetcher(url,{...options,redirect:'manual',signal:controller.signal});
  if(response.status>=300&&response.status<400)throw Error('CONNECTOR_STORAGE_UNAVAILABLE');
  if(!response.headers.get('content-type')?.includes('application/json')||!response.body)throw Error('CONNECTOR_STORAGE_UNAVAILABLE');
  const reader=response.body.getReader(),chunks=[];let size=0;
  try{while(true){const item=await reader.read();if(item.done)break;size+=item.value.byteLength;if(size>2097152){await reader.cancel();throw Error('CONNECTOR_STORAGE_UNAVAILABLE');}chunks.push(item.value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  const data=JSON.parse(new TextDecoder().decode(bytes));return {ok:response.ok,data};
 }finally{clearTimeout(timer);}
}
export async function naraFlexibleConnectorsResponse(request,env,fetcher=fetch){
 const spend=await naraSpendApprovalResponse(request,env,fetcher);if(spend)return spend;
 if(new URL(request.url).pathname!=='/api/nara/connectors'&&!new URL(request.url).pathname.startsWith('/api/nara/connectors/'))return null;
 const endpoint=createConnectorEndpoint({
  authenticate:async req=>{
   const authorization=req.headers.get('authorization')||'';
   if(!/^Bearer [^\s]{1,8192}$/.test(authorization))throw Error('CONNECTOR_AUTH_REQUIRED');
   if(String(env.SUPABASE_URL||'').replace(/\/$/,'')!==BASE||!env.SUPABASE_PUBLISHABLE_KEY)throw Error('CONNECTOR_UNAVAILABLE');
   let checked;try{checked=await json(fetcher,BASE+'/auth/v1/user',{method:'GET',headers:{authorization,apikey:env.SUPABASE_PUBLISHABLE_KEY}});}catch{throw Error('CONNECTOR_AUTH_REQUIRED');}
   if(!checked.ok)throw Error('CONNECTOR_AUTH_REQUIRED');return requireConnectorAdminIdentity(checked.data);
  },
  storage:async(actor,action,id=null,data={})=>{
   const token=env.SUPABASE_SERVICE_ROLE_KEY;if(!token)throw Error('CONNECTOR_STORAGE_UNAVAILABLE');
   let result;try{result=await json(fetcher,BASE+'/rest/v1/rpc/nara_connector_storage_v1',{method:'POST',headers:{authorization:`Bearer ${token}`,apikey:token,'content-type':'application/json'},body:JSON.stringify({p_actor:actor,p_action:action,p_id:id,p_data:data})});}catch{throw Error('CONNECTOR_STORAGE_UNAVAILABLE');}
   if(!result.ok){const allowed=['CONNECTOR_ADMIN_REQUIRED','CONNECTOR_NOT_FOUND','CONNECTOR_DISCONNECTED','CONNECTOR_REVISION_CONFLICT','CONNECTOR_INVALID_REQUEST'];throw Error(allowed.includes(result.data?.message)?result.data.message:'CONNECTOR_STORAGE_UNAVAILABLE');}
   return result.data;
  },
  normalize:normalizeConnection,seal:sealCredential,open:openCredential,
  readMetadata:(config,token)=>readConnectorMetadata(config,token,fetcher),
  key:()=>env.NARA_CONNECTOR_ENCRYPTION_KEY,newId:()=>crypto.randomUUID()
 });return endpoint(request);
}
