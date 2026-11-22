import worker from './worker-nara-owner-connectors.mjs';
import {domainRecoveryResponse} from '../server/domain-recovery-router.mjs';
import {DOMAIN_MANAGEMENT_CRON,runDomainManagementSchedule} from '../server/domain-management-scheduler.mjs';
import {isDomainDeadlineRequest,withDomainDeadline} from '../server/domain-api-deadline.mjs';
import {domainReconciliationResponse} from '../server/domain-reconciliation-stage3.mjs';
import {domainRuntimeEnvironment} from '../server/domain-runtime-environment.mjs';
import {domainPendingRecheckResponse} from '../server/domain-pending-recheck-handler.mjs';
import {handleDomainRequest} from '../server/domain-handler.mjs';
import {createCustomerDomainRouter} from '../server/customer-domain-connection-router.mjs';
import {normalizeDomainManagementResponse} from '../shared/customer-domain-management-view.mjs';
import {domainMigrationResponse} from '../server/customer-domain-migration-runtime.mjs';
import {migrationRouteProofResponse} from '../server/customer-domain-migration-live-proof.mjs';

import {domainConnectionPaymentInstallationResponse} from '../server/domain-connection-payment-installation.mjs';
import {domainConnectionPaidRefreshResponse,paidConnectionTenantProofResponse} from '../server/domain-connection-paid-refresh.mjs';
import {withPaidConnectionAccess} from '../server/domain-connection-serving-guard.mjs';

const customerDomainRouter=createCustomerDomainRouter({legacyHandler:handleDomainRequest});

async function routeRequest(request,env,context){
 const paidRefresh=await domainConnectionPaidRefreshResponse(request,env);
 if(paidRefresh)return paidRefresh;
 const annualConnection=await domainConnectionPaymentInstallationResponse(request,env,context);
 if(annualConnection)return annualConnection;
 const runtimeEnv=domainRuntimeEnvironment(env);
 const routeProof=await migrationRouteProofResponse(request,runtimeEnv);
 if(routeProof)return routeProof;
 const finalize=response=>normalizeDomainManagementResponse(request,response);
 const migration=await domainMigrationResponse(request,runtimeEnv);
 if(migration)return migration;
 const customerConnection=await customerDomainRouter(request,runtimeEnv);
 if(customerConnection)return finalize(customerConnection);
 const pendingRecheck=await domainPendingRecheckResponse(request,runtimeEnv);
 if(pendingRecheck)return finalize(pendingRecheck);
 const reconciliation=await domainReconciliationResponse(request,runtimeEnv);
 if(reconciliation)return finalize(reconciliation);
 if(isDomainDeadlineRequest(request))return finalize(await withDomainDeadline(request,runtimeEnv,context,()=>worker.fetch(request,runtimeEnv,context)));
 const response=await domainRecoveryResponse(request,runtimeEnv);
 return finalize(response||await worker.fetch(request,runtimeEnv,context));
}

export default {...worker,async fetch(request,env,context){
 // Signed setup proof has its own entitlement and site checks and must work
 // while a newly bound hostname is still verifying. Invalid proof falls through.
 const paidProof=await paidConnectionTenantProofResponse(request,env);
 if(paidProof)return paidProof;
 return withPaidConnectionAccess(request,env,()=>routeRequest(request,env,context));
},async scheduled(event,env,context){
 const runtimeEnv=domainRuntimeEnvironment(env);
 // This dedicated cron must not dispatch registration or purchasing jobs.
 if(event.cron===DOMAIN_MANAGEMENT_CRON){
  context.waitUntil(runDomainManagementSchedule(runtimeEnv).then(result=>{if(result.ok!==true)throw Error('DOMAIN_MANAGEMENT_SCHEDULE_FAILED');}));
  return;
 }
 if(typeof worker.scheduled==='function')return worker.scheduled(event,runtimeEnv,context);
}};
