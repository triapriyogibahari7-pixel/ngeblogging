import {handleDomainRequest} from './domain-handler.mjs';
export function createHttpDcvHandler({handler=handleDomainRequest,fetchImpl=globalThis.fetch}={}){
 return async function(request,env){
  if(request.method!=='POST'||new URL(request.url).pathname!=='/api/domains/register'||env.CUSTOM_DOMAIN_PROVIDER!=='cloudflare-custom-hostnames')return handler(request,env);
  const response=await handler(request,env);
  if(!response?.ok)return response;
  let data;try{data=await response.clone().json();}catch{return response;}
  const d=data?.domain;
  if(!d||!['cloudflare','cloudflare-custom-hostnames'].includes(d.provider)||d.ssl_status!=='pending_validation'||!/^[a-f0-9-]{36}$/i.test(d.provider_hostname_id||'')||typeof d.hostname!=='string'||d.hostname.includes('*'))return response;
  if(!/^[a-f0-9]{32}$/i.test(env.CLOUDFLARE_ZONE_ID||'')||!env.CLOUDFLARE_API_TOKEN)return response;
  const controller=new AbortController(),abort=()=>controller.abort(),timer=setTimeout(abort,8000);
  request.signal.addEventListener('abort',abort,{once:true});if(request.signal.aborted)abort();
  const url='https://api.cloudflare.com/client/v4/zones/'+env.CLOUDFLARE_ZONE_ID+'/custom_hostnames/'+d.provider_hostname_id;
  const headers={authorization:'Bearer '+env.CLOUDFLARE_API_TOKEN,accept:'application/json','content-type':'application/json'};
  let attempted=false;
  try{
   const current=await fetchImpl(url,{method:'GET',redirect:'error',headers,signal:controller.signal});
   if(!current.ok)return response;
   const state=await current.json(),h=state.result;
   if(state.success!==true||h?.id!==d.provider_hostname_id||h.hostname!==d.hostname||h.ssl?.status!=='pending_validation'||h.ssl.method!=='txt'||h.ssl.type!=='dv'||h.ssl.wildcard===true)return response;
   attempted=true;
   const changed=await fetchImpl(url,{method:'PATCH',redirect:'error',headers,signal:controller.signal,body:JSON.stringify({ssl:{method:'http',type:'dv'}})});
   const result=await changed.json();
   const confirmed=changed.ok&&result.success===true&&result.result?.id===h.id&&result.result?.hostname===h.hostname&&result.result?.ssl?.method==='http';
   return Response.json({...data,certificateValidation:{method:confirmed?'http':null,changeConfirmed:confirmed,statusRefreshRequired:true},publicSiteVerified:false,siteContentVerified:false},{status:response.status,headers:response.headers});
  }catch{return attempted?Response.json({...data,certificateValidation:{method:null,changeConfirmed:false,outcomeUnknown:true,statusRefreshRequired:true},publicSiteVerified:false,siteContentVerified:false},{status:response.status,headers:response.headers}):response;}
  finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);}
 };
}
export const handleCustomerDomainWithHttpDcv=createHttpDcvHandler();
