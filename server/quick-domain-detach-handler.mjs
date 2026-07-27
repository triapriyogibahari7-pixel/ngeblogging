import { detachWorkerDomain } from "./cloudflare-full-zone-provider.mjs";

const DOMAIN_SELECT = "id,site_id,hostname,status,provider,provider_hostname_id,provider_status,ssl_status,ssl_validation,ownership_verification";

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
    publishableKey: String(
      env.SUPABASE_PUBLISHABLE_KEY
      || env.VITE_SUPABASE_PUBLISHABLE_KEY
      || env.VITE_SUPABASE_ANON_KEY
      || "",
    ),
  };
}

async function verifyUser(request, env) {
  const token = bearerToken(request);
  if (!token) {
    throw Object.assign(new Error("Silakan masuk untuk mengelola domain."), {
      status: 401,
      code: "AUTH_REQUIRED",
    });
  }

  const { url, publishableKey } = supabaseConfig(env);
  if (!url || !publishableKey) {
    throw Object.assign(new Error("Autentikasi domain belum dikonfigurasi."), {
      status: 503,
      code: "DOMAIN_AUTH_CONFIG_REQUIRED",
    });
  }

  const result = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${token}`,
    },
  });

  if (!result.ok) {
    throw Object.assign(new Error("Sesi pengguna tidak valid."), {
      status: 401,
      code: "INVALID_SESSION",
    });
  }

  return { user: await result.json(), token };
}

async function userJson(env, token, path, options = {}) {
  const { url, publishableKey } = supabaseConfig(env);
  const result = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: publishableKey,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(options.prefer ? { prefer: options.prefer } : {}),
      ...(options.headers || {}),
    },
  });

  const payload = await result.json().catch(() => null);
  if (!result.ok) {
    throw Object.assign(new Error("Penyimpanan domain belum dapat diproses."), {
      status: result.status === 401 || result.status === 403 ? result.status : 503,
      code: "DOMAIN_DATABASE_ERROR",
      providerStatus: result.status,
    });
  }

  return payload;
}

async function verifySiteManager(env, token, siteId, userId) {
  const members = await userJson(
    env,
    token,
    `site_members?site_id=eq.${encodeURIComponent(siteId)}&user_id=eq.${encodeURIComponent(userId)}&select=role&limit=1`,
  );
  const role = members?.[0]?.role;

  if (new Set(["owner", "admin"]).has(role)) return role;

  const sites = await userJson(
    env,
    token,
    `sites?id=eq.${encodeURIComponent(siteId)}&owner_id=eq.${encodeURIComponent(userId)}&select=id&limit=1`,
  );
  if (sites?.[0]) return "owner";

  throw Object.assign(new Error("Hanya pemilik atau admin situs yang dapat melepas domain."), {
    status: 403,
    code: "SITE_MANAGER_REQUIRED",
  });
}

function storedWorkerDomainIds(domain) {
  const records = Array.isArray(domain?.ssl_validation) ? domain.ssl_validation : [];
  return [...new Set(
    records
      .map((record) => String(record?.id || "").trim())
      .filter((id) => /^[a-z0-9_-]{1,128}$/i.test(id)),
  )];
}

async function detachWorkerDomains(env, domain) {
  const detached = [];

  for (const id of storedWorkerDomainIds(domain)) {
    try {
      await detachWorkerDomain(env, id);
      detached.push(id);
    } catch (error) {
      if (error?.providerStatus === 404) continue;
      throw error;
    }
  }

  return detached;
}

export async function handleQuickDomainDetach(
  request,
  env,
  requestId = crypto.randomUUID(),
) {
  try {
    const body = await request.json().catch(() => ({}));

    /*
     * Mode penghapusan zone lama tetap dapat dipanggil secara eksplisit.
     * Permintaan UI biasa selalu memakai detach reversibel.
     */
    if (body?.deleteZone === true || body?.confirmFinal === true) return null;

    const domainId = String(body?.domainId || "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(domainId)) {
      return response(400, {
        code: "INVALID_DOMAIN_ID",
        error: "Domain yang dipilih tidak valid.",
      }, requestId);
    }

    const { user, token } = await verifyUser(request, env);
    const rows = await userJson(
      env,
      token,
      `site_domains?id=eq.${encodeURIComponent(domainId)}&select=${DOMAIN_SELECT}&limit=1`,
    );
    const domain = rows?.[0] || null;

    if (!domain) {
      return response(404, {
        code: "DOMAIN_NOT_FOUND",
        error: "Domain tidak ditemukan.",
      }, requestId);
    }

    if (domain.provider !== "cloudflare-full-zone") return null;

    await verifySiteManager(env, token, domain.site_id, user.id);
    const detachedIds = await detachWorkerDomains(env, domain);
    const now = new Date().toISOString();

    await userJson(
      env,
      token,
      `sites?id=eq.${encodeURIComponent(domain.site_id)}&custom_domain=eq.${encodeURIComponent(domain.hostname)}`,
      {
        method: "PATCH",
        prefer: "return=minimal",
        body: JSON.stringify({ custom_domain: null, updated_at: now }),
      },
    );

    await userJson(
      env,
      token,
      `site_domains?id=eq.${encodeURIComponent(domain.id)}`,
      {
        method: "DELETE",
        prefer: "return=minimal",
      },
    );

    return response(200, {
      removed: true,
      reusable: true,
      provider: "cloudflare-full-zone",
      hostname: domain.hostname,
      zoneId: domain.provider_hostname_id || null,
      zonePreserved: Boolean(domain.provider_hostname_id),
      nameserverChangeRequired: false,
      detachedWorkerDomainCount: detachedIds.length,
      message: "Domain dilepaskan dari situs. Zone Cloudflare dan nameserver tetap disimpan agar domain dapat dipasang kembali kapan saja.",
    }, requestId);
  } catch (error) {
    console.error("Quick domain detach failed", {
      requestId,
      code: error?.code,
      status: error?.status,
    });

    return response(error?.status || 500, {
      code: error?.code || "DOMAIN_DETACH_ERROR",
      error: error?.message || "Domain belum dapat dilepaskan.",
    }, requestId);
  }
}
