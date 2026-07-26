import {
  attachDefaultWorkerDomains,
  deleteFullZone,
  detachWorkerDomain,
  fullZoneProviderReady,
  getFullZoneStatus,
  getOrCreateFullZone,
  normalizeZoneName,
  publicZoneState,
} from "./cloudflare-full-zone-provider.mjs";

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
    url: String(
      env.SUPABASE_URL
      || env.VITE_SUPABASE_URL
      || "",
    ).replace(/\/$/, ""),
    publishableKey: String(
      env.SUPABASE_PUBLISHABLE_KEY
      || env.VITE_SUPABASE_PUBLISHABLE_KEY
      || env.VITE_SUPABASE_ANON_KEY
      || "",
    ),
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

function customDomainProvider(env) {
  const provider = String(
    env.CUSTOM_DOMAIN_PROVIDER || "",
  ).trim().toLowerCase();

  return provider === "cloudflare-full-zone"
    ? "cloudflare-full-zone"
    : "cloudflare-custom-hostnames";
}

function legacyReadiness(env) {
  const cf = domainConfig(env);
  const db = supabaseConfig(env);
  const missing = [];

  if (!cf.apiToken) missing.push("CLOUDFLARE_API_TOKEN");
  if (!cf.zoneId) missing.push("CLOUDFLARE_ZONE_ID");
  if (!cf.cnameTarget) {
    missing.push("CLOUDFLARE_CUSTOM_HOSTNAME_TARGET");
  }
  if (!db.url) missing.push("SUPABASE_URL");
  if (!db.publishableKey) {
    missing.push("SUPABASE_PUBLISHABLE_KEY");
  }

  return {
    enabled: missing.length === 0,
    missing,
    cnameTarget: cf.cnameTarget,
    databaseMode: "user-jwt-rls",
  };
}

function fullZoneReadiness(env) {
  const db = supabaseConfig(env);
  const apiToken = String(
    env.CLOUDFLARE_API_TOKEN || "",
  ).trim();
  const accountId = String(
    env.CLOUDFLARE_ACCOUNT_ID || "",
  ).trim();
  const workerService = String(
    env.CLOUDFLARE_WORKER_SERVICE || "ngeblogging",
  ).trim();

  const missing = [];

  if (!apiToken) {
    missing.push("CLOUDFLARE_API_TOKEN");
  }
  if (!/^[0-9a-f]{32}$/i.test(accountId)) {
    missing.push("CLOUDFLARE_ACCOUNT_ID");
  }
  if (!workerService) {
    missing.push("CLOUDFLARE_WORKER_SERVICE");
  }
  if (!db.url) {
    missing.push("SUPABASE_URL");
  }
  if (!db.publishableKey) {
    missing.push("SUPABASE_PUBLISHABLE_KEY");
  }

  const providerReady = fullZoneProviderReady(env);

  if (!providerReady && missing.length === 0) {
    missing.push("CLOUDFLARE_FULL_ZONE_PROVIDER");
  }

  return {
    enabled: missing.length === 0,
    missing,
    provider: "cloudflare-full-zone",
    providerMode: "full-zone",
    dnsMode: "nameserver",
    workerService,
    cnameTarget: null,
    databaseMode: "user-jwt-rls",
  };
}

function readiness(env) {
  return customDomainProvider(env) === "cloudflare-full-zone"
    ? fullZoneReadiness(env)
    : legacyReadiness(env);
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
  const {
    publishableKey,
  } = supabaseConfig(env);

  return {
    apikey: publishableKey,
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    ...(prefer ? { prefer } : {}),
  };
}

