import {runDomainConnectionCredentialProbe} from './domain-connection-credential-probe.mjs';
import {createWorkerRedirectSafeFetch} from './domain-worker-fetch.mjs';
// Internal adapter only: no HTTP route, activation, or mutations.
export function runWorkerDomainConnectionCredentialProbe(request,env={}, {
 fetchImpl=(...args)=>globalThis.fetch(...args),referenceOrderId,timeoutMs=5000,
}={}){
 return runDomainConnectionCredentialProbe(request,env,{
  fetchImpl:createWorkerRedirectSafeFetch(fetchImpl),referenceOrderId,timeoutMs,
 });
}
