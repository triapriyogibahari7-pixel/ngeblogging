import {checkCustomDomainDns} from './custom-domain-dns-readiness.mjs';
import {verifyCustomDomainTenantProof} from './custom-domain-tenant-proof.mjs';
const failure=code=>Object.assign(Error(code),{code});
export function createCustomDomainProvider(env,{validate,claimActivation,claimWrite,fetchImpl=globalThis.fetch}={}){
 const token=String(env.CLOUDFLARE_DOMAIN_API_TOKEN||env.CLOUDFLARE_API_TOKEN||'').trim(),account=String(env.CLOUDFLARE_ACCOUNT_ID||''),service=String(env.CLOUDFLARE_WORKER_SERVICE||'');
 if(!token||!/^[a-f0-9]{32}$/i.test(account)||!service||[validate,claimActivation,claimWrite].some(f=>typeof f!=='function'))throw failure('PROVIDER_CONFIG_REQUIRED');
 const api=async(path,{method='GET',body,signal}={})=>{
  if(signal?.aborted)throw failure('ABORTED');const own=new AbortController(),abort=()=>own.abort();signal?.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,8000);
  try{const r=await fetchImpl('https://api.cloudflare.com/client/v4'+path,{method,redirect:'manual',signal:own.signal,headers:{authorization:'Bearer '+token,accept:'application/json',...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});if([401,403].includes(r.status))throw failure('PROVIDER_AUTH_REQUIRED');if(r.status===429)throw failure('PROVIDER_RATE_LIMITED');if(!r.ok)throw failure('PROVIDER_RESPONSE_UNVERIFIED');
   const reader=r.body?.getReader();if(!reader)throw failure('PROVIDER_RESPONSE_UNVERIFIED');let text='',size=0;const decoder=new TextDecoder();try{for(;;){const p=await reader.read();if(p.done)break;size+=p.value.byteLength;if(size>262144)throw failure('PROVIDER_RESPONSE_TOO_LARGE');text+=decoder.decode(p.value,{stream:true});}text+=decoder.decode();}finally{reader.cancel().catch(()=>{});}const d=JSON.parse(text);if(d?.success!==true)throw failure('PROVIDER_RESPONSE_UNVERIFIED');return d.result;
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);own.abort();}
 };
 return {validate,claimActivation,claimWrite,
  readZone:(id,options)=>api('/zones/'+encodeURIComponent(id),options),
  readBindings:(h,options)=>api('/accounts/'+account+'/workers/domains?hostname='+encodeURIComponent(h),options),
  attach:({hostname,zoneId,zoneName},options)=>api('/accounts/'+account+'/workers/domains',{...options,method:'PUT',body:{hostname,service,zone_id:zoneId,zone_name:zoneName}}),
  activationCheck:async(id,options)=>(await api('/zones/'+encodeURIComponent(id)+'/activation_check',{...options,method:'PUT'}))?.id===id,
  readDns:({signal,...input})=>checkCustomDomainDns({...input,fetchImpl:(url,init)=>{const u=new URL(url);if(u.protocol!=='https:'||!['dns.google','cloudflare-dns.com'].includes(u.hostname))throw failure('DNS_TARGET_REJECTED');return fetchImpl(url,{...init,redirect:'manual',signal:signal?AbortSignal.any([signal,init.signal].filter(Boolean)):init.signal});}}),
  verifyTenant:(job,options)=>verifyCustomDomainTenantProof(job,env,{...options,fetchImpl})
 };
}
