import {installPaidConnectionProviderPair} from './domain-connection-provider-installation.mjs';

// Internal backend coordinator; not yet wired to notifications or HTTP.
// userId must be independently authenticated or loaded from a verified paid order.
const DB='https://polvmlrhqoiflumibfqs.supabase.co';
const fail=code=>{throw Object.assign(Error(code),{code});};
async function readJson(response){
 const reader=response.body?.getReader();if(!reader)fail('BIND_BODY_REQUIRED');
 try{let text='',size=0;const decoder=new TextDecoder('utf-8',{fatal:true});for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>65536)fail('BIND_BODY_TOO_LARGE');text+=decoder.decode(part.value,{stream:true});}return JSON.parse(text+decoder.decode());}
 finally{reader.cancel().catch(()=>{});}
}
function strings(source,keys){const result={};for(const key of keys)if(typeof source?.[key]==='string'&&source[key].length<=4096)result[key]=source[key];return result;}
export async function installAndBindPaidConnectionPair(input,env,{fetchImpl=globalThis.fetch}={}){
 const provisioned=await installPaidConnectionProviderPair(input,env,{fetchImpl});
 if(provisioned.orderId!==input.orderId||provisioned.siteId!==input.siteId||!Array.isArray(provisioned.jobs)||provisioned.jobs.length!==2)fail('BIND_PROVISIONING_UNVERIFIED');
 const token=String(env.CLOUDFLARE_DOMAIN_API_TOKEN||env.CLOUDFLARE_API_TOKEN||'').trim(),cf='https://api.cloudflare.com/client/v4/zones/'+env.CLOUDFLARE_ZONE_ID;
 async function call(url,headers,init={}){const response=await fetchImpl(url,{...init,headers,redirect:'manual',signal:AbortSignal.timeout(8000)});if(!response.ok){try{response.body?.cancel()?.catch(()=>{});}catch{}fail('BIND_UPSTREAM_UNAVAILABLE');}return readJson(response);}
 const cfHeaders={authorization:'Bearer '+token,accept:'application/json'};
 const [zone,fallback]=await Promise.all([call(cf,cfHeaders),call(cf+'/custom_hostnames/fallback_origin',cfHeaders)]);
 const origin=fallback.result?.origin;
 if(zone.success!==true||zone.result?.id!==env.CLOUDFLARE_ZONE_ID||zone.result?.name!=='ngeblogging.com'||zone.result?.account?.id!==env.CLOUDFLARE_ACCOUNT_ID||zone.result?.status!=='active'||fallback.success!==true||fallback.result?.status!=='active'||typeof origin!=='string'||!origin.endsWith('.ngeblogging.com')||!/^[a-z0-9.-]+$/.test(origin))fail('BIND_PLATFORM_UNVERIFIED');
 const results=await Promise.all(provisioned.jobs.map(async job=>{
  const response=await call(cf+'/custom_hostnames/'+job.providerHostnameId,cfHeaders),p=response.result;
  if(response.success!==true||p?.id!==job.providerHostnameId||p.hostname!==job.hostname||typeof p.status!=='string'||!p.status.length||p.status.length>80||typeof p.ssl?.status!=='string'||!p.ssl.status.length||p.ssl.status.length>80)fail('BIND_PROVIDER_IDENTITY_UNVERIFIED');
  const ownership=strings(p.ownership_verification,['type','name','value']);
  const validation=(Array.isArray(p.ssl.validation_records)?p.ssl.validation_records:[]).slice(0,20).map(row=>strings(row,['txt_name','txt_value','cname_name','cname_target','http_url','http_body'])).filter(row=>Object.keys(row).length);
  return {domain_id:job.domainId,hostname:job.hostname,provider_hostname_id:p.id,provider_status:p.status,ssl_status:p.ssl.status,ownership_verification:ownership,ssl_validation:validation};
 }));
 const args={p_order:input.orderId,p_user:input.userId,p_site:input.siteId,p_merchant:env.DOMAIN_MIDTRANS_PRODUCTION_MERCHANT_ID,p_zone:env.CLOUDFLARE_ZONE_ID,p_account:env.CLOUDFLARE_ACCOUNT_ID,p_target:String(env.CLOUDFLARE_CUSTOM_HOSTNAME_TARGET||'').toLowerCase().replace(/\.$/,''),p_origin:origin,p_results:results};
 const admin={apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'content-type':'application/json'};
 const saved=await call(DB+'/rest/v1/rpc/domain_connection_install_bind_v1',admin,{method:'POST',body:JSON.stringify(args)});
 if(saved?.ok!==true||saved.orderId!==input.orderId||saved.siteId!==input.siteId||saved.hostname!==provisioned.hostname||saved.registryBindingCompleted!==true||saved.primaryChanged!==false||!Array.isArray(saved.domains)||saved.domains.length!==2)fail('BIND_SAVE_UNVERIFIED');
 const seen=new Set();for(const d of saved.domains){const job=provisioned.jobs.find(j=>j.domainId===d.id);if(!job||seen.has(d.id)||d.site_id!==input.siteId||d.hostname!==job.hostname||d.provider_hostname_id!==job.providerHostnameId||!['cloudflare','cloudflare-custom-hostnames'].includes(d.provider)||d.is_primary!==false||!['pending','verifying','active','failed'].includes(d.status))fail('BIND_SAVE_IDENTITY_UNVERIFIED');seen.add(d.id);}
 return {...provisioned,stage:'registry-bound',domains:saved.domains,registryBindingCompleted:true,activationChecked:false,serviceActive:null,primaryChanged:false,publicSiteVerified:false};
}
