export const ROOT_DOMAIN = "ngeblogging.com";

const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "studio",
  "assets",
  "cdn",
  "mail",
  "support",
  "status",
  "docs",
  "blog",
]);

export function normalizeSiteSlug(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

export function validateSiteSlug(value = "") {
  const slug = normalizeSiteSlug(value);
  if (slug.length < 3) return { valid: false, slug, reason: "Minimal 3 karakter." };
  if (slug.length > 63) return { valid: false, slug, reason: "Maksimal 63 karakter." };
  if (RESERVED_SUBDOMAINS.has(slug)) return { valid: false, slug, reason: "Nama ini digunakan oleh sistem." };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { valid: false, slug, reason: "Gunakan huruf kecil, angka, dan tanda hubung." };
  }
  return { valid: true, slug, reason: "Tersedia untuk diperiksa." };
}

export function getTenantSlug(hostname = "", rootDomain = ROOT_DOMAIN) {
  const host = String(hostname).trim().toLowerCase().split(":")[0];
  const root = String(rootDomain).trim().toLowerCase();

  if (!host || !root || host === root || host === `www.${root}`) return null;
  if (host.endsWith(`.${root}`)) {
    const candidate = host.slice(0, -(root.length + 1));
    if (!candidate || candidate.includes(".")) return null;
    return validateSiteSlug(candidate).valid ? candidate : null;
  }

  const localMatch = host.match(/^([a-z0-9-]+)\.(?:localhost|127\.0\.0\.1)$/);
  return localMatch && validateSiteSlug(localMatch[1]).valid ? localMatch[1] : null;
}

export function buildSiteUrl(slug, rootDomain = ROOT_DOMAIN, protocol = "https:") {
  const result = validateSiteSlug(slug);
  if (!result.valid) return "";
  return `${protocol}//${result.slug}.${rootDomain}`;
}

export function isPlatformHost(hostname = "", rootDomain = ROOT_DOMAIN) {
  const host = String(hostname).trim().toLowerCase().split(":")[0];
  return host === rootDomain || host === `www.${rootDomain}` || host === "localhost" || host === "127.0.0.1";
}
