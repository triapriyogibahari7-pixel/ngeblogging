import { requireConnectorAdminIdentity } from './nara-connector-admin-identity.mjs';
import { normalizeConnection } from '../shared/nara-connector-registry.mjs';
import { openCredential } from './nara-connector-credentials.mjs';
import { readConnectorMetadata } from './nara-connector-providers.mjs';
const BASE='https://polvmlrhqoiflumibfqs.supabase.co';
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export async function collectNaraConnectorContext({env,user,authProject,deadline},fetcher=fetch){
 requireConnectorAdminIdentity(user);
 if(authProject!==BASE||!env.SUPABASE_SERVICE_ROLE_KEY)throw Error('NARA_CONNECTOR_AUTH_UNAVAILABLE');
 const actor=user.id;
 async function rpc(action,id=null){
  const ms=Math.min(4000,deadline-Date.now());if(ms<=0)throw Error('NARA_CONNECTOR_TIMEOUT');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),ms);
  try{
   const token=env.SUPABASE_SERVICE_ROLE_KEY;
   const res=await fetcher(BASE+'/rest/v1/rpc/nara_connector_storage_v1',{method:'POST',headers:{authorization:`Bearer ${token}`,apikey:token,'content-type':'application/json'},body:JSON.stringify({p_actor:actor,p_action:action,p_id:id,p_data:{}}),redirect:'manual',signal:controller.signal});
   if(!res.ok||!res.headers.get('content-type')?.includes('application/json')||!res.body)throw Error();
   const reader=res.body.getReader(),chunks=[];let size=0;
   try{while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>262144){await reader.cancel();throw Error();}chunks.push(next.value);}}finally{reader.releaseLock();}
   const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
   return JSON.parse(new TextDecoder().decode(bytes));
  }catch{throw Error('NARA_CONNECTOR_UNAVAILABLE');}finally{clearTimeout(timer);}
 }
 async function admin(){if((await rpc('admin'))?.admin!==true)throw Error('NARA_CONNECTOR_ACCESS_REVOKED');}
 function checked(row,id,revision){if(row?.id!==id||row.owner_id!==actor||row.key_version!=='v1'||row.enabled!==true||row.status!=='connected'||(revision!==undefined&&String(row.revision)!==revision))throw Error('NARA_CONNECTOR_ACCESS_REVOKED');return row;}
 await admin();
 const rows=await rpc('list');if(!Array.isArray(rows))throw Error('NARA_CONNECTOR_UNAVAILABLE');
 const connected=rows.filter(row=>row.enabled===true&&row.status==='connected');
 const results=[],snapshots=[];
 const readDeadline=Math.min(deadline-12000,Date.now()+8000);
 for(const item of connected.slice(0,2)){
  if(!uuid(item.id))throw Error('NARA_CONNECTOR_UNAVAILABLE');
  let row;
  try{row=checked(await rpc('authorize_tool',item.id),item.id);}catch{throw Error('NARA_CONNECTOR_ACCESS_REVOKED');}
  const revision=String(row.revision),config=normalizeConnection(row.config);
  if(readDeadline<=Date.now()){results.push({connectionId:item.id,status:'not-read-time-budget'});continue;}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),readDeadline-Date.now());
  try{
   const token=await openCredential(row.credential,env.NARA_CONNECTOR_ENCRYPTION_KEY,{ownerId:actor,connectionId:item.id,provider:config.provider});
   const boundedFetch=(url,options={})=>fetcher(url,{...options,signal:AbortSignal.any([controller.signal,options.signal].filter(Boolean))});
   const result=await readConnectorMetadata(config,token,boundedFetch);
   checked(await rpc('get',item.id),item.id,revision);
   const safeText=value=>typeof value==='string'?value.split(token).join('[REDACTED]').slice(0,200):undefined;
   const resources=(Array.isArray(result.resources)?result.resources:[]).slice(0,10).map(resource=>{const out={};for(const key of ['name','kind','projectRef','status','phase'])if(typeof resource[key]==='string')out[key]=safeText(resource[key]);if(typeof resource.private==='boolean')out.private=resource.private;return out;});
   results.push({connectionId:item.id,provider:config.provider,status:'read',fetchedAt:new Date().toISOString(),verifiedCapability:safeText(result.verifiedCapability),resources,firstPageOnly:result.firstPageOnly===true,resourceLimit:10,...(Number.isSafeInteger(result.sessionCountInResponse)?{sessionCountInResponse:result.sessionCountInResponse}:{}),...(typeof result.renderingVerified==='boolean'?{renderingVerified:result.renderingVerified}:{})});
   snapshots.push({id:item.id,revision});
  }catch{results.push({connectionId:item.id,provider:config.provider,status:'read-failed'});}finally{clearTimeout(timer);}
 }
 async function verify(){await admin();for(const snapshot of snapshots)checked(await rpc('get',snapshot.id),snapshot.id,snapshot.revision);}
 await verify();
 return {evidence:{scope:'connected-provider-metadata-only',connectionLimit:2,notReadCount:Math.max(0,connected.length-2),untrustedProviderData:true,results},verify};
}
