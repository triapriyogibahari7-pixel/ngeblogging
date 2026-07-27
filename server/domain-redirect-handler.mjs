import { handleDomainRequest } from "./domain-handler.mjs";

const RULE_SELECT = "id,site_id,domain_id,source_hostname,target_url,enabled,locked,permanent,preserve_path,created_at,updated_at";
const SYSTEM_HOSTS = new Set([
  "ngeblogging.com",
  "www.ngeblogging.com",
  "studio.ngeblogging.com",
  "api.ngeblogging.com",
]);

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

function bearerToken(request) {
  const value = request.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

function headers(env, token, prefer = "") {
  const { key } = config(env);
  return {
    apikey: key,
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    accept: "application/json",
    ...(prefer ? { prefer } : {}),
  };
}

async function verifyUser(request, env) {
  const token = bearerToken(request);
  if (!token) throw Object.assign(new Error("Silakan masuk untuk mengelola pengalihan domain."), { status: 401, code: "AUTH_REQUIRED" });
  const { url, key } = config(env);
  if (!url || !key) throw Object.assign(new Error("Penyimpanan pengalihan domain belum dikonfigurasi."), { status: 503, code: "REDIRECT_STORAGE_REQUIRED" });
  const result = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, authorization: `Bearer ${token}` } });
  if (!result.ok) throw Object.assign(new Error("Sesi pengguna tidak valid."), { status: 401, code: "INVALID_SESSION" });
  return { user: await result.json(), token };
}

async function rest(env, token, path, options = {}) {
  const { url, key } = config(env);
  if (!url || !key) throw Object.assign(new Error("Penyimpanan pengalihan domain belum dikonfigurasi."), { status: 503, code: "REDIRECT_STORAGE_REQUIRED" });
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      ...headers(env, token, options.prefer),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const duplicate = response.status === 409 || payload?.code === "23505";
    throw Object.assign(
      new Error(duplicate ? "Alamat sumber sudah digunakan oleh aturan pengalihan lain." : "Pengalihan domain belum dapat disimpan."),
      {
        status: duplicate ? 409 : response.status === 401 || response.status === 403 ? response.status : 503,
        code: duplicate ? "REDIRECT_SOURCE_ALREADY_USED" : "REDIRECT_DATABASE_ERROR",
      },
    );
  }
  return payload;
}

async function verifyManager(env, token, siteId, userId) {
  const members = await rest(env, token, `site_members?site_id=eq.${encodeURIComponent(siteId)}&user_id=eq.${encodeURIComponent(userId)}&select=role&limit=1`);
  const role = members?.[0]?.role;
  if (new Set(["owner", "admin"]).has(role)) return role;
  const sites = await rest(env, token, `sites?id=eq.${encodeURIComponent(siteId)}&owner_id=eq.${encodeURIComponent(userId)}&select=id&limit=1`);
  if (sites?.[0]) return "owner";
  throw Object.assign(new Error("Hanya pemilik atau admin situs yang dapat mengelola pengalihan."), { status: 403, code: "SITE_MANAGER_REQUIRED" });
}

async function domainForManager(env, token, domainId, userId) {
  const rows = await rest(env, token, `site_domains?id=eq.${encodeURIComponent(domainId)}&select=id,site_id,hostname,status,provider,provider_status,ssl_status,ownership_verification&limit=1`);
  const domain = rows?.[0];
  if (!domain) throw Object.assign(new Error("Domain tidak ditemukan."), { status: 404, code: "DOMAIN_NOT_FOUND" });
  await verifyManager(env, token, domain.site_id, userId);
  return domain;
}

