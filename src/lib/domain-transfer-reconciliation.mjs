// Read-state classification only. Server and SQL remain responsible for authorization.
export function classifyTransferSnapshot(request,snapshot,userId){
  const review=code=>({phase:'needs_review',code,providerCacheVerified:false});
  const {domain,sourceSite:source,targetSite:target,targetDomains}=snapshot||{};
  if(!request||!userId||!domain||!source||!target||snapshot.targetLoaded!==true||!Array.isArray(targetDomains))return review('READ_STATE_INCOMPLETE');
  if(domain.id!==request.p_domain_id||domain.hostname!==request.p_confirm_hostname||source.id!==request.p_source_site_id||target.id!==request.p_target_site_id||source.id===target.id)return review('READ_STATE_MISMATCH');
  if(source.owner_id!==userId||target.owner_id!==userId||snapshot.sourceRole!=='owner'||snapshot.targetRole!=='owner')return review('READ_OWNERSHIP_MISMATCH');
  if(!source.slug||!target.slug||domain.provider!=='cloudflare-full-zone'||!['active','pending','verifying'].includes(domain.status)||(domain.is_primary===true&&domain.status!=='active'))return review('READ_DOMAIN_STATE_UNSUPPORTED');
  if(targetDomains.some(row=>!row||row.site_id!==target.id))return review('READ_TARGET_SCOPE_MISMATCH');
  const free=`${target.slug}.ngeblogging.com`;
  if(!targetDomains.some(row=>row.hostname===free&&row.provider==='cloudflare'&&row.status==='active'))return review('READ_MANAGED_DOMAIN_MISSING');
  const primaries=targetDomains.filter(row=>row.status==='active'&&row.is_primary===true);
  if(primaries.length!==1||target.custom_domain!==primaries[0].hostname)return review('READ_TARGET_MAPPING_INCONSISTENT');
  const row=targetDomains.find(row=>row.id===domain.id);
  if(domain.site_id===target.id){
    if(!row||row.hostname!==domain.hostname||row.status!==domain.status||row.is_primary!==domain.is_primary||row.provider!==domain.provider||targetDomains.some(item=>item.id!==domain.id&&item.hostname!==free))return review('READ_TARGET_DOMAIN_INCONSISTENT');
    const expected=domain.status==='active'&&domain.is_primary===true?domain.hostname:free;
    if(target.custom_domain!==expected||source.custom_domain!==`${source.slug}.ngeblogging.com`)return review('READ_SITE_MAPPING_INCONSISTENT');
    return {phase:'at_target',providerCacheVerified:false};
  }
  if(domain.site_id===source.id){
    const expected=domain.status==='active'&&domain.is_primary===true?domain.hostname:`${source.slug}.ngeblogging.com`;
    if(row||targetDomains.some(item=>item.hostname!==free)||target.custom_domain!==free||source.custom_domain!==expected)return review('READ_SOURCE_MAPPING_INCONSISTENT');
    // Observation is NOT a rollback receipt: the original request may still finish later.
    return {phase:'at_source',providerCacheVerified:false};
  }
  return review('READ_DOMAIN_MOVED_ELSEWHERE');
}