async function userJson(
  env,
  path,
  options = {},
) {
  const {
    url,
    publishableKey,
  } = supabaseConfig(env);

  const token = String(
    env?.DOMAIN_USER_TOKEN || "",
  ).trim();

  if (!url || !publishableKey || !token) {
    throw Object.assign(
      new Error(
        "Penyimpanan domain pengguna belum dikonfigurasi.",
      ),
      {
        status: 503,
        code: "DOMAIN_STORAGE_REQUIRED",
      },
    );
  }

  const result = await fetch(
    `${url}/rest/v1/${path}`,
    {
      ...options,
      headers: {
        ...userHeaders(
          env,
          token,
          options.prefer,
        ),
        ...(options.headers || {}),
      },
    },
  );

  const payload = await result
    .json()
    .catch(() => null);

  if (!result.ok) {
    const duplicate =
      result.status === 409
      || payload?.code === "23505";

    console.error(
      "Domain database request failed",
      {
        path,
        status: result.status,
        code: payload?.code,
      },
    );

    throw Object.assign(
      new Error(
        duplicate
          ? "Domain ini sudah terhubung ke situs lain."
          : "Penyimpanan domain belum dapat diproses.",
      ),
      {
        status: duplicate
          ? 409
          : result.status === 401
              || result.status === 403
            ? result.status
            : 503,
        code: duplicate
          ? "DOMAIN_ALREADY_USED"
          : "DOMAIN_DATABASE_ERROR",
      },
    );
  }

  return payload;
}

async function verifySiteManager(env, siteId, userId) {
  if (!/^[0-9a-f-]{36}$/i.test(String(siteId || ""))) throw Object.assign(new Error("Situs tidak valid."), { status: 400, code: "INVALID_SITE" });
  const rows = await userJson(env, `site_members?site_id=eq.${encodeURIComponent(siteId)}&user_id=eq.${encodeURIComponent(userId)}&select=role&limit=1`);
  const role = rows?.[0]?.role;
  if (!role) {
    const sites = await userJson(env, `sites?id=eq.${encodeURIComponent(siteId)}&owner_id=eq.${encodeURIComponent(userId)}&select=id&limit=1`);
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
  const rows = await userJson(env, `site_domains?id=eq.${encodeURIComponent(domainRow.id)}&select=${DOMAIN_SELECT}`, {
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
    await userJson(env, `site_domains?site_id=eq.${encodeURIComponent(saved.site_id)}&id=neq.${encodeURIComponent(saved.id)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ is_primary: false, updated_at: now }),
    });
    await userJson(env, `sites?id=eq.${encodeURIComponent(saved.site_id)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ custom_domain: saved.hostname, updated_at: now }),
    });
  }
  return saved;
}

async function listDomains(env, siteId) {
  return userJson(env, `site_domains?site_id=eq.${encodeURIComponent(siteId)}&select=${DOMAIN_SELECT}&order=created_at.desc&limit=20`);
}

function fullZoneInstructions(zoneState) {
  return {
    dnsMode: "nameserver",
    action: zoneState.active
      ? "zone-active"
      : "replace-nameservers",
    zoneName: zoneState.name,
    status: zoneState.status,
    nameServers: zoneState.nameServers,
    originalNameServers: zoneState.originalNameServers,
    message: zoneState.active
      ? "Zone Cloudflare sudah aktif."
      : "Ganti nameserver domain dengan dua nameserver Cloudflare berikut.",
  };
}

function fullZoneOwnership(zoneState) {
  return {
    method: "nameserver",
    zone_name: zoneState.name,
    required_name_servers: zoneState.nameServers,
    original_name_servers: zoneState.originalNameServers,
  };
}

function publicWorkerDomain(workerDomain) {
  if (!workerDomain) return null;

  return {
    id: String(workerDomain.id || ""),
    certificateId:
      String(workerDomain.cert_id || "") || null,
    hostname: String(workerDomain.hostname || ""),
    service: String(workerDomain.service || ""),
    zoneId: String(workerDomain.zone_id || ""),
    zoneName: String(workerDomain.zone_name || ""),
  };
}

function workerDomainsReady(workerDomains) {
  return Boolean(
    workerDomains?.apex?.id
    && workerDomains?.apex?.cert_id
    && workerDomains?.www?.id
    && workerDomains?.www?.cert_id
  );
}

