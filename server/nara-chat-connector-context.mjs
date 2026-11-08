import { requireConnectorAdminIdentity } from './nara-connector-admin-identity.mjs';
import { normalizeNaraConnectorReads, collectNaraConnectorContext } from './nara-inference-connectors.mjs';
const BASE='https://polvmlrhqoiflumibfqs.supabase.co';
const wanted=message=>/\b(github|repositori|repository|cloudflare|worker|supabase|waf|zero trust|browser rendering|sesi browser|konektor)\b/i.test(message)&&/\b(baca|lihat|periksa|cek|audit|status|daftar|analisis)\b/i.test(message);
const fail=(code,status)=>{throw Object.assign(Error(code),{status});};
async function authenticate(event,env,fetcher){
 const authorization=event.headers?.authorization||event.headers?.Authorization||'';
 if(!/^Bearer [^\s]{1,8192}$/.test(authorization))fail('CONNECTOR_AUTH_REQUIRED',401);
 if(String(env.SUPABASE_URL||'').replace(/\/$/,'')!==BASE||!env.SUPABASE_PUBLISHABLE_KEY)fail('CONNECTOR_AUTH_CONFIG',503);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
 try{
  const response=await fetcher(BASE+'/auth/v1/user',{method:'GET',headers:{authorization,apikey:env.SUPABASE_PUBLISHABLE_KEY},redirect:'error',signal:controller.signal});
  if(!response.ok)fail('CONNECTOR_AUTH_REQUIRED',401);
  if(!response.body||!response.headers.get('content-type')?.includes('application/json'))fail('CONNECTOR_AUTH_REQUIRED',401);
  const reader=response.body.getReader(),chunks=[];let size=0;
  try{while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>16384){await reader.cancel();fail('CONNECTOR_AUTH_REQUIRED',401);}chunks.push(next.value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  let user;try{user=JSON.parse(new TextDecoder().decode(bytes));}catch{fail('CONNECTOR_AUTH_REQUIRED',401);}
  try{return requireConnectorAdminIdentity(user);}catch{fail('CONNECTOR_ADMIN_REQUIRED',403);}
 }finally{clearTimeout(timer);}
}
function boundedEvidence(evidence){
 const result=JSON.parse(JSON.stringify(evidence));
 const fits=()=>JSON.stringify(result).length<=10000;
 if(!Array.isArray(result.results))fail('CONNECTOR_INVALID_RESPONSE',503);
 for(let index=result.results.length-1;index>=0&&!fits();index--){
  const entry=result.results[index];
  result.results[index]={connectionId:entry.connectionId,provider:entry.provider,status:'read-omitted-evidence-budget',usedInContext:false,reason:'Hasil dihilangkan dari konteks chat karena batas ukuran; isi tidak boleh diklaim telah digunakan.'};
  result.truncated=true;
 }
 if(Array.isArray(result.providerStates))for(const state of result.providerStates){
  if(!result.results.some(item=>item.provider===state.provider&&item.status==='read')&&result.results.some(item=>item.provider===state.provider&&item.usedInContext===false))state.status='read-omitted-evidence-budget';
 }
 if(!fits())fail('CONNECTOR_CONTEXT_TOO_LARGE',413);
 return result;
}
export async function enrichNaraConnectorContext(event,env,dependencies={}){
 if(String(event.httpMethod).toUpperCase()!=='POST'||typeof event.body!=='string')return event;
 let input;try{input=JSON.parse(event.body);}catch{return event;}
 if(!input||typeof input!=='object'||Array.isArray(input))return event;
 const explicit=Object.hasOwn(input,'connectorReads');
 if(input.model!=='nara-max'||input.intelligence!=='xhigh'){if(explicit)fail('CONNECTOR_MODE_REQUIRED',400);return event;}
 if(!explicit&&!wanted(String(input.message||'')))return event;
 if(event.body.length>524288){if(explicit)fail('CONNECTOR_PAYLOAD_TOO_LARGE',413);return event;}
 let reads;try{reads=await normalizeNaraConnectorReads(input.connectorReads);}catch(error){fail(error.message==='NARA_COST_APPROVAL_REQUIRED'?'NARA_COST_APPROVAL_REQUIRED':'INVALID_CONNECTOR_READ',error.message==='NARA_COST_APPROVAL_REQUIRED'?403:400);}
 const fetcher=dependencies.fetcher||fetch;
 let user;try{user=await authenticate(event,env,fetcher);}catch(error){if(!explicit&&[401,403].includes(error.status))return event;throw error;}
 const collect=dependencies.collect||collectNaraConnectorContext;
 const context=await collect({env,user,authProject:BASE,deadline:Date.now()+45000,resourceReads:reads},fetcher);
 await context.verify();
 const evidence=boundedEvidence(context.evidence);
 const existing=input.context&&typeof input.context==='object'&&!Array.isArray(input.context)?input.context:null;
 const {connectorReads,...rest}=input;
 return {...event,body:JSON.stringify({...rest,context:{naraConnectorEvidence:{...evidence,source:'server-verified-shared-inference-collector',instruction:'Jawab hanya sesuai bukti relevan. Metadata bukan isi resource. Rendering sesi bukan rendering halaman. Hasil dihilangkan tidak boleh diklaim digunakan.'},...(existing?{userContext:JSON.stringify(existing).slice(0,1500)}:{})}})};
}
