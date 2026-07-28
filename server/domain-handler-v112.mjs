import { handleDomainRequest as handleDomainRequestBase } from "./domain-handler.mjs";

const RELEASE = "domain-single-site-audit-v112-20260728";

function response(status, body, requestId = "") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-ngeblogging-domain-authority": RELEASE,
      ...(requestId ? { "x-request-id": requestId } : {}),
    },
  });
}

function bearer(request) {
  const value = request.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

function supabaseConfig(env) {
  return {
    url: String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").replace(/\/$/, ""),
    key: String(env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || ""),
  };
}

function normalizeHostname(value) {
  return String(value || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "").replace(/^www\./, "");
}

function domainRank(domain) {
  const active = domain?.status === "active" && domain?.provider_status === "active" && domain?.ssl_status === "active";
  return [active ? 0 : 1, domain?.is_primary ? 0 : 1, domain?.status === "pending_deletion" ? 1 : 0, -Date.parse(domain?.created_at || 0)];
}

function canonicalDomains(domains, siteId) {
  return (Array.isArray(domains) ? domains : [])
    .filter((domain) => String(domain?.site_id || "") === String(siteId || ""))
    .sort((left, right) => {
      const a = domainRank(left), b = domainRank(right);
      for (let index = 0; index < a.length; index += 1) if (a[index] !== b[index]) return a[index] - b[index];
      return String(left?.hostname || "").localeCompare(String(right?.hostname || ""));
    })
    .slice(0, 1);
}

async function baseList(request, env, requestId, siteId) {
  const url = new URL(request.url);
  url.pathname = "/api/domains/list";
  url.search = `?siteId=${encodeURIComponent(siteId)}`;
  const listRequest = new Request(url, {
    method: "GET",
    headers: {
      authorization: request.headers.get("authorization") || "",
      accept: "application/json",
      "cache-control": "no-cache",
    },
  });
  return handleDomainRequestBase(listRequest, env, requestId);
}

async function readSite(request, env, siteId) {
  const config = supabaseConfig(env);
  const token = bearer(request);
  if (!config.url || !config.key || !token) return null;
  const result = await fetch(`${config.url}/rest/v1/sites?id=eq.${encodeURIComponent(siteId)}&select=id,name,slug,status,is_public&limit=1`, {
    headers: {
      apikey: config.key,
      authorization: `Bearer ${token}`,
      accept: "application/json",
      "cache-control": "no-cache",
    },
    cache: "no-store",
  });
  if (!result.ok) return null;
  const rows = await result.json().catch(() => []);
  return rows?.[0] || null;
}

function additionalAddresses(domain) {
  const rows = domain?.ownership_verification?.additional_hostnames;
  return (Array.isArray(rows) ? rows : [])
    .filter((item) => item?.hostname && item.enabled !== false)
    .map((item) => ({
      label: item.host === "www" ? "Alamat www" : "Alamat tambahan",
      kind: item.host === "www" ? "www" : "additional",
      hostname: String(item.hostname).toLowerCase(),
    }));
}

async function readPrefix(response, maximum = 8192) {
  const reader = response.body?.getReader?.();
  if (!reader) return "";
  let bytes = new Uint8Array(0);
  try {
    while (bytes.length < maximum) {
      const { value, done } = await reader.read();
      if (done || !value) break;
      const length = Math.min(maximum, bytes.length + value.length);
      const next = new Uint8Array(length);
      next.set(bytes);
      next.set(value.subarray(0, length - bytes.length), bytes.length);
      bytes = next;
    }
  } finally {
    try { await reader.cancel(); } catch { /* Best effort. */ }
  }
  return new TextDecoder().decode(bytes);
}

async function auditTarget(target) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const url = new URL(`https://${target.hostname}/`);
    url.searchParams.set("ngeblogging_domain_audit", "v112");
    const result = await fetch(url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: { accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1", "cache-control": "no-cache" },
      cf: { cacheTtl: 0, cacheEverything: false },
    });
    const contentType = String(result.headers.get("content-type") || "").toLowerCase();
    const prefix = await readPrefix(result);
    const html = /<!doctype\s+html|<html[\s>]/i.test(prefix);
    const reachable = result.ok && contentType.includes("text/html") && html;
    return {
      ...target,
      address: target.hostname,
      url: `https://${target.hostname}`,
      reachable,
      https: true,
      httpStatus: result.status,
      contentType,
      finalUrl: result.url || url.href,
      latencyMs: Date.now() - started,
      check: reachable ? "HTML publik berhasil dimuat melalui HTTPS." : "Respons belum memenuhi kontrak halaman HTML publik.",
    };
  } catch (error) {
    return {
      ...target,
      address: target.hostname,
      url: `https://${target.hostname}`,
      reachable: false,
      https: false,
      httpStatus: 0,
      contentType: "",
      finalUrl: "",
      latencyMs: Date.now() - started,
      check: error?.name === "AbortError" ? "Pemeriksaan melewati batas waktu 10 detik." : "Alamat belum dapat dijangkau dari jaringan audit.",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function handleAudit(request, env, requestId) {
  const body = await request.clone().json().catch(() => ({}));
  const siteId = String(body.siteId || "");
  const listResponse = await baseList(request, env, requestId, siteId);
  if (!listResponse.ok) return listResponse;
  const payload = await listResponse.json().catch(() => ({}));
  const domains = canonicalDomains(payload.domains, siteId);
  const domain = domains[0] || null;
  const site = await readSite(request, env, siteId);
  if (!site?.id || !site?.slug) return response(404, { code: "SITE_NOT_FOUND", error: "Situs aktif tidak ditemukan." }, requestId);

  const targets = [{ label: "Subdomain gratis", kind: "free", hostname: `${site.slug}.ngeblogging.com` }];
  if (domain?.hostname) {
    targets.push({ label: "Domain utama", kind: "root", hostname: domain.hostname });
    targets.push(...additionalAddresses(domain));
  }
  const results = [];
  for (const target of targets.slice(0, 14)) results.push(await auditTarget(target));
  const passed = results.filter((item) => item.reachable).length;
  return response(200, {
    release: RELEASE,
    site: { id: site.id, name: site.name, slug: site.slug },
    domain: domain ? { id: domain.id, hostname: domain.hostname, status: domain.status, providerStatus: domain.provider_status, sslStatus: domain.ssl_status } : null,
    checkedAt: new Date().toISOString(),
    passed,
    total: results.length,
    allReachable: results.length > 0 && passed === results.length,
    results,
  }, requestId);
}

async function enforceOneDomainPerSite(request, env, requestId) {
  const body = await request.clone().json().catch(() => ({}));
  const siteId = String(body.siteId || "");
  const hostname = normalizeHostname(body.hostname);
  const listResponse = await baseList(request, env, requestId, siteId);
  if (!listResponse.ok) return listResponse;
  const payload = await listResponse.json().catch(() => ({}));
  const domain = canonicalDomains(payload.domains, siteId).find((item) => item.status !== "pending_deletion") || null;
  if (domain && normalizeHostname(domain.hostname) !== hostname) {
    return response(409, {
      code: "SITE_DOMAIN_LIMIT_REACHED",
      error: `Situs aktif sudah memiliki domain ${domain.hostname}. Pilih situs lain melalui tombol Ganti situs untuk memasang domain berikutnya.`,
      domain,
    }, requestId);
  }
  return null;
}

export async function handleDomainRequest(request, env, requestId = crypto.randomUUID()) {
  const url = new URL(request.url);
  if (request.method === "POST" && url.pathname === "/api/domains/audit") return handleAudit(request, env, requestId);
  if (request.method === "POST" && url.pathname === "/api/domains/register") {
    const blocked = await enforceOneDomainPerSite(request, env, requestId);
    if (blocked) return blocked;
  }
  const result = await handleDomainRequestBase(request, env, requestId);
  if (request.method === "GET" && url.pathname === "/api/domains/list" && result.ok) {
    const payload = await result.clone().json().catch(() => ({}));
    const siteId = url.searchParams.get("siteId") || "";
    return response(result.status, { ...payload, domains: canonicalDomains(payload.domains, siteId), release: RELEASE }, requestId);
  }
  return result;
}
