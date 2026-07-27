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

  const slug = managedSlug(url.hostname);
  if (!slug) return null;

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
    `site_domains?select=id,hostname,status,provider_status,ssl_status&site_id=eq.${encodeURIComponent(site.id)}&hostname=eq.${encodeURIComponent(customHostname)}&status=eq.active&limit=1`,
  );
  const domain = domains?.[0] || null;
  if (!domain || validCustomHostname(domain.hostname) !== customHostname) return null;

  const target = new URL(request.url);
  target.protocol = "https:";
  target.hostname = customHostname;
  target.port = "";
  target.searchParams.delete("ngeblogging-free-preview");

  const headers = new Headers({
    location: target.toString(),
    "cache-control": "public, max-age=60, s-maxage=300",
    "x-ngeblogging-canonical-domain": customHostname,
    "x-content-type-options": "nosniff",
  });

  return new Response(null, {
    status: 308,
    headers,
  });
}
