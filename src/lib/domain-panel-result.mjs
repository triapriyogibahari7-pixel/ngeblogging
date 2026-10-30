export function assignedNameservers(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter(value => typeof value === 'string').map(value => value.trim().toLowerCase().replace(/\.$/, '')).filter(value => value.length <= 253 && value.includes('.') && value.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))))];
}
export function applyDomainInstructions(result, siteId) {
  const domain = result?.domain;
  if (!domain || domain.site_id !== siteId) return result;
  const provided = assignedNameservers(result.instructions?.nameServers);
  const stored = assignedNameservers(domain.ownership_verification?.required_name_servers);
  const values = provided.length >= 2 ? provided : stored;
  return {...result, domain: {...domain, ownership_verification: {...(domain.ownership_verification || {}), required_name_servers: values}}};
}
export function domainRowsForSite(siteId, acceptedDomain, rows = []) {
  const seen = new Set();
  return [acceptedDomain, ...rows].filter(row => {
    if (!row || row.site_id !== siteId || !row.id) return false;
    const hostname = String(row.hostname || '').trim().toLowerCase();
    if (!hostname || hostname === 'ngeblogging.com' || hostname.endsWith('.ngeblogging.com') || seen.has(hostname)) return false;
    seen.add(hostname);
    return true;
  });
}
