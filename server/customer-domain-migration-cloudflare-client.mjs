const fail=code=>Object.assign(Error(code),{code});
export function createMigrationCloudflareClient({token,zoneId,fetchImpl=globalThis.fetch,beforeWrite,afterWrite}={}){
 if(!token||!/^[a-f0-9]{32}$/i.test(zoneId||''))throw fail('CLOUDFLARE_CONFIGURATION_REQUIRED');
 async function call(method,suffix,body,context){
  const write=method!=='GET';
  if(write&&(!context?.migrationId||!context?.operationId||typeof beforeWrite!=='function'||typeof afterWrite!=='function'))throw fail('DURABLE_PROVIDER_CHECKPOINT_REQUIRED');
  if(write)await beforeWrite({method,suffix,body,context});
  const response=await fetchImpl('https://api.cloudflare.com/client/v4/zones/'+zoneId+'/custom_hostnames'+suffix,{method,redirect:'error',headers:{authorization:'Bearer '+token,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  let data;try{data=await response.json();}catch{throw fail('CLOUDFLARE_OUTCOME_UNKNOWN');}
  if(!response.ok||data.success!==true)throw fail(write?'CLOUDFLARE_WRITE_REQUIRES_RECONCILIATION':'CLOUDFLARE_READ_FAILED');
  if(write)await afterWrite({context,result:data.result});
  return data;
 }
 const id=value=>{if(!/^[a-f0-9]{32}$/i.test(value||''))throw fail('INVALID_PROVIDER_ID');return value;};
 return {
  inspect:async hostnameId=>(await call('GET','/'+id(hostnameId))).result,
  fallback:async()=>(await call('GET','/fallback_origin')).result,
  find:async hostname=>(await call('GET','?hostname='+encodeURIComponent(hostname)+'&per_page=50')).result,
  create:async(payload,context)=>(await call('POST','',payload,context)).result,
  remove:async(hostnameId,context)=>{const current=(await call('GET','/'+id(hostnameId))).result;const meta=current?.custom_metadata;if(meta?.migration_id!==context?.migrationId||meta?.site_id!==context?.siteId)throw fail('PROVIDER_RESOURCE_NOT_OWNED');return (await call('DELETE','/'+id(hostnameId),undefined,context)).result;}
 };
}
