const DOMAIN_SELECT = "id,site_id,hostname,status,verification_token,is_primary,verified_at,created_at,updated_at,provider,provider_hostname_id,provider_status,ssl_status,ownership_verification,ssl_validation,last_checked_at,error_message";
const TERMINAL_FAILURES = new Set(["blocked", "deleted", "pending_deletion", "test_blocked", "test_failed"]);

function response(status, body, requestId = "") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...(requestId ? { "x-request-id": requestId } : {}),
    },
  });
}

function bearerToken(request) {
  const value = request.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

function supabaseConfig(env) {
  return {
    url: String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").replace(/\/$/, ""),
    publishableKey: env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || "",
    serviceKey: env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

function domainConfig(env) {
  return {
    apiToken: String(env.CLOUDFLARE_API_TOKEN || ""),
    zoneId: String(env.CLOUDFLARE_ZONE_ID || ""),
    cnameTarget: String(env.CLOUDFLARE_CUSTOM_HOSTNAME_TARGET || "").toLowerCase().replace(/\.$/, ""),
    originServer: String(env.CLOUDFLARE_CUSTOM_ORIGIN || "ngeblogging.com").toLowerCase().replace(/\.$/, ""),
  };
}

function readiness(env) {
  const cf = domainConfig(env);
  const db = supabaseConfig(env);
  const missing = [];
  if (!cf.apiToken) missing.push("CLOUDFLARE_API_TOKEN");
  if (!cf.zoneId) missing.push("CLOUDFLARE_ZONE_ID");
  if (!cf.cnameTarget) missing.push("CLOUDFLARE_CUSTOM_HOSTNAME_TARGET");
  if (!db.url) missing.push("SUPABASE_URL");
  if (!db.publishableKey) missing.push("SUPABASE_PUBLISHABLE_KEY");
  if (!db.serviceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  return { enabled: missing.length === 0, missing, cnameTarget: cf.cnameTarget };
}

async function verifyUser(request, env) {
  const token = bearerToken(request);
  if (!token) throw Object.assign(new Error("Silakan masuk untuk mengelola domain."), { status: 401, code: "AUTH_REQUIRED" });
  const { url, publishableKey } = supabaseConfig(env);
  if (!url || !publishableKey) throw Object.assign(new Error("Autentikasi domain belum dikonfigurasi."), { status: 503, code: "DOMAIN_AUTH_CONFIG_REQUIRED" });
  const result = await fetch(`${url}/auth/v1/user`, { headers: { apikey: publishableKey, authorization: `Bearer ${token}` } });
  if (!result.ok) throw Object.assign(new Error("Sesi pengguna tidak valid."), { status: 401, code: "INVALID_SESSION" });
  return { user: await result.json(), token };
}

function adminHeaders(serviceKey, prefer = "") {
  return {
    apikey: serviceKey,
    authorization: `Bearer ${serviceKey}`,
    "content-type": "application/json",
    ...(prefer ? { prefer } : {}),
  };
}

async function adminJson(env, path, options = {}) {
  const { url, serviceKey } = supabaseConfig(env);
  if (!url || !serviceKey) throw Object.assign(new Error("Penyimpanan domain server belum dikonfigurasi."), { status: 503, code: "DOMAIN_STORAGE_REQUIRED" });
  const result = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: { ...adminHeaders(serviceKey, options.prefer), ...(options.headers || {}) },
  });
  const payload = await result.json().catch(() => null);
  if (!result.ok) {
    console.error("Domain database request failed", { path, status: result.status, code: payload?.code });
    throw Object.assign(new Error("Penyimpanan domain belum dapat diproses."), { status: 503, code: "DOMAIN_DATABASE_ERROR" });
  }
  return payload;
}

async function verifySiteManager(env, siteId, userId) {
  if (!/^[0-9a-f-]{36}$/i.test(String(siteId || ""))) throw Object.assign(new Error("Situs tidak valid."), { status: 400, code: "INVALID_SITE" });
  const rows = await adminJson(env, `site_members?site_id=eq.${encodeURIComponent(siteId)}&user_id=eq.${encodeURIComponent(userId)}&select=role&limit=1`);
  const role = rows?.[0]?.role;
  if (!role) {
    const sites = await adminJson(env, `sites?id=eq.${encodeURIComponent(siteId)}&owner_id=eq.${encodeURIComponent(userId)}&select=id&limit=1`);
    if (sites?.[0]) return "owner";
  }
  if (!new Set(["owner", "admin"]).has(role)) throw Object.assign(new Error("Hanya pemilik atau admin situs yang dapat mengelola domain."), { status: 403, code: "SITE_MANAGER_REQUIRED" });
  return role;
}

function normalizeHostname(input) {
  let value = String(input || "").trim().toLowerCase();
  if (!value) throw Object.assign(new Error("Masukkan nama domain."), { status: 400, code: "HOSTNAME_REQUIRED" });
  if (!value.includes("://")) value = `https://${value}`;
  let parsed;
  try { parsed = new URL(value); } catch { throw Object.assign(new Error("Format domain tidak valid."), { status: 400, code: "INVALID_HOSTNAME" }); }
  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (parsed.pathname !== "/" || parsed.search || parsed.hash || parsed.port || parsed.username || parsed.password) throw Object.assign(new Error("Masukkan domain saja tanpa path, parameter, port, atau kredensial."), { status: 400, code: "INVALID_HOSTNAME" });
  if (hostname.length < 4 || hostname.length > 253 || !hostname.includes(".") || !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])$/.test(hostname) || hostname.includes("..")) throw Object.assign(new Error("Nama domain tidak valid."), { status: 400, code: "INVALID_HOSTNAME" });
  if (hostname === "ngeblogging.com" || hostname.endsWith(".ngeblogging.com")) throw Object.assign(new Error("Gunakan pengaturan subdomain gratis untuk alamat *.ngeblogging.com."), { status: 400, code: "USE_FREE_SUBDOMAIN" });
  return hostname;
}

