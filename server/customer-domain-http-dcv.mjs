import {createWorkerRedirectSafeFetch} from './domain-worker-fetch.mjs';
import {handleSaasHttpRegistration} from './customer-domain-http-registration.mjs';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function createHttpDcvHandler({handler=handleSaasHttpRegistration,fetchImpl=(...args)=>globalThis.fetch(...args)}={}){
 const transport=createWorkerRedirectSafeFetch(fetchImpl);
 return async function(request,env){
  if(request.method!=='POST'||new URL(request.url).pathname!=='/api/domains/register'||env.CUSTOM_DOMAIN_PROVIDER!=='cloudflare-custom-hostnames')return handler(request,env);
  const response=await handler(request,env);
  if(!response?.ok)return response;
  let data;try{data=await response.clone().json();}catch{return response;}
  const d=data?.domain;
  if(!d||!['cloudflare','cloudflare-custom-hostnames'].includes(d.provider)||!UUID.test(d.provider_hostname_id||'')||typeof d.hostname!=='string'||d.hostname.includes('*'))return response;
  if(!/^[a-f0-9]{32}$/i.test(env.CLOUDFLARE_ZONE_ID||'')||!env.CLOUDFLARE_API_TOKEN)return response;
  const controller=new AbortController(),abort=()=>controller.abort(),timer=setTimeout(abort,8000);
  request.signal.addEventListener('abort',abort,{once:true});if(request.signal.aborted)abort();
  const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag');headers.set('cache-control','no-store');
  const reply=extra=>Response.json({...data,...extra,publicSiteVerified:false,siteContentVerified:false},{status:response.status,headers});
  try{
   const url='https://api.cloudflare.com/client/v4/zones/'+env.CLOUDFLARE_ZONE_ID+'/custom_hostnames/'+d.provider_hostname_id;
   const current=await transport(url,{method:'GET',headers:{authorization:'Bearer '+env.CLOUDFLARE_API_TOKEN,accept:'application/json'},signal:controller.signal});
   if(!current.ok)throw Error('CERTIFICATE_STATUS_UNAVAILABLE');
   const state=await current.json(),h=state.result;
   if(state.success!==true||h?.id!==d.provider_hostname_id||h.hostname!==d.hostname||!h.ssl||typeof h.ssl.status!=='string')throw Error('CERTIFICATE_IDENTITY_UNVERIFIED');
   const sslValidation=Array.isArray(h.ssl.validation_records)?h.ssl.validation_records:[];
   const within=name=>typeof name==='string'&&name.replace(/\.$/,'').toLowerCase()==='_acme-challenge.'+d.hostname.toLowerCase();
   const delegationRecords=(Array.isArray(h.ssl.dcv_delegation_records)?h.ssl.dcv_delegation_records:[]).filter(r=>within(r?.cname)&&typeof r.cname_target==='string'&&r.cname_target.toLowerCase().replace(/\.$/,'').endsWith('.dcv.cloudflare.com')).map(r=>({type:'CNAME',name:r.cname,value:r.cname_target,purpose:'certificate',verified:false}));
   const certificateRecords=sslValidation.filter(r=>within(r?.txt_name)&&typeof r.txt_value==='string'&&r.txt_value).map(r=>({type:'TXT',name:r.txt_name,value:r.txt_value,purpose:'certificate',verified:false}));
   return reply({domain:{...d,provider_status:h.status||d.provider_status,ssl_status:h.ssl.status,ssl_validation:sslValidation},certificateValidation:{method:h.ssl.method||null,status:h.ssl.status,providerReadVerified:true,changeConfirmed:false,mutationAttempted:false,statusRefreshRequired:true,delegationRecords,records:certificateRecords,alternativeRecordSets:true}});
  }catch{return reply({certificateValidation:{method:null,providerReadVerified:false,changeConfirmed:false,mutationAttempted:false,statusRefreshRequired:true,error:'CERTIFICATE_STATUS_UNAVAILABLE'}});}
  finally{clearTimeout(timer);request.signal.removeEventListener('abort',abort);controller.abort();}
 };
}
export const handleCustomerDomainWithHttpDcv=createHttpDcvHandler();
