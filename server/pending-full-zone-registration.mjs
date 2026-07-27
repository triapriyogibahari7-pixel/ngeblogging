import {
  findFullZone,
  normalizeZoneName,
  publicZoneState,
} from "./cloudflare-full-zone-provider.mjs";

const DOMAIN_SELECT = "id,site_id,hostname,status,verification_token,is_primary,verified_at,created_at,updated_at,provider,provider_hostname_id,provider_status,ssl_status,ownership_verification,ssl_validation,last_checked_at,error_message";

function databaseConfig(env) {
  return {
    url: String(env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").replace(/\/$/, ""),
    key: String(
      env.SUPABASE_PUBLISHABLE_KEY
      || env.VITE_SUPABASE_PUBLISHABLE_KEY
      || env.VITE_SUPABASE_ANON_KEY
      || "",
    ).trim(),
  };
}

function bearerToken(request) {
  const value = String(request.headers.get("authorization") || "");
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

async function userJson(env, token, path, options = {}) {
  const { url, key } = databaseConfig(env);
  if (!url || !key || !token) return { ok: false, status: 503, data: null };

  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      authorization: `Bearer ${token}`,
      accept: "application/json",
      "content-type": "application/json",
      ...(options.prefer ? { prefer: options.prefer } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, data };
}

function response(status, body, requestId = "") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-ngeblogging-domain-accepted": "pending-full-zone-v65",
      ...(requestId ? { "x-request-id": requestId } : {}),
    },
  });
}

function pendingInstructions(zoneState) {
  const ready = zoneState.nameServers.length >= 2;
  return {
    dnsMode: "nameserver",
    action: ready ? "replace-nameservers" : "wait-for-nameservers",
    zoneName: zoneState.name,
    status: zoneState.status,
    nameServers: zoneState.nameServers,
    originalNameServers: zoneState.originalNameServers,
    automaticRefresh: true,
    message: ready
      ? "Ganti nameserver domain dengan dua nameserver Cloudflare berikut."
      : "Zone berhasil dibuat. Cloudflare sedang menyiapkan nameserver dan Ngeblogging akan memeriksanya otomatis.",
  };
}

export async function recoverPendingFullZoneRegistration(request, env, failureResponse = null) {
  const requestId = failureResponse?.headers.get("x-request-id") || crypto.randomUUID();
  const body = await request.clone().json().catch(() => ({}));
  const siteId = String(body.siteId || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(siteId)) return null;

  let hostname;
  try {
    hostname = normalizeZoneName(body.hostname);
  } catch {
    return null;
  }

  const token = bearerToken(request);
  if (!token) return null;

  const zone = await findFullZone(env, hostname).catch(() => null);
  const zoneState = publicZoneState(zone);
  if (
    !/^[0-9a-f]{32}$/i.test(zoneState.id)
    || zoneState.name !== hostname
  ) return null;

  const existingResult = await userJson(
    env,
    token,
    `site_domains?hostname=eq.${encodeURIComponent(hostname)}&select=${DOMAIN_SELECT}&limit=1`,
  );
  if (!existingResult.ok) return null;

  const existing = existingResult.data?.[0] || null;
  if (existing && existing.site_id !== siteId) return null;

  const now = new Date().toISOString();
  const ownership = {
    ...objectValue(existing?.ownership_verification),
    method: "nameserver",
    zone_name: zoneState.name,
    required_name_servers: zoneState.nameServers,
    original_name_servers: zoneState.originalNameServers,
    provisioning_state: zoneState.nameServers.length >= 2
      ? "nameservers-ready"
      : "awaiting-nameservers",
    automatic_refresh: true,
  };

  const state = {
    status: "verifying",
    provider: "cloudflare-full-zone",
    provider_hostname_id: zoneState.id,
    provider_status: zoneState.status || "pending",
    ssl_status: "pending",
    ownership_verification: ownership,
    ssl_validation: Array.isArray(existing?.ssl_validation) ? existing.ssl_validation : [],
    last_checked_at: now,
    error_message: null,
    is_primary: false,
    verified_at: null,
    updated_at: now,
  };

  const savedResult = existing
    ? await userJson(
        env,
        token,
        `site_domains?id=eq.${encodeURIComponent(existing.id)}&select=${DOMAIN_SELECT}`,
        {
          method: "PATCH",
          prefer: "return=representation",
          body: JSON.stringify(state),
        },
      )
    : await userJson(
        env,
        token,
        `site_domains?select=${DOMAIN_SELECT}`,
        {
          method: "POST",
          prefer: "return=representation",
          body: JSON.stringify({ site_id: siteId, hostname, ...state }),
        },
      );

  if (!savedResult.ok || !savedResult.data?.[0]) return null;

  return response(
    zoneState.nameServers.length >= 2 ? (existing ? 200 : 201) : 202,
    {
      domain: savedResult.data[0],
      provider: "cloudflare-full-zone",
      reused: Boolean(existing),
      accepted: true,
      pending: zoneState.nameServers.length < 2,
      zone: zoneState,
      instructions: pendingInstructions(zoneState),
      cnameTarget: null,
      requestId,
    },
    requestId,
  );
}
