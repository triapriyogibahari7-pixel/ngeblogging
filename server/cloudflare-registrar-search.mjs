const ENDPOINT='https://api.cloudflare.com/client/v4/accounts/095e57b46e7ba7f6b188480d9e4e5fe7/registrar/domain-search';
const REASONS=new Set(['extension_not_supported_via_api','extension_not_supported','extension_disallows_registration','domain_premium','domain_unavailable']);
const amount=v=>typeof v==='string'&&/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/.test(v);
export function normalizeRegistrarSearchQuery(value){
 if(typeof value!=='string')throw new Error('INVALID_SEARCH_QUERY');
 const query=value.trim().replace(/ +/g,' ');
 if(!query||query.length>100||query.startsWith('.')||!/^[\p{L}\p{M}\p{N} .-]+$/u.test(query))throw new Error('INVALID_SEARCH_QUERY');
 return query;
}
export function registrarSuggestionKeyword(value){
 const query=normalizeRegistrarSearchQuery(value);
 const domainLike=/^[\p{L}\p{M}\p{N}-]+(?:\.[\p{L}\p{M}\p{N}-]+)+\.?$/u.test(query)&&!/^\d+(?:\.\d+){3}$/.test(query);
 return domainLike?query.split('.')[0]:query;
}
function candidate(row){
 const name=row?.name;
 if(typeof name!=='string'||name.length>253||name!==name.toLowerCase()||name.split('.').length<2||/^\d+(?:\.\d+){3}$/.test(name)||name.split('.').some(x=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x))||typeof row.registrable!=='boolean')throw new Error('INVALID_SEARCH_RESPONSE');
 if(row.registrable&&(row.reason!==undefined||!['standard','premium'].includes(row.tier)))throw new Error('INVALID_SEARCH_RESPONSE');
 let prices=null;
 if(row.pricing!==undefined){
  const p=row.pricing;
  if(!p||typeof p.currency!=='string'||!/^[A-Z]{3}$/.test(p.currency)||!amount(p.registration_cost)||!amount(p.renewal_cost))throw new Error('INVALID_SEARCH_RESPONSE');
  prices={currency:p.currency,registration:{amount:p.registration_cost,termYears:1},renewal:{amount:p.renewal_cost,termYears:1},taxIncluded:null};
 }else if(row.registrable)throw new Error('INVALID_SEARCH_RESPONSE');
 const reason=row.registrable?null:REASONS.has(row.reason)?row.reason:'unknown_restriction';
 return {domain:name,searchAvailability:row.registrable?'appears_available':reason==='domain_unavailable'?'appears_unavailable':'not_confirmed',reason,tier:['standard','premium'].includes(row.tier)?row.tier:null,prices,advisory:true,mustRecheckBeforePurchase:true,purchaseAllowed:false};
}
export async function searchCloudflareRegistrar(env,input,{fetchImpl=globalThis.fetch,clock=Date.now}={}){
 const query=normalizeRegistrarSearchQuery(input?.query),limit=input?.limit??20;
 if(!Number.isInteger(limit)||limit<1||limit>50)throw new Error('INVALID_SEARCH_LIMIT');
 const searchTerm=registrarSuggestionKeyword(query);
 const base={query,searchTerm,providerId:'cloudflare',lookupOnly:true,purchaseAllowed:false,advisory:true,mustRecheckBeforePurchase:true,limit};
 const token=env?.CLOUDFLARE_REGISTRAR_API_TOKEN;
 if(typeof token!=='string'||!token.trim())return {...base,status:'secret_missing'};
 const url=new URL(ENDPOINT);url.searchParams.set('q',searchTerm);url.searchParams.set('limit',String(limit));
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
  const response=await fetchImpl(url.toString(),{method:'GET',redirect:'manual',cache:'no-store',headers:{Authorization:'Bearer '+token},signal:controller.signal});
  if(response.status>=300&&response.status<400)return {...base,status:'redirect_rejected'};
  if(!response.ok)return {...base,status:[401,403].includes(response.status)?'access_denied':response.status===429?'rate_limited':'provider_error',httpStatus:response.status};
  let data;try{data=await response.json();}catch{return {...base,status:'invalid_response'};}
  const rows=data?.result?.domains;
  if(data?.success!==true||!Array.isArray(rows)||rows.length>limit)return {...base,status:'invalid_response'};
  let domains;try{domains=rows.map(candidate);}catch{return {...base,status:'invalid_response'};}
  if(new Set(domains.map(row=>row.domain)).size!==domains.length)return {...base,status:'invalid_response'};
  const now=clock();if(!Number.isFinite(now)||Math.abs(now)>8640000000000000)return {...base,status:'invalid_clock'};
  return {...base,status:'search_results',searchedAt:new Date(now).toISOString(),count:domains.length,domains};
 }catch{return {...base,status:controller.signal.aborted?'timeout':'network_error'};}
 finally{clearTimeout(timer);}
}
