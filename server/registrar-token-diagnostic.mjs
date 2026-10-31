export async function diagnoseRegistrarAccess(env, {fetchImpl = globalThis.fetch} = {}) {
 const token = env?.CLOUDFLARE_REGISTRAR_API_TOKEN;
 const base = {lookupOnly:true,purchaseAllowed:false};
 if(typeof token !== 'string' || !token.trim()) return {...base,status:'secret_missing'};
 const controller = new AbortController();
 const timer = setTimeout(() => controller.abort(), 10000);
 try {
  const response = await fetchImpl('https://api.cloudflare.com/client/v4/accounts/095e57b46e7ba7f6b188480d9e4e5fe7/registrar/domain-search?q=ngeblogging&limit=3', {method:'GET',redirect:'manual',headers:{Authorization:'Bearer '+token},signal:controller.signal});
  if(response.status>=300 && response.status<400) return {...base,status:'provider_error',httpStatus:response.status};
  let data; try {data = await response.json();} catch {return {...base,status:'invalid_response',httpStatus:response.status};}
  const errorCodes = Array.isArray(data?.errors) ? data.errors.map(e=>e?.code).filter(Number.isInteger) : [];
  if(!response.ok || data?.success !== true) return {...base,status:[401,403].includes(response.status)?'access_denied':response.status===429?'rate_limited':'provider_error',httpStatus:response.status,errorCodes};
  if(!Array.isArray(data?.result?.domains)) return {...base,status:'invalid_response',httpStatus:response.status};
  return {...base,status:'registrar_search_access_confirmed',httpStatus:response.status,candidateCount:data.result.domains.length,realTimeAvailabilityChecked:false,workerSecretUsed:true};
 } catch {return {...base,status:controller.signal.aborted?'timeout':'network_error'};}
 finally {clearTimeout(timer);}
}
