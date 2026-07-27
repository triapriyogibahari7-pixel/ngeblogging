import {
  addressAnswers,
  addressSetsOverlap,
  buildDomainDnsContract,
  cnameAnswerMatches,
  cleanHostname,
  normalizeDomainHostname,
} from "./domain-dns-v67-contract.mjs";

const RELEASE = "2026.07.27-domain-dns-v67";
const DOMAIN_SELECT = "id,site_id,hostname,status,verification_token,is_primary,verified_at,created_at,updated_at,provider,provider_hostname_id,provider_status,ssl_status,ownership_verification,ssl_validation,last_checked_at,error_message";
const FAILED_PROVIDER_STATES = new Set(["blocked", "deleted", "failed", "moved", "test_blocked", "test_failed"]);

function envConfig(env) {
  return {
    supabaseUrl: String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").replace(/\/$/, ""),
    publishableKey: String(env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || "").trim(),
    apiToken: String(env.CLOUDFLARE_DOMAIN_API_TOKEN || env.CLOUDFLARE_API_TOKEN || "").trim(),
    zoneId: String(env.CLOUDFLARE_ZONE_ID || "").trim(),
    target: cleanHostname(env.CLOUDFLARE_CUSTOM_HOSTNAME_TARGET || "connect.ngeblogging.com"),
    origin: cleanHostname(env.CLOUDFLARE_CUSTOM_ORIGIN || "ngeblogging.com"),
  };
}

export function domainDnsV67Readiness(env) {
  const config = envConfig(env);
  const bindings = {
    databaseAccess: Boolean(config.supabaseUrl && config.publishableKey),
    apiToken: Boolean(config.apiToken),
    zoneId: /^[0-9a-f]{32}$/i.test(config.zoneId),
    cnameTarget: Boolean(config.target),
    origin: Boolean(config.origin),
  };
  const missing = Object.entries(bindings).filter(([, ready]) => !ready).map(([name]) => name);
  return {
    enabled: bindings.databaseAccess && bindings.cnameTarget,
    activationReady: Object.values(bindings).every(Boolean),
    ready: Object.values(bindings).every(Boolean),
    provider: "cloudflare-custom-hostnames",
    providerMode: "cloudflare-for-saas",
    dnsMode: "two-cname",
    automation: true,
    cnameTarget: config.target,
    databaseMode: "user-jwt-rls",
    serviceRoleRequired: false,
    bindings,
    missing,
    release: RELEASE,
  };
}

function allowedOrigin(origin) {
  if (!origin) return "";
  try {
    const url = new URL(origin);
    const hostname = url.hostname.toLowerCase();
    if (url.protocol === "https:" && (hostname === "ngeblogging.com" || hostname.endsWith(".ngeblogging.com"))) return origin;
    if (url.protocol === "https:" && ["ngeblogging.netlify.app", "ngeblogging.triapriyogibahari7.workers.dev"].includes(hostname)) return origin;
    if (["localhost", "127.0.0.1", "[::1]"].includes(hostname)) return origin;
  } catch {
    return "";
  }
  return "";
}

function response(request, status, body, requestId = "") {
  const origin = allowedOrigin(request.headers.get("origin") || "");
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-request-id": requestId,
    "x-ngeblogging-domain-engine": RELEASE,
  });
  if (origin) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-headers", "authorization, content-type, cache-control");
    headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
    headers.set("access-control-expose-headers", "x-request-id, x-ngeblogging-domain-engine");
    headers.set("vary", "Origin");
  }
  return new Response(request.method === "HEAD" ? null : JSON.stringify(body), { status, headers });
}

function bearerToken(request) {
  const value = request.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

async function verifyUser(request, env) {
  const token = bearerToken(request);
  if (!token) throw Object.assign(new Error("Silakan masuk untuk mengelola domain."), { status: 401, code: "AUTH_REQUIRED" });
  const config = envConfig(env);
  if (!config.supabaseUrl || !config.publishableKey) {
    throw Object.assign(new Error("Autentikasi domain belum dikonfigurasi."), { status: 503, code: "DOMAIN_AUTH_CONFIG_REQUIRED" });
  }
  const result = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
    headers: { apikey: config.publishableKey, authorization: `Bearer ${token}` },
  });
  if (!result.ok) throw Object.assign(new Error("Sesi pengguna tidak valid."), { status: 401, code: "INVALID_SESSION" });
  return { token, user: await result.json() };
}