async function saveFullZoneRefreshState(
  env,
  domainRow,
  zoneState,
  workerDomains = null,
) {
  const now = new Date().toISOString();
  const attached =
    workerDomainsReady(workerDomains);
  const active =
    zoneState.active && attached;
  const failed =
    zoneState.status === "moved";

  const sslValidation = attached
    ? [
        publicWorkerDomain(
          workerDomains.apex,
        ),
        publicWorkerDomain(
          workerDomains.www,
        ),
      ]
    : [];

  const update = {
    status: active
      ? "active"
      : failed
        ? "failed"
        : "verifying",
    provider: "cloudflare-full-zone",
    provider_hostname_id:
      zoneState.id
      || domainRow.provider_hostname_id,
    provider_status: zoneState.status,
    ssl_status: active
      ? "active"
      : "pending",
    ownership_verification:
      fullZoneOwnership(zoneState),
    ssl_validation: sslValidation,
    last_checked_at: now,
    verified_at: active
      ? domainRow.verified_at || now
      : null,
    is_primary: active,
    error_message: failed
      ? "Cloudflare tidak lagi mendeteksi nameserver yang diwajibkan."
      : null,
    updated_at: now,
  };

  const rows = await userJson(
    env,
    `site_domains?id=eq.${encodeURIComponent(domainRow.id)}&select=${DOMAIN_SELECT}`,
    {
      method: "PATCH",
      prefer: "return=representation",
      body: JSON.stringify(update),
    },
  );

  const saved = rows?.[0] || {
    ...domainRow,
    ...update,
  };

  if (active) {
    await userJson(
      env,
      `site_domains?site_id=eq.${encodeURIComponent(saved.site_id)}&id=neq.${encodeURIComponent(saved.id)}`,
      {
        method: "PATCH",
        prefer: "return=minimal",
        body: JSON.stringify({
          is_primary: false,
          updated_at: now,
        }),
      },
    );

    await userJson(
      env,
      `sites?id=eq.${encodeURIComponent(saved.site_id)}`,
      {
        method: "PATCH",
        prefer: "return=minimal",
        body: JSON.stringify({
          custom_domain: saved.hostname,
          updated_at: now,
        }),
      },
    );
  }

  return saved;
}

async function refreshFullZoneDomain(
  env,
  domain,
  requestId,
) {
  const zoneId = String(
    domain.provider_hostname_id || "",
  ).trim();

  if (!/^[0-9a-f]{32}$/i.test(zoneId)) {
    return response(
      409,
      {
        code: "INVALID_FULL_ZONE_ID",
        error: "Domain belum memiliki Cloudflare Zone ID yang valid.",
      },
      requestId,
    );
  }

  const zone = await getFullZoneStatus(
    env,
    zoneId,
  );

  const zoneState =
    publicZoneState(zone);

  if (
    zoneState.id !== zoneId
    || zoneState.name !== domain.hostname
  ) {
    throw Object.assign(
      new Error(
        "Cloudflare Zone tidak cocok dengan domain yang tersimpan.",
      ),
      {
        code: "FULL_ZONE_MISMATCH",
        status: 409,
      },
    );
  }

  let workerDomains = null;

  if (zoneState.active) {
    workerDomains =
      await attachDefaultWorkerDomains(
        env,
        zone,
      );
  }

  const saved =
    await saveFullZoneRefreshState(
      env,
      domain,
      zoneState,
      workerDomains,
    );

  return response(
    200,
    {
      domain: saved,
      provider: "cloudflare-full-zone",
      zone: zoneState,
      instructions:
        fullZoneInstructions(zoneState),
      attached:
        workerDomainsReady(workerDomains),
      workerDomains: workerDomains
        ? {
            apex:
              publicWorkerDomain(
                workerDomains.apex,
              ),
            www:
              publicWorkerDomain(
                workerDomains.www,
              ),
          }
        : null,
      cnameTarget: null,
    },
    requestId,
  );
}

