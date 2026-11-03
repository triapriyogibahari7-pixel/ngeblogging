import {pathToFileURL} from 'node:url';
const URL='https://polvmlrhqoiflumibfqs.supabase.co/rest/v1/';
const MAX=2097152;
const types=new Set(['string','integer','number','boolean','object','array']);
const formats=new Set(['uuid','int32','int64','float','double','date','date-time','json','jsonb','text','numeric','boolean']);
const stop=reason=>({status:'not_verified',reason,tableConstraintsVerified:false,rpcDefinitionsVerified:false,checkoutVerified:false});
// GET OpenAPI metadata only. Never queries customer rows or executes an RPC.
export async function inspectDomainQuoteApiSchema({serviceRoleKey,fetchImpl=globalThis.fetch}={}){
 if(typeof serviceRoleKey!=='string'||!serviceRoleKey.trim()||serviceRoleKey.length>8192||/\s/.test(serviceRoleKey))return stop('SUPABASE_CI_CREDENTIAL_UNAVAILABLE');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);let reader;
 try{
  const response=await fetchImpl(URL,{method:'GET',redirect:'error',headers:{apikey:serviceRoleKey,authorization:'Bearer '+serviceRoleKey,accept:'application/openapi+json'},signal:controller.signal});
  if(response.status!==200)return stop([401,403].includes(response.status)?'SUPABASE_METADATA_ACCESS_REJECTED':'SUPABASE_METADATA_HTTP_UNAVAILABLE');
  reader=response.body?.getReader();if(!reader)return stop('SUPABASE_METADATA_INVALID');
  let size=0;const chunks=[];
  for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>MAX)return stop('SUPABASE_METADATA_TOO_LARGE');chunks.push(part.value);}
  const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
  const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(data?.swagger!=='2.0')return stop('SUPABASE_METADATA_FORMAT_UNSUPPORTED');
  const schema=data.definitions?.domain_sale_quotes,properties=schema?.properties;
  if(!properties||typeof properties!=='object'||Array.isArray(properties)||Object.keys(properties).length===0)return stop('QUOTE_SCHEMA_NOT_VISIBLE');
  const columns=Object.entries(properties).filter(([name])=>/^[a-z][a-z0-9_]{0,62}$/.test(name)).map(([name,value])=>({name,type:types.has(value?.type)?value.type:null,format:formats.has(value?.format)?value.format:null,required:Array.isArray(schema.required)&&schema.required.includes(name)})).sort((a,b)=>a.name.localeCompare(b.name));
  if(columns.length===0)return stop('QUOTE_SCHEMA_NOT_VISIBLE');
  const report={status:'metadata_read',projectRef:'polvmlrhqoiflumibfqs',columns,rpcPaths:['/rpc/domain_begin_production_checkout','/rpc/domain_begin_site_production_checkout'].map(path=>({path,visible:!!data.paths&&Object.hasOwn(data.paths,path)})),tableConstraintsVerified:false,rpcDefinitionsVerified:false,checkoutVerified:false};
  return JSON.stringify(report).includes(serviceRoleKey)?stop('SUPABASE_METADATA_UNSAFE'):report;
 }catch{return stop(controller.signal.aborted?'SUPABASE_METADATA_TIMEOUT':'SUPABASE_METADATA_READ_FAILED');}
 finally{clearTimeout(timer);if(reader){reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}}
}
async function main(){const report=await inspectDomainQuoteApiSchema({serviceRoleKey:process.env.SUPABASE_SERVICE_ROLE_KEY});console.log(JSON.stringify(report));if(report.status!=='metadata_read')process.exitCode=1;}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){main().catch(()=>{console.log(JSON.stringify(stop('SUPABASE_METADATA_READ_FAILED')));process.exitCode=1;});}