async function cloudflareRequest(env, path, options = {}) {
  const config = domainConfig(env);
  if (!readiness(env).enabled) throw Object.assign(new Error("Custom domain belum diaktifkan pada konfigurasi produksi."), { status: 503, code: "CUSTOM_DOMAIN_NOT_CONFIGURED" });
  const result = await fetch(`https://api.cloudflare.com/client/v4/zones/${config.zoneId}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${config.apiToken}`,
      "content-type": "application/json",
      accept: "application/json",
      ...(options.headers || {}),
    },
  });
  const payload = await result.json().catch(() => ({}));
  if (!result.ok || payload.success === false) {
    const message = payload?.errors?.[0]?.message || "Cloudflare belum dapat memproses custom domain.";
    console.error("Cloudflare custom hostname request failed", { path, status: result.status, code: payload?.errors?.[0]?.code });
    throw Object.assign(new Error(message), { status: result.status >= 500 ? 502 : 409, code: payload?.errors?.[0]?.code || "CLOUDFLARE_DOMAIN_ERROR" });
  }
  return payload.result;
}

function providerState(provider) {
  const providerStatus = String(provider?.status || "pending").toLowerCase();
  const sslStatus = String(provider?.ssl?.status || "pending").toLowerCase();
  const active = providerStatus === "active" && sslStatus === "active";
  const failed = TERMINAL_FAILURES.has(providerStatus) || TERMINAL_FAILURES.has(sslStatus);
  return {
    status: active ? "active" : failed ? "failed" : "verifying",
    providerStatus,
    sslStatus,
    active,
    ownershipVerification: provider?.ownership_verification || {},
    sslValidation: provider?.ssl?.validation_records || [],
    errorMessage: provider?.verification_errors?.join(" ") || provider?.ssl?.validation_errors?.map((item) => item?.message || String(item)).join(" ") || null,
  };
}

