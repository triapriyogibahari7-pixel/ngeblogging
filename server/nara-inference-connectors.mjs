import { requireConnectorAdminIdentity } from './nara-connector-admin-identity.mjs';
import { normalizeConnection, CONNECTOR_CATALOG } from '../shared/nara-connector-registry.mjs';
import { openCredential } from './nara-connector-credentials.mjs';
import { readConnectorMetadata } from './nara-connector-providers.mjs';
const BASE='https://polvmlrhqoiflumibfqs.supabase.co';
const LIMIT=5,CONCURRENCY=2;
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export async function normalizeNaraConnectorReads(value){
 if(value===undefined)return [];
 if(!Array.isArray(value)||value.length>LIMIT)throw Error('INVALID_CONNECTOR_READ');
 if(!value.length)return [];
 const {normalizeNaraReadRequest}=await import('./nara-connector-resource-reads.mjs');
 const providers={'github-file':'github','supabase-schema':'supabase','worker-settings':'cloudflare','waf-ruleset':'cloudflare-one-waf','browser-sessions':'cloudflare-browser-rendering'},seen=new Set();
 return value.map(item=>{
  if(!item||typeof item!=='object'||Array.isArray(item)||Object.keys(item).some(k=>!['connectionId','read'].includes(k))||!uuid(item.connectionId))throw Error('INVALID_CONNECTOR_READ');
  const connectionId=item.connectionId.toLowerCase(),operation=item.read?.operation;
  if(operation==='browser-render')throw Error('NARA_COST_APPROVAL_REQUIRED');
  if(seen.has(connectionId)||!Object.hasOwn(providers,operation))throw Error('INVALID_CONNECTOR_READ');seen.add(connectionId);
  return {connectionId,read:normalizeNaraReadRequest(providers[operation],item.read)};
 });
}
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
export function publicNaraConnectorEvidence(evidence){
 return {...evidence,results:evidence.results.map(({data,...proof})=>({...proof,...(data?{resource:{...Object.fromEntries(['path','requestedRef','blobSha','sourceBytes','redactionApplied','projectRef','script','rulesetId','sessionCountInResponse','renderingVerified'].filter(k=>Object.hasOwn(data,k)).map(k=>[k,data[k]])),...(Array.isArray(data.columns)?{columnCount:data.columns.length}:{}),...(Array.isArray(data.rules)?{ruleCount:data.rules.length}:{})}}:{})}))};
}
export async function collectNaraConnectorContext({env,user,authProject,deadline,resourceReads},fetcher=fetch){
 requireConnectorAdminIdentity(user);
 if(authProject!==BASE||!env.SUPABASE_SERVICE_ROLE_KEY)throw Error('NARA_CONNECTOR_AUTH_UNAVAILABLE');
 const plans=await normalizeNaraConnectorReads(resourceReads),actor=user.id;
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
 const rows=await rpc('list'),candidates=selectNaraConnectorCandidates(rows);
 const selected=plans.length?plans.map(plan=>{const row=rows.find(r=>r.id===plan.connectionId&&r.enabled===true&&r.status==='connected');if(!row)throw Error('NARA_CONNECTOR_ACCESS_REVOKED');return row;}):candidates.selected;
 const results=new Array(selected.length),snapshots=new Array(selected.length),readDeadline=Math.min(deadline-12000,Date.now()+8000);
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
   let result;
   if(plans.length){const {readNaraConnectorResource}=await import('./nara-connector-resource-reads.mjs');result=await readNaraConnectorResource({config,token,request:plans[index].read,signal:controller.signal},boundedFetch);}
   else result=await readConnectorMetadata(config,token,boundedFetch);
   if(controller.signal.aborted)throw Error('NARA_CONNECTOR_TIMEOUT');
   checked(await rpc('get',item.id,readDeadline),item.id,revision);
   if(plans.length)results[index]={...result,connectionId:item.id,usedInContext:true};
   else{
    const safeText=value=>typeof value==='string'?value.split(token).join('[REDACTED]').slice(0,200):undefined;
    const resources=(Array.isArray(result.resources)?result.resources:[]).slice(0,10).map(resource=>{const out={};for(const key of ['name','kind','projectRef','status','phase'])if(typeof resource[key]==='string')out[key]=safeText(resource[key]);if(typeof resource.private==='boolean')out.private=resource.private;return out;});
    results[index]={connectionId:item.id,provider:config.provider,status:'read',fetchedAt:new Date().toISOString(),verifiedCapability:safeText(result.verifiedCapability),resources,firstPageOnly:result.firstPageOnly===true,truncated:Array.isArray(result.resources)&&result.resources.length>10,resourceLimit:10,...(Number.isSafeInteger(result.sessionCountInResponse)?{sessionCountInResponse:result.sessionCountInResponse}:{}),...(typeof result.renderingVerified==='boolean'?{renderingVerified:result.renderingVerified}:{})};
   }
   snapshots[index]={id:item.id,revision};
  }catch(error){
   if(error.message==='NARA_CONNECTOR_ACCESS_REVOKED')throw error;
   const reasons={CREDENTIAL_UNAVAILABLE:'credential-unavailable',INVALID_CONNECTOR_READ:'invalid-resource-request',CONNECTOR_ACCESS_DENIED:'provider-access-denied',CONNECTOR_RATE_LIMITED:'provider-rate-limited',CONNECTOR_RESOURCE_NOT_FOUND:'resource-not-found',CONNECTOR_INVALID_RESPONSE:'provider-response-invalid',CONNECTOR_CONTENT_NOT_TEXT:'content-not-text',CONNECTOR_REDIRECT_REJECTED:'redirect-rejected',CONNECTOR_RESPONSE_TOO_LARGE:'provider-response-too-large',CONNECTOR_READ_TIMEOUT:'time-budget-exhausted'};
   results[index]={connectionId:item.id,provider:config.provider,status:'read-failed',reason:controller.signal.aborted||error.message==='NARA_CONNECTOR_TIMEOUT'?'time-budget-exhausted':reasons[error.message]||'provider-unavailable'};
  }finally{clearTimeout(timer);}
 }
 for(let offset=0;offset<selected.length;offset+=CONCURRENCY)await Promise.all(selected.slice(offset,offset+CONCURRENCY).map((item,i)=>readOne(item,offset+i)));
 async function verify(){await admin();for(const snapshot of snapshots.filter(Boolean))checked(await rpc('get',snapshot.id),snapshot.id,snapshot.revision);}
 await verify();
 const providerStates=CONNECTOR_CATALOG.map(({id})=>{const items=results.filter(item=>item.provider===id);return {provider:id,status:items.some(item=>item.status==='read')?'read':items.length?'unavailable':plans.length&&rows.some(row=>row.enabled===true&&row.status==='connected'&&row.config?.provider===id)?'not-requested':'not-connected'};});
 const evidence={scope:plans.length?'requested-connector-resources':'connected-provider-metadata-only',connectionLimit:LIMIT,concurrencyLimit:CONCURRENCY,notReadCount:plans.length?0:Math.max(0,candidates.connectedCount-selected.length),untrustedProviderData:true,providerStates,results};
 if(plans.length){
  evidence.byteLimit=32768;
  for(let i=results.length-1;i>=0&&new TextEncoder().encode(JSON.stringify(evidence)).byteLength>evidence.byteLimit;i--){const {data,...proof}=results[i];if(data){results[i]={...proof,status:'read-omitted-evidence-budget',usedInContext:false};evidence.truncated=true;}}
  for(const state of providerStates)if(!results.some(r=>r.provider===state.provider&&r.status==='read')&&results.some(r=>r.provider===state.provider&&r.status==='read-omitted-evidence-budget'))state.status='read-omitted-evidence-budget';
 }
 return {evidence,verify};
}