async function registerFullZoneDomain(
  body,
  env,
  user,
  requestId,
) {
  const siteId = String(body.siteId || "");

  await verifySiteManager(
    env,
    siteId,
    user.id,
  );

  const hostname = normalizeZoneName(
    body.hostname,
  );

  const existing = await userJson(
    env,
    `site_domains?hostname=eq.${encodeURIComponent(hostname)}&select=${DOMAIN_SELECT}&limit=1`,
  );

  const existingDomain = existing?.[0] || null;

  if (
    existingDomain
    && existingDomain.site_id !== siteId
  ) {
    return response(
      409,
      {
        code: "DOMAIN_ALREADY_USED",
        error: "Domain ini sudah terhubung ke situs lain.",
      },
      requestId,
    );
  }

  if (
    existingDomain?.provider_hostname_id
    && existingDomain.provider
    && existingDomain.provider !== "cloudflare-full-zone"
  ) {
    return response(
      409,
      {
        code: "DOMAIN_PROVIDER_MISMATCH",
        error: "Domain ini masih terhubung melalui provider lama.",
      },
      requestId,
    );
  }

  const {
    zone,
    reused: zoneReused,
  } = await getOrCreateFullZone(
    env,
    hostname,
  );

  const zoneState = publicZoneState(zone);

  if (
    !/^[0-9a-f]{32}$/i.test(zoneState.id)
    || zoneState.name !== hostname
  ) {
    throw Object.assign(
      new Error(
        "Cloudflare tidak mengembalikan zone yang valid.",
      ),
      {
        code: "INVALID_FULL_ZONE_RESPONSE",
        status: 502,
      },
    );
  }

  if (
    zoneState.nameServers.length < 2
    && !zoneState.active
  ) {
    throw Object.assign(
      new Error(
        "Cloudflare belum memberikan nameserver untuk domain ini.",
      ),
      {
        code: "FULL_ZONE_NAMESERVERS_UNAVAILABLE",
        status: 502,
      },
    );
  }

  const now = new Date().toISOString();

  const domainState = {
    status: "verifying",
    provider: "cloudflare-full-zone",
    provider_hostname_id: zoneState.id,
    provider_status: zoneState.status,
    ssl_status: "pending",
    ownership_verification:
      fullZoneOwnership(zoneState),
    ssl_validation: [],
    last_checked_at: now,
    error_message: null,
    is_primary: false,
    verified_at: null,
    updated_at: now,
  };

  let row;

  if (existingDomain) {
    const rows = await userJson(
      env,
      `site_domains?id=eq.${encodeURIComponent(existingDomain.id)}&select=${DOMAIN_SELECT}`,
      {
        method: "PATCH",
        prefer: "return=representation",
        body: JSON.stringify(domainState),
      },
    );

    row = rows?.[0] || {
      ...existingDomain,
      ...domainState,
    };
  } else {
    const rows = await userJson(
      env,
      `site_domains?select=${DOMAIN_SELECT}`,
      {
        method: "POST",
        prefer: "return=representation",
        body: JSON.stringify({
          site_id: siteId,
          hostname,
          ...domainState,
        }),
      },
    );

    row = rows?.[0];
  }

  if (!row) {
    throw Object.assign(
      new Error(
        "Data full-zone gagal disimpan.",
      ),
      {
        code: "FULL_ZONE_STORAGE_FAILED",
        status: 503,
      },
    );
  }

  return response(
    existingDomain ? 200 : 201,
    {
      domain: row,
      provider: "cloudflare-full-zone",
      reused: Boolean(existingDomain) || zoneReused,
      zone: zoneState,
      instructions:
        fullZoneInstructions(zoneState),
      cnameTarget: null,
    },
    requestId,
  );
}

