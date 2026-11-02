import {AsyncLocalStorage} from 'node:async_hooks';
import {createDomainCustomerPriceCheck} from './domain-customer-price-check.mjs';
import {createDomainCustomerReview} from './domain-customer-review.mjs';
const BASE='https://polvmlrhqoiflumibfqs.supabase.co/';
function authEnvironment(env){
 let url=env?.SUPABASE_URL,key=env?.SUPABASE_PUBLISHABLE_KEY,reason=null;
 if(typeof url==='string'){url=url.trim();try{const u=new URL(url);if(u.origin===BASE.slice(0,-1)&&u.pathname==='/'&&!u.search&&!u.hash&&!u.username&&!u.password)url=BASE;else reason='supabase_url_invalid';}catch{reason='supabase_url_invalid';}}
 else reason='supabase_url_missing';
 if(typeof key==='string'){key=key.trim();if(!key||key.length>8192||/[\s\u0000-\u001f\u007f]/u.test(key)){reason=reason||'supabase_key_invalid';key='';}}
 else reason=reason||'supabase_key_missing';
 return {env:{...env,SUPABASE_URL:url,SUPABASE_PUBLISHABLE_KEY:key},reason};
}
async function rejectedApiKey(response){
 let reader;
 try{
  reader=response.clone().body?.getReader();if(!reader)return false;
  const chunks=[];let size=0;
  for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>4096)return false;chunks.push(part.value);}
  const bytes=new Uint8Array(size);let at=0;for(const part of chunks){bytes.set(part,at);at+=part.byteLength;}
  const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  const text=[value?.message,value?.error,value?.msg,value?.code].filter(x=>typeof x==='string').map(x=>x.slice(0,512)).join(' ').toLowerCase();
  return /invalid api[ _-]?key|no api[ _-]?key|api[ _-]?key (?:is )?(?:invalid|missing)/.test(text);
 }catch{return false;}
 finally{if(reader){try{Promise.resolve(reader.cancel()).catch(()=>{});}catch{}try{reader.releaseLock();}catch{}}}
}
// Request-local diagnostic state only. Never store credentials, URLs, bodies or user IDs.
// The original handlers still perform authentication, ownership, limits and pricing checks.
export function createCustomerDomainAuthBridge({fetchImpl=(...args)=>globalThis.fetch(...args),log=entry=>console.warn(JSON.stringify(entry)),priceTimeoutMs=20000,reviewTimeoutMs=25000}={}){
 if(typeof fetchImpl!=='function'||typeof log!=='function')throw Error('INVALID_AUTH_BRIDGE_CONFIGURATION');
 const scopes=new AsyncLocalStorage();
 const transport=async(target,init)=>{
  const state=scopes.getStore();let stage=null;
  try{const u=new URL(target instanceof Request?target.url:String(target));if(u.origin===BASE.slice(0,-1)&&init?.method==='GET')stage=u.pathname==='/auth/v1/user'?'session':u.pathname==='/rest/v1/sites'?'site':null;}catch{}
  if(state&&stage){state.stage=stage;state.status=null;state.failure=null;}
  try{
   const response=await fetchImpl(target,init);
   if(state&&stage){
    state.status=response.status;
    if([401,403].includes(response.status)&&await rejectedApiKey(response))state.failure='AUTH_API_KEY_REJECTED';
    else if(response.status===429)state.failure='AUTH_RATE_LIMITED';
    else if(stage==='site'&&response.status===403)state.failure='AUTH_SITE_ACCESS_DENIED';
    else if(stage==='site'&&response.status===401)state.failure='INVALID_SESSION';
    else if(response.status!==200&&![401,403].includes(response.status))state.failure=stage==='session'?'AUTH_SESSION_UPSTREAM_UNAVAILABLE':'AUTH_SITE_UPSTREAM_UNAVAILABLE';
   }
   return response;
  }catch(error){if(state&&stage)state.failure=init?.signal?.aborted?'AUTH_REQUEST_TIMEOUT':stage==='session'?'AUTH_SESSION_FETCH_FAILED':'AUTH_SITE_FETCH_FAILED';throw error;}
 };
 // Keep handler instances stable so admission/rate-limit state is not reset per request.
 const price=createDomainCustomerPriceCheck({fetchImpl:transport,timeoutMs:priceTimeoutMs});
 const review=createDomainCustomerReview({fetchImpl:transport,priceCheck:price,timeoutMs:reviewTimeoutMs});
 return async(request,env)=>{
  const kind=new URL(request.url).pathname.match(/^\/api\/domains\/commerce\/(check|search|review)\//)?.[1];if(!kind)return null;
  const configured=authEnvironment(env),state={stage:null,status:null,failure:null};
  return scopes.run(state,async()=>{
   const response=await (kind==='review'?review:price)(request,configured.env);
   if(!response||response.status<400)return response;
   let data;try{data=await response.clone().json();}catch{return response;}
   const authFailure=['AUTH_UNAVAILABLE','INVALID_SESSION','SITE_OWNER_REQUIRED'].includes(data?.code);
   if(!authFailure&&!(data?.code==='DOMAIN_REVIEW_UNAVAILABLE'&&state.failure))return response;
   let code=state.failure;
   if(data.code==='AUTH_UNAVAILABLE'){
    if(configured.reason)code='AUTH_CONFIGURATION_UNAVAILABLE';
    else if(data.reason==='request_deadline')code='AUTH_REQUEST_TIMEOUT';
    else if(!code)code=state.status===200?(state.stage==='site'?'AUTH_SITE_RESPONSE_INVALID':'AUTH_SESSION_RESPONSE_INVALID'):'AUTH_REQUEST_UNAVAILABLE';
   }
   if(!code)return response;
   const status=code==='INVALID_SESSION'?401:503;
   const detail={code,authStage:state.stage||'configuration',...(state.status===null?{}:{upstreamStatus:state.status}),...(code==='AUTH_CONFIGURATION_UNAVAILABLE'?{reason:configured.reason}:{})};
   try{log({event:'domain_customer_auth_failure',...detail});}catch{}
   return new Response(JSON.stringify(detail),{status,headers:response.headers});
  });
 };
}
export const customerDomainAuthBridge=createCustomerDomainAuthBridge();
