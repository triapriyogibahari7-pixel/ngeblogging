import worker from './worker-v70.mjs';
import {domainRecoveryResponse} from '../server/domain-recovery-router.mjs';
import {DOMAIN_MANAGEMENT_CRON,runDomainManagementSchedule} from '../server/domain-management-scheduler.mjs';
import {isDomainDeadlineRequest,withDomainDeadline} from '../server/domain-api-deadline.mjs';
import {domainReconciliationResponse} from '../server/domain-reconciliation-stage3.mjs';
import {domainRuntimeEnvironment} from '../server/domain-runtime-environment.mjs';
import {domainPendingRecheckResponse} from '../server/domain-pending-recheck-handler.mjs';

export default {...worker,async fetch(request,env,context){
 const runtimeEnv=domainRuntimeEnvironment(env);
 const pendingRecheck=await domainPendingRecheckResponse(request,runtimeEnv);
 if(pendingRecheck)return pendingRecheck;
 const reconciliation=await domainReconciliationResponse(request,runtimeEnv);
 if(reconciliation)return reconciliation;
 if(isDomainDeadlineRequest(request))return withDomainDeadline(request,runtimeEnv,context,()=>worker.fetch(request,runtimeEnv,context));
 const response=await domainRecoveryResponse(request,runtimeEnv);
 return response||worker.fetch(request,runtimeEnv,context);
},async scheduled(event,env,context){
 const runtimeEnv=domainRuntimeEnvironment(env);
 // This dedicated cron must not dispatch registration or purchasing jobs.
 if(event.cron===DOMAIN_MANAGEMENT_CRON){
  context.waitUntil(runDomainManagementSchedule(runtimeEnv).then(result=>{if(result.ok!==true)throw Error('DOMAIN_MANAGEMENT_SCHEDULE_FAILED');}));
  return;
 }
 if(typeof worker.scheduled==='function')return worker.scheduled(event,runtimeEnv,context);
}};
