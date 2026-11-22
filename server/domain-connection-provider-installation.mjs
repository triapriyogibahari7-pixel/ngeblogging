import {customerHost,customerOptions,customerRequest} from '../shared/customer-domain-connection.mjs';

// Trusted backend component only; not wired to an HTTP route or notification yet.
// input.userId must come from independently verified authentication.
// Provider receipts are not public registry bindings, activation, or serving rights.
const DB='https://polvmlrhqoiflumibfqs.supabase.co';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const HEX=/^[a-f0-9]{32}$/,ORDER=/^DCON-[a-f0-9]{32}$/;
const PID=/^(?:[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/;
const fail=code=>{throw Object.assign(Error(code),{code});};
async function boundedJson(response){
 const reader=response.body?.getReader();if(!reader)fail('INSTALL_UPSTREAM_BODY_REQUIRED');
 try{const decoder=new TextDecoder('utf-8',{fatal:true});let text='',size=0;for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>65536)fail('INSTALL_UPSTREAM_BODY_TOO_LARGE');text+=decoder.decode(part.value,{stream:true});}return JSON.parse(text+decoder.decode());}
 finally{reader.cancel().catch(()=>{});}
}
export async function installPaidConnectionProviderPair(input,env,{fetchImpl=globalThis.fetch}={}){
 if(env.DOMAIN_CONNECTION_INSTALLER_ENABLED!=='true')fail('PAID_CONNECTION_INSTALLER_DISABLED');
 if(!input||!ORDER.test(input.orderId||'')||!UUID.test(input.userId||'')||!UUID.test(input.siteId||''))fail('INSTALL_IDENTITY_REQUIRED');
 const options=customerOptions(env),token=String(env.CLOUDFLARE_DOMAIN_API_TOKEN||env.CLOUDFLARE_API_TOKEN||'').trim(),merchant=env.DOMAIN_MIDTRANS_PRODUCTION_MERCHANT_ID;
 if(String(env.SUPABASE_URL||'').replace(/\/$/,'')!==DB||!env.SUPABASE_SERVICE_ROLE_KEY||!options.configurationReady||!options.apexReady||options.apexDnsMode!=='cname-flattening'||!HEX.test(env.CLOUDFLARE_ZONE_ID||'')||!HEX.test(env.CLOUDFLARE_ACCOUNT_ID||'')||typeof merchant!=='string'||!/^[A-Za-z0-9_-]{2,100}$/.test(merchant))fail('INSTALL_CONFIGURATION_REQUIRED');
 const admin={apikey:env.SUPABASE_SERVICE_ROLE_KEY,authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'content-type':'application/json'},cfHeaders={authorization:'Bearer '+token,accept:'application/json','content-type':'application/json'};
 const cf='https://api.cloudflare.com/client/v4/zones/'+env.CLOUDFLARE_ZONE_ID;
 async function call(url,headers,init={}){const response=await fetchImpl(url,{...init,headers,redirect:'error',signal:AbortSignal.timeout(8000)});if(!response.ok)fail('INSTALL_UPSTREAM_UNAVAILABLE');return boundedJson(response);}
 const rpc=(name,args)=>call(DB+'/rest/v1/rpc/'+name,admin,{method:'POST',body:JSON.stringify(args)});
 const cfGet=suffix=>call(cf+suffix,cfHeaders);
 const [zone,fallback,target,capability]=await Promise.all(['','/custom_hostnames/fallback_origin','/dns_records?name='+encodeURIComponent(options.cnameTarget)+'&per_page=2','/custom_hostnames?per_page=1'].map(cfGet));
 const origin=fallback.result?.origin;
 if(zone.success!==true||zone.result?.id!==env.CLOUDFLARE_ZONE_ID||zone.result?.name!=='ngeblogging.com'||zone.result?.account?.id!==env.CLOUDFLARE_ACCOUNT_ID||zone.result?.status!=='active'||fallback.success!==true||fallback.result?.status!=='active'||typeof origin!=='string'||!origin.endsWith('.ngeblogging.com')||origin===options.cnameTarget||!/^[a-z0-9.-]+$/.test(origin)||target.success!==true||!Array.isArray(target.result)||!target.result.some(r=>r.name===options.cnameTarget&&r.proxied===true&&['A','AAAA','CNAME'].includes(r.type))||capability.success!==true||!Array.isArray(capability.result))fail('INSTALL_PLATFORM_UNVERIFIED');
 const args={p_order:input.orderId,p_user:input.userId,p_site:input.siteId,p_merchant:merchant,p_zone:env.CLOUDFLARE_ZONE_ID,p_account:env.CLOUDFLARE_ACCOUNT_ID,p_target:options.cnameTarget,p_origin:origin};
 const prepared=await rpc('domain_connection_install_prepare_v1',args);
 if(prepared?.version!=='connection-installation-v1'||prepared.orderId!==input.orderId||prepared.userId!==input.userId||prepared.siteId!==input.siteId||typeof prepared.hostname!=='string'||customerHost(prepared.hostname)!==prepared.hostname||prepared.hostname.startsWith('www.')||prepared.hostname.length>249||!Number.isFinite(Date.parse(prepared.expiresAt))||Date.parse(prepared.expiresAt)<=Date.now()||!Array.isArray(prepared.jobs)||prepared.jobs.length!==2)fail('INSTALL_PREPARATION_UNVERIFIED');
 const names=[prepared.hostname,'www.'+prepared.hostname],seen=new Set(),results=[];
 function checked(job){
  if(!job||!names.includes(job.hostname)||!UUID.test(job.operation_id||'')||!UUID.test(job.domain_id||'')||job.site_id!==input.siteId||job.user_id!==input.userId||job.zone_id!==args.p_zone||job.account_id!==args.p_account||job.cname_target!==args.p_target||job.fallback_origin!==args.p_origin||!['prepared','creating','observed'].includes(job.state))fail('INSTALL_JOB_UNVERIFIED');
  if(job.state==='observed'&&(!PID.test(job.provider_hostname_id||'')||job.provider_snapshot?.id!==job.provider_hostname_id||job.provider_snapshot?.hostname!==job.hostname))fail('INSTALL_RECEIPT_UNVERIFIED');
  return job;
 }
 for(const raw of prepared.jobs){const job=checked(raw);if(seen.has(job.hostname))fail('INSTALL_PAIR_UNVERIFIED');seen.add(job.hostname);}
 for(const raw of prepared.jobs){
  let job=checked(raw);
  if(job.state==='creating')fail('PROVIDER_OUTCOME_REQUIRES_RECONCILIATION');
  if(job.state==='observed'){
   const observed=await cfGet('/custom_hostnames/'+job.provider_hostname_id);
   if(observed.success!==true||observed.result?.id!==job.provider_hostname_id||observed.result?.hostname!==job.hostname)fail('INSTALL_EXISTING_RECEIPT_REQUIRES_REVIEW');
  }else{
   const inventory=await cfGet('/custom_hostnames?hostname='+encodeURIComponent(job.hostname)+'&per_page=50');
   if(inventory.success!==true||!Array.isArray(inventory.result)||Number(inventory.result_info?.total_pages||1)>1)fail('INSTALL_INVENTORY_UNVERIFIED');
   if(inventory.result.some(row=>row.hostname===job.hostname))fail('INSTALL_EXISTING_PROVIDER_RESOURCE_REQUIRES_REVIEW');
   const claimed=await rpc('domain_connection_install_begin_v1',{...args,p_operation:job.operation_id});
   if(claimed?.claimed!==true)fail('INSTALL_ALREADY_STARTED_RECONCILE');
   const start=checked(claimed.job);
   if(start.operation_id!==job.operation_id||start.domain_id!==job.domain_id||start.hostname!==job.hostname||start.state!=='creating'||!Number.isFinite(Date.parse(claimed.expiresAt))||Date.parse(claimed.expiresAt)<=Date.now())fail('INSTALL_WRITE_CHECKPOINT_UNVERIFIED');
   try{
    const created=await call(cf+'/custom_hostnames',cfHeaders,{method:'POST',body:JSON.stringify({hostname:job.hostname,ssl:{method:'txt',type:'dv'}})}),p=created.result;
    if(created.success!==true||!PID.test(p?.id||'')||p.hostname!==job.hostname)fail('INSTALL_PROVIDER_RESULT_UNVERIFIED');
    const receipt={id:p.id,hostname:p.hostname,status:typeof p.status==='string'&&p.status.length<=80?p.status:null,ssl_status:typeof p.ssl?.status==='string'&&p.ssl.status.length<=80?p.ssl.status:null};
    const saved=await rpc('domain_connection_install_record_v1',{p_operation:job.operation_id,p_receipt:receipt});
    if(saved?.ok!==true)fail('INSTALL_RECEIPT_SAVE_UNVERIFIED');
    const recorded=checked(saved.job);
    if(recorded.operation_id!==job.operation_id||recorded.domain_id!==job.domain_id||recorded.hostname!==job.hostname||recorded.state!=='observed'||recorded.provider_hostname_id!==p.id)fail('INSTALL_RECEIPT_SAVE_UNVERIFIED');
    job=recorded;
   }catch{fail('PROVIDER_OUTCOME_REQUIRES_RECONCILIATION');}
  }
  results.push({hostname:job.hostname,domainId:job.domain_id,providerHostnameId:job.provider_hostname_id,state:job.state});
 }
 const apex=customerRequest({siteId:input.siteId,domain:prepared.hostname,mode:'apex'},options),www=customerRequest({siteId:input.siteId,domain:prepared.hostname,mode:'subdomain',label:'www'},options);
 return {stage:'provider-resources-recorded',orderId:input.orderId,siteId:input.siteId,hostname:prepared.hostname,jobs:results,instructions:{records:[...apex.records,...www.records],requiresCnameFlattening:true},registryBindingCompleted:false,serviceActive:false,primaryChanged:false,publicSiteVerified:false};
}
