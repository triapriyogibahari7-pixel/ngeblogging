const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const BLOCKED=new Set(['blocked','deleted','pending_deletion','test_blocked','test_failed']);
const fail=code=>Object.assign(Error(code),{code});
const copy=value=>structuredClone(value);
const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
const aliasState=row=>(row.ownership_verification?.additional_hostnames||[]).map(x=>({hostname:x.hostname,enabled:x.enabled!==false}));
function hostname(value){if(typeof value!=='string'||value.length>253||!value.includes('.')||value==='ngeblogging.com'||value.endsWith('.ngeblogging.com')||value.split('.').some(x=>!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x)))throw fail('INVALID_HOSTNAME');return value;}
function hosts(value){if(!Array.isArray(value)||!value.length||value.length>50)throw fail('INVALID_HOST_SET');const names=value.map(x=>hostname(typeof x==='string'?x:x.hostname));if(new Set(names).size!==names.length)throw fail('DUPLICATE_HOSTNAME');return names.sort();}
function requiredHosts(row){const aliases=aliasState(row);const disabled=new Set(aliases.filter(x=>!x.enabled).map(x=>x.hostname));const names=new Set([row.hostname,...aliases.filter(x=>x.enabled).map(x=>x.hostname),...(Array.isArray(row.ssl_validation)?row.ssl_validation:[]).filter(x=>x?.hostname).map(x=>x.hostname)]);for(const name of names)if(disabled.has(name))throw fail('DISABLED_ALIAS_STILL_BOUND');return hosts([...names]);}
const sameHosts=(a,b)=>canonical(hosts(a))===canonical(hosts(b));
function validSnapshot(snapshot,input){const row=snapshot?.domain;if(!row||row.id!==input.domainId||row.site_id!==input.siteId||snapshot.site?.id!==input.siteId||row.provider!=='cloudflare-full-zone'||BLOCKED.has(row.status)||!row.provider_hostname_id)throw fail('SOURCE_RECORD_NOT_ELIGIBLE');hostname(row.hostname);requiredHosts(row);}
function retainedIdentity(after,before){for(const key of ['id','site_id','hostname','is_primary','verified_at','created_at'])if(canonical(after.domain?.[key])!==canonical(before.domain[key]))throw fail('IDENTITY_OR_PRIMARY_CHANGED');if(after.site?.id!==before.site.id||after.site.custom_domain!==before.site.custom_domain||canonical(aliasState(after.domain))!==canonical(aliasState(before.domain)))throw fail('SITE_OR_ALIASES_CHANGED');}
function readyTarget(target,state){if(!target||target.siteId!==state.siteId||target.migrationId!==state.migrationId||!sameHosts(target.hostnames,state.source.hostnames)||target.hostnames.some(x=>typeof x.id!=='string'||!x.id||x.status!=='active'||x.sslStatus!=='active'))throw fail('TARGET_NOT_READY');if(new Set(target.hostnames.map(x=>x.id)).size!==target.hostnames.length)throw fail('DUPLICATE_PROVIDER_ID');if(target.hostnames.some(x=>state.receipt.hostnames.find(y=>y.hostname===x.hostname)?.id!==x.id))throw fail('TARGET_PROVIDER_ID_CHANGED');}
function proofValid(proof,state,now){if(!proof||proof.siteId!==state.siteId||proof.migrationId!==state.migrationId||!Number.isFinite(proof.checkedAt)||proof.checkedAt>now+5000||now-proof.checkedAt>60000||!sameHosts(proof.hostnames,state.source.hostnames)||proof.hostnames.some(x=>x.dnsVerified!==true||x.routingVerified!==true||x.siteContentVerified!==true||x.sslStatus!=='active'))throw fail('LIVE_PROOF_REQUIRED');}
function publicState(state){if(!state)return null;return {migrationId:state.migrationId,domainId:state.domainId,siteId:state.siteId,hostname:state.snapshot.domain.hostname,phase:state.phase,version:state.version,failedStep:state.failedStep||null,recoveryRequired:state.phase==='needs_recovery',productionActivationCertified:false};}
export function createSaasMigrationExecutor({journal,provider,records,authorize,now=Date.now,prepareEnabled=false,cutoverEnabled=false,rollbackEnabled=false}={}){
 const required={journal:['acquire','assertHeld','read','write','release'],provider:['inspectSource','stage','inspectTarget','switchTraffic','verifyTarget','restoreSource','sourceReady','removeOwnedStage','verifySource'],records:['read','assertUnchanged','commit','rollback']};
 for(const [name,methods] of Object.entries(required))for(const method of methods)if(typeof ({journal,provider,records}[name])?.[method]!=='function')throw fail('ADAPTER_REQUIRED_'+name.toUpperCase()+'_'+method.toUpperCase());
 if(typeof authorize!=='function')throw fail('AUTHORIZER_REQUIRED');
 return {async execute(input){
  const action=input?.action;
  if(!['status','prepare','cutover','rollback'].includes(action)||['actorId','siteId','domainId','migrationId'].some(k=>!UUID.test(input?.[k]||'')))throw fail('INVALID_MIGRATION_REQUEST');
  const identity={actorId:input.actorId,siteId:input.siteId,domainId:input.domainId,migrationId:input.migrationId,action};
  const auth=async()=>{if(input.signal?.aborted)throw fail('REQUEST_ABORTED');if(await authorize(copy(identity))!==true)throw fail('MIGRATION_FORBIDDEN');};
  await auth();
  if(action==='status'){const state=await journal.read(identity);if(state&&(state.siteId!==input.siteId||state.migrationId!==input.migrationId))throw fail('MIGRATION_NOT_IN_SCOPE');return publicState(state);}
  const flags={prepare:prepareEnabled,cutover:cutoverEnabled,rollback:rollbackEnabled};const flag=flags[action];if((typeof flag==='function'?await flag():flag)!==true)throw fail('MIGRATION_ACTION_DISABLED');
  const lock=await journal.acquire(copy(identity));if(!lock)throw fail('MIGRATION_BUSY');
  let state=null,uncertain=false,step=null;
  const guard=async()=>{await auth();await journal.assertHeld(lock,identity);};
  const save=async patch=>{await journal.assertHeld(lock,identity);const next={...state,...copy(patch),version:(state?.version||0)+1,updatedAt:now()};await journal.write(copy(next),lock,state?.version||0);state=next;};
  const effect=async(name,operation)=>{await guard();step=name;await save({phase:name});await guard();uncertain=true;const result=await operation();await journal.assertHeld(lock,identity);return result;};
  try{
   state=await journal.read(identity);
   if(state&&(state.siteId!==input.siteId||state.migrationId!==input.migrationId))throw fail('MIGRATION_NOT_IN_SCOPE');
   if(state?.phase==='needs_recovery')throw fail('MANUAL_RECONCILIATION_REQUIRED');
   if(action==='prepare'){
    if(state&&['prepared','cutover_complete','rolled_back'].includes(state.phase))return publicState(state);
    if(state)throw fail('MIGRATION_ALREADY_STARTED');
    const snapshot=copy(await records.read(identity));validSnapshot(snapshot,input);
    await guard();const source=copy(await provider.inspectSource({identity:copy(identity),snapshot:copy(snapshot)}));
    if(source?.inventoryComplete!==true||source.rollbackVerified!==true||source.platformVerified!==true||source.maintenanceHeld!==true||source.hostname!==snapshot.domain.hostname||source.zoneId!==snapshot.domain.provider_hostname_id||!sameHosts(source.hostnames,requiredHosts(snapshot.domain)))throw fail('SOURCE_INVENTORY_OR_ROLLBACK_UNVERIFIED');
    if(source.apexCapabilityVerified!==true)throw fail('APEX_CAPABILITY_UNVERIFIED');
    if(typeof source.trafficMayChangeDuringPrepare!=='boolean')throw fail('PREPARE_TRAFFIC_RISK_UNVERIFIED');
    if(source.trafficMayChangeDuringPrepare&&input.approvePrepareTrafficChange!==true)throw fail('PREPARE_TRAFFIC_CHANGE_APPROVAL_REQUIRED');
    state={...identity,action:undefined,snapshot,source,prepareTrafficChangeApproved:input.approvePrepareTrafficChange===true,phase:'initializing',version:0};
    await save({phase:'planned'});
    const receipt=copy(await effect('staging_provider',()=>provider.stage({identity:copy(identity),snapshot:copy(snapshot),source:copy(source),idempotencyKey:input.migrationId})));
    if(receipt?.siteId!==state.siteId||receipt.migrationId!==state.migrationId||!sameHosts(receipt.hostnames,source.hostnames)||receipt.hostnames.some(x=>typeof x.id!=='string'||!x.id)||new Set(receipt.hostnames.map(x=>x.id)).size!==receipt.hostnames.length)throw fail('STAGING_RESULT_MISMATCH');
    await save({phase:'prepared',receipt});uncertain=false;return publicState(state);
   }
   if(!state)throw fail('MIGRATION_NOT_FOUND');
   if(action==='cutover'){
    if(state.phase==='cutover_complete')return publicState(state);
    if(state.phase!=='prepared')throw fail('INVALID_CUTOVER_PHASE');
    await guard();await records.assertUnchanged(copy(state.snapshot),identity);
    const target=copy(await provider.inspectTarget(copy(state)));readyTarget(target,state);
    await effect('switching_traffic',()=>provider.switchTraffic({...copy(state),target}));
    const proof=copy(await provider.verifyTarget({...copy(state),target}));proofValid(proof,state,now());
    if(proof.hostnames.some(x=>x.providerId!==target.hostnames.find(y=>y.hostname===x.hostname)?.id))throw fail('LIVE_PROVIDER_ID_MISMATCH');
    await guard();await records.assertUnchanged(copy(state.snapshot),identity);await save({target,proof});
    const committed=copy(await effect('committing_record',()=>records.commit({identity:copy(identity),expected:copy(state.snapshot),target,proof:copy(proof)})));
    retainedIdentity(committed,state.snapshot);const apex=target.hostnames.find(x=>x.hostname===state.snapshot.domain.hostname);
    if(!['cloudflare','cloudflare-custom-hostnames'].includes(committed.domain.provider)||committed.domain.provider_hostname_id!==apex.id)throw fail('COMMITTED_PROVIDER_MISMATCH');
    await save({phase:'cutover_complete',target,proof,committed});uncertain=false;return publicState(state);
   }
   if(state.phase==='rolled_back')return publicState(state);
   if(!['prepared','cutover_complete'].includes(state.phase))throw fail('INVALID_ROLLBACK_PHASE');
   await guard();const expected=state.phase==='cutover_complete'?state.committed:state.snapshot;await records.assertUnchanged(copy(expected),identity);
   await effect('restoring_source',()=>provider.restoreSource(copy(state)));
   const readiness=await provider.sourceReady(copy(state));if(readiness?.configured!==true||readiness.certificatesReady!==true)throw fail('SOURCE_RESTORE_NOT_READY');
   await effect('removing_owned_stage',()=>provider.removeOwnedStage(copy(state)));
   const proof=copy(await provider.verifySource(copy(state)));proofValid(proof,state,now());
   await guard();await records.assertUnchanged(copy(expected),identity);
   const restored=copy(await effect('restoring_record',()=>records.rollback({identity:copy(identity),expected:copy(expected),snapshot:copy(state.snapshot),sourceProof:proof})));
   retainedIdentity(restored,state.snapshot);
   if(restored.domain.provider!==state.snapshot.domain.provider||restored.domain.provider_hostname_id!==state.snapshot.domain.provider_hostname_id)throw fail('RESTORED_PROVIDER_MISMATCH');
   await save({phase:'rolled_back',restored,rollbackProof:proof});uncertain=false;return publicState(state);
  }catch(error){
   if(uncertain){try{await save({phase:'needs_recovery',failedStep:step,failureCode:typeof error?.code==='string'?error.code:'OPERATION_OUTCOME_UNKNOWN'});}catch{}throw Object.assign(fail('MIGRATION_OUTCOME_REQUIRES_RECONCILIATION'),{failedStep:step,cause:error});}
   throw error;
  }finally{if(!uncertain)await journal.release(lock,identity);}
 }};
}
