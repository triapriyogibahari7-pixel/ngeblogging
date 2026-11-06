import {planDomainActivationRecovery} from './domain-activation-recovery-plan.mjs';
export async function requestDomainActivationCheck({domain,zone,dns,env={},confirmed=false,leaseStore,fetchImpl=(...args)=>globalThis.fetch(...args),timeoutMs=10000}={}){
 const accountId=String(env.CLOUDFLARE_ACCOUNT_ID||'').trim();
 const plan=planDomainActivationRecovery({domain,zone,dns,accountId});
 const out=(reason,requested=false,extra={})=>({...plan,requested,reason,...extra,publicSiteVerified:false,productionChangeAllowed:false});
 if(confirmed!==true)return out('EXPLICIT_CONFIRMATION_REQUIRED');
 if(!plan.activationCheckAllowed)return {...plan,requested:false};
 const token=String(env.CLOUDFLARE_DOMAIN_API_TOKEN||env.CLOUDFLARE_API_TOKEN||'').trim();
 if(!token)return out('DOMAIN_API_TOKEN_REQUIRED');
 if(typeof leaseStore?.claim!=='function')return out('DISTRIBUTED_LEASE_REQUIRED');
 let claimed;
 try{claimed=await leaseStore.claim(`activation:${accountId}:${plan.zoneId}`);}catch{return out('ACTIVATION_LEASE_UNAVAILABLE');}
 if(claimed!==true)return out('ACTIVATION_CHECK_COOLDOWN');
 const controller=new AbortController();
 let timer;
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('DEADLINE'));},Math.max(1,Math.min(10000,Number(timeoutMs)||10000)));});
 try{
  return await Promise.race([deadline,(async()=>{
   const response=await fetchImpl(`https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(plan.zoneId)}/activation_check`,{method:'PUT',redirect:'manual',headers:{authorization:`Bearer ${token}`,accept:'application/json'},signal:controller.signal});
   const data=await response.json().catch(()=>null);
   if(response.status===429)return out('ACTIVATION_CHECK_RATE_LIMITED');
   if([401,403].includes(response.status))return out('ACTIVATION_PERMISSION_REQUIRED');
   if(response.status>=500)return out('ACTIVATION_CHECK_OUTCOME_UNKNOWN',null);
   if(!response.ok)return out('ACTIVATION_CHECK_REJECTED',false,{httpStatus:response.status});
   if(data?.success!==true||data?.result?.id!==plan.zoneId)return out('ACTIVATION_CHECK_OUTCOME_UNKNOWN',null);
   return out('ACTIVATION_CHECK_ACCEPTED',true,{checkedAt:new Date().toISOString()});
  })()]);
 }catch{return out('ACTIVATION_CHECK_OUTCOME_UNKNOWN',null);}
 finally{clearTimeout(timer);controller.abort();}
}
