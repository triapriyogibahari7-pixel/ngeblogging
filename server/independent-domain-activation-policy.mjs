// Internal policy only: evidence must come from authenticated backend probes, never a client body.
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function validCustomerHostname(host) {
  return typeof host === 'string' && host.length <= 253 && host === host.toLowerCase()
    && host.includes('.') && /^[a-z]{2,63}$/.test(host.split('.').at(-1))
    && host.split('.').every(x => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(x))
    && host !== 'ngeblogging.com' && !host.endsWith('.ngeblogging.com');
}
export function evaluateIndependentActivation({hostname, siteId, gatewayReady, evidence, nowMs, attempt = 0} = {}) {
  if (!validCustomerHostname(hostname) || !UUID.test(siteId || '') || !Number.isSafeInteger(nowMs) || nowMs < 0
      || !Number.isSafeInteger(attempt) || attempt < 0) throw new TypeError('INVALID_ACTIVATION_INPUT');
  const result = (outcome, reason) => ({outcome, reason, hostname, siteId,
    nextAttemptAtMs: outcome === 'retry' ? nowMs + Math.min(3600000, 30000 * 2 ** Math.min(attempt, 7)) : null});
  if (gatewayReady !== true) return result('blocked', 'GATEWAY_NOT_READY');
  if (attempt >= 20) return result('blocked', 'RETRY_BUDGET_EXHAUSTED');
  if (!evidence || evidence.hostname !== hostname || evidence.siteId !== siteId) return result('blocked', 'EVIDENCE_SCOPE_MISMATCH');
  if (evidence.domainConflict === true) return result('blocked', 'DOMAIN_CONFLICT');
  if (!Number.isSafeInteger(evidence.checkedAtMs) || evidence.checkedAtMs > nowMs
      || nowMs - evidence.checkedAtMs > 300000) return result('retry', 'FRESH_PROBE_REQUIRED');
  if (evidence.ownershipVerified !== true) return result('retry', 'OWNERSHIP_PENDING');
  if (evidence.dnsToGateway !== true) return result('retry', 'DNS_PENDING');
  if (evidence.tlsTrusted !== true || evidence.tlsHostname !== hostname
      || !Number.isSafeInteger(evidence.tlsExpiresAtMs) || evidence.tlsExpiresAtMs <= nowMs) return result('retry', 'TLS_PENDING');
  if (evidence.httpStatus !== 200) return result('retry', 'HTTP_NOT_READY');
  let final;
  try { final = new URL(evidence.finalUrl); } catch { return result('blocked', 'INVALID_FINAL_URL'); }
  if (final.protocol !== 'https:' || final.hostname !== hostname || final.username || final.password
      || (final.port && final.port !== '443')) return result('blocked', 'PUBLIC_ORIGIN_MISMATCH');
  if (evidence.renderedSiteId !== siteId || evidence.tenantProofVerified !== true) return result('blocked', 'TENANT_PROOF_MISMATCH');
  return result('complete', 'READY_FOR_PERSISTENCE');
}
