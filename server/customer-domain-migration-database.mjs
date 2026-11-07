import {createMigrationCloudflareClient} from './customer-domain-migration-cloudflare-client.mjs';
const fail=code=>Object.assign(Error(code),{code});
export function createMigrationDatabase({url,key,identity,fetchImpl=globalThis.fetch}={}){
 if(url!=='https://polvmlrhqoiflumibfqs.supabase.co'||!key||!identity)throw fail('MIGRATION_STORAGE_NOT_CONFIGURED');
 identity=structuredClone(identity);
 let held=null;const pending=new Map();
 const post=async(name,args)=>{const r=await fetchImpl(url+'/rest/v1/rpc/'+name,{method:'POST',redirect:'error',headers:{apikey:key,authorization:'Bearer '+key,'content-type':'application/json'},body:JSON.stringify(args)});let data;try{data=await r.json();}catch{throw fail('DATABASE_OUTCOME_UNKNOWN');}if(!r.ok){const msg=data?.message;throw fail(/^[A-Z_]+$/.test(msg||'')?msg:'MIGRATION_DATABASE_UNAVAILABLE');}return data;};
 const rpc=(op,payload={},who=identity)=>post('domain_migration_rpc',{p_op:op,p_identity:who,p_payload:{...payload,...(held||{})}});
 const contextValid=context=>context?.siteId===identity.siteId&&context?.migrationId===identity.migrationId&&typeof context?.operationId==='string'&&/^[a-zA-Z0-9_.:-]{1,200}$/.test(context.operationId);
 const checkpoint=(stage,operationId,request,result)=>post('domain_migration_provider_checkpoint',{p_identity:identity,p_fence:held.fence,p_operation_id:operationId,p_stage:stage,p_request:request,p_result:result??null});
 return {authorize:who=>rpc('authorize',{},who),journal:{
  acquire:async who=>{if(held||pending.size)throw fail('MIGRATION_BUSY');held=await rpc('acquire',{},who);return held;},
  assertHeld:async(lock,who)=>{if(!lock?.fence||held?.fence!==lock.fence)throw fail('MIGRATION_LOCK_LOST');return rpc('assertHeld',{},who);},
  read:who=>rpc('read',{},who),
  write:(state,lock,expectedVersion)=>{if(!lock?.fence||held?.fence!==lock.fence)throw fail('MIGRATION_LOCK_LOST');return rpc('write',{state,expectedVersion});},
  release:async(lock,who)=>{if(!lock?.fence||held?.fence!==lock.fence)throw fail('MIGRATION_LOCK_LOST');if(pending.size)throw fail('PROVIDER_OPERATION_RECONCILIATION_REQUIRED');await rpc('release',{},who);held=null;}
 },records:{
  read:who=>rpc('read_record',{},who),
  assertUnchanged:(expected,who)=>rpc('assertUnchanged',{expected},who),
  commit:({identity:who,...payload})=>rpc('commit',payload,who),
  rollback:({identity:who,...payload})=>rpc('rollback',payload,who)
 },cloudflareClient:({token,zoneId,fetchImpl:providerFetch=globalThis.fetch})=>createMigrationCloudflareClient({token,zoneId,fetchImpl:providerFetch,
  beforeWrite:async({method,suffix,body,context})=>{
   if(!held?.fence)throw fail('MIGRATION_LOCK_LOST');
   if(!contextValid(context))throw fail('MIGRATION_NOT_IN_SCOPE');
   if(pending.size)throw fail('PROVIDER_OPERATION_RECONCILIATION_REQUIRED');
   const request=structuredClone({method,suffix,body:body??null}),entry={request,reserved:false};pending.set(context.operationId,entry);
   const receipt=await checkpoint('reserve',context.operationId,request);
   if(receipt?.reserved!==true||receipt.operationId!==context.operationId)throw fail('PROVIDER_CHECKPOINT_RESULT_MISMATCH');entry.reserved=true;
  },
  afterWrite:async({context,result})=>{
   if(!held?.fence||!contextValid(context))throw fail('MIGRATION_LOCK_LOST');
   const entry=pending.get(context.operationId);if(!entry?.reserved)throw fail('PROVIDER_INTENT_REQUIRED');
   const receipt=await checkpoint('settle',context.operationId,entry.request,{result});
   if(receipt?.settled!==true||receipt.operationId!==context.operationId)throw fail('PROVIDER_CHECKPOINT_RESULT_MISMATCH');pending.delete(context.operationId);
  }
 })};
}
