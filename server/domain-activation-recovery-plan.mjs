const normalize=value=>String(value||'').trim().toLowerCase().replace(/\.$/,'');
const validHost=value=>value.length<=253&&value.includes('.')&&value.split('.').every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
const set=value=>Array.isArray(value)?[...new Set(value.map(normalize))].sort():[];
const equal=(a,b)=>a.length===b.length&&a.every((value,index)=>value===b[index]);
export function planDomainActivationRecovery({domain,zone,dns,accountId,now=Date.now()}={}){
 const base={activationCheckAllowed:false,publicSiteVerified:false,productionChangeAllowed:false};
 const result=(action,reason)=>({...base,action,reason});
 const name=normalize(domain?.hostname),zoneId=String(domain?.provider_hostname_id||'');
 if(!validHost(name)||name==='ngeblogging.com'||name.endsWith('.ngeblogging.com')||domain?.provider!=='cloudflare-full-zone'||!['verifying','pending','active'].includes(domain?.status)||!/^[a-f0-9]{32}$/i.test(zoneId))return result('blocked','DOMAIN_STATE_INVALID');
 if(!/^[a-f0-9]{32}$/i.test(String(accountId||''))||zone?.id!==zoneId||normalize(zone?.name)!==name||zone?.account?.id!==accountId||zone?.type!=='full')return result('blocked','ZONE_BINDING_MISMATCH');
 if(zone.paused===true)return result('blocked','ZONE_PAUSED');
 if(zone.status==='active')return result('verify_worker_routing','ZONE_ACTIVE');
 if(zone.status!=='pending')return result('wait','ZONE_NOT_PENDING');
 const expected=set(zone.name_servers);
 if(expected.length<2||!expected.every(validHost))return result('wait','ASSIGNED_NAMESERVERS_INCOMPLETE');
 const age=now-Date.parse(dns?.checkedAt);
 if(normalize(dns?.hostname)!==name||normalize(dns?.zoneName)!==name||!Number.isFinite(age)||age< -60000||age>300000)return result('check_dns','DNS_EVIDENCE_MISSING_OR_STALE');
 const rows=Array.isArray(dns?.checks)?dns.checks:[];
 if(rows.length!==2||new Set(rows.map(row=>row?.resolver)).size!==2||rows.some(row=>!['cloudflare-dns.com','dns.google'].includes(row?.resolver)))return result('check_dns','DNS_RESOLVERS_UNVERIFIED');
 if(rows.some(row=>row?.ns?.state!=='resolved'))return result('check_dns','NS_OBSERVATION_INCONCLUSIVE');
 if(rows.some(row=>!equal(set(row.ns.answers),expected)))return {...result('update_registrar_nameservers','NS_DELEGATION_MISMATCH'),requiredNameservers:expected};
 return {...result('offer_activation_check','NS_MATCH_ZONE_PENDING'),activationCheckAllowed:true,zoneId,hostname:name};
}