async function userJson(env, token, path, options = {}) {
  const config = envConfig(env);
  const result = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: config.publishableKey,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(options.prefer ? { prefer: options.prefer } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await result.json().catch(() => null);
  if (!result.ok) {
    const duplicate = result.status === 409 || payload?.code === "23505";
    throw Object.assign(new Error(duplicate ? "Domain ini sudah terhubung ke situs lain." : "Penyimpanan domain belum dapat diproses."), {
      status: duplicate ? 409 : [401, 403].includes(result.status) ? result.status : 503,
      code: duplicate ? "DOMAIN_ALREADY_USED" : "DOMAIN_DATABASE_ERROR",
      providerStatus: result.status,
    });
  }
  return payload;
}

async function verifySiteManager(env, token, siteId, userId) {
  if (!/^[0-9a-f-]{36}$/i.test(siteId)) throw Object.assign(new Error("Situs tidak valid."), { status: 400, code: "INVALID_SITE" });
  const members = await userJson(env, token, `site_members?site_id=eq.${encodeURIComponent(siteId)}&user_id=eq.${encodeURIComponent(userId)}&select=role&limit=1`);
  let role = members?.[0]?.role || "";
  if (!role) {
    const sites = await userJson(env, token, `sites?id=eq.${encodeURIComponent(siteId)}&owner_id=eq.${encodeURIComponent(userId)}&select=id&limit=1`);
    if (sites?.[0]) role = "owner";
  }
  if (!new Set(["owner", "admin"]).has(role)) {
    throw Object.assign(new Error("Hanya pemilik atau admin situs yang dapat mengelola domain."), { status: 403, code: "SITE_MANAGER_REQUIRED" });
  }
}

function ownershipWithContract(domain, env, extra = {}) {
  const contract = buildDomainDnsContract(domain.hostname, domain.verification_token, envConfig(env).target);
  const current = domain.ownership_verification && typeof domain.ownership_verification === "object" && !Array.isArray(domain.ownership_verification)
    ? domain.ownership_verification
    : {};
  return {
    ...current,
    ...contract,
    required_dns_records: contract.records,
    required_name_servers: contract.required_name_servers,
    ...extra,
  };
}

async function patchDomain(env, token, domain, update) {
  const rows = await userJson(env, token, `site_domains?id=eq.${encodeURIComponent(domain.id)}&select=${DOMAIN_SELECT}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: JSON.stringify({ ...update, updated_at: new Date().toISOString() }),
  });
  return rows?.[0] || { ...domain, ...update };
}

async function fetchDns(name, type) {
  const query = `${encodeURIComponent(cleanHostname(name))}&type=${encodeURIComponent(type)}`;
  const endpoints = [
    `https://cloudflare-dns.com/dns-query?name=${query}`,
    `https://dns.google/resolve?name=${query}`,
  ];
  let lastError = null;
  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    try {
      const result = await fetch(endpoint, {
        headers: { accept: "application/dns-json" },
        signal: controller.signal,
      });
      if (!result.ok) throw new Error(`DNS HTTP ${result.status}`);
      const payload = await result.json();
      return Array.isArray(payload?.Answer) ? payload.Answer : [];
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw Object.assign(new Error(lastError?.message || "Resolver DNS belum merespons."), { code: "DNS_RESOLVER_UNAVAILABLE", status: 503 });
}

async function verifyDnsContract(domain, env) {
  const ownership = ownershipWithContract(domain, env);
  const [routing, verification] = ownership.records;
  const [routingCname, verificationCname] = await Promise.all([
    fetchDns(routing.name, "CNAME"),
    fetchDns(verification.name, "CNAME"),
  ]);
  let routingReady = cnameAnswerMatches(routingCname, routing.value);
  let flattened = false;
  if (!routingReady) {
    const [hostA, targetA, hostAAAA, targetAAAA] = await Promise.all([
      fetchDns(routing.name, "A"),
      fetchDns(routing.value, "A"),
      fetchDns(routing.name, "AAAA"),
      fetchDns(routing.value, "AAAA"),
    ]);
    routingReady = addressSetsOverlap(addressAnswers(hostA), addressAnswers(targetA))
      || addressSetsOverlap(addressAnswers(hostAAAA), addressAnswers(targetAAAA));
    flattened = routingReady;
  }
  const ownershipReady = cnameAnswerMatches(verificationCname, verification.value);
  return {
    ready: routingReady && ownershipReady,
    routing: { ...routing, ready: routingReady, flattened },
    ownership: { ...verification, ready: ownershipReady },
    checkedAt: new Date().toISOString(),
  };
}

async function cloudflareRequest(env, path, options = {}) {
  const config = envConfig(env);
  if (!domainDnsV67Readiness(env).activationReady) {
    throw Object.assign(new Error("Aktivasi Cloudflare for SaaS belum lengkap pada deployment produksi."), { status: 503, code: "CUSTOM_HOSTNAME_PROVIDER_NOT_READY" });
  }
  const result = await fetch(`https://api.cloudflare.com/client/v4/zones/${config.zoneId}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${config.apiToken}`,
      accept: "application/json",
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  const payload = await result.json().catch(() => ({}));
  if (!result.ok || payload.success === false) {
    const error = payload?.errors?.[0] || {};
    throw Object.assign(new Error(error.message || "Cloudflare belum dapat memproses custom hostname."), {
      status: result.status >= 500 ? 502 : result.status || 409,
      code: error.code ? `CLOUDFLARE_${error.code}` : "CLOUDFLARE_CUSTOM_HOSTNAME_ERROR",
      providerStatus: result.status,
    });
  }
  return payload.result;
}

function providerState(provider) {
  const providerStatus = String(provider?.status || "pending").toLowerCase();
  const sslStatus = String(provider?.ssl?.status || "pending").toLowerCase();
  const active = providerStatus === "active" && sslStatus === "active";
  const failed = FAILED_PROVIDER_STATES.has(providerStatus) || FAILED_PROVIDER_STATES.has(sslStatus);
  return {
    active,
    failed,
    status: active ? "active" : failed ? "failed" : "verifying",
    providerStatus,
    sslStatus,
    providerId: String(provider?.id || "") || null,
    sslValidation: provider?.ssl?.validation_records || [],
    providerOwnership: provider?.ownership_verification || {},
    errorMessage: provider?.verification_errors?.join(" ")
      || provider?.ssl?.validation_errors?.map((item) => item?.message || String(item)).join(" ")
      || null,
  };
}

async function findOrCreateProvider(env, domain, userId) {
  if (domain.provider_hostname_id) {
    return cloudflareRequest(env, `/custom_hostnames/${encodeURIComponent(domain.provider_hostname_id)}`, { method: "GET" });
  }
  const found = await cloudflareRequest(env, `/custom_hostnames?hostname=${encodeURIComponent(domain.hostname)}&per_page=50`, { method: "GET" });
  const existing = Array.isArray(found) ? found.find((item) => cleanHostname(item?.hostname) === domain.hostname) : null;
  if (existing) return existing;
  const config = envConfig(env);
  return cloudflareRequest(env, "/custom_hostnames", {
    method: "POST",
    body: JSON.stringify({
      hostname: domain.hostname,
      custom_origin_server: config.origin,
      custom_metadata: { site_id: domain.site_id, owner_id: userId, engine: RELEASE },
      ssl: {
        method: "http",
        type: "dv",
        bundle_method: "ubiquitous",
        settings: { min_tls_version: "1.2", tls_1_3: "on", http2: "on" },
      },
    }),
  });
}

async function listDomains(request, env, token, user, requestId, url) {
  const siteId = String(url.searchParams.get("siteId") || "");
  await verifySiteManager(env, token, siteId, user.id);
  const domains = await userJson(env, token, `site_domains?site_id=eq.${encodeURIComponent(siteId)}&select=${DOMAIN_SELECT}&order=created_at.desc&limit=20`);
  const normalized = (domains || []).map((domain) => ({
    ...domain,
    ownership_verification: ownershipWithContract(domain, env),
  }));
  return response(request, 200, { domains: normalized, ...domainDnsV67Readiness(env) }, requestId);
}

async function registerDomain(request, env, token, user, requestId) {
  const body = await request.json().catch(() => ({}));
  const siteId = String(body.siteId || "");
  await verifySiteManager(env, token, siteId, user.id);
  const hostname = normalizeDomainHostname(body.hostname);

  const siteDomains = await userJson(env, token, `site_domains?site_id=eq.${encodeURIComponent(siteId)}&select=${DOMAIN_SELECT}&order=created_at.desc&limit=20`);
  const different = siteDomains?.find((item) => item.hostname !== hostname);
  if (different) return response(request, 409, { code: "SITE_DOMAIN_ALREADY_EXISTS", error: `Situs ini sudah memiliki domain ${different.hostname}. Lepaskan domain lama sebelum menggantinya.` }, requestId);

  const byHostname = await userJson(env, token, `site_domains?hostname=eq.${encodeURIComponent(hostname)}&select=${DOMAIN_SELECT}&limit=1`);
  let domain = byHostname?.[0] || siteDomains?.find((item) => item.hostname === hostname) || null;
  if (!domain) {
    const rows = await userJson(env, token, `site_domains?select=${DOMAIN_SELECT}`, {
      method: "POST",
      prefer: "return=representation",
      body: JSON.stringify({
        site_id: siteId,
        hostname,
        status: "verifying",
        provider: "cloudflare-custom-hostnames",
        provider_status: "awaiting_dns",
        ssl_status: "pending",
        is_primary: false,
        ownership_verification: {},
        ssl_validation: [],
        error_message: null,
        last_checked_at: new Date().toISOString(),
      }),
    });
    domain = rows?.[0];
  }
  if (!domain) throw Object.assign(new Error("Data domain gagal dibuat."), { status: 503, code: "DOMAIN_STORAGE_FAILED" });
  const ownership = ownershipWithContract(domain, env, { dns_verified: false, state: "awaiting_dns" });
  domain = await patchDomain(env, token, domain, {
    status: "verifying",
    provider: "cloudflare-custom-hostnames",
    provider_status: domain.provider_hostname_id ? domain.provider_status : "awaiting_dns",
    ssl_status: domain.provider_hostname_id ? domain.ssl_status : "pending",
    ownership_verification: ownership,
    error_message: null,
    last_checked_at: new Date().toISOString(),
  });
  return response(request, byHostname?.[0] ? 200 : 201, {
    domain,
    reused: Boolean(byHostname?.[0]),
    instructions: { dnsMode: "two-cname", records: ownership.records, message: "Tambahkan dua record CNAME berikut, lalu tekan Periksa koneksi." },
    ...domainDnsV67Readiness(env),
  }, requestId);
}

async function refreshDomain(request, env, token, user, requestId) {
  const body = await request.json().catch(() => ({}));
  const domainId = String(body.domainId || "");
  const rows = await userJson(env, token, `site_domains?id=eq.${encodeURIComponent(domainId)}&select=${DOMAIN_SELECT}&limit=1`);
  let domain = rows?.[0];
  if (!domain) return response(request, 404, { code: "DOMAIN_NOT_FOUND", error: "Domain tidak ditemukan." }, requestId);
  await verifySiteManager(env, token, domain.site_id, user.id);

  const dns = await verifyDnsContract(domain, env);
  let ownership = ownershipWithContract(domain, env, { dns_verified: dns.ready, dns_checks: dns, state: dns.ready ? "dns_verified" : "awaiting_dns" });
  if (!dns.ready) {
    const missing = [!dns.routing.ready ? "CNAME koneksi" : "", !dns.ownership.ready ? "CNAME verifikasi unik" : ""].filter(Boolean).join(" dan ");
    domain = await patchDomain(env, token, domain, {
      status: "verifying",
      provider_status: "awaiting_dns",
      ssl_status: "pending",
      ownership_verification: ownership,
      error_message: `${missing} belum terdeteksi. Pastikan nama dan target sama persis, lalu tunggu propagasi DNS.`,
      last_checked_at: dns.checkedAt,
      is_primary: false,
      verified_at: null,
    });
    return response(request, 200, { domain, dns, providerPending: true, ...domainDnsV67Readiness(env) }, requestId);
  }

  let provider;
  try {
    provider = await findOrCreateProvider(env, domain, user.id);
  } catch (error) {
    ownership = { ...ownership, state: "provider_pending", provider_error_code: error.code || "PROVIDER_ERROR" };
    domain = await patchDomain(env, token, domain, {
      status: "verifying",
      provider_status: "provider_pending",
      ssl_status: "pending",
      ownership_verification: ownership,
      error_message: error.message,
      last_checked_at: dns.checkedAt,
      is_primary: false,
    });
    return response(request, 200, { domain, dns, providerPending: true, providerError: { code: error.code, message: error.message }, ...domainDnsV67Readiness(env) }, requestId);
  }

  const state = providerState(provider);
  ownership = {
    ...ownership,
    state: state.active ? "active" : state.failed ? "failed" : "provisioning_tls",
    cloudflare_ownership: state.providerOwnership,
  };
  domain = await patchDomain(env, token, domain, {
    status: state.status,
    provider: "cloudflare-custom-hostnames",
    provider_hostname_id: state.providerId || domain.provider_hostname_id,
    provider_status: state.providerStatus,
    ssl_status: state.sslStatus,
    ownership_verification: ownership,
    ssl_validation: state.sslValidation,
    error_message: state.errorMessage,
    last_checked_at: new Date().toISOString(),
    verified_at: state.active ? (domain.verified_at || new Date().toISOString()) : null,
    is_primary: state.active,
  });

  if (state.active) {
    const now = new Date().toISOString();
    await userJson(env, token, `site_domains?site_id=eq.${encodeURIComponent(domain.site_id)}&id=neq.${encodeURIComponent(domain.id)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ is_primary: false, updated_at: now }),
    });
    await userJson(env, token, `sites?id=eq.${encodeURIComponent(domain.site_id)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ custom_domain: domain.hostname, updated_at: now }),
    });
  }
  return response(request, 200, { domain, dns, provider: { status: state.providerStatus, sslStatus: state.sslStatus }, ...domainDnsV67Readiness(env) }, requestId);
}

async function removeDomain(request, env, token, user, requestId) {
  const body = await request.json().catch(() => ({}));
  const domainId = String(body.domainId || "");
  const rows = await userJson(env, token, `site_domains?id=eq.${encodeURIComponent(domainId)}&select=${DOMAIN_SELECT}&limit=1`);
  const domain = rows?.[0];
  if (!domain) return response(request, 404, { code: "DOMAIN_NOT_FOUND", error: "Domain tidak ditemukan." }, requestId);
  await verifySiteManager(env, token, domain.site_id, user.id);
  if (domain.provider_hostname_id && domainDnsV67Readiness(env).activationReady) {
    try {
      await cloudflareRequest(env, `/custom_hostnames/${encodeURIComponent(domain.provider_hostname_id)}`, { method: "DELETE" });
    } catch (error) {
      if (error.providerStatus !== 404) throw error;
    }
  }
  await userJson(env, token, `site_domains?id=eq.${encodeURIComponent(domain.id)}`, { method: "DELETE", prefer: "return=minimal" });
  await userJson(env, token, `sites?id=eq.${encodeURIComponent(domain.site_id)}&custom_domain=eq.${encodeURIComponent(domain.hostname)}`, {
    method: "PATCH",
    prefer: "return=minimal",
    body: JSON.stringify({ custom_domain: null, updated_at: new Date().toISOString() }),
  });
  return response(request, 200, { removed: true, hostname: domain.hostname }, requestId);
}

export async function handleDomainDnsV67Request(request, env, requestId = crypto.randomUUID()) {
  try {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return response(request, 204, {}, requestId);
    const { token, user } = await verifyUser(request, env);
    if (request.method === "GET" && url.pathname === "/api/domains/config") {
      return response(request, 200, domainDnsV67Readiness(env), requestId);
    }
    if (request.method === "GET" && url.pathname === "/api/domains/list") {
      return listDomains(request, env, token, user, requestId, url);
    }
    if (request.method === "POST" && url.pathname === "/api/domains/register") {
      return registerDomain(request, env, token, user, requestId);
    }
    if (request.method === "POST" && url.pathname === "/api/domains/refresh") {
      return refreshDomain(request, env, token, user, requestId);
    }
    if (request.method === "POST" && url.pathname === "/api/domains/remove") {
      return removeDomain(request, env, token, user, requestId);
    }
    if (request.method === "POST" && url.pathname === "/api/domains/address") {
      return response(request, 409, {
        code: "ADDITIONAL_HOST_REQUIRES_DNS_ONBOARDING",
        error: "Hubungkan alamat tambahan sebagai hostname custom tersendiri. Domain utama tetap aman dan tidak akan diubah.",
      }, requestId);
    }
    return response(request, 404, { code: "DOMAIN_ENDPOINT_NOT_FOUND", error: "Endpoint domain tidak ditemukan." }, requestId);
  } catch (error) {
    console.error("Domain DNS v67 handler failed", { requestId, code: error?.code, status: error?.status, name: error?.name });
    return response(request, error.status || 500, {
      code: error.code || "DOMAIN_DNS_V67_ERROR",
      error: error.message || "Pengelolaan domain mengalami gangguan sementara.",
      release: RELEASE,
    }, requestId);
  }
}
