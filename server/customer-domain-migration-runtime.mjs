import {createMigrationRouter} from './customer-domain-migration-router.mjs';
import {createMigrationDatabase} from './customer-domain-migration-database.mjs';
const DB='https://polvmlrhqoiflumibfqs.supabase.co';
const fail=code=>Object.assign(Error(code),{code});
export function createMigrationRuntime({fetchImpl=globalThis.fetch}={}){
 return createMigrationRouter({
  authenticate:async(request,env)=>{const key=env.SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_ANON_KEY;if(!key)throw fail('MIGRATION_AUTH_NOT_CONFIGURED');const r=await fetchImpl(DB+'/auth/v1/user',{redirect:'error',signal:AbortSignal.timeout(10000),headers:{apikey:key,authorization:request.headers.get('authorization')}});if(r.status===401||r.status===403)return null;if(!r.ok)throw fail('MIGRATION_AUTH_UNAVAILABLE');return r.json();},
  executorForRequest:async({env,actor})=>({execute:async input=>{
   const identity={actorId:actor.id,siteId:input.siteId,domainId:input.domainId,migrationId:input.migrationId,action:input.action};
   const db=createMigrationDatabase({url:DB,key:env.SUPABASE_SERVICE_ROLE_KEY,identity,fetchImpl});
   await db.authorize(identity);
   if(input.action!=='status')throw fail('MIGRATION_PROVIDER_ADAPTER_NOT_READY');
   const state=await db.journal.read(identity);if(!state)return null;
   return {migrationId:state.migrationId,domainId:state.domainId,siteId:state.siteId,hostname:state.snapshot?.domain?.hostname,phase:state.phase,version:state.version,failedStep:state.failedStep||null,recoveryRequired:state.phase==='needs_recovery',productionActivationCertified:false};
  }})
 });
}
export const domainMigrationResponse=createMigrationRuntime();
