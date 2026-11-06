import {getFullZoneStatus} from './cloudflare-full-zone-provider.mjs';
import {checkCustomDomainDns} from './custom-domain-dns-readiness.mjs';
import {createWorkerRedirectSafeFetch} from './domain-worker-fetch.mjs';
import {planDomainActivationRecovery} from './domain-activation-recovery-plan.mjs';
export async function readDomainActivationRecovery(domain,env,{readZone=getFullZoneStatus,readDns=checkCustomDomainDns,now=()=>Date.now()}={}){
 const fallback=reason=>({action:'check_provider',reason,activationCheckAllowed:false,productionChangeAllowed:false,publicSiteVerified:false});
 const accountId=String(env?.CLOUDFLARE_ACCOUNT_ID||'').trim();
 if(domain?.provider!=='cloudflare-full-zone'||!['pending','verifying','active'].includes(domain?.status)||!/^[a-f0-9]{32}$/i.test(String(domain?.provider_hostname_id||''))||!/^[a-f0-9]{32}$/i.test(accountId))return fallback('RECOVERY_INPUT_INVALID');
 let zone;
 try{zone=await readZone(env,domain.provider_hostname_id);}catch{return fallback('ZONE_OBSERVATION_UNAVAILABLE');}
 let plan=planDomainActivationRecovery({domain,zone,accountId,now:now()});
 if(plan.action!=='check_dns')return plan;
 let dns;
 try{dns=await readDns({hostname:domain.hostname,zoneName:zone.name,expectedNameservers:zone.name_servers,fetchImpl:createWorkerRedirectSafeFetch()});}
 catch{return {...plan,reason:'DNS_OBSERVATION_UNAVAILABLE'};}
 plan=planDomainActivationRecovery({domain,zone,dns,accountId,now:now()});
 return {...plan,dnsCheckedAt:typeof dns?.checkedAt==='string'?dns.checkedAt:null};
}
