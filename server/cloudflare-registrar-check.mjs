import {normalizeRegistrarDomain} from './domain-registrar-quote-router.mjs';
const ENDPOINT='https://api.cloudflare.com/client/v4/accounts/095e57b46e7ba7f6b188480d9e4e5fe7/registrar/domain-check';
const amount=v=>typeof v==='string'&&/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/.test(v);
export async function checkCloudflareRegistrar(env,input,{fetchImpl=globalThis.fetch,clock=Date.now}={}){
 const domain=normalizeRegistrarDomain(input?.domain).domain;
 const base={domain,providerId:'cloudflare',lookupOnly:true,purchaseAllowed:false};
 const token=env?.CLOUDFLARE_REGISTRAR_API_TOKEN;
 if(typeof token!=='string'||!token.trim())return {...base,status:'secret_missing'};
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),10000);
 try{
  const response=await fetchImpl(ENDPOINT,{method:'POST',redirect:'manual',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({domains:[domain]}),signal:controller.signal});
  if(response.status>=300&&response.status<400)return {...base,status:'redirect_rejected'};
  if(!response.ok)return {...base,status:[401,403].includes(response.status)?'access_denied':response.status===429?'rate_limited':'provider_error',httpStatus:response.status};
  let data;try{data=await response.json();}catch{return {...base,status:'invalid_response'};}
  const rows=data?.result?.domains;
  if(data?.success!==true||!Array.isArray(rows)||rows.length!==1||rows[0]?.name!==domain||typeof rows[0]?.registrable!=='boolean')return {...base,status:'invalid_response'};
  const row=rows[0];
  const now=clock();
  if(!Number.isFinite(now)||Math.abs(now)>8640000000000000)return {...base,status:'invalid_clock'};
  const checkedAt=new Date(now).toISOString();
  if(!row.registrable)return {...base,status:'not_registrable',registrable:false,checkedAt,availability:'not_confirmed',quote:null};
  if(!['standard','premium'].includes(row.tier))return {...base,status:'invalid_response'};
  const p=row.pricing;
  if(!p||typeof p.currency!=='string'||!/^[A-Z]{3}$/.test(p.currency)||!amount(p.registration_cost)||!amount(p.renewal_cost))return {...base,status:'invalid_response'};
  return {...base,status:row.tier==='premium'?'premium_not_supported':'checked',registrable:true,tier:row.tier,checkedAt,mustRecheckBeforePurchase:true,prices:{currency:p.currency,registration:{amount:p.registration_cost,termYears:1},renewal:{amount:p.renewal_cost,termYears:1},transfer:null,taxIncluded:null},registrantEligibility:'not_checked'};
 }catch{return {...base,status:controller.signal.aborted?'timeout':'network_error'};}
 finally{clearTimeout(timer);}
}
