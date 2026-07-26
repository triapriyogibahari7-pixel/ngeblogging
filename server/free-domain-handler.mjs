const DOMAIN_SELECT = "id,site_id,hostname,status,verification_token,is_primary,verified_at,created_at,updated_at,provider,provider_hostname_id,provider_status,ssl_status,ownership_verification,ssl_validation,last_checked_at,error_message";
const NETLIFY_APEX_IP = "75.2.60.5";
const DEFAULT_NETLIFY_HOST = "ngeblogging.netlify.app";

function response(status, body, requestId = "") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
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
    publishableKey: String(env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || ""),
  };
}

function netlifyConfig(env) {
  const hostname = String(env.NETLIFY_SITE_HOSTNAME || DEFAULT_NETLIFY_HOST)
    .trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  return {
    token: String(env.NETLIFY_AUTH_TOKEN || "").trim(),
    siteId: String(env.NETLIFY_SITE_ID || hostname).trim(),
    hostname,
  };
}

export function freeDomainReadiness(env) {
  const db = supabaseConfig(env);
  const netlify = netlifyConfig(env);
  const databaseAccess = Boolean(db.url && db.publishableKey);
  const bridgeHostname = Boolean(netlify.hostname && netlify.hostname.endsWith(".netlify.app"));
  const automation = Boolean(netlify.token && netlify.siteId);
  return {
    enabled: databaseAccess && bridgeHostname,
    provider: "netlify",
    mode: automation ? "netlify-api" : "netlify-manual",
    automation,
    cnameTarget: netlify.hostname,
    apexTarget: NETLIFY_APEX_IP,
    databaseMode: "user-jwt-rls",
    serviceRoleRequired: false,
    bindings: {
      databaseAccess,
      bridgeHostname,
      apiToken: Boolean(netlify.token),
      siteId: Boolean(netlify.siteId),
      providerApi: automation,
      cnameTarget: bridgeHostname,
      zoneId: false,
    },
  };
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

function userHeaders(env, token, prefer = "") {
  return {
    apikey: supabaseConfig(env).publishableKey,
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    ...(prefer ? { prefer } : {}),
  };
}

async function userJson(env, token, path, options = {}) {
  const { url, publishableKey } = supabaseConfig(env);
  if (!url || !publishableKey) throw Object.assign(new Error("Penyimpanan domain belum dikonfigurasi."), { status: 503, code: "DOMAIN_STORAGE_REQUIRED" });
  const result = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: { ...userHeaders(env, token, options.prefer), ...(options.headers || {}) },
  });
  const payload = await result.json().catch(() => null);
  if (!result.ok) {
    const duplicate = result.status === 409 || payload?.code === "23505";
    throw Object.assign(
      new Error(duplicate ? "Domain ini sudah terhubung ke situs lain." : "Penyimpanan domain belum dapat diproses."),
      { status: duplicate ? 409 : result.status === 401 || result.status === 403 ? result.status : 503, code: duplicate ? "DOMAIN_ALREADY_USED" : "DOMAIN_DATABASE_ERROR" },
    );
  }
  return payload;
}

async function verifySiteManager(env, token, siteId, userId) {
  if (!/^[0-9a-f-]{36}$/i.test(String(siteId || ""))) throw Object.assign(new Error("Situs tidak valid."), { status: 400, code: "INVALID_SITE" });
  const memberships = await userJson(env, token, `site_members?site_id=eq.${encodeURIComponent(siteId)}&user_id=eq.${encodeURIComponent(userId)}&select=role&limit=1`);
  if (new Set(["owner", "admin"]).has(memberships?.[0]?.role)) return;
  const sites = await userJson(env, token, `sites?id=eq.${encodeURIComponent(siteId)}&owner_id=eq.${encodeURIComponent(userId)}&select=id&limit=1`);
  if (sites?.[0]) return;
  throw Object.assign(new Error("Hanya pemilik atau admin situs yang dapat mengelola domain."), { status: 403, code: "SITE_MANAGER_REQUIRED" });
}