async function saveProviderState(env, domainRow, provider) {
  const state = providerState(provider);
  const now = new Date().toISOString();
  const rows = await adminJson(env, `site_domains?id=eq.${encodeURIComponent(domainRow.id)}&select=${DOMAIN_SELECT}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: JSON.stringify({
      status: state.status,
      provider_hostname_id: provider.id || domainRow.provider_hostname_id,
      provider_status: state.providerStatus,
      ssl_status: state.sslStatus,
      ownership_verification: state.ownershipVerification,
      ssl_validation: state.sslValidation,
      last_checked_at: now,
      verified_at: state.active ? (domainRow.verified_at || now) : null,
      is_primary: state.active,
      error_message: state.errorMessage,
      updated_at: now,
    }),
  });
  const saved = rows?.[0] || domainRow;
  if (state.active) {
    await adminJson(env, `site_domains?site_id=eq.${encodeURIComponent(saved.site_id)}&id=neq.${encodeURIComponent(saved.id)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ is_primary: false, updated_at: now }),
    });
    await adminJson(env, `sites?id=eq.${encodeURIComponent(saved.site_id)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ custom_domain: saved.hostname, updated_at: now }),
    });
  }
  return saved;
}

async function listDomains(env, siteId) {
  return adminJson(env, `site_domains?site_id=eq.${encodeURIComponent(siteId)}&select=${DOMAIN_SELECT}&order=created_at.desc&limit=20`);
}

async function registerDomain(request, env, user, requestId) {
  const ready = readiness(env);
  if (!ready.enabled) return response(503, { code: "CUSTOM_DOMAIN_NOT_CONFIGURED", error: "Custom domain belum dibuka karena konfigurasi produksi belum lengkap.", ...ready }, requestId);
  const body = await request.json().catch(() => ({}));
  const siteId = String(body.siteId || "");
  await verifySiteManager(env, siteId, user.id);
  const hostname = normalizeHostname(body.hostname);

  const existing = await adminJson(env, `site_domains?hostname=eq.${encodeURIComponent(hostname)}&select=${DOMAIN_SELECT}&limit=1`);
  if (existing?.[0] && existing[0].site_id !== siteId) return response(409, { code: "DOMAIN_ALREADY_USED", error: "Domain ini sudah terhubung ke situs lain." }, requestId);
  if (existing?.[0]?.provider_hostname_id) return response(200, { domain: existing[0], reused: true, cnameTarget: ready.cnameTarget }, requestId);

  const config = domainConfig(env);
  const provider = await cloudflareRequest(env, "/custom_hostnames", {
    method: "POST",
    body: JSON.stringify({
      hostname,
      custom_origin_server: config.originServer,
      custom_metadata: { site_id: siteId, owner_id: user.id },
      ssl: { method: "txt", type: "dv", bundle_method: "ubiquitous", settings: { min_tls_version: "1.2", tls_1_3: "on", http2: "on" } },
    }),
  });

  const state = providerState(provider);
  const now = new Date().toISOString();
  let row;
  if (existing?.[0]) {
    const rows = await adminJson(env, `site_domains?id=eq.${encodeURIComponent(existing[0].id)}&select=${DOMAIN_SELECT}`, {
      method: "PATCH",
      prefer: "return=representation",
      body: JSON.stringify({ provider_hostname_id: provider.id, provider_status: state.providerStatus, ssl_status: state.sslStatus, status: state.status, ownership_verification: state.ownershipVerification, ssl_validation: state.sslValidation, last_checked_at: now, error_message: state.errorMessage, updated_at: now }),
    });
    row = rows?.[0];
  } else {
    const rows = await adminJson(env, `site_domains?select=${DOMAIN_SELECT}`, {
      method: "POST",
      prefer: "return=representation",
      body: JSON.stringify({ site_id: siteId, hostname, status: state.status, provider: "cloudflare", provider_hostname_id: provider.id, provider_status: state.providerStatus, ssl_status: state.sslStatus, ownership_verification: state.ownershipVerification, ssl_validation: state.sslValidation, last_checked_at: now, error_message: state.errorMessage }),
    });
    row = rows?.[0];
  }
  return response(201, { domain: row, cnameTarget: ready.cnameTarget }, requestId);
}

async function refreshDomain(request, env, user, requestId) {
  const body = await request.json().catch(() => ({}));
  const domainId = String(body.domainId || "");
  const rows = await adminJson(env, `site_domains?id=eq.${encodeURIComponent(domainId)}&select=${DOMAIN_SELECT}&limit=1`);
  const domain = rows?.[0];
  if (!domain) return response(404, { error: "Domain tidak ditemukan." }, requestId);
  await verifySiteManager(env, domain.site_id, user.id);
  if (!domain.provider_hostname_id) return response(409, { error: "Domain belum memiliki ID Cloudflare." }, requestId);
  const provider = await cloudflareRequest(env, `/custom_hostnames/${encodeURIComponent(domain.provider_hostname_id)}`, { method: "GET" });
  const saved = await saveProviderState(env, domain, provider);
  return response(200, { domain: saved, cnameTarget: readiness(env).cnameTarget }, requestId);
}

async function removeDomain(request, env, user, requestId) {
  const body = await request.json().catch(() => ({}));
  const domainId = String(body.domainId || "");
  const rows = await adminJson(env, `site_domains?id=eq.${encodeURIComponent(domainId)}&select=${DOMAIN_SELECT}&limit=1`);
  const domain = rows?.[0];
  if (!domain) return response(404, { error: "Domain tidak ditemukan." }, requestId);
  await verifySiteManager(env, domain.site_id, user.id);
  if (domain.provider_hostname_id && readiness(env).enabled) await cloudflareRequest(env, `/custom_hostnames/${encodeURIComponent(domain.provider_hostname_id)}`, { method: "DELETE" });
  await adminJson(env, `site_domains?id=eq.${encodeURIComponent(domain.id)}`, { method: "DELETE", prefer: "return=minimal" });
  await adminJson(env, `sites?id=eq.${encodeURIComponent(domain.site_id)}&custom_domain=eq.${encodeURIComponent(domain.hostname)}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ custom_domain: null, updated_at: new Date().toISOString() }) });
  return response(200, { removed: true }, requestId);
}

export async function handleDomainRequest(request, env, requestId = crypto.randomUUID()) {
  try {
    const url = new URL(request.url);
    const { user } = await verifyUser(request, env);

    if (request.method === "GET" && url.pathname === "/api/domains/config") {
      return response(200, readiness(env), requestId);
    }

    if (request.method === "GET" && url.pathname === "/api/domains/list") {
      const siteId = String(url.searchParams.get("siteId") || "");
      await verifySiteManager(env, siteId, user.id);
      return response(200, { domains: await listDomains(env, siteId), ...readiness(env) }, requestId);
    }

    if (request.method === "POST" && url.pathname === "/api/domains/register") return registerDomain(request, env, user, requestId);
    if (request.method === "POST" && url.pathname === "/api/domains/refresh") return refreshDomain(request, env, user, requestId);
    if (request.method === "POST" && url.pathname === "/api/domains/remove") return removeDomain(request, env, user, requestId);

    return response(404, { error: "Endpoint domain tidak ditemukan." }, requestId);
  } catch (error) {
    console.error("Domain handler failed", { requestId, name: error?.name, code: error?.code, status: error?.status });
    return response(error.status || 500, { code: error.code || "DOMAIN_ERROR", error: error.message || "Pengelolaan domain mengalami gangguan sementara." }, requestId);
  }
}
