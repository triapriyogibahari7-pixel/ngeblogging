import worker from './worker-v70.mjs';
import {domainRecoveryResponse} from '../server/domain-recovery-router.mjs';
import {DOMAIN_MANAGEMENT_CRON,runDomainManagementSchedule} from '../server/domain-management-scheduler.mjs';
import {isDomainDeadlineRequest,withDomainDeadline} from '../server/domain-api-deadline.mjs';

export default {...worker,async fetch(request,env,context){
 if(isDomainDeadlineRequest(request))return withDomainDeadline(request,env,context,()=>worker.fetch(request,env,context));
 const response=await domainRecoveryResponse(request,env);
 return response||worker.fetch(request,env,context);
},async scheduled(event,env,context){
 // This dedicated cron must not dispatch registration or purchasing jobs.
 if(event.cron===DOMAIN_MANAGEMENT_CRON){
  context.waitUntil(runDomainManagementSchedule(env).then(result=>{if(result.ok!==true)throw Error('DOMAIN_MANAGEMENT_SCHEDULE_FAILED');}));
  return;
 }
 if(typeof worker.scheduled==='function')return worker.scheduled(event,env,context);
}};