async function registerDomain(request, env, user, requestId) {
  const ready = readiness(env);

  if (!ready.enabled) {
    return response(
      503,
      {
        code: "CUSTOM_DOMAIN_NOT_CONFIGURED",
        error: "Custom domain belum dibuka karena konfigurasi produksi belum lengkap.",
        ...ready,
      },
      requestId,
    );
  }

  const body = await request.json().catch(() => ({}));

  if (ready.provider === "cloudflare-full-zone") {
    return registerFullZoneDomain(
      body,
      env,
      user,
      requestId,
    );
  }
  const siteId = String(body.siteId || "");
  await verifySiteManager(env, siteId, user.id);
  const hostname = normalizeHostname(body.hostname);

  const existing = await userJson(env, `site_domains?hostname=eq.${encodeURIComponent(hostname)}&select=${DOMAIN_SELECT}&limit=1`);
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
    const rows = await userJson(env, `site_domains?id=eq.${encodeURIComponent(existing[0].id)}&select=${DOMAIN_SELECT}`, {
      method: "PATCH",
      prefer: "return=representation",
      body: JSON.stringify({ provider_hostname_id: provider.id, provider_status: state.providerStatus, ssl_status: state.sslStatus, status: state.status, ownership_verification: state.ownershipVerification, ssl_validation: state.sslValidation, last_checked_at: now, error_message: state.errorMessage, updated_at: now }),
    });
    row = rows?.[0];
  } else {
    const rows = await userJson(env, `site_domains?select=${DOMAIN_SELECT}`, {
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
  const rows = await userJson(env, `site_domains?id=eq.${encodeURIComponent(domainId)}&select=${DOMAIN_SELECT}&limit=1`);
  const domain = rows?.[0];
  if (!domain) return response(404, { error: "Domain tidak ditemukan." }, requestId);
  await verifySiteManager(env, domain.site_id, user.id);

  if (domain.provider === "cloudflare-full-zone") {
    return refreshFullZoneDomain(
      env,
      domain,
      requestId,
    );
  }

  if (!domain.provider_hostname_id) return response(409, { error: "Domain belum memiliki ID Cloudflare." }, requestId);
  const provider = await cloudflareRequest(env, `/custom_hostnames/${encodeURIComponent(domain.provider_hostname_id)}`, { method: "GET" });
  const saved = await saveProviderState(env, domain, provider);
  return response(200, { domain: saved, cnameTarget: readiness(env).cnameTarget }, requestId);
}

function fullZoneWorkerDomainIds(domain) {
  const records = Array.isArray(
    domain?.ssl_validation,
  )
    ? domain.ssl_validation
    : [];

  return [
    ...new Set(
      records
        .map((record) =>
          String(record?.id || "").trim(),
        )
        .filter((id) =>
          /^[a-z0-9_-]{1,128}$/i.test(id),
        ),
    ),
  ];
}

async function detachStoredWorkerDomains(
  env,
  domain,
) {
  const domainIds =
    fullZoneWorkerDomainIds(domain);

  const detachedIds = [];

  for (const domainId of domainIds) {
    try {
      await detachWorkerDomain(
        env,
        domainId,
      );

      detachedIds.push(domainId);
    } catch (error) {
      /*
       * Jika domain sebelumnya sudah terlepas,
       * operasi tetap dianggap aman dan dapat
       * dilanjutkan.
       */
      if (error?.providerStatus === 404) {
        continue;
      }

      throw error;
    }
  }

  return detachedIds;
}

function fullZoneRemovalInstructions(domain) {
  return {
    stage: "awaiting-nameserver-change",
    requiredAction:
      "Ganti nameserver domain di registrar ke penyedia DNS baru sebelum menghapus zone Cloudflare.",
    finalConfirmationRequired: true,
    zoneDeleted: false,
    domain: domain.hostname,
  };
}

async function requestFullZoneRemoval(
  env,
  domain,
  requestId,
) {
  if (domain.status === "pending_deletion") {
    return response(
      200,
      {
        domain,
        provider:
          "cloudflare-full-zone",
        reused: true,
        removal:
          fullZoneRemovalInstructions(
            domain,
          ),
      },
      requestId,
    );
  }

  const detachedIds =
    await detachStoredWorkerDomains(
      env,
      domain,
    );

  const now =
    new Date().toISOString();

  const currentOwnership =
    domain.ownership_verification
    && typeof domain.ownership_verification
      === "object"
    && !Array.isArray(
      domain.ownership_verification,
    )
      ? domain.ownership_verification
      : {};

  const update = {
    status: "pending_deletion",
    is_primary: false,
    verified_at: null,
    ssl_status: "pending",
    ssl_validation: [],
    ownership_verification: {
      ...currentOwnership,
      removal: {
        stage:
          "awaiting-nameserver-change",
        requested_at: now,
        final_confirmation_required:
          true,
        zone_deleted: false,
      },
    },
    last_checked_at: now,
    error_message: null,
    updated_at: now,
  };

  const rows = await userJson(
    env,
    `site_domains?id=eq.${encodeURIComponent(domain.id)}&select=${DOMAIN_SELECT}`,
    {
      method: "PATCH",
      prefer: "return=representation",
      body: JSON.stringify(update),
    },
  );

  const saved = rows?.[0] || {
    ...domain,
    ...update,
  };

  await userJson(
    env,
    `sites?id=eq.${encodeURIComponent(domain.site_id)}&custom_domain=eq.${encodeURIComponent(domain.hostname)}`,
    {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({
        custom_domain: null,
        updated_at: now,
      }),
    },
  );

  return response(
    202,
    {
      domain: saved,
      provider:
        "cloudflare-full-zone",
      detachedWorkerDomainCount:
        detachedIds.length,
      removal:
        fullZoneRemovalInstructions(
          saved,
        ),
    },
    requestId,
  );
}

function validFinalRemovalConfirmation(
  body,
  domain,
) {
  const confirmation = String(
    body?.confirmation || "",
  ).trim().toLowerCase();

  const hostname = String(
    domain?.hostname || "",
  ).trim().toLowerCase();

  return (
    body?.confirmFinal === true
    && confirmation === hostname
  );
}

function finalRemovalInstructions(
  domain,
  zoneState = null,
) {
  const zoneStatus = String(
    zoneState?.status
    || domain?.provider_status
    || "unknown",
  ).toLowerCase();

  return {
    stage: zoneStatus === "moved"
      ? "ready-to-delete-zone"
      : "awaiting-nameserver-change",
    confirmationRequired: true,
    confirmationValue: domain.hostname,
    zoneStatus,
    zoneDeleted: false,
    message: zoneStatus === "moved"
      ? "Nameserver Cloudflare sudah tidak digunakan. Zone siap dihapus."
      : "Ganti nameserver domain dahulu, kemudian tunggu status Cloudflare menjadi moved.",
  };
}

async function finalizeFullZoneRemoval(
  body,
  env,
  domain,
  requestId,
) {
  if (domain.status !== "pending_deletion") {
    return response(
      409,
      {
        code:
          "FULL_ZONE_REMOVAL_NOT_REQUESTED",
        error:
          "Lakukan tahap Lepaskan domain terlebih dahulu.",
      },
      requestId,
    );
  }

  if (
    !validFinalRemovalConfirmation(
      body,
      domain,
    )
  ) {
    return response(
      400,
      {
        code:
          "FULL_ZONE_FINAL_CONFIRMATION_REQUIRED",
        error:
          `Ketik ${domain.hostname} untuk mengonfirmasi penghapusan final.`,
        confirmationValue:
          domain.hostname,
      },
      requestId,
    );
  }

  const zoneId = String(
    domain.provider_hostname_id || "",
  ).trim();

  if (!/^[0-9a-f]{32}$/i.test(zoneId)) {
    return response(
      409,
      {
        code: "INVALID_FULL_ZONE_ID",
        error:
          "Cloudflare Zone ID tidak valid.",
      },
      requestId,
    );
  }

  /*
   * Aman dipanggil ulang. Jika masih ada
   * Worker Domain tersimpan, lepaskan dahulu.
   */
  await detachStoredWorkerDomains(
    env,
    domain,
  );

  let zoneState = null;
  let zoneAlreadyGone = false;

  try {
    const zone =
      await getFullZoneStatus(
        env,
        zoneId,
      );

    zoneState =
      publicZoneState(zone);
  } catch (error) {
    /*
     * Cloudflare dapat menghapus zone moved
     * secara otomatis. HTTP 404 berarti zone
     * sudah tidak ada dan proses lokal boleh
     * diselesaikan.
     */
    if (error?.providerStatus === 404) {
      zoneAlreadyGone = true;
    } else {
      throw error;
    }
  }

  if (!zoneAlreadyGone) {
    if (
      zoneState.id !== zoneId
      || zoneState.name !== domain.hostname
    ) {
      throw Object.assign(
        new Error(
          "Cloudflare Zone tidak cocok dengan domain yang tersimpan.",
        ),
        {
          code: "FULL_ZONE_MISMATCH",
          status: 409,
        },
      );
    }

    if (zoneState.status !== "moved") {
      return response(
        409,
        {
          code:
            "FULL_ZONE_STILL_AUTHORITATIVE",
          error:
            "Zone belum boleh dihapus karena nameserver Cloudflare masih digunakan atau perubahan belum terdeteksi.",
          zone: zoneState,
          removal:
            finalRemovalInstructions(
              domain,
              zoneState,
            ),
        },
        requestId,
      );
    }

    await deleteFullZone(
      env,
      zoneId,
    );
  }

  const now =
    new Date().toISOString();

  await userJson(
    env,
    `site_domains?id=eq.${encodeURIComponent(domain.id)}`,
    {
      method: "DELETE",
      prefer: "return=minimal",
    },
  );

  await userJson(
    env,
    `sites?id=eq.${encodeURIComponent(domain.site_id)}&custom_domain=eq.${encodeURIComponent(domain.hostname)}`,
    {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({
        custom_domain: null,
        updated_at: now,
      }),
    },
  );

  return response(
    200,
    {
      removed: true,
      provider:
        "cloudflare-full-zone",
      hostname: domain.hostname,
      zoneId,
      zoneDeleted:
        !zoneAlreadyGone,
      zoneAlreadyGone,
      zone: zoneState,
    },
    requestId,
  );
}

async function removeDomain(request, env, user, requestId) {
  const body = await request.json().catch(() => ({}));
  const domainId = String(body.domainId || "");
  const rows = await userJson(env, `site_domains?id=eq.${encodeURIComponent(domainId)}&select=${DOMAIN_SELECT}&limit=1`);
  const domain = rows?.[0];
  if (!domain) return response(404, { error: "Domain tidak ditemukan." }, requestId);
  await verifySiteManager(env, domain.site_id, user.id);

  if (domain.provider === "cloudflare-full-zone") {
    if (body.confirmFinal === true) {
      return finalizeFullZoneRemoval(
        body,
        env,
        domain,
        requestId,
      );
    }

    return requestFullZoneRemoval(
      env,
      domain,
      requestId,
    );
  }

  if (domain.provider_hostname_id && readiness(env).enabled) await cloudflareRequest(env, `/custom_hostnames/${encodeURIComponent(domain.provider_hostname_id)}`, { method: "DELETE" });
  await userJson(env, `site_domains?id=eq.${encodeURIComponent(domain.id)}`, { method: "DELETE", prefer: "return=minimal" });
  await userJson(env, `sites?id=eq.${encodeURIComponent(domain.site_id)}&custom_domain=eq.${encodeURIComponent(domain.hostname)}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ custom_domain: null, updated_at: new Date().toISOString() }) });
  return response(200, { removed: true }, requestId);
}

export async function handleDomainRequest(
  request,
  env,
  requestId = crypto.randomUUID(),
) {
  try {
    const url = new URL(request.url);

    const {
      user,
      token,
    } = await verifyUser(
      request,
      env,
    );

    /*
     * Konteks dibuat khusus untuk satu request.
     * JWT tidak ditulis ke env global dan tidak
     * dapat tertukar dengan request pengguna lain.
     */
    const requestEnv =
      Object.create(env);

    Object.defineProperty(
      requestEnv,
      "DOMAIN_USER_TOKEN",
      {
        value: token,
        enumerable: false,
        configurable: false,
        writable: false,
      },
    );

    if (
      request.method === "GET"
      && url.pathname === "/api/domains/config"
    ) {
      return response(
        200,
        readiness(requestEnv),
        requestId,
      );
    }

    if (
      request.method === "GET"
      && url.pathname === "/api/domains/list"
    ) {
      const siteId = String(
        url.searchParams.get("siteId") || "",
      );

      await verifySiteManager(
        requestEnv,
        siteId,
        user.id,
      );

      return response(
        200,
        {
          domains: await listDomains(
            requestEnv,
            siteId,
          ),
          ...readiness(requestEnv),
        },
        requestId,
      );
    }

    if (
      request.method === "POST"
      && url.pathname === "/api/domains/register"
    ) {
      return registerDomain(
        request,
        requestEnv,
        user,
        requestId,
      );
    }

    if (
      request.method === "POST"
      && url.pathname === "/api/domains/refresh"
    ) {
      return refreshDomain(
        request,
        requestEnv,
        user,
        requestId,
      );
    }

    if (
      request.method === "POST"
      && url.pathname === "/api/domains/remove"
    ) {
      return removeDomain(
        request,
        requestEnv,
        user,
        requestId,
      );
    }

    return response(
      404,
      {
        error:
          "Endpoint domain tidak ditemukan.",
      },
      requestId,
    );
  } catch (error) {
    console.error(
      "Domain handler failed",
      {
        requestId,
        name: error?.name,
        code: error?.code,
        status: error?.status,
      },
    );

    return response(
      error.status || 500,
      {
        code:
          error.code || "DOMAIN_ERROR",
        error:
          error.message
          || "Pengelolaan domain mengalami gangguan sementara.",
      },
      requestId,
    );
  }
}
