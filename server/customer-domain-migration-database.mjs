const fail=code=>Object.assign(Error(code),{code});
export function createMigrationDatabase({url,key,identity,fetchImpl=globalThis.fetch}={}){
 if(url!=='https://polvmlrhqoiflumibfqs.supabase.co'||!key||!identity)throw fail('MIGRATION_STORAGE_NOT_CONFIGURED');
 let held=null;
 const rpc=async(op,payload={},who=identity)=>{const r=await fetchImpl(url+'/rest/v1/rpc/domain_migration_rpc',{method:'POST',redirect:'error',headers:{apikey:key,authorization:'Bearer '+key,'content-type':'application/json'},body:JSON.stringify({p_op:op,p_identity:who,p_payload:{...payload,...(held||{})}})});let data;try{data=await r.json();}catch{throw fail('DATABASE_OUTCOME_UNKNOWN');}if(!r.ok){const msg=data?.message;throw fail(/^[A-Z_]+$/.test(msg||'')?msg:'MIGRATION_DATABASE_UNAVAILABLE');}return data;};
 return {authorize:who=>rpc('authorize',{},who),journal:{
  acquire:async who=>{held=await rpc('acquire',{},who);return held;},
  assertHeld:async(lock,who)=>{if(!lock?.fence||held?.fence!==lock.fence)throw fail('MIGRATION_LOCK_LOST');return rpc('assertHeld',{},who);},
  read:who=>rpc('read',{},who),
  write:(state,lock,expectedVersion)=>{if(!lock?.fence||held?.fence!==lock.fence)throw fail('MIGRATION_LOCK_LOST');return rpc('write',{state,expectedVersion});},
  release:async(lock,who)=>{if(!lock?.fence||held?.fence!==lock.fence)throw fail('MIGRATION_LOCK_LOST');await rpc('release',{},who);held=null;}
 },records:{
  read:who=>rpc('read_record',{},who),
  assertUnchanged:(expected,who)=>rpc('assertUnchanged',{expected},who),
  commit:({identity:who,...payload})=>rpc('commit',payload,who),
  rollback:({identity:who,...payload})=>rpc('rollback',payload,who)
 }};
}
