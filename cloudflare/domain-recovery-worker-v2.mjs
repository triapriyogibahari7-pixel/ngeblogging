import worker from './worker-v70.mjs';
import {domainRecoveryResponse} from '../server/domain-recovery-router.mjs';
import {DOMAIN_MANAGEMENT_CRON,runDomainManagementSchedule} from '../server/domain-management-scheduler.mjs';
import {isDomainDeadlineRequest,withDomainDeadline} from '../server/domain-api-deadline.mjs';
import {domainReconciliationResponse} from '../server/domain-reconciliation-stage3.mjs';

function domainEnvironment(env) {
 return {...env, CLOUDFLARE_WORKER_SERVICE: 'ngeblogging-custom-domains'};
}

export default {...worker,async fetch(request,env,context){
 const runtimeEnv=domainEnvironment(env);
 const reconciliation=await domainReconciliationResponse(request,runtimeEnv);
 if(reconciliation)return reconciliation;
 if(isDomainDeadlineRequest(request))return withDomainDeadline(request,runtimeEnv,context,()=>worker.fetch(request,runtimeEnv,context));
 const response=await domainRecoveryResponse(request,runtimeEnv);
 return response||worker.fetch(request,runtimeEnv,context);
},async scheduled(event,env,context){
 const runtimeEnv=domainEnvironment(env);
 // This dedicated cron must not dispatch registration or purchasing jobs.
 if(event.cron===DOMAIN_MANAGEMENT_CRON){
  context.waitUntil(runDomainManagementSchedule(runtimeEnv).then(result=>{if(result.ok!==true)throw Error('DOMAIN_MANAGEMENT_SCHEDULE_FAILED');}));
  return;
 }
 if(typeof worker.scheduled==='function')return worker.scheduled(event,runtimeEnv,context);
}};
