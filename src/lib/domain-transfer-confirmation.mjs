export function buildTransferRequest({domain,source,target,userId,confirmation,targetDomains,targetLoaded}) {
  const fail=code=>{throw Object.assign(new Error(code),{code});};
  if(!userId) fail('AUTH_REQUIRED');
  if(!domain?.id||!source?.id||!target?.id||source.id===target.id) fail('INVALID_TARGET');
  if(source.owner_id!==userId||target.owner_id!==userId) fail('BOTH_SITE_OWNERSHIP_REQUIRED');
  if(target.status!=='active') fail('TARGET_SITE_INACTIVE');
  const external=host=>typeof host==='string'&&host===host.toLowerCase()&&host.includes('.')&&!host.includes('..')&&host.length<=253&&host.split('.').every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))&&host!=='ngeblogging.com'&&!host.endsWith('.ngeblogging.com');
  if(domain.site_id!==source.id) fail('DOMAIN_SOURCE_CHANGED');
  if(domain.provider!=='cloudflare-full-zone'||!external(domain.hostname)||!['pending','verifying','active'].includes(domain.status)||(domain.is_primary===true&&domain.status!=='active')) fail('DOMAIN_STATE_NOT_TRANSFERABLE');
  if(typeof confirmation!=='string'||confirmation.trim().toLowerCase()!==domain.hostname) fail('HOSTNAME_CONFIRMATION_MISMATCH');
  if(targetLoaded!==true||!Array.isArray(targetDomains)) fail('TARGET_STATE_NOT_LOADED');
  if(targetDomains.some(row=>!row||row.site_id!==target.id)) fail('TARGET_STATE_MISMATCH');
  if(targetDomains.some(row=>row.hostname!==`${target.slug}.ngeblogging.com`)) fail('TARGET_HAS_DOMAIN_OR_UNREVIEWED_MAPPING');
  if(target.custom_domain&&target.custom_domain!==`${target.slug}.ngeblogging.com`) fail('TARGET_MAPPING_REQUIRES_REVIEW');
  return Object.freeze({p_domain_id:domain.id,p_source_site_id:source.id,p_target_site_id:target.id,p_confirm_hostname:domain.hostname});
}
export function createTransferController(send,{timeoutMs=30000,onState=()=>{}}={}) {
  if(typeof send!=='function') throw new TypeError('TRANSFER_TRANSPORT_REQUIRED');
  let phase='idle',disposed=false;
  const emit=(next,extra={})=>{phase=next;if(!disposed)onState({phase,...extra});};
  return {
    get phase(){return phase;},
    dispose(){disposed=true;},
    async submit(input){
      if(disposed||phase!=='idle') throw Object.assign(new Error('RELOAD_REQUIRED_OR_BUSY'),{code:'RELOAD_REQUIRED_OR_BUSY'});
      const request=buildTransferRequest(input);
      emit('pending');let timer;
      try {
        const result=await Promise.race([Promise.resolve().then(()=>send(request)),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('TRANSFER_RESPONSE_TIMEOUT')),timeoutMs);})]);
        if(result?.status!=='moved'||result.domainId!==request.p_domain_id||result.sourceSiteId!==request.p_source_site_id||result.targetSiteId!==request.p_target_site_id||!Number.isInteger(result.redirectsMoved)||result.redirectsMoved<0) throw new Error('TRANSFER_RECEIPT_MISMATCH');
        emit('moved',{routingVerified:false,result});return result;
      } catch(error){
        emit('unknown',{reloadRequired:true,message:'Hasil pemindahan belum dapat dipastikan. Muat ulang status kedua situs; jangan kirim ulang otomatis.'});
        throw Object.assign(new Error('TRANSFER_RECONCILIATION_REQUIRED'),{code:'TRANSFER_RECONCILIATION_REQUIRED',cause:error});
      } finally {clearTimeout(timer);}
    }
  };
}
