import { requireConnectorAdminIdentity } from './nara-connector-admin-identity.mjs';
import { normalizeConnection, CONNECTOR_CATALOG } from '../shared/nara-connector-registry.mjs';
import { openCredential } from './nara-connector-credentials.mjs';
import { readConnectorMetadata } from './nara-connector-providers.mjs';
const BASE='https://polvmlrhqoiflumibfqs.supabase.co';
const LIMIT=5,CONCURRENCY=2;
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export function selectNaraConnectorCandidates(rows){
 if(!Array.isArray(rows))throw Error('NARA_CONNECTOR_UNAVAILABLE');
 const connected=rows.filter(row=>row?.enabled===true&&row.status==='connected'),ids=new Set(),providers=new Set(),first=[],rest=[];
 for(const row of connected){
  if(!uuid(row.id)||ids.has(row.id))throw Error('NARA_CONNECTOR_UNAVAILABLE');ids.add(row.id);
  const provider=normalizeConnection(row.config).provider;
  if(providers.has(provider))rest.push(row);else{providers.add(provider);first.push(row);}
 }
 return {selected:[...first,...rest].slice(0,LIMIT),connectedCount:connected.length};
}
export async function collectNaraConnectorContext({env,user,authProject,deadline},fetcher=fetch){
 requireConnectorAdminIdentity(user);
 if(authProject!==BASE||!env.SUPABASE_SERVICE_ROLE_KEY)throw Error('NARA_CONNECTOR_AUTH_UNAVAILABLE');
 const actor=user.id;
 async function rpc(action,id=null,until=deadline){
  const ms=Math.min(4000,until-Date.now());if(ms<=0)throw Error('NARA_CONNECTOR_TIMEOUT');
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
 function checked(row,id,revision){if(row?.id!==id||row.owner_id!==actor||row.key_version!=='v1'||row.enabled!==true||row.status!=='connected'||!(/^[1-9][0-9]*$/).test(String(row.revision))||(revision!==undefined&&String(row.revision)!==revision))throw Error('NARA_CONNECTOR_ACCESS_REVOKED');return row;}
 await admin();
 const {selected,connectedCount}=selectNaraConnectorCandidates(await rpc('list'));
 const results=new Array(selected.length),snapshots=new Array(selected.length);
 const readDeadline=Math.min(deadline-12000,Date.now()+8000);
 async function readOne(item,index){
  const selectedProvider=normalizeConnection(item.config).provider;
  if(readDeadline<=Date.now()){results[index]={connectionId:item.id,provider:selectedProvider,status:'not-read-time-budget'};return;}
  let row;
  try{row=checked(await rpc('authorize_tool',item.id,readDeadline),item.id);}catch(error){
   if(error.message==='NARA_CONNECTOR_ACCESS_REVOKED')throw error;
   results[index]={connectionId:item.id,provider:selectedProvider,status:'read-failed',reason:'authorization-unavailable'};return;
  }
  const revision=String(row.revision),config=normalizeConnection(row.config);
  const remaining=readDeadline-Date.now();if(remaining<=0){results[index]={connectionId:item.id,provider:config.provider,status:'not-read-time-budget'};return;}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),remaining);
  try{
   const token=await openCredential(row.credential,env.NARA_CONNECTOR_ENCRYPTION_KEY,{ownerId:actor,connectionId:item.id,provider:config.provider});
   const boundedFetch=(url,options={})=>fetcher(url,{...options,signal:AbortSignal.any([controller.signal,options.signal].filter(Boolean))});
   const result=await readConnectorMetadata(config,token,boundedFetch);
   if(controller.signal.aborted)throw Error('NARA_CONNECTOR_TIMEOUT');
   checked(await rpc('get',item.id,readDeadline),item.id,revision);
   const safeText=value=>typeof value==='string'?value.split(token).join('[REDACTED]').slice(0,200):undefined;
   const resources=(Array.isArray(result.resources)?result.resources:[]).slice(0,10).map(resource=>{const out={};for(const key of ['name','kind','projectRef','status','phase'])if(typeof resource[key]==='string')out[key]=safeText(resource[key]);if(typeof resource.private==='boolean')out.private=resource.private;return out;});
   results[index]={connectionId:item.id,provider:config.provider,status:'read',fetchedAt:new Date().toISOString(),verifiedCapability:safeText(result.verifiedCapability),resources,firstPageOnly:result.firstPageOnly===true,truncated:Array.isArray(result.resources)&&result.resources.length>10,resourceLimit:10,...(Number.isSafeInteger(result.sessionCountInResponse)?{sessionCountInResponse:result.sessionCountInResponse}:{}),...(typeof result.renderingVerified==='boolean'?{renderingVerified:result.renderingVerified}:{})};
   snapshots[index]={id:item.id,revision};
  }catch(error){
   if(error.message==='NARA_CONNECTOR_ACCESS_REVOKED')throw error;
   const reasons={CREDENTIAL_UNAVAILABLE:'credential-unavailable',CONNECTOR_ACCESS_DENIED:'provider-access-denied',CONNECTOR_RATE_LIMITED:'provider-rate-limited',CONNECTOR_INVALID_RESPONSE:'provider-response-invalid',CONNECTOR_RESPONSE_TOO_LARGE:'provider-response-too-large'};
   results[index]={connectionId:item.id,provider:config.provider,status:'read-failed',reason:controller.signal.aborted||error.message==='NARA_CONNECTOR_TIMEOUT'?'time-budget-exhausted':reasons[error.message]||'provider-unavailable'};
  }finally{clearTimeout(timer);}
 }
 for(let offset=0;offset<selected.length;offset+=CONCURRENCY)await Promise.all(selected.slice(offset,offset+CONCURRENCY).map((item,i)=>readOne(item,offset+i)));
 async function verify(){await admin();for(const snapshot of snapshots.filter(Boolean))checked(await rpc('get',snapshot.id),snapshot.id,snapshot.revision);}
 await verify();
 const providerStates=CONNECTOR_CATALOG.map(({id})=>{const items=results.filter(item=>item.provider===id);return {provider:id,status:items.some(item=>item.status==='read')?'read':items.length?'unavailable':'not-connected'};});
 return {evidence:{scope:'connected-provider-metadata-only',connectionLimit:LIMIT,concurrencyLimit:CONCURRENCY,notReadCount:Math.max(0,connectedCount-selected.length),untrustedProviderData:true,providerStates,results},verify};
}
