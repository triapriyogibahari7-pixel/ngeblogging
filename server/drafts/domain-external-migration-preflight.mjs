// Preflight candidate only: never executes DNS, registrar or provider writes.
export function planExternalMigration(input) {
  const stop = code => ({state: 'blocked', code, executed: false});
  if (!input || input.ownershipVerified !== true) return stop('OWNERSHIP_REQUIRED');
  if (!input.targetSiteId || input.targetReady !== true) return stop('TARGET_NOT_READY');
  if (input.snapshotReviewed !== true) return stop('DNS_SNAPSHOT_REVIEW_REQUIRED');
  const caps = input.capabilities || {};
  const base = {executed: false, requiresApproval: true, targetSiteId: input.targetSiteId, preserveUnrelatedRecords: true, registrarTransferRequired: false};
  if (input.mode === 'full-zone') {
    if (input.delegationReady === true) return {...base, state: caps.zoneWrite === true ? 'automatic-after-approval' : 'manual', method: caps.zoneWrite === true ? 'zone-api' : 'zone-records'};
    if (input.dnssecReviewed !== true) return stop('DNSSEC_REVIEW_REQUIRED');
    const ns = input.assignedNameservers;
    if (!Array.isArray(ns) || ns.length < 2 || new Set(ns).size !== ns.length || ns.some(value => typeof value !== 'string' || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(value))) return stop('PROVIDER_NAMESERVERS_REQUIRED');
    const automatic = caps.zoneWrite === true && caps.registrarNameserverWrite === true;
    return {...base, state: automatic ? 'automatic-after-approval' : 'manual', method: automatic ? 'zone-and-registrar-api' : 'nameservers', assignedNameservers: [...ns]};
  }
  if (input.mode === 'saas') {
    if (caps.saasReady !== true) return stop('SAAS_NOT_ENABLED');
    if (caps.dnsWrite === true) return {...base, state: 'automatic-after-approval', method: 'dns-api'};
    if (caps.domainConnect === true && caps.templateApproved === true) return {...base, state: 'automatic-after-approval', method: 'domain-connect', ownerAuthorizationRequired: true};
    return {...base, state: 'manual', method: 'provider-dns-records'};
  }
  return stop('UNSUPPORTED_PROVIDER_MODE');
}
export function acceptsRoutingEvidence({expectedSiteId, observedSiteId, dnsMatches, httpsReady}) {
  return typeof expectedSiteId === 'string' && expectedSiteId.length > 0 && expectedSiteId === observedSiteId && dnsMatches === true && httpsReady === true;
}