function normalizeHostname(input) {
  let value = String(input || "").trim().toLowerCase();
  if (!value) throw Object.assign(new Error("Masukkan nama domain."), { status: 400, code: "HOSTNAME_REQUIRED" });
  if (!value.includes("://")) value = `https://${value}`;
  let parsed;
  try { parsed = new URL(value); }
  catch { throw Object.assign(new Error("Format domain tidak valid."), { status: 400, code: "INVALID_HOSTNAME" }); }
  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (parsed.pathname !== "/" || parsed.search || parsed.hash || parsed.port || parsed.username || parsed.password) throw Object.assign(new Error("Masukkan domain saja tanpa path, parameter, port, atau kredensial."), { status: 400, code: "INVALID_HOSTNAME" });
  if (hostname.length < 4 || hostname.length > 253 || !hostname.includes(".") || !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])$/.test(hostname) || hostname.includes("..")) throw Object.assign(new Error("Nama domain tidak valid."), { status: 400, code: "INVALID_HOSTNAME" });
  if (hostname === "ngeblogging.com" || hostname.endsWith(".ngeblogging.com")) throw Object.assign(new Error("Gunakan pengaturan subdomain gratis untuk alamat *.ngeblogging.com."), { status: 400, code: "USE_FREE_SUBDOMAIN" });
  return hostname;
}

function verificationToken() {
  return crypto.randomUUID().replaceAll("-", "");
}

function routingRecord(hostname, addressType, netlifyHostname) {
  if (addressType === "apex") {
    return {
      label: "1 · Arahkan domain utama",
      note: "Buat record A pada @ atau nama domain utama.",
      type: "A",
      name: hostname,
      value: NETLIFY_APEX_IP,
      purpose: "routing",
    };
  }
  return {
    label: "1 · Arahkan WWW/subdomain",
    note: "Buat record CNAME untuk WWW atau subdomain ini.",
    type: "CNAME",
    name: hostname,
    value: netlifyHostname,
    purpose: "routing",
  };
}

function ownershipRecord(hostname, token) {
  return {
    label: "2 · Verifikasi kepemilikan",
    note: "Record TXT resmi Ngeblogging untuk membuktikan bahwa domain dikelola pemilik situs.",
    type: "TXT",
    name: `_ngeblogging-verification.${hostname}`,
    value: `ngeblogging-site-verification=${token}`,
    purpose: "ownership",
  };
}

