import worker from './worker-v70.mjs';
import {domainOrderRecoveryAcceptResponse} from '../server/domain-order-recovery-accept-handler-v2.mjs';
import {domainOrderRecoveryQuoteResponse} from '../server/domain-order-recovery-quote-handler.mjs';
import {createWorkerRedirectSafeFetch} from '../server/domain-worker-fetch.mjs';
const transport=createWorkerRedirectSafeFetch();
export default {...worker,async fetch(request,env,context){
 const path=new URL(request.url).pathname;
 if(path==='/api/commerce/domains/order-recovery-accept')return domainOrderRecoveryAcceptResponse(request,env,{fetchImpl:transport});
 if(path==='/api/commerce/domains/order-recovery-quote'&&env?.DOMAIN_ORDER_RECOVERY_ENABLED==='true')return domainOrderRecoveryQuoteResponse(request,env,{fetchImpl:transport});
 return worker.fetch(request,env,context);
}};
