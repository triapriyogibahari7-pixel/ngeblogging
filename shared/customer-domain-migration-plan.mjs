const BLOCKED=new Set(['blocked','deleted','pending_deletion','test_blocked','test_failed']);
export function legacySaasMigrationPlan(row={},capabilities={}){
 const provider=typeof row.provider==='string'?row.provider:null;
 const saas=['cloudflare','cloudflare-custom-hostnames'].includes(provider),legacy=provider==='cloudflare-full-zone';
 const blocked=BLOCKED.has(row.status);
 const blockers=[];
 if(blocked)blockers.push('DOMAIN_BLOCKED');
 if(!saas&&!legacy)blockers.push('UNKNOWN_PROVIDER');
 if(legacy){if(capabilities.configurationReady!==true)blockers.push('SAAS_CONFIGURATION_NOT_READY');if(capabilities.apexReady!==true)blockers.push('APEX_CAPABILITY_NOT_READY');blockers.push('AUTHORITATIVE_PROVIDER_AND_DNS_INVENTORY_REQUIRED','CERTIFICATE_AND_HOSTNAME_VALIDATION_REQUIRED','ATOMIC_CUTOVER_AND_ROLLBACK_NOT_IMPLEMENTED');}
 const aliases=Array.isArray(row.ownership_verification?.additional_hostnames)?row.ownership_verification.additional_hostnames:[];
 return {domainId:row.id||null,siteId:row.site_id||null,hostname:row.hostname||null,sourceProvider:provider,targetProvider:'cloudflare-custom-hostnames',migrationRequired:legacy?true:saas?false:null,stage:blocked?'blocked':legacy?'preflight-required':saas?'already-saas-recorded':'provider-review',canExecute:false,mutations:[],blockers,snapshot:{isPrimary:typeof row.is_primary==='boolean'?row.is_primary:null,providerHostnameId:row.provider_hostname_id||null,aliases:aliases.filter(x=>x&&typeof x.hostname==='string').map(x=>({hostname:x.hostname,enabled:x.enabled!==false}))},publicSiteVerified:false};
}