async function netlifyRequest(env, path, options = {}) {
  const config = netlifyConfig(env);
  if (!config.token || !config.siteId) throw Object.assign(new Error("Otomatisasi Netlify belum diberi token; gunakan mode manual atau jalankan skrip Codespaces."), { status: 409, code: "NETLIFY_MANUAL_MODE" });
  const result = await fetch(`https://api.netlify.com/api/v1${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${config.token}`,
      accept: "application/json",
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await result.json().catch(() => ({}));
  if (!result.ok) throw Object.assign(new Error(payload?.message || payload?.error || `Netlify gagal memproses domain (${result.status}).`), { status: result.status >= 500 ? 502 : 409, code: "NETLIFY_DOMAIN_ERROR" });
  return payload;
}

async function addNetlifyAlias(env, hostname) {
  const config = netlifyConfig(env);
  const site = await netlifyRequest(env, `/sites/${encodeURIComponent(config.siteId)}`);
  const aliases = [...new Set([...(Array.isArray(site.domain_aliases) ? site.domain_aliases : []), hostname])];
  if (aliases.length > 50) throw Object.assign(new Error("Bridge Netlify ini sudah mencapai batas operasional 50 alias. Tambahkan bridge site berikutnya sebelum menerima domain baru."), { status: 409, code: "NETLIFY_ALIAS_CAPACITY" });
  await netlifyRequest(env, `/sites/${encodeURIComponent(config.siteId)}`, { method: "PATCH", body: JSON.stringify({ domain_aliases: aliases, force_ssl: true }) });
  return `${config.siteId}:${hostname}`;
}

async function removeNetlifyAlias(env, hostname) {
  const config = netlifyConfig(env);
  if (!config.token || !config.siteId) return false;
  const site = await netlifyRequest(env, `/sites/${encodeURIComponent(config.siteId)}`);
  const aliases = (Array.isArray(site.domain_aliases) ? site.domain_aliases : []).filter((alias) => String(alias).toLowerCase() !== hostname);
  await netlifyRequest(env, `/sites/${encodeURIComponent(config.siteId)}`, { method: "PATCH", body: JSON.stringify({ domain_aliases: aliases }) });
  return true;
}

async function provisionNetlifySsl(env) {
  const config = netlifyConfig(env);
  if (!config.token || !config.siteId) return false;
  try {
    await netlifyRequest(env, `/sites/${encodeURIComponent(config.siteId)}/ssl`, { method: "POST" });
    return true;
  } catch {
    return false;
  }
}

async function dnsAnswers(name, type) {
  const endpoints = [
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`,
    `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`,
  ];
  for (const endpoint of endpoints) {
    try {
      const result = await fetch(endpoint, { headers: { accept: "application/dns-json" }, cf: { cacheTtl: 30, cacheEverything: true } });
      if (!result.ok) continue;
      const payload = await result.json();
      if (Array.isArray(payload.Answer)) return payload.Answer.map((answer) => String(answer.data || "").replace(/^"|"$/g, "").replace(/\.$/, ""));
    } catch {}
  }
  return [];
}

async function verifyDns(domain) {
  const ownership = domain.ownership_verification || {};
  const routing = Array.isArray(domain.ssl_validation) ? domain.ssl_validation.find((record) => record?.purpose === "routing") || domain.ssl_validation[0] : null;
  const txt = ownership.name && ownership.value ? await dnsAnswers(ownership.name, "TXT") : [];
  const ownershipOk = txt.some((value) => value.replaceAll('" "', "") === ownership.value);
  let routingOk = false;
  if (routing?.type === "A") {
    routingOk = (await dnsAnswers(routing.name, "A")).includes(routing.value);
  } else if (routing?.type === "CNAME") {
    routingOk = (await dnsAnswers(routing.name, "CNAME")).some((value) => value.toLowerCase() === String(routing.value).toLowerCase().replace(/\.$/, ""));
  }
  return { ownershipOk, routingOk };
}

async function httpsReady(hostname) {
  try {
    const result = await fetch(`https://${hostname}/`, { method: "HEAD", redirect: "manual", cf: { cacheTtl: 0 } });
    return result.status >= 200 && result.status < 500;
  } catch {
    return false;
  }
}

async function listDomains(env, token, siteId) {
  return userJson(env, token, `site_domains?site_id=eq.${encodeURIComponent(siteId)}&select=${DOMAIN_SELECT}&order=created_at.desc&limit=50`);
}

async function registerDomain(request, env, user, token, requestId) {
  const ready = freeDomainReadiness(env);
  if (!ready.enabled) return response(503, { code: "FREE_DOMAIN_NOT_CONFIGURED", error: "Bridge domain gratis belum siap karena koneksi Supabase atau hostname Netlify belum tersedia.", ...ready }, requestId);
  const body = await request.json().catch(() => ({}));
  const siteId = String(body.siteId || "");
  await verifySiteManager(env, token, siteId, user.id);
  const hostname = normalizeHostname(body.hostname);
  const addressType = body.addressType === "apex" ? "apex" : "subdomain";
  const existing = await userJson(env, token, `site_domains?hostname=eq.${encodeURIComponent(hostname)}&select=${DOMAIN_SELECT}&limit=1`);
  if (existing?.[0] && existing[0].site_id !== siteId) return response(409, { code: "DOMAIN_ALREADY_USED", error: "Domain ini sudah terhubung ke situs lain." }, requestId);
  if (existing?.[0]) return response(200, { domain: existing[0], reused: true, ...ready }, requestId);

  const verifyToken = verificationToken();
  const routing = routingRecord(hostname, addressType, ready.cnameTarget);
  const ownership = ownershipRecord(hostname, verifyToken);
  let providerHostnameId = `manual:${hostname}`;
  let providerStatus = "manual_alias_required";
  let errorMessage = "Tambahkan domain ini sebagai Domain alias pada project Netlify ngeblogging, lalu pasang dua record DNS yang ditampilkan.";
  if (ready.automation) {
    providerHostnameId = await addNetlifyAlias(env, hostname);
    providerStatus = "dns_pending";
    errorMessage = null;
  }

  const now = new Date().toISOString();
  const rows = await userJson(env, token, `site_domains?select=${DOMAIN_SELECT}`, {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify({
      site_id: siteId,
      hostname,
      status: "verifying",
      verification_token: verifyToken,
      provider: "netlify",
      provider_hostname_id: providerHostnameId,
      provider_status: providerStatus,
      ssl_status: "pending",
      ownership_verification: ownership,
      ssl_validation: [routing],
      last_checked_at: now,
      error_message: errorMessage,
    }),
  });
  return response(201, { domain: rows?.[0], ...ready, manualActionRequired: !ready.automation }, requestId);
}

async function refreshDomain(request, env, user, token, requestId) {
  const body = await request.json().catch(() => ({}));
  const domainId = String(body.domainId || "");
  const rows = await userJson(env, token, `site_domains?id=eq.${encodeURIComponent(domainId)}&select=${DOMAIN_SELECT}&limit=1`);
  const domain = rows?.[0];
  if (!domain) return response(404, { error: "Domain tidak ditemukan." }, requestId);
  await verifySiteManager(env, token, domain.site_id, user.id);
  const ready = freeDomainReadiness(env);
  const dns = await verifyDns(domain);
  if (dns.ownershipOk && dns.routingOk && ready.automation) await provisionNetlifySsl(env);
  const sslActive = dns.ownershipOk && dns.routingOk ? await httpsReady(domain.hostname) : false;
  const active = dns.ownershipOk && dns.routingOk && sslActive;
  const now = new Date().toISOString();
  const errorMessage = active
    ? null
    : !dns.ownershipOk
      ? "Record TXT verifikasi kepemilikan belum ditemukan."
      : !dns.routingOk
        ? "Record A/CNAME belum mengarah ke bridge Netlify."
        : "DNS sudah benar; HTTPS Netlify masih diproses atau domain alias belum ditambahkan pada project Netlify.";
  const savedRows = await userJson(env, token, `site_domains?id=eq.${encodeURIComponent(domain.id)}&select=${DOMAIN_SELECT}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: JSON.stringify({
      status: active ? "active" : "verifying",
      provider_status: active ? "active" : dns.ownershipOk && dns.routingOk ? "dns_verified" : "dns_pending",
      ssl_status: active ? "active" : "pending",
      last_checked_at: now,
      verified_at: active ? (domain.verified_at || now) : null,
      is_primary: active,
      error_message: errorMessage,
      updated_at: now,
    }),
  });
  const saved = savedRows?.[0] || domain;
  if (active) {
    await userJson(env, token, `site_domains?site_id=eq.${encodeURIComponent(saved.site_id)}&id=neq.${encodeURIComponent(saved.id)}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ is_primary: false, updated_at: now }) });
    await userJson(env, token, `sites?id=eq.${encodeURIComponent(saved.site_id)}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ custom_domain: saved.hostname, updated_at: now }) });
  }
  return response(200, { domain: saved, dns, ...ready }, requestId);
}

async function removeDomain(request, env, user, token, requestId) {
  const body = await request.json().catch(() => ({}));
  const domainId = String(body.domainId || "");
  const rows = await userJson(env, token, `site_domains?id=eq.${encodeURIComponent(domainId)}&select=${DOMAIN_SELECT}&limit=1`);
  const domain = rows?.[0];
  if (!domain) return response(404, { error: "Domain tidak ditemukan." }, requestId);
  await verifySiteManager(env, token, domain.site_id, user.id);
  const aliasRemoved = await removeNetlifyAlias(env, domain.hostname).catch(() => false);
  await userJson(env, token, `site_domains?id=eq.${encodeURIComponent(domain.id)}`, { method: "DELETE", prefer: "return=minimal" });
  await userJson(env, token, `sites?id=eq.${encodeURIComponent(domain.site_id)}&custom_domain=eq.${encodeURIComponent(domain.hostname)}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ custom_domain: null, updated_at: new Date().toISOString() }) });
  return response(200, { removed: true, aliasRemoved, manualAliasRemovalRequired: !aliasRemoved }, requestId);
}

