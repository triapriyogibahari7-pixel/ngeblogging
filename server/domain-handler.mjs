function json(status, body, requestId = "") {
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

function cloudflareConfig(env) {
  return {
    zoneId: String(env.CLOUDFLARE_ZONE_ID || "").trim(),
    apiToken: String(env.CLOUDFLARE_API_TOKEN || "").trim(),
    cnameTarget: String(env.CUSTOM_DOMAIN_CNAME_TARGET || "").trim().toLowerCase().replace(/\.$/, ""),
  };
}

function domainFeature(env) {
  const cloudflare = cloudflareConfig(env);
  const database = supabaseConfig(env);
  const configuredLimit = Number(env.CUSTOM_DOMAIN_LIMIT_PER_SITE || 5);
  const limit = Number.isInteger(configuredLimit) && configuredLimit > 0 ? Math.min(configuredLimit, 20) : 5;
  return {
    ...cloudflare,
    limit,
    enabled: Boolean(
      cloudflare.zoneId
      && cloudflare.apiToken
      && cloudflare.cnameTarget
      && database.url
      && database.publishableKey
      && database.serviceKey
    ),
  };
}

async function verifyUser(request, env) {
  const token = bearerToken(request);
  if (!token) throw Object.assign(new Error("Silakan masuk untuk mengelola domain."), { status: 401, code: "AUTH_REQUIRED" });
  const { url, publishableKey } = supabaseConfig(env);
  if (!url || !publishableKey) throw Object.assign(new Error("Autentikasi domain belum dikonfigurasi."), { status: 503, code: "DOMAIN_AUTH_CONFIG_REQUIRED" });
  const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: publishableKey, authorization: `Bearer ${token}` } });
  if (!response.ok) throw Object.assign(new Error("Sesi pengguna tidak valid."), { status: 401, code: "INVALID_SESSION" });
  return await response.json();
}

function adminConfig(env) {
  const config = supabaseConfig(env);
  if (!config.url || !config.serviceKey) throw Object.assign(new Error("Penyimpanan domain server belum dikonfigurasi."), { status: 503, code: "DOMAIN_STORAGE_REQUIRED" });
  return config;
}

async function adminJson(env, path, options = {}) {
  const { url, serviceKey } = adminConfig(env);
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      "content-type": "application/json",
      ...(options.prefer ? { prefer: options.prefer } : {}),
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    console.error("Domain database request failed", { path, status: response.status, code: body?.code });
    throw Object.assign(new Error("Data domain belum dapat diproses."), { status: 503, code: "DOMAIN_DATABASE_ERROR" });
  }
  return body;
}

function validUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

async function requireSiteAdmin(env, userId, siteId) {
  if (!validUuid(siteId)) throw Object.assign(new Error("Situs tidak valid."), { status: 400, code: "INVALID_SITE" });
  const rows = await adminJson(env, `site_members?site_id=eq.${encodeURIComponent(siteId)}&user_id=eq.${encodeURIComponent(userId)}&role=in.(owner,admin)&select=site_id,role&limit=1`);
  if (!rows?.length) throw Object.assign(new Error("Anda tidak memiliki izin mengelola domain situs ini."), { status: 403, code: "DOMAIN_PERMISSION_DENIED" });
}

function normalizeHostname(input) {
  const raw = String(input || "").trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0].replace(/\.$/, "");
  if (!raw || raw.length > 253 || raw.includes("*") || raw.includes(":") || raw.includes("..")) throw Object.assign(new Error("Nama domain tidak valid."), { status: 400, code: "INVALID_HOSTNAME" });
  let hostname;
  try { hostname = new URL(`https://${raw}`).hostname.toLowerCase().replace(/\.$/, ""); }
  catch { throw Object.assign(new Error("Nama domain tidak valid."), { status: 400, code: "INVALID_HOSTNAME" }); }
  if (hostname === "ngeblogging.com" || hostname.endsWith(".ngeblogging.com")) throw Object.assign(new Error("Gunakan subdomain gratis Ngeblogging untuk alamat *.ngeblogging.com."), { status: 400, code: "PLATFORM_HOSTNAME" });
  if (hostname === "localhost" || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || !hostname.includes(".")) throw Object.assign(new Error("Masukkan domain publik yang valid."), { status: 400, code: "INVALID_HOSTNAME" });
  if (hostname.split(".").some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) throw Object.assign(new Error("Label domain tidak valid."), { status: 400, code: "INVALID_HOSTNAME" });
  return hostname;
}

