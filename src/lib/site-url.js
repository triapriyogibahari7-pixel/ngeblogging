export const CANONICAL_SITE_URL = "https://ngeblogging.com";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function parseUrl(value) {
  try {
    return value ? new URL(value) : null;
  } catch {
    return null;
  }
}

function isLocal(url) {
  return Boolean(url && LOCAL_HOSTS.has(url.hostname));
}

function isSecurePublic(url) {
  return Boolean(url && url.protocol === "https:" && !isLocal(url));
}

export function resolveSiteOrigin(configuredSiteUrl = "", currentOrigin = "") {
  const configured = parseUrl(String(configuredSiteUrl).trim());
  const current = parseUrl(currentOrigin);

  if (isLocal(current)) return (configured || current).origin;
  if (isSecurePublic(current)) return current.origin;
  if (configured && !isLocal(configured)) return configured.origin;
  return CANONICAL_SITE_URL;
}

export function createAppUrl(path = "/", configuredSiteUrl = "", currentOrigin = "") {
  return new URL(path, resolveSiteOrigin(configuredSiteUrl, currentOrigin)).toString();
}
