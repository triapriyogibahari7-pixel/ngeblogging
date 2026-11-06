import {createDomainRecoveryDispatcher} from './domain-recovery-route-dispatch.mjs';
import {domainOrderRecoveryAcceptResponse} from './domain-order-recovery-accept-handler-v2.mjs';
import {domainOrderRecoveryQuoteResponse} from './domain-order-recovery-quote-handler.mjs';
import {createWorkerRedirectSafeFetch} from './domain-worker-fetch.mjs';
import {domainGatewayReconcileResponse} from './domain-gateway-reconcile-handler.mjs';
import {domainReconciliationResponse} from './domain-reconciliation-stage3.mjs';
import {domainPublicDnsResponse} from './domain-public-dns-response.mjs';
const fetchImpl=createWorkerRedirectSafeFetch();
const recovery=createDomainRecoveryDispatcher({quoteHandler:domainOrderRecoveryQuoteResponse,acceptHandler:domainOrderRecoveryAcceptResponse,fetchImpl});
export async function domainRecoveryResponse(request,env){
 const dns=await domainPublicDnsResponse(request);if(dns)return dns;
 if(new URL(request.url).pathname==='/api/domains/reconcile'){
  const fullZone=String(env.CUSTOM_DOMAIN_PROVIDER||'').trim().toLowerCase()==='cloudflare-worker-custom-domain-v172';
  const runtime=fullZone?{...env,CUSTOM_DOMAIN_PROVIDER:'cloudflare-full-zone',CLOUDFLARE_API_TOKEN:env.CLOUDFLARE_DOMAIN_API_TOKEN||env.CLOUDFLARE_API_TOKEN,CLOUDFLARE_WORKER_SERVICE:'ngeblogging-custom-domains'}:env;
  return domainReconciliationResponse(request,runtime);
 }
 const reconciled=await domainGatewayReconcileResponse(request,env,{fetchImpl});
 return reconciled||recovery(request,env);
}
