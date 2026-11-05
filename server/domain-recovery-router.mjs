import {createDomainRecoveryDispatcher} from './domain-recovery-route-dispatch.mjs';
import {domainOrderRecoveryAcceptResponse} from './domain-order-recovery-accept-handler-v2.mjs';
import {domainOrderRecoveryQuoteResponse} from './domain-order-recovery-quote-handler.mjs';
import {createWorkerRedirectSafeFetch} from './domain-worker-fetch.mjs';
export const domainRecoveryResponse=createDomainRecoveryDispatcher({quoteHandler:domainOrderRecoveryQuoteResponse,acceptHandler:domainOrderRecoveryAcceptResponse,fetchImpl:createWorkerRedirectSafeFetch()});
