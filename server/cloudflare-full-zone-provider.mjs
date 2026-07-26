const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";

function providerConfig(env) {
  const apiToken = String(env?.CLOUDFLARE_API_TOKEN || "").trim();
  const accountId = String(env?.CLOUDFLARE_ACCOUNT_ID || "").trim();
  const workerService = String(
    env?.CLOUDFLARE_WORKER_SERVICE || "ngeblogging",
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

  if (missing.length) {
    const error = new Error(
      `Konfigurasi Cloudflare belum lengkap: ${missing.join(", ")}`,
    );

    error.code = "CLOUDFLARE_CONFIGURATION_REQUIRED";
    error.status = 503;
    error.missing = missing;

    throw error;
  }

  return {
    apiToken,
    accountId,
    workerService,
  };
}

export function normalizeZoneName(input) {
  let value = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");

  if (!value) {
    const error = new Error("Masukkan nama domain.");
    error.code = "DOMAIN_REQUIRED";
    error.status = 400;
    throw error;
  }

  if (!value.includes("://")) {
    value = `https://${value}`;
  }

  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    const error = new Error("Format domain tidak valid.");
    error.code = "INVALID_DOMAIN";
    error.status = 400;
    throw error;
  }

  const hostname = parsed.hostname
    .toLowerCase()
    .replace(/\.$/, "");

  if (
    parsed.pathname !== "/"
    || parsed.search
    || parsed.hash
    || parsed.port
    || parsed.username
    || parsed.password
  ) {
    const error = new Error(
      "Masukkan domain tanpa path, parameter, port, atau kredensial.",
    );

    error.code = "INVALID_DOMAIN";
    error.status = 400;
    throw error;
  }

  if (
    hostname.length < 4
    || hostname.length > 253
    || !hostname.includes(".")
    || hostname.includes("..")
    || hostname.startsWith("www.")
    || !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])$/.test(hostname)
  ) {
    const error = new Error(
      "Masukkan domain akar yang valid, misalnya domain.com.",
    );

    error.code = "INVALID_ROOT_DOMAIN";
    error.status = 400;
    throw error;
  }

  if (
    hostname === "ngeblogging.com"
    || hostname.endsWith(".ngeblogging.com")
  ) {
    const error = new Error(
      "Alamat *.ngeblogging.com menggunakan sistem subdomain gratis.",
    );

    error.code = "USE_MANAGED_SUBDOMAIN";
    error.status = 400;
    throw error;
  }

  return hostname;
}

function cloudflareError(payload, response) {
  const firstError = payload?.errors?.[0];
  const message =
    firstError?.message
    || `Cloudflare API mengembalikan HTTP ${response.status}.`;

  const error = new Error(message);

  error.code =
    firstError?.code
    || "CLOUDFLARE_API_ERROR";

  error.status =
    response.status >= 500
      ? 502
      : response.status === 401 || response.status === 403
        ? response.status
        : 409;

  error.providerStatus = response.status;

  return error;
}

