export const PROVIDER = 'ngeblogging-full-zone';
export const TARGET_NAMESERVERS = Object.freeze(['ns1.ngeblogging.com', 'ns2.ngeblogging.com']);
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function invalid(code) { return Object.assign(new Error(code), {code, status:400}); }
export function normalizeZoneName(value) {
  if (typeof value !== 'string') throw invalid('INVALID_HOSTNAME');
  const name = value.trim().toLowerCase().replace(/\.$/, '');
  if (name.length > 253 || !name.includes('.') || !/[a-z]/.test(name.split('.').at(-1)) || name.split('.').some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) throw invalid('INVALID_HOSTNAME');
  if (name === 'ngeblogging.com' || name.endsWith('.ngeblogging.com')) throw invalid('PLATFORM_DOMAIN_RESERVED');
  if (/(?:^|\.)(?:localhost|local|internal|test|invalid|example)$/.test(name)) throw invalid('NON_PUBLIC_HOSTNAME');
  return name;
}
export class NgebloggingFullZoneFoundation {
  checkCapabilities() {
    return {provider:PROVIDER, stage:'foundation-only', configurationReady:false, providerApiVerified:false, authoritativeDnsVerified:false, gatewayVerified:false, productionReady:false, instructionsAllowed:false, assignedNameservers:[], blockers:['AUTHORITATIVE_DNS_NOT_INTEGRATED','ZONE_STORAGE_NOT_INTEGRATED','OWNERSHIP_VERIFICATION_NOT_INTEGRATED','HTTPS_GATEWAY_NOT_INTEGRATED','RUNTIME_ROUTER_NOT_INTEGRATED']};
  }
  planConnection(input) {
    if (!input || !UUID.test(input.siteId || '')) throw invalid('INVALID_SITE');
    const hostname = normalizeZoneName(input.hostname);
    return {provider:PROVIDER, siteId:input.siteId, hostname, status:'blocked', sideEffects:false, requiresAuthorization:true, requiresOwnershipProof:true, targetNameservers:[...TARGET_NAMESERVERS], assignedNameservers:[], instructionsAllowed:false, nextAction:'complete_server_integration', capabilities:this.checkCapabilities()};
  }
}