function normalizeSource(input, rootHostname) {
  const root = String(rootHostname || "").trim().toLowerCase().replace(/\.$/, "");
  let value = String(input || "").trim().toLowerCase().replace(/\.$/, "");
  if (!value) throw Object.assign(new Error("Masukkan alamat sumber, misalnya cloud."), { status: 400, code: "REDIRECT_SOURCE_REQUIRED" });
  if (value.includes("://")) {
    let parsed;
    try { parsed = new URL(value); } catch { throw Object.assign(new Error("Format alamat sumber tidak valid."), { status: 400, code: "INVALID_REDIRECT_SOURCE" }); }
    if (parsed.pathname !== "/" || parsed.search || parsed.hash || parsed.port || parsed.username || parsed.password) {
      throw Object.assign(new Error("Alamat sumber hanya boleh berisi hostname tanpa path atau parameter."), { status: 400, code: "INVALID_REDIRECT_SOURCE" });
    }
    value = parsed.hostname.toLowerCase().replace(/\.$/, "");
  }
  const source = value.endsWith(`.${root}`) ? value : `${value}.${root}`;
  if (source === root) throw Object.assign(new Error("Gunakan subdomain sebagai alamat sumber agar domain utama tidak terkunci dalam pengalihan."), { status: 400, code: "ROOT_REDIRECT_NOT_ALLOWED" });
  if (!source.endsWith(`.${root}`)) throw Object.assign(new Error("Alamat sumber harus berada di dalam domain utama."), { status: 400, code: "REDIRECT_SOURCE_OUTSIDE_DOMAIN" });
  const host = source.slice(0, -(root.length + 1));
  const labels = host.split(".");
  if (host.length > 190 || labels.length > 8 || labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) {
    throw Object.assign(new Error("Gunakan alamat seperti cloud, app, docs, atau support.tim."), { status: 400, code: "INVALID_REDIRECT_SOURCE" });
  }
  return { host, source };
}

function normalizeTarget(input, rootHostname, sourceHostname) {
  const value = String(input || "").trim();
  if (!value) throw Object.assign(new Error("Masukkan tujuan pengalihan."), { status: 400, code: "REDIRECT_TARGET_REQUIRED" });
  let target;
  try {
    target = value.startsWith("/")
      ? new URL(value, `https://${rootHostname}`)
      : new URL(value.includes("://") ? value : `https://${value}`);
  } catch {
    throw Object.assign(new Error("Tujuan pengalihan tidak valid."), { status: 400, code: "INVALID_REDIRECT_TARGET" });
  }
  if (target.protocol !== "https:" || target.username || target.password || target.port) {
    throw Object.assign(new Error("Tujuan pengalihan harus menggunakan HTTPS tanpa kredensial atau port khusus."), { status: 400, code: "INVALID_REDIRECT_TARGET" });
  }
  if (target.hostname.toLowerCase() === sourceHostname.toLowerCase()) {
    throw Object.assign(new Error("Tujuan tidak boleh kembali ke alamat sumber karena dapat menyebabkan pengalihan berulang."), { status: 400, code: "REDIRECT_LOOP" });
  }
  target.hash = "";
  return target.href;
}

function activeAdditionalAddress(domain, hostname) {
  const records = Array.isArray(domain?.ownership_verification?.additional_hostnames)
    ? domain.ownership_verification.additional_hostnames
    : [];
  return records.some((record) => String(record?.hostname || "").toLowerCase() === hostname && record?.enabled !== false);
}

async function ensureSourceAddress(request, env, requestId, domain, host, source) {
  if (activeAdditionalAddress(domain, source)) return;
  const addressRequest = new Request(new URL("/api/domains/address", request.url), {
    method: "POST",
    headers: {
      authorization: request.headers.get("authorization") || "",
      "content-type": "application/json",
    },
    body: JSON.stringify({ domainId: domain.id, host, enabled: true }),
  });
  const result = await handleDomainRequest(addressRequest, env, requestId);
  if (!result.ok) {
    const payload = await result.json().catch(() => ({}));
    throw Object.assign(new Error(payload.error || "Alamat sumber belum dapat diaktifkan."), { status: result.status, code: payload.code || "REDIRECT_SOURCE_ACTIVATION_FAILED" });
  }
}

