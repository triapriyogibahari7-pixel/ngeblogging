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
function stateTime(row) {
  return Math.max(...['updated_at', 'last_checked_at'].map(key => {
    const value = Date.parse(row?.[key]);
    return Number.isFinite(value) ? value : 0;
  }));
}
export function domainRowsForSite(siteId, acceptedDomain, rows = []) {
  const selected = new Map();
  const valid = row => {
    if (!row || row.site_id !== siteId || !row.id) return '';
    const hostname = String(row.hostname || '').trim().toLowerCase().replace(/\.$/, '');
    return hostname && hostname !== 'ngeblogging.com' && !hostname.endsWith('.ngeblogging.com') ? hostname : '';
  };
  for (const row of rows) {
    const hostname = valid(row);
    if (!hostname) continue;
    const previous = selected.get(hostname);
    if (!previous || stateTime(row) > stateTime(previous)) selected.set(hostname, row);
  }
  const acceptedHostname = valid(acceptedDomain);
  if (acceptedHostname) {
    selected.delete(acceptedHostname);
    return [acceptedDomain, ...selected.values()];
  }
  return [...selected.values()];
}