export async function handleFreeDomainRequest(request, env, requestId = crypto.randomUUID()) {
  try {
    const url = new URL(request.url);
    const { user, token } = await verifyUser(request, env);
    const ready = freeDomainReadiness(env);
    if (request.method === "GET" && url.pathname === "/api/domains/config") return response(200, ready, requestId);
    if (request.method === "GET" && url.pathname === "/api/domains/list") {
      const siteId = String(url.searchParams.get("siteId") || "");
      await verifySiteManager(env, token, siteId, user.id);
      return response(200, { domains: await listDomains(env, token, siteId), ...ready }, requestId);
    }
    if (request.method === "POST" && url.pathname === "/api/domains/register") return registerDomain(request, env, user, token, requestId);
    if (request.method === "POST" && url.pathname === "/api/domains/refresh") return refreshDomain(request, env, user, token, requestId);
    if (request.method === "POST" && url.pathname === "/api/domains/remove") return removeDomain(request, env, user, token, requestId);
    return response(404, { error: "Endpoint domain gratis tidak ditemukan." }, requestId);
  } catch (error) {
    console.error("Free domain handler failed", { requestId, name: error?.name, code: error?.code, status: error?.status });
    return response(error.status || 500, { code: error.code || "FREE_DOMAIN_ERROR", error: error.message || "Pengelolaan domain gratis mengalami gangguan sementara." }, requestId);
  }
}