async function listRules(request, env, token, user, requestId) {
  const url = new URL(request.url);
  const domainId = String(url.searchParams.get("domainId") || "");
  const domain = await domainForManager(env, token, domainId, user.id);
  const rows = await rest(env, token, `site_domain_redirects?domain_id=eq.${encodeURIComponent(domain.id)}&select=${RULE_SELECT}&order=created_at.asc&limit=50`);
  return json(200, { domain: { id: domain.id, hostname: domain.hostname, status: domain.status }, redirects: rows || [], limit: 50 }, requestId);
}

async function upsertRule(request, env, token, user, requestId) {
  const body = await request.json().catch(() => ({}));
  const domain = await domainForManager(env, token, String(body.domainId || ""), user.id);
  if (domain.provider !== "cloudflare-full-zone" || domain.status !== "active" || domain.provider_status !== "active") {
    return json(409, { code: "ROOT_DOMAIN_NOT_ACTIVE", error: "Aktifkan dan verifikasi domain utama sebelum membuat pengalihan." }, requestId);
  }
  const count = await rest(env, token, `site_domain_redirects?domain_id=eq.${encodeURIComponent(domain.id)}&select=id&limit=51`);
  const { host, source } = normalizeSource(body.source || body.sourceHostname, domain.hostname);
  const targetUrl = normalizeTarget(body.target || body.targetUrl, domain.hostname, source);
  const existing = await rest(env, token, `site_domain_redirects?source_hostname=eq.${encodeURIComponent(source)}&select=${RULE_SELECT}&limit=1`);
  if (!existing?.[0] && (count?.length || 0) >= 50) {
    return json(409, { code: "REDIRECT_LIMIT_REACHED", error: "Maksimal 50 aturan pengalihan untuk satu domain." }, requestId);
  }
  if (existing?.[0]?.locked) {
    return json(409, { code: "REDIRECT_LOCKED", error: "Aturan ini sedang dikunci. Buka kunci sebelum mengubahnya." }, requestId);
  }
  await ensureSourceAddress(request, env, requestId, domain, host, source);
  const now = new Date().toISOString();
  const rows = await rest(
    env,
    token,
    `site_domain_redirects?on_conflict=source_hostname&select=${RULE_SELECT}`,
    {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=representation",
      body: JSON.stringify({
        site_id: domain.site_id,
        domain_id: domain.id,
        source_hostname: source,
        target_url: targetUrl,
        enabled: body.enabled !== false,
        locked: false,
        permanent: body.permanent !== false,
        preserve_path: body.preservePath !== false,
        created_by: user.id,
        updated_at: now,
      }),
    },
  );
  return json(existing?.[0] ? 200 : 201, { redirect: rows?.[0] || null, sourceAddressActivated: true }, requestId);
}

async function ruleForManager(env, token, id, userId) {
  const rows = await rest(env, token, `site_domain_redirects?id=eq.${encodeURIComponent(id)}&select=${RULE_SELECT}&limit=1`);
  const rule = rows?.[0];
  if (!rule) throw Object.assign(new Error("Aturan pengalihan tidak ditemukan."), { status: 404, code: "REDIRECT_NOT_FOUND" });
  await verifyManager(env, token, rule.site_id, userId);
  return rule;
}

