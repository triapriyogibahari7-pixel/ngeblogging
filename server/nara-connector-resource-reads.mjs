// Internal read-only adapter, NOT an HTTP handler or authorization boundary.
// Caller must authorize stored owner/config/revision, apply quota/cost policy,
// and recheck revocation before returning data or using it for inference.
import {normalizeConnection} from '../shared/nara-connector-registry.mjs';
const CF='https://api.cloudflare.com/client/v4';
const SCHEMA_SQL="SELECT c.table_schema, c.table_name, c.column_name, c.data_type FROM information_schema.columns AS c WHERE c.table_schema = 'public' AND ($1::text IS NULL OR c.table_name = $1::text) ORDER BY c.table_name, c.ordinal_position LIMIT 101";
const SPECS={
 'github-file':{provider:'github',fields:['path','ref']},
 'supabase-schema':{provider:'supabase',fields:['table']},
 'worker-settings':{provider:'cloudflare',fields:['script']},
 'waf-ruleset':{provider:'cloudflare-one-waf',fields:['rulesetId']},
 'browser-sessions':{provider:'cloudflare-browser-rendering',fields:[]}
};
const fail=code=>{throw Error(code);};
const invalid=()=>fail('INVALID_CONNECTOR_READ');
const id32=v=>typeof v==='string'&&/^[a-f0-9]{32}$/.test(v);
export function normalizeNaraReadRequest(provider,input){
 if(!input||typeof input!=='object'||Array.isArray(input))invalid();
 if(input.operation==='browser-render')fail('NARA_COST_APPROVAL_REQUIRED');
 const spec=Object.hasOwn(SPECS,input.operation)?SPECS[input.operation]:null;
 if(!spec||spec.provider!==provider||Object.keys(input).some(k=>!['operation',...spec.fields].includes(k)))invalid();
 const out={operation:input.operation};
 for(const key of spec.fields)if(input[key]!==undefined){if(typeof input[key]!=='string')invalid();out[key]=input[key];}
 if(out.operation==='github-file'){
  if(!/^[A-Za-z0-9._/-]{1,240}$/.test(out.path||''))invalid();
  const parts=out.path.split('/');
  if(parts.some(p=>!p||p==='.'||p==='..'||/^\.git$/i.test(p)||/^\.env(?:\.|$)/i.test(p)||/^(?:\.npmrc|\.pypirc|credentials(?:\..*)?|id_rsa|id_ed25519|secrets?(?:\..*)?)$/i.test(p)||/\.(?:pem|key|p12|pfx)$/i.test(p)))invalid();
  if(out.ref!==undefined&&(!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,119}$/.test(out.ref)||out.ref.split('/').some(p=>!p||p==='.'||p==='..')))invalid();
 }
 if(out.operation==='supabase-schema'&&out.table!==undefined&&!/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(out.table))invalid();
 if(out.operation==='worker-settings'&&!/^[A-Za-z0-9][A-Za-z0-9_-]{0,62}$/.test(out.script||''))invalid();
 if(out.operation==='waf-ruleset'&&!id32(out.rulesetId))invalid();
 return out;
}
export async function readNaraConnectorResource({config,token,request,signal},fetcher=fetch){
 config=normalizeConnection(config);
 request=normalizeNaraReadRequest(config.provider,request);
 if(typeof token!=='string'||!token||token.length>8192||/[\s\u0000-\u001f\u007f]/.test(token))invalid();
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
 const combined=AbortSignal.any([controller.signal,signal].filter(Boolean));
 const safe=(v,limit=200)=>typeof v==='string'?v.split(token).join('[REDACTED]').slice(0,limit):'';
 const ensure=condition=>{if(!condition)fail('CONNECTOR_INVALID_RESPONSE');};
 async function call(url,{method='GET',body,cloudflare=false}={}){
  if(combined.aborted)fail('CONNECTOR_READ_TIMEOUT');
  const response=await fetcher(url,{method,headers:{authorization:`Bearer ${token}`,accept:'application/json','user-agent':'Ngeblogging-Nara',...(body?{'content-type':'application/json'}:{}),...(config.provider==='github'?{'X-GitHub-Api-Version':'2022-11-28'}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'manual',signal:combined});
  const reject=async code=>{await response.body?.cancel().catch(()=>{});fail(code);};
  if(response.status>=300&&response.status<400)await reject('CONNECTOR_REDIRECT_REJECTED');
  if(!response.ok)await reject(response.status===401||response.status===403?'CONNECTOR_ACCESS_DENIED':response.status===429?'CONNECTOR_RATE_LIMITED':response.status===404?'CONNECTOR_RESOURCE_NOT_FOUND':'CONNECTOR_UPSTREAM_UNAVAILABLE');
  if(!response.headers.get('content-type')?.toLowerCase().includes('application/json')||!response.body)await reject('CONNECTOR_INVALID_RESPONSE');
  const reader=response.body.getReader(),chunks=[];let size=0;
  const cancel=()=>{void reader.cancel().catch(()=>{});};combined.addEventListener('abort',cancel,{once:true});
  try{
   if(combined.aborted)fail('CONNECTOR_READ_TIMEOUT');
   while(true){const next=await reader.read();if(combined.aborted)fail('CONNECTOR_READ_TIMEOUT');if(next.done)break;size+=next.value.byteLength;if(size>98304){await reader.cancel();fail('CONNECTOR_RESPONSE_TOO_LARGE');}chunks.push(next.value);}
  }finally{combined.removeEventListener('abort',cancel);reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  let data;try{data=JSON.parse(new TextDecoder().decode(bytes));}catch{fail('CONNECTOR_INVALID_RESPONSE');}
  if(cloudflare){ensure(data?.success===true);return data.result;}return data;
 }
 function evidence(url,capability,data,extra={}){
  if(combined.aborted)fail('CONNECTOR_READ_TIMEOUT');
  const result={provider:config.provider,operation:request.operation,status:'read',capability,source:{url:safe(url,1000),fetchedAt:new Date().toISOString()},untrustedProviderData:true,data,...extra};
  if(new TextEncoder().encode(JSON.stringify(result)).byteLength>32768)fail('CONNECTOR_RESPONSE_TOO_LARGE');
  return result;
 }
 try{
  if(request.operation==='github-file'){
   const url=`https://api.github.com/repos/${config.repository}/contents/${request.path.split('/').map(encodeURIComponent).join('/')}`+(request.ref?'?ref='+encodeURIComponent(request.ref):'');
   const data=await call(url);
   ensure(data?.type==='file'&&!data.submodule_git_url&&data.encoding==='base64'&&data.path===request.path&&/^[a-f0-9]{40}$/.test(data.sha||'')&&Number.isSafeInteger(data.size)&&data.size>=0&&typeof data.content==='string');
   if(data.size>24576||data.content.length>40000)fail('CONNECTOR_RESPONSE_TOO_LARGE');
   let bytes,content;try{bytes=Uint8Array.from(atob(data.content.replace(/\s/g,'')),c=>c.charCodeAt(0));ensure(bytes.length===data.size);content=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{fail('CONNECTOR_INVALID_RESPONSE');}
   if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(content))fail('CONNECTOR_CONTENT_NOT_TEXT');
   const redacted=content.split(token).join('[REDACTED]').replace(/(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----)/g,'[REDACTED]');
   return evidence(url,'repository-file:read',{path:request.path,requestedRef:request.ref||null,blobSha:data.sha,content:redacted.slice(0,10000),sourceBytes:bytes.length,redactionApplied:redacted!==content},{truncated:redacted.length>10000,contentLimit:10000});
  }
  if(request.operation==='supabase-schema'){
   const url=`https://api.supabase.com/v1/projects/${config.projectRef}/database/query/read-only`;
   const data=await call(url,{method:'POST',body:{query:SCHEMA_SQL,parameters:[request.table??null]}});
   ensure(Array.isArray(data));
   const columns=data.slice(0,100).map(row=>{ensure(row?.table_schema==='public'&&['table_name','column_name','data_type'].every(k=>typeof row[k]==='string')&&(!request.table||row.table_name===request.table));return {schema:'public',table:safe(row.table_name),column:safe(row.column_name),dataType:safe(row.data_type)};});
   return evidence(url,'public-schema-columns:read',{projectRef:config.projectRef,columns},{truncated:data.length>100,rowLimit:100,scope:'visible-public-schema-only',userRowsRead:false});
  }
  if(request.operation==='worker-settings'){
   const url=`${CF}/accounts/${config.accountId}/workers/scripts/${encodeURIComponent(request.script)}/script-settings`;
   const data=await call(url,{cloudflare:true});ensure(data&&typeof data==='object'&&!Array.isArray(data));
   ensure(typeof data.logpush==='boolean'||typeof data.observability?.enabled==='boolean');
   const settings={script:request.script};if(typeof data.logpush==='boolean')settings.logpush=data.logpush;if(typeof data.observability?.enabled==='boolean')settings.observabilityEnabled=data.observability.enabled;
   if(typeof data.observability?.head_sampling_rate==='number'&&data.observability.head_sampling_rate>=0&&data.observability.head_sampling_rate<=1)settings.headSamplingRate=data.observability.head_sampling_rate;
   return evidence(url,'worker-script-settings:read',settings,{bindingsRead:false});
  }
  if(request.operation==='waf-ruleset'){
   const zone=await call(`${CF}/zones/${config.zoneId}`,{cloudflare:true});ensure(zone?.id===config.zoneId&&zone?.account?.id===config.accountId);
   const url=`${CF}/zones/${config.zoneId}/rulesets/${request.rulesetId}`,data=await call(url,{cloudflare:true});ensure(data?.id===request.rulesetId&&Array.isArray(data.rules));
   const rules=data.rules.slice(0,20).map(row=>{ensure(row&&typeof row==='object');return {id:safe(row.id),action:safe(row.action),description:safe(row.description),expression:safe(row.expression,1000),...(typeof row.enabled==='boolean'?{enabled:row.enabled}:{})};});
   return evidence(url,'zone-ruleset-details:read',{rulesetId:request.rulesetId,phase:safe(data.phase),rules},{truncated:data.rules.length>20||data.rules.slice(0,20).some(row=>typeof row.expression==='string'&&row.expression.length>1000),ruleLimit:20});
  }
  const url=`${CF}/accounts/${config.accountId}/browser-rendering/devtools/session`,data=await call(url,{cloudflare:true});ensure(Array.isArray(data));
  return evidence(url,'browser-session-metadata:read',{sessionCountInResponse:data.length,renderingVerified:false},{scope:'sessions-only'});
 }catch(error){
  const allowed=new Set(['CONNECTOR_READ_TIMEOUT','CONNECTOR_REDIRECT_REJECTED','CONNECTOR_ACCESS_DENIED','CONNECTOR_RATE_LIMITED','CONNECTOR_RESOURCE_NOT_FOUND','CONNECTOR_UPSTREAM_UNAVAILABLE','CONNECTOR_INVALID_RESPONSE','CONNECTOR_RESPONSE_TOO_LARGE','CONNECTOR_CONTENT_NOT_TEXT']);
  throw Error(combined.aborted?'CONNECTOR_READ_TIMEOUT':allowed.has(error?.message)?error.message:'CONNECTOR_UPSTREAM_UNAVAILABLE');
 }finally{clearTimeout(timer);}
}