async function cloudflareRequest(env, path, options = {}) {
  const config = domainFeature(env);
  if (!config.enabled) throw Object.assign(new Error("Cloudflare for SaaS belum dikonfigurasi lengkap pada server."), { status: 503, code: "CUSTOM_DOMAIN_CONFIG_REQUIRED" });
  const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${config.zoneId}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${config.apiToken}`,
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    const message = payload.errors?.[0]?.message || "Cloudflare belum dapat memproses domain.";
    console.error("Cloudflare custom hostname request failed", { path, status: response.status, code: payload.errors?.[0]?.code });
    throw Object.assign(new Error(message), { status: response.status >= 500 ? 502 : 409, code: "CLOUDFLARE_CUSTOM_HOSTNAME_ERROR" });
  }
  return payload.result;
}

function providerState(result) {
  const providerStatus = String(result?.status || "pending").toLowerCase();
  const sslStatus = String(result?.ssl?.status || "pending").toLowerCase();
  const failed = [providerStatus, sslStatus].some((value) => ["failed", "deleted", "expired", "validation_timed_out", "blocked"].includes(value));
  const active = providerStatus === "active" && sslStatus === "active";
  return { providerStatus, sslStatus, status: active ? "active" : failed ? "failed" : "verifying" };
}

function validationData(result) {
  const ownership = result?.ownership_verification || {};
  const sslRecords = Array.isArray(result?.ssl?.validation_records) ? result.ssl.validation_records : [];
  return {
    ownership: {
      name: String(ownership.name || ownership.txt_name || ""),
      type: String(ownership.type || (ownership.name ? "txt" : "")),
      value: String(ownership.value || ownership.txt_record || ""),
    },
    sslRecords: sslRecords.map((record) => ({
      name: String(record.txt_name || record.cname_name || ""),
      type: record.txt_name ? "TXT" : record.cname_name ? "CNAME" : "",
      value: String(record.txt_value || record.cname_target || ""),
    })).filter((record) => record.name && record.value),
  };
}

function publicDomain(row, cnameTarget) {
  return {
    id: row.id,
    siteId: row.site_id,
    hostname: row.hostname,
    status: row.status,
    providerStatus: row.provider_status || "pending",
    sslStatus: row.ssl_status || "pending",
    isPrimary: Boolean(row.is_primary),
    verifiedAt: row.verified_at,
    lastCheckedAt: row.last_checked_at,
    errorMessage: row.error_message || "",
    ownership: row.ownership_verification || {},
    sslRecords: row.ssl_validation || [],
    cnameTarget,
  };
}

async function domainRow(env, id) {
  if (!validUuid(id)) return null;
  const rows = await adminJson(env, `site_domains?id=eq.${encodeURIComponent(id)}&select=*&limit=1`);
  return rows?.[0] || null;
}

async function syncPrimaryDomain(env, siteId) {
  const rows = await adminJson(env, `site_domains?site_id=eq.${encodeURIComponent(siteId)}&status=eq.active&order=is_primary.desc,verified_at.asc&select=id,hostname,is_primary&limit=1`);
  const primary = rows?.[0] || null;
  if (primary && !primary.is_primary) {
    await adminJson(env, `site_domains?id=eq.${encodeURIComponent(primary.id)}`, {
      method:"PATCH",
      prefer:"return=minimal",
      body:JSON.stringify({ is_primary:true, updated_at:new Date().toISOString() }),
    });
  }
  await adminJson(env, `sites?id=eq.${encodeURIComponent(siteId)}`, {
    method:"PATCH",
    prefer:"return=minimal",
    body:JSON.stringify({ custom_domain:primary?.hostname || null, updated_at:new Date().toISOString() }),
  });
}

async function persistProviderResult(env, row, result) {
  const state = providerState(result);
  const validation = validationData(result);
  const now = new Date().toISOString();
  const rows = await adminJson(env, `site_domains?id=eq.${encodeURIComponent(row.id)}&select=*`, {
    method: "PATCH",
    prefer: "return=representation",
    body: JSON.stringify({
      status: state.status,
      provider: "cloudflare",
      provider_hostname_id: result.id || row.provider_hostname_id,
      provider_status: state.providerStatus,
      ssl_status: state.sslStatus,
      ownership_verification: validation.ownership,
      ssl_validation: validation.sslRecords,
      verified_at: state.status === "active" ? (row.verified_at || now) : null,
      last_checked_at: now,
      error_message: Array.isArray(result?.ssl?.validation_errors) ? result.ssl.validation_errors.map((item) => item.message).filter(Boolean).join("; ").slice(0, 1000) : null,
      updated_at: now,
    }),
  });
  const updated = rows?.[0] || row;
  if (state.status === "active") await syncPrimaryDomain(env, row.site_id);
  return updated;
}

export async function handleDomainRequest(request, env, requestId = crypto.randomUUID()) {
  try {
    const url = new URL(request.url);
    const feature = domainFeature(env);

    if (request.method === "GET" && url.pathname === "/api/domains/config") {
      return json(200, {
        enabled: feature.enabled,
        cnameTarget: feature.enabled ? feature.cnameTarget : "",
        provider: feature.enabled ? "cloudflare-for-saas" : "unconfigured",
        limit: feature.limit,
      }, requestId);
    }

    const user = await verifyUser(request, env);

    if (request.method === "GET" && url.pathname === "/api/domains") {
      const siteId = url.searchParams.get("siteId") || "";
      await requireSiteAdmin(env, user.id, siteId);
      const rows = await adminJson(env, `site_domains?site_id=eq.${encodeURIComponent(siteId)}&select=*&order=created_at.desc`);
      return json(200, {
        enabled: feature.enabled,
        cnameTarget: feature.enabled ? feature.cnameTarget : "",
        limit: feature.limit,
        domains: (rows || []).map((row) => publicDomain(row, feature.cnameTarget)),
      }, requestId);
    }

    const body = await request.json().catch(() => ({}));

    if (request.method === "POST" && url.pathname === "/api/domains/register") {
      const siteId = String(body.siteId || "");
      await requireSiteAdmin(env, user.id, siteId);
      if (!feature.enabled) return json(503, { code: "CUSTOM_DOMAIN_CONFIG_REQUIRED", error: "Custom domain belum diaktifkan pada infrastruktur Cloudflare." }, requestId);
      const hostname = normalizeHostname(body.hostname);
      const existing = await adminJson(env, `site_domains?hostname=eq.${encodeURIComponent(hostname)}&select=*&limit=1`);
      if (existing?.[0] && existing[0].site_id !== siteId) return json(409, { code: "DOMAIN_ALREADY_USED", error: "Domain tersebut sudah digunakan situs lain." }, requestId);
      if (existing?.[0]?.provider_hostname_id) return json(200, { domain: publicDomain(existing[0], feature.cnameTarget), reused: true }, requestId);

      const currentRows = await adminJson(env, `site_domains?site_id=eq.${encodeURIComponent(siteId)}&select=id,is_primary`);
      if ((currentRows || []).length >= feature.limit) return json(409, { code:"CUSTOM_DOMAIN_LIMIT", error:`Maksimal ${feature.limit} custom domain per situs.` }, requestId);
      const makePrimary = !(currentRows || []).some((row) => row.is_primary);

      const provider = await cloudflareRequest(env, "/custom_hostnames", {
        method: "POST",
        body: JSON.stringify({ hostname, ssl: { method: "txt", type: "dv" } }),
      });
      const state = providerState(provider);
      const validation = validationData(provider);
      const rows = await adminJson(env, "site_domains?on_conflict=hostname", {
        method: "POST",
        prefer: "resolution=merge-duplicates,return=representation",
        body: JSON.stringify({
          site_id: siteId,
          hostname,
          status: state.status,
          provider: "cloudflare",
          provider_hostname_id: provider.id,
          provider_status: state.providerStatus,
          ssl_status: state.sslStatus,
          ownership_verification: validation.ownership,
          ssl_validation: validation.sslRecords,
          is_primary:makePrimary,
          last_checked_at: new Date().toISOString(),
        }),
      });
      const created = rows?.[0];
      if (state.status === "active") await syncPrimaryDomain(env, siteId);
      return json(201, { domain: publicDomain(created, feature.cnameTarget) }, requestId);
    }

    if (request.method === "POST" && url.pathname === "/api/domains/refresh") {
      const id = String(body.id || "");
      const row = await domainRow(env, id);
      if (!row) return json(404, { error: "Domain tidak ditemukan." }, requestId);
      await requireSiteAdmin(env, user.id, row.site_id);
      if (!feature.enabled) return json(503, { error:"Integrasi Cloudflare custom domain tidak aktif." }, requestId);
      if (!row.provider_hostname_id) return json(409, { error: "ID domain Cloudflare belum tersedia." }, requestId);
      const provider = await cloudflareRequest(env, `/custom_hostnames/${encodeURIComponent(row.provider_hostname_id)}`, { method: "GET" });
      const updated = await persistProviderResult(env, row, provider);
      return json(200, { domain: publicDomain(updated, feature.cnameTarget) }, requestId);
    }

    if (request.method === "DELETE" && url.pathname.startsWith("/api/domains/")) {
      const id = decodeURIComponent(url.pathname.slice("/api/domains/".length));
      const row = await domainRow(env, id);
      if (!row) return json(404, { error: "Domain tidak ditemukan." }, requestId);
      await requireSiteAdmin(env, user.id, row.site_id);
      if (row.provider_hostname_id) {
        if (!feature.enabled) return json(503, { error:"Integrasi Cloudflare custom domain tidak aktif; domain tidak dihapus agar tidak meninggalkan konfigurasi yatim." }, requestId);
        await cloudflareRequest(env, `/custom_hostnames/${encodeURIComponent(row.provider_hostname_id)}`, { method: "DELETE" });
      }
      await adminJson(env, `site_domains?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", prefer: "return=minimal" });
      await syncPrimaryDomain(env, row.site_id);
      return json(200, { deleted: true }, requestId);
    }

    return json(404, { error: "Endpoint domain tidak ditemukan." }, requestId);
  } catch (error) {
    return json(error.status || 500, {
      code: error.code || "DOMAIN_INTERNAL_ERROR",
      error: error.status && error.status < 500 ? error.message : "Terjadi gangguan sementara saat mengelola domain.",
    }, requestId);
  }
}
