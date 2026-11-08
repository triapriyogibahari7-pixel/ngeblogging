import { requireConnectorAdminIdentity } from './nara-connector-admin-identity.mjs';
const BASE='https://polvmlrhqoiflumibfqs.supabase.co';
const HOSTS=new Set(['ngeblogging.com','www.ngeblogging.com','ngeblogging.triapriyogibahari7.workers.dev']);
const PREFIX='/api/nara/spend/quotes/';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store','vary':'Authorization, Origin','x-content-type-options':'nosniff'}});
async function readJson(response,limit){
 if(!response.headers.get('content-type')?.includes('application/json')||!response.body)throw Error('SPEND_UNAVAILABLE');
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>limit){await reader.cancel();throw Error('SPEND_INVALID_REQUEST');}chunks.push(next.value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 return JSON.parse(new TextDecoder().decode(bytes));
}
export function createNaraSpendEndpoint({authenticate,rpc}){
 return async request=>{
  const url=new URL(request.url);if(!url.pathname.startsWith(PREFIX))return null;
  if(url.protocol!=='https:'||!HOSTS.has(url.hostname))return reply(404,{code:'NOT_FOUND'});
  if(url.search)return reply(400,{code:'SPEND_INVALID_REQUEST'});
  const origin=request.headers.get('origin');
  if((origin&&origin!==url.origin)||request.headers.get('sec-fetch-site')==='cross-site'||(request.method!=='GET'&&origin!==url.origin))return reply(403,{code:'ORIGIN_NOT_ALLOWED'});
  const parts=url.pathname.slice(PREFIX.length).split('/');
  if(!UUID.test(parts[0])||parts.length>2)return reply(404,{code:'NOT_FOUND'});
  const action=parts.length===1&&request.method==='GET'?'get':parts.length===2&&request.method==='POST'&&['approve','cancel'].includes(parts[1])?parts[1]:null;
  if(!action)return reply(405,{code:'METHOD_NOT_ALLOWED'});
  try{
   await authenticate(request);
   const args={p_quote:parts[0]};
   if(action!=='get'){
    const data=await readJson(request,4096);if(!data||typeof data!=='object'||Array.isArray(data))throw Error('SPEND_INVALID_REQUEST');
    if(action==='approve'){
     if(Object.keys(data).sort().join(',')!=='maxCostMicros,requestDigest'||typeof data.requestDigest!=='string'||!/^[a-f0-9]{64}$/.test(data.requestDigest)||typeof data.maxCostMicros!=='string'||!(/^[1-9][0-9]{0,18}$/).test(data.maxCostMicros)||BigInt(data.maxCostMicros)>9223372036854775807n)throw Error('SPEND_INVALID_REQUEST');
     args.p_digest=data.requestDigest;args.p_max_cost_micros=data.maxCostMicros;
    }else if(Object.keys(data).length)throw Error('SPEND_INVALID_REQUEST');
   }
   const quote=await rpc(request,'nara_spend_quote_'+action+'_v1',args);
   if(!quote||quote.id!==parts[0]||!['pending','approved','consumed','cancelled','expired'].includes(quote.status))throw Error('SPEND_UNAVAILABLE');
   return reply(200,{quote,executionStarted:false});
  }catch(error){
   const codes={SPEND_INVALID_REQUEST:400,SPEND_USER_REQUIRED:401,SPEND_ADMIN_REQUIRED:403,SPEND_QUOTE_UNAVAILABLE:404,SPEND_APPROVAL_INVALID:409,SPEND_APPROVAL_INVALID_OR_USED:409};
   const code=Object.hasOwn(codes,error?.message)?error.message:'SPEND_UNAVAILABLE';return reply(codes[code]||503,{code});
  }
 };
}
export async function naraSpendApprovalResponse(request,env,fetcher=fetch){
 if(!new URL(request.url).pathname.startsWith(PREFIX))return null;
 async function call(url,options){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);try{const response=await fetcher(url,{...options,redirect:'manual',signal:controller.signal});return {ok:response.ok,data:await readJson(response,65536)};}finally{clearTimeout(timer);}}
 function headers(req){const authorization=req.headers.get('authorization')||'';if(!/^Bearer [^\s]{1,8192}$/.test(authorization))throw Error('SPEND_USER_REQUIRED');if(String(env.SUPABASE_URL||'').replace(/\/$/,'')!==BASE||!env.SUPABASE_PUBLISHABLE_KEY)throw Error('SPEND_UNAVAILABLE');return {authorization,apikey:env.SUPABASE_PUBLISHABLE_KEY};}
 return createNaraSpendEndpoint({
  authenticate:async req=>{const result=await call(BASE+'/auth/v1/user',{method:'GET',headers:headers(req)});if(!result.ok)throw Error('SPEND_USER_REQUIRED');try{requireConnectorAdminIdentity(result.data);}catch{throw Error('SPEND_ADMIN_REQUIRED');}},
  rpc:async(req,name,args)=>{const result=await call(BASE+'/rest/v1/rpc/'+name,{method:'POST',headers:{...headers(req),'content-type':'application/json'},body:JSON.stringify(args)});if(!result.ok){const allowed=['SPEND_ADMIN_REQUIRED','SPEND_USER_REQUIRED','SPEND_QUOTE_UNAVAILABLE','SPEND_APPROVAL_INVALID','SPEND_APPROVAL_INVALID_OR_USED'];throw Error(allowed.includes(result.data?.message)?result.data.message:'SPEND_UNAVAILABLE');}return result.data;}
 })(request);
}
