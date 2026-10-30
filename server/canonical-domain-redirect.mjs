const SYSTEM_HOSTS = new Set([
  "ngeblogging.com",
  "www.ngeblogging.com",
  "studio.ngeblogging.com",
  "api.ngeblogging.com",
]);

function config(env) {
  return {
    url: String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").replace(/\/$/, ""),
    key: String(
      env.SUPABASE_PUBLISHABLE_KEY
      || env.VITE_SUPABASE_PUBLISHABLE_KEY
      || env.VITE_SUPABASE_ANON_KEY
      || "",
    ),
  };
}

function managedSlug(hostname) {
  const host = String(hostname || "").trim().toLowerCase().split(":")[0];
  if (!host.endsWith(".ngeblogging.com") || SYSTEM_HOSTS.has(host)) return "";
  const slug = host.slice(0, -".ngeblogging.com".length);
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug) ? slug : "";
}

function validCustomHostname(value) {
  const hostname = String(value || "").trim().toLowerCase().replace(/\.$/, "");
  if (
    hostname.length < 4
    || hostname.length > 253
    || !hostname.includes(".")
    || hostname.includes("..")
    || hostname === "ngeblogging.com"
    || hostname.endsWith(".ngeblogging.com")
    || !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])$/.test(hostname)
  ) return "";
  return hostname;
}

async function rest(env, path) {
  const { url, key } = config(env);
  if (!url || !key) return null;
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      accept: "application/json",
      "cache-control": "no-cache",
    },
  });
  if (!response.ok) return null;
  return response.json().catch(() => null);
}

export async function canonicalDomainRedirect(request, env) {
  if (!["GET", "HEAD"].includes(request.method)) return null;

  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/studio")) return null;

  /* www.<custom-domain> -> <custom-domain> when the apex is the site's active
   * primary custom domain (e.g. www.triapriyogi.com -> triapriyogi.com). */
  const requestHost = url.hostname.toLowerCase();
  if (requestHost.startsWith("www.")) {
    const apex = validCustomHostname(requestHost.slice(4));
    if (apex) {
      const apexDomains = await rest(
        env,
        `site_domains?select=hostname,status,is_primary&hostname=eq.${encodeURIComponent(apex)}&status=eq.active&is_primary=eq.true&limit=1`,
      );
      if (apexDomains?.[0]?.hostname && validCustomHostname(apexDomains[0].hostname) === apex) {
        const target = new URL(request.url);
        target.protocol = "https:";
        target.hostname = apex;
        target.port = "";
        return new Response(null, {
          status: 308,
          headers: {
            location: target.toString(),
            "cache-control": "public, max-age=300, s-maxage=3600",
            "x-ngeblogging-canonical-domain": apex,
            "x-content-type-options": "nosniff",
          },
        });
      }
    }
  }

  const slug = managedSlug(url.hostname);
  if (!slug) return null;

  /* Emergency/direct preview keeps the free address usable without a loop. */
  if (url.searchParams.get("ngeblogging-free-preview") === "1") return null;

  const sites = await rest(
    env,
    `sites?select=id,slug,custom_domain,status,is_public&slug=eq.${encodeURIComponent(slug)}&status=eq.active&is_public=eq.true&limit=1`,
  );
  const site = sites?.[0] || null;
  const customHostname = validCustomHostname(site?.custom_domain);
  if (!site?.id || !customHostname) return null;

  const domains = await rest(
    env,
    `site_domains?select=id,hostname,status,provider_status,ssl_status,is_primary&site_id=eq.${encodeURIComponent(site.id)}&hostname=eq.${encodeURIComponent(customHostname)}&status=eq.active&is_primary=eq.true&limit=1`,
  );
  const domain = domains?.[0] || null;
  const fullyActive = domain
    && validCustomHostname(domain.hostname) === customHostname
    && String(domain.provider_status || "").toLowerCase() === "active"
    && String(domain.ssl_status || "").toLowerCase() === "active"
    && domain.is_primary === true;

  if (!fullyActive) return null;

  const target = new URL(request.url);
  target.protocol = "https:";
  target.hostname = customHostname;
  target.port = "";
  target.searchParams.delete("ngeblogging-free-preview");

  // Default-off policy for movable custom domains; does not invalidate old redirects.
  const reversible = env.REVERSIBLE_FREE_DOMAIN_REDIRECTS === "true";
  const headers = new Headers({
    location: target.toString(),
    "cache-control": reversible ? "no-store, max-age=0" : "public, max-age=60, s-maxage=300",
    "x-ngeblogging-canonical-domain": customHostname,
    "x-ngeblogging-free-domain-fallback": "available-with-preview-parameter",
    "x-content-type-options": "nosniff",
  });

  if (reversible) headers.set("x-ngeblogging-canonical-redirect-policy", "reversible-free-domain");

  return new Response(null, {
    status: reversible ? 307 : 308,
    headers,
  });
}
