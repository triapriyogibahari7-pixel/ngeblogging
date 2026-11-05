import worker from './worker-v70.mjs';
import {domainRecoveryResponse} from '../server/domain-recovery-router.mjs';
export default {...worker,async fetch(request,env,context){
 const response=await domainRecoveryResponse(request,env);
 return response||worker.fetch(request,env,context);
}};