async function cloudflareRequest(
  env,
  path,
  {
    method = "GET",
    body,
  } = {},
) {
  const { apiToken } = providerConfig(env);

  const response = await fetch(
    `${CLOUDFLARE_API_BASE}${path}`,
    {
      method,
      headers: {
        authorization: `Bearer ${apiToken}`,
        accept: "application/json",
        ...(body ? { "content-type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  );

  const text = await response.text();

  let payload;

  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    const error = new Error(
      "Cloudflare mengembalikan respons yang tidak valid.",
    );

    error.code = "INVALID_CLOUDFLARE_RESPONSE";
    error.status = 502;
    throw error;
  }

  if (!response.ok || payload.success === false) {
    throw cloudflareError(payload, response);
  }

  return payload.result;
}

export async function findFullZone(env, input) {
  const name = normalizeZoneName(input);
  const { accountId } = providerConfig(env);

  const query = new URLSearchParams({
    name,
    "account.id": accountId,
    per_page: "50",
  });

  const zones = await cloudflareRequest(
    env,
    `/zones?${query.toString()}`,
  );

  return Array.isArray(zones)
    ? zones.find((zone) => zone?.name === name) || null
    : null;
}

export async function createFullZone(env, input) {
  const name = normalizeZoneName(input);
  const { accountId } = providerConfig(env);

  return cloudflareRequest(env, "/zones", {
    method: "POST",
    body: {
      account: {
        id: accountId,
      },
      name,
      type: "full",
    },
  });
}

export async function getOrCreateFullZone(env, input) {
  const name = normalizeZoneName(input);
  const existing = await findFullZone(env, name);

  if (existing) {
    return {
      zone: existing,
      reused: true,
    };
  }

  const created = await createFullZone(env, name);

  return {
    zone: created,
    reused: false,
  };
}

export async function getFullZoneStatus(env, zoneId) {
  const normalizedZoneId = String(zoneId || "").trim();

  if (!/^[0-9a-f]{32}$/i.test(normalizedZoneId)) {
    const error = new Error("Cloudflare Zone ID tidak valid.");
    error.code = "INVALID_ZONE_ID";
    error.status = 400;
    throw error;
  }

  return cloudflareRequest(
    env,
    `/zones/${encodeURIComponent(normalizedZoneId)}`,
  );
}

export function publicZoneState(zone) {
  return {
    id: String(zone?.id || ""),
    name: String(zone?.name || ""),
    status: String(zone?.status || "pending"),
    active: String(zone?.status || "").toLowerCase() === "active",
    nameServers: Array.isArray(zone?.name_servers)
      ? zone.name_servers.map(String)
      : [],
    originalNameServers: Array.isArray(zone?.original_name_servers)
      ? zone.original_name_servers.map(String)
      : [],
    createdOn: zone?.created_on || null,
    activatedOn: zone?.activated_on || null,
  };
}

export async function attachWorkerDomain(
  env,
  {
    hostname,
    zoneId,
    zoneName,
  },
) {
  const normalizedZone = normalizeZoneName(zoneName);
  const normalizedHostname = String(hostname || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");

  if (
    normalizedHostname !== normalizedZone
    && !normalizedHostname.endsWith(`.${normalizedZone}`)
  ) {
    const error = new Error(
      "Hostname tidak berada di dalam zone yang dipilih.",
    );

    error.code = "HOSTNAME_ZONE_MISMATCH";
    error.status = 400;
    throw error;
  }

  if (!/^[0-9a-f]{32}$/i.test(String(zoneId || ""))) {
    const error = new Error("Cloudflare Zone ID tidak valid.");
    error.code = "INVALID_ZONE_ID";
    error.status = 400;
    throw error;
  }

  const {
    accountId,
    workerService,
  } = providerConfig(env);

  return cloudflareRequest(
    env,
    `/accounts/${accountId}/workers/domains`,
    {
      method: "PUT",
      body: {
        hostname: normalizedHostname,
        service: workerService,
        zone_id: String(zoneId),
        zone_name: normalizedZone,
      },
    },
  );
}

export async function attachDefaultWorkerDomains(env, zone) {
  const state = publicZoneState(zone);

  if (!state.active) {
    const error = new Error(
      "Zone belum aktif. Nameserver domain harus diarahkan ke Cloudflare dahulu.",
    );

    error.code = "ZONE_NOT_ACTIVE";
    error.status = 409;
    throw error;
  }

  const apex = await attachWorkerDomain(env, {
    hostname: state.name,
    zoneId: state.id,
    zoneName: state.name,
  });

  const www = await attachWorkerDomain(env, {
    hostname: `www.${state.name}`,
    zoneId: state.id,
    zoneName: state.name,
  });

  return {
    apex,
    www,
  };
}

function normalizeWorkerDomainId(input) {
  const value = String(input || "").trim();

  if (
    !value
    || value.length > 128
    || !/^[a-z0-9_-]+$/i.test(value)
  ) {
    const error = new Error(
      "Cloudflare Worker Domain ID tidak valid.",
    );

    error.code = "INVALID_WORKER_DOMAIN_ID";
    error.status = 400;

    throw error;
  }

  return value;
}

function normalizeZoneId(input) {
  const value = String(input || "").trim();

  if (!/^[0-9a-f]{32}$/i.test(value)) {
    const error = new Error(
      "Cloudflare Zone ID tidak valid.",
    );

    error.code = "INVALID_ZONE_ID";
    error.status = 400;

    throw error;
  }

  return value;
}

export async function detachWorkerDomain(
  env,
  domainId,
) {
  const normalizedDomainId =
    normalizeWorkerDomainId(domainId);

  const {
    accountId,
  } = providerConfig(env);

  return cloudflareRequest(
    env,
    `/accounts/${accountId}/workers/domains/${encodeURIComponent(normalizedDomainId)}`,
    {
      method: "DELETE",
    },
  );
}

export async function deleteFullZone(
  env,
  zoneId,
) {
  const normalizedZoneId =
    normalizeZoneId(zoneId);

  return cloudflareRequest(
    env,
    `/zones/${encodeURIComponent(normalizedZoneId)}`,
    {
      method: "DELETE",
    },
  );
}

export function fullZoneProviderReady(env) {
  try {
    providerConfig(env);
    return true;
  } catch {
    return false;
  }
}
