import {createDomainRecoveryDispatcher} from './domain-recovery-route-dispatch.mjs';
import {domainOrderRecoveryAcceptResponse} from './domain-order-recovery-accept-handler-v2.mjs';
import {domainOrderRecoveryQuoteResponse} from './domain-order-recovery-quote-handler.mjs';
import {createWorkerRedirectSafeFetch} from './domain-worker-fetch.mjs';
import {domainGatewayReconcileResponse} from './domain-gateway-reconcile-handler.mjs';
const fetchImpl=createWorkerRedirectSafeFetch();
const recovery=createDomainRecoveryDispatcher({quoteHandler:domainOrderRecoveryQuoteResponse,acceptHandler:domainOrderRecoveryAcceptResponse,fetchImpl});
export async function domainRecoveryResponse(request,env){
 const reconciled=await domainGatewayReconcileResponse(request,env,{fetchImpl});
 return reconciled||recovery(request,env);
}
