const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i,ORDER=/^DOM-[a-f0-9]{40}$/,HASH=/^[a-f0-9]{64}$/;
const uuid=value=>typeof value==='string'&&UUID.test(value);
const domain=value=>typeof value==='string'&&value!=='ngeblogging.com'&&value.split('.').length===2&&value.split('.').every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
export function parseInstallationClaim(value,{orderId,userId,siteId,domain:hostname}={}){
 const fail=()=>{throw Error('INSTALLATION_CLAIM_UNVERIFIED');};
 if(typeof orderId!=='string'||!ORDER.test(orderId)||!uuid(userId)||!uuid(siteId)||!domain(hostname))fail();
 if(!value||value.ok!==true||value.order_id!==orderId||value.user_id!==userId.toLowerCase()||value.site_id!==siteId.toLowerCase()||value.domain!==hostname||value.environment!=='production'||!uuid(value.claim_id)||!uuid(value.registration_attempt_id)||typeof value.registration_evidence_sha256!=='string'||!HASH.test(value.registration_evidence_sha256)||value.claim_recorded!==true||typeof value.new_claim!=='boolean'||value.reconciliation_only!==!value.new_claim||!['claimed','review_required','installed'].includes(value.state)||(value.new_claim&&value.state!=='claimed')||value.provider_mutation_allowed!==false||value.installation_action_taken!==false||value.installation_confirmed!==false)fail();
 return Object.freeze({orderId,userId:userId.toLowerCase(),siteId:siteId.toLowerCase(),domain:hostname,claimId:value.claim_id,registrationAttemptId:value.registration_attempt_id,registrationEvidenceSha256:value.registration_evidence_sha256,state:value.state,newClaim:value.new_claim,reconciliationOnly:value.reconciliation_only,providerMutationAllowed:false,installationActionTaken:false,installationConfirmed:false});
}
