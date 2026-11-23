import {
 domainConnectionPaidRefreshResponse as refreshPaidConnection,
 paidConnectionTenantProofResponse as respondPaidConnectionProof,
} from './domain-connection-paid-refresh.mjs';

// Only the paid connection handlers receive this copy.
// Never enable or replace the legacy Full Zone proof bindings globally.
export function paidConnectionProofEnvironment(env={}){
 return {
  ...env,
  CUSTOM_DOMAIN_PROOF_ENABLED:env.DOMAIN_CONNECTION_PROOF_ENABLED==='true'?'true':'false',
  CUSTOM_DOMAIN_PROOF_SECRET:env.DOMAIN_CONNECTION_PROOF_SECRET,
 };
}

export function domainConnectionPaidRefreshResponse(request,env){
 return refreshPaidConnection(request,paidConnectionProofEnvironment(env));
}

export function paidConnectionTenantProofResponse(request,env){
 return respondPaidConnectionProof(request,paidConnectionProofEnvironment(env));
}
