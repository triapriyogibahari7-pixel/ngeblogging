const fail=code=>Object.assign(Error(code),{code});
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const id=value=>{if(!UUID.test(value||''))throw fail('INVALID_PROVIDER_ID');return value;};
export function createMigrationCloudflareClient({token,zoneId,fetchImpl=globalThis.fetch,beforeWrite,afterWrite}={}){
 if(!token||!/^[a-f0-9]{32}$/i.test(zoneId||''))throw fail('CLOUDFLARE_CONFIGURATION_REQUIRED');
 async function call(method,suffix,body,context){
  const write=method!=='GET';
  if(write&&(!UUID.test(context?.migrationId||'')||!UUID.test(context?.siteId||'')||!context?.operationId||typeof beforeWrite!=='function'||typeof afterWrite!=='function'))throw fail('DURABLE_PROVIDER_CHECKPOINT_REQUIRED');
  if(write)await beforeWrite({method,suffix,body,context});
  const response=await fetchImpl('https://api.cloudflare.com/client/v4/zones/'+zoneId+'/custom_hostnames'+suffix,{method,redirect:'error',...(!write?{signal:AbortSignal.timeout(10000)}:{}),headers:{authorization:'Bearer '+token,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  let data;try{data=await response.json();}catch{throw fail('CLOUDFLARE_OUTCOME_UNKNOWN');}
  if(!response.ok||data.success!==true)throw fail(write?'CLOUDFLARE_WRITE_REQUIRES_RECONCILIATION':'CLOUDFLARE_READ_FAILED');
  if(write)await afterWrite({context,result:data.result});
  return data;
 }
 const owned=(row,context)=>{const meta=row?.custom_metadata;if(!UUID.test(context?.migrationId||'')||!UUID.test(context?.siteId||'')||meta?.migration_id!==context.migrationId||meta?.site_id!==context.siteId)throw fail('PROVIDER_RESOURCE_NOT_OWNED');return row;};
 return {
  inspect:async hostnameId=>(await call('GET','/'+id(hostnameId))).result,
  fallback:async()=>(await call('GET','/fallback_origin')).result,
  find:async hostname=>{const page=await call('GET','?hostname='+encodeURIComponent(hostname)+'&per_page=50');if(!Array.isArray(page.result)||Number(page.result_info?.total_pages||1)>1)throw fail('PROVIDER_INVENTORY_INCOMPLETE');return page.result.filter(x=>x.hostname===hostname);},
  create:async(payload,context)=>{if(payload?.custom_metadata?.migration_id!==context?.migrationId||payload?.custom_metadata?.site_id!==context?.siteId)throw fail('PROVIDER_OWNERSHIP_METADATA_REQUIRED');return owned((await call('POST','',payload,context)).result,context);},
  bindProofIdentity:async(hostnameId,context)=>{const current=owned((await call('GET','/'+id(hostnameId))).result,context);return owned((await call('PATCH','/'+id(hostnameId),{custom_metadata:{...current.custom_metadata,provider_id:hostnameId}},context)).result,context);},
  remove:async(hostnameId,context)=>{owned((await call('GET','/'+id(hostnameId))).result,context);return (await call('DELETE','/'+id(hostnameId),undefined,context)).result;}
 };
}
