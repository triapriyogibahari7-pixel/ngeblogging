export const MAX_ACCOUNT_SITES = 12;

function text(value) {
  return String(value || "").trim();
}

export function selectActiveSite(sites, preferredId = "", publishedSite = null) {
  const list = Array.isArray(sites) ? sites.filter((site) => site?.id) : [];
  const preferred = text(preferredId);
  const publishedId = text(publishedSite?.id);
  return list.find((site) => site.id === preferred)
    || list.find((site) => site.id === publishedId)
    || list[0]
    || null;
}

function domainRank(domain) {
  const active = domain?.status === "active"
    && domain?.provider_status === "active"
    && domain?.ssl_status === "active";
  const deleting = domain?.status === "pending_deletion";
  return [
    active ? 0 : 1,
    domain?.is_primary ? 0 : 1,
    deleting ? 1 : 0,
    -Date.parse(domain?.created_at || 0),
  ];
}

function compareRank(left, right) {
  const a = domainRank(left);
  const b = domainRank(right);
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return text(left?.hostname).localeCompare(text(right?.hostname));
}

export function canonicalDomainsForSite(domains, siteId) {
  const selectedSiteId = text(siteId);
  if (!selectedSiteId) return [];
  return (Array.isArray(domains) ? domains : [])
    .filter((domain) => text(domain?.site_id) === selectedSiteId)
    .sort(compareRank)
    .slice(0, 1);
}

export function accountCapacity(sites) {
  return Math.min(Array.isArray(sites) ? sites.filter((site) => site?.id).length : 0, MAX_ACCOUNT_SITES);
}