async function changeRule(request, env, token, user, requestId, action) {
  const body = await request.json().catch(() => ({}));
  const rule = await ruleForManager(env, token, String(body.id || ""), user.id);
  if (action !== "lock" && rule.locked) return json(409, { code: "REDIRECT_LOCKED", error: "Aturan ini sedang dikunci. Buka kunci sebelum mengubahnya." }, requestId);
  if (action === "remove") {
    await rest(env, token, `site_domain_redirects?id=eq.${encodeURIComponent(rule.id)}`, { method: "DELETE", prefer: "return=minimal" });
    return json(200, { removed: true, id: rule.id }, requestId);
  }
  const patch = action === "lock"
    ? { locked: body.locked !== false }
    : { enabled: body.enabled !== false };
  const rows = await rest(env, token, `site_domain_redirects?id=eq.${encodeURIComponent(rule.id)}&select=${RULE_SELECT}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
  return json(200, { redirect: rows?.[0] || null }, requestId);
}

export async function handleDomainRedirectRequest(request, env, requestId = crypto.randomUUID()) {
  try {
    const url = new URL(request.url);
    const { user, token } = await verifyUser(request, env);
    if (request.method === "GET" && url.pathname === "/api/domain-redirects/list") return listRules(request, env, token, user, requestId);
    if (request.method === "POST" && url.pathname === "/api/domain-redirects/upsert") return upsertRule(request, env, token, user, requestId);
    if (request.method === "POST" && url.pathname === "/api/domain-redirects/toggle") return changeRule(request, env, token, user, requestId, "toggle");
    if (request.method === "POST" && url.pathname === "/api/domain-redirects/lock") return changeRule(request, env, token, user, requestId, "lock");
    if (request.method === "POST" && url.pathname === "/api/domain-redirects/remove") return changeRule(request, env, token, user, requestId, "remove");
    return json(404, { error: "Endpoint pengalihan domain tidak ditemukan." }, requestId);
  } catch (error) {
    console.error("Domain redirect handler failed", { requestId, name: error?.name, code: error?.code, status: error?.status });
    return json(error.status || 500, { code: error.code || "DOMAIN_REDIRECT_ERROR", error: error.message || "Pengalihan domain mengalami gangguan sementara." }, requestId);
  }
}

function publicHeaders(env) {
  const { key } = config(env);
  return { apikey: key, authorization: `Bearer ${key}`, accept: "application/json" };
}

async function publicRule(hostname, env, context) {
  const host = String(hostname || "").toLowerCase();
  const cache = caches.default;
  const cacheKey = new Request(`https://domain-redirect-cache.ngeblogging.invalid/${encodeURIComponent(host)}`);
  const cached = await cache.match(cacheKey);
  if (cached) return cached.json().catch(() => null);
  const { url, key } = config(env);
  if (!url || !key) return null;
  const result = await fetch(`${url}/rest/v1/site_domain_redirects?source_hostname=eq.${encodeURIComponent(host)}&enabled=eq.true&select=target_url,permanent,preserve_path&limit=1`, { headers: publicHeaders(env) });
  const rows = result.ok ? await result.json().catch(() => []) : [];
  const rule = rows?.[0] || null;
  const response = new Response(JSON.stringify(rule), { headers: { "content-type": "application/json", "cache-control": `public, max-age=${rule ? 30 : 15}` } });
  if (context?.waitUntil) context.waitUntil(cache.put(cacheKey, response.clone()));
  else await cache.put(cacheKey, response.clone());
  return rule;
}

function finalTarget(requestUrl, rule) {
  const target = new URL(rule.target_url);
  if (rule.preserve_path !== false) {
    if (target.pathname === "/") target.pathname = requestUrl.pathname;
    else if (requestUrl.pathname !== "/") target.pathname = `${target.pathname.replace(/\/$/, "")}/${requestUrl.pathname.replace(/^\//, "")}`;
    if (!target.search && requestUrl.search) target.search = requestUrl.search;
  }
  return target;
}

export async function resolveDomainRedirect(request, env, context) {
  if (!new Set(["GET", "HEAD"]).has(request.method)) return null;
  const url = new URL(request.url);
  const hostname = url.hostname.toLowerCase();
  if (SYSTEM_HOSTS.has(hostname) || hostname.endsWith(".ngeblogging.com")) return null;
  const rule = await publicRule(hostname, env, context);
  if (!rule?.target_url) return null;
  const target = finalTarget(url, rule);
  if (target.hostname.toLowerCase() === hostname && target.pathname === url.pathname && target.search === url.search) return null;
  return new Response(null, {
    status: rule.permanent === false ? 307 : 308,
    headers: {
      location: target.href,
      "cache-control": "no-store",
      "x-ngeblogging-domain-redirect": "v59",
      "x-content-type-options": "nosniff",
    },
  });
}
