const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";
export const WORKER_DOMAIN_ATTACH_RELEASE_V317 = "cloudflare-worker-domain-verified-v317-20260806";

function providerConfig(env) {
  const apiToken = String(
    env?.CLOUDFLARE_DOMAIN_API_TOKEN
    || env?.CLOUDFLARE_API_TOKEN
    || "",
  ).trim();
  const accountId = String(env?.CLOUDFLARE_ACCOUNT_ID || "").trim();
  const workerService = String(env?.CLOUDFLARE_WORKER_SERVICE || "ngeblogging").trim();
  const missing = [];

  if (!apiToken) missing.push("CLOUDFLARE_DOMAIN_API_TOKEN atau CLOUDFLARE_API_TOKEN");
  if (!/^[0-9a-f]{32}$/i.test(accountId)) missing.push("CLOUDFLARE_ACCOUNT_ID");
  if (!workerService) missing.push("CLOUDFLARE_WORKER_SERVICE");

  if (missing.length) {
    const error = new Error(`Konfigurasi Cloudflare belum lengkap: ${missing.join(", ")}`);
    error.code = "CLOUDFLARE_CONFIGURATION_REQUIRED";
    error.status = 503;
    error.missing = missing;
    throw error;
  }

  return { apiToken, accountId, workerService };
}

export function normalizeZoneName(input) {
  let value = String(input || "").trim().toLowerCase().replace(/\.$/, "");
  if (!value) {
    const error = new Error("Masukkan nama domain.");
    error.code = "DOMAIN_REQUIRED";
    error.status = 400;
    throw error;
  }
  if (!value.includes("://")) value = `https://${value}`;

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    const error = new Error("Format domain tidak valid.");
    error.code = "INVALID_DOMAIN";
    error.status = 400;
    throw error;
  }

  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (
    parsed.pathname !== "/"
    || parsed.search
    || parsed.hash
    || parsed.port
    || parsed.username
    || parsed.password
  ) {
    const error = new Error("Masukkan domain tanpa path, parameter, port, atau kredensial.");
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
    const error = new Error("Masukkan domain akar yang valid, misalnya domain.com. Jangan awali dengan www.");
    error.code = "INVALID_ROOT_DOMAIN";
    error.status = 400;
    throw error;
  }

  if (hostname === "ngeblogging.com" || hostname.endsWith(".ngeblogging.com")) {
    const error = new Error("Alamat *.ngeblogging.com menggunakan sistem subdomain gratis.");
    error.code = "USE_MANAGED_SUBDOMAIN";
    error.status = 400;
    throw error;
  }

  return hostname;
}

function permissionMessage(message = "") {
  const value = String(message).toLowerCase();
  return value.includes("account.zone.create")
    || value.includes("permission") && value.includes("create zones");
}

function cloudflareError(payload, httpResponse) {
  const firstError = payload?.errors?.[0] || null;
  const providerMessage = String(
    firstError?.message
    || `Cloudflare API mengembalikan HTTP ${httpResponse.status}.`,
  );
  const providerCode = firstError?.code ?? "CLOUDFLARE_API_ERROR";

  if (permissionMessage(providerMessage)) {
    const error = new Error(
      "Cloudflare belum mengizinkan Ngeblogging membuat zone baru. Token domain produksi wajib memiliki izin Zone: Edit/Create untuk semua zone pada akun ini. Setelah izin CLOUDFLARE_DOMAIN_API_TOKEN atau CLOUDFLARE_API_TOKEN diperbarui, kirim ulang domain dan nameserver akan ditampilkan otomatis.",
    );
    error.code = "CLOUDFLARE_ZONE_CREATE_PERMISSION_REQUIRED";
    error.status = 503;
    error.providerCode = providerCode;
    error.requiredPermission = "com.cloudflare.api.account.zone.create";
    return error;
  }

  if (Number(providerCode) === 1000 || /invalid api token/i.test(providerMessage)) {
    const error = new Error(
      "Token Cloudflare untuk layanan domain tidak valid atau sudah dicabut. Perbarui CLOUDFLARE_DOMAIN_API_TOKEN, lalu coba kembali.",
    );
    error.code = "CLOUDFLARE_DOMAIN_TOKEN_INVALID";
    error.status = 503;
    error.providerCode = providerCode;
    return error;
  }

  const error = new Error(providerMessage);
  error.code = String(providerCode || "CLOUDFLARE_API_ERROR");
  error.status = httpResponse.status >= 500
    ? 502
    : httpResponse.status === 401 || httpResponse.status === 403
      ? httpResponse.status
      : 409;
  error.providerStatus = httpResponse.status;
  return error;
}

async function cloudflareRequest(env, path, { method = "GET", body } = {}) {
  const { apiToken } = providerConfig(env);
  const httpResponse = await fetch(`${CLOUDFLARE_API_BASE}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${apiToken}`,
      accept: "application/json",
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await httpResponse.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    const error = new Error("Cloudflare mengembalikan respons yang tidak valid. Coba kembali beberapa saat lagi.");
    error.code = "INVALID_CLOUDFLARE_RESPONSE";
    error.status = 502;
    throw error;
  }

  if (!httpResponse.ok || payload.success === false) {
    throw cloudflareError(payload, httpResponse);
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
  const zones = await cloudflareRequest(env, `/zones?${query.toString()}`);
  return Array.isArray(zones)
    ? zones.find((zone) => String(zone?.name || "").toLowerCase() === name) || null
    : null;
}

export async function createFullZone(env, input) {
  const name = normalizeZoneName(input);
  const { accountId } = providerConfig(env);
  return cloudflareRequest(env, "/zones", {
    method: "POST",
    body: { account: { id: accountId }, name, type: "full" },
  });
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function hydrateNameservers(env, zone) {
  let current = zone;
  for (const delay of [0, 350, 800, 1500]) {
    const state = publicZoneState(current);
    if (state.nameServers.length >= 2 || state.active) return current;
    if (!/^[0-9a-f]{32}$/i.test(state.id)) return current;
    if (delay) await wait(delay);
    try {
      current = await getFullZoneStatus(env, state.id);
    } catch {
      // Respons pembuatan awal tetap dipakai apabila status belum dapat dibaca.
    }
  }
  return current;
}

export async function getOrCreateFullZone(env, input) {
  const name = normalizeZoneName(input);
  const existing = await findFullZone(env, name);
  if (existing) {
    return { zone: await hydrateNameservers(env, existing), reused: true };
  }

  try {
    const created = await createFullZone(env, name);
    return { zone: await hydrateNameservers(env, created), reused: false };
  } catch (error) {
    // Menangani race condition: zone mungkin dibuat oleh request lain sesaat sebelumnya.
    const raced = await findFullZone(env, name).catch(() => null);
    if (raced) return { zone: await hydrateNameservers(env, raced), reused: true };
    throw error;
  }
}

export async function getFullZoneStatus(env, zoneId) {
  const normalizedZoneId = String(zoneId || "").trim();
  if (!/^[0-9a-f]{32}$/i.test(normalizedZoneId)) {
    const error = new Error("Cloudflare Zone ID tidak valid.");
    error.code = "INVALID_ZONE_ID";
    error.status = 400;
    throw error;
  }
  return cloudflareRequest(env, `/zones/${encodeURIComponent(normalizedZoneId)}`);
}

export function publicZoneState(zone) {
  return {
    id: String(zone?.id || ""),
    name: String(zone?.name || ""),
    status: String(zone?.status || "pending"),
    active: String(zone?.status || "").toLowerCase() === "active",
    nameServers: Array.isArray(zone?.name_servers)
      ? zone.name_servers.map(String).map((value) => value.trim()).filter(Boolean)
      : [],
    originalNameServers: Array.isArray(zone?.original_name_servers)
      ? zone.original_name_servers.map(String).map((value) => value.trim()).filter(Boolean)
      : [],
    createdOn: zone?.created_on || null,
    activatedOn: zone?.activated_on || null,
  };
}

function workerDomainPermissionError(error) {
  const status = Number(error?.status || error?.providerStatus || 0);
  const message = String(error?.message || "");
  if (status !== 401 && status !== 403 && !/workers?.*(permission|script)/i.test(message)) return error;
  const next = new Error(
    "Cloudflare Zone sudah dapat dibaca, tetapi token domain belum diizinkan memasang Worker Custom Domain. Tambahkan izin Workers Scripts Write pada CLOUDFLARE_DOMAIN_API_TOKEN atau CLOUDFLARE_API_TOKEN, lalu tekan Refresh status domain. Status aktif tidak akan dipalsukan sebelum routing Worker benar-benar terverifikasi.",
  );
  next.code = "CLOUDFLARE_WORKERS_DOMAIN_PERMISSION_REQUIRED";
  next.status = 503;
  next.requiredPermission = "Workers Scripts Write";
  next.cause = error;
  return next;
}

export async function listWorkerDomains(env, hostname = "") {
  const { accountId } = providerConfig(env);
  const query = new URLSearchParams();
  const normalizedHostname = String(hostname || "").trim().toLowerCase().replace(/\.$/, "");
  if (normalizedHostname) query.set("hostname", normalizedHostname);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  try {
    const result = await cloudflareRequest(env, `/accounts/${accountId}/workers/domains${suffix}`);
    return Array.isArray(result) ? result : [];
  } catch (error) {
    throw workerDomainPermissionError(error);
  }
}

async function verifyWorkerDomainAttachment(env, { hostname, zoneId, zoneName, workerService }) {
  const expectedHostname = String(hostname || "").trim().toLowerCase().replace(/\.$/, "");
  const expectedZoneId = String(zoneId || "").trim().toLowerCase();
  const expectedZoneName = String(zoneName || "").trim().toLowerCase().replace(/\.$/, "");
  let lastSeen = null;

  for (const delay of [0, 300, 800, 1600, 3200]) {
    if (delay) await wait(delay);
    const domains = await listWorkerDomains(env, expectedHostname);
    const exact = domains.find((item) => String(item?.hostname || "").toLowerCase().replace(/\.$/, "") === expectedHostname) || null;
    if (!exact) continue;
    lastSeen = exact;
    const serviceMatches = String(exact.service || "") === workerService;
    const zoneMatches = !exact.zone_id || String(exact.zone_id || "").toLowerCase() === expectedZoneId;
    const zoneNameMatches = !exact.zone_name || String(exact.zone_name || "").toLowerCase().replace(/\.$/, "") === expectedZoneName;
    if (serviceMatches && zoneMatches && zoneNameMatches && exact.id) return exact;
    if (!serviceMatches) {
      const error = new Error(`Hostname ${expectedHostname} masih diarahkan ke Worker ${String(exact.service || "lain")}, bukan ${workerService}.`);
      error.code = "WORKER_DOMAIN_SERVICE_MISMATCH";
      error.status = 409;
      error.expectedService = workerService;
      error.actualService = String(exact.service || "");
      throw error;
    }
  }

  const error = new Error(
    `Cloudflare belum mengonfirmasi routing ${expectedHostname} ke Worker ${workerService}. Ngeblogging mempertahankan status verifikasi agar domain tidak terlihat aktif sebelum benar-benar dapat dirutekan. Tekan Refresh status setelah beberapa detik.`,
  );
  error.code = "WORKER_DOMAIN_NOT_ATTACHED";
  error.status = 503;
  error.hostname = expectedHostname;
  error.workerService = workerService;
  error.lastSeen = lastSeen;
  error.release = WORKER_DOMAIN_ATTACH_RELEASE_V317;
  throw error;
}

export async function attachWorkerDomain(env, { hostname, zoneId, zoneName }) {
  const normalizedZone = normalizeZoneName(zoneName);
  const normalizedHostname = String(hostname || "").trim().toLowerCase().replace(/\.$/, "");
  if (normalizedHostname !== normalizedZone && !normalizedHostname.endsWith(`.${normalizedZone}`)) {
    const error = new Error("Hostname tidak berada di dalam zone yang dipilih.");
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
  const { accountId, workerService } = providerConfig(env);
  try {
    await cloudflareRequest(env, `/accounts/${accountId}/workers/domains`, {
      method: "PUT",
      body: {
        hostname: normalizedHostname,
        service: workerService,
        zone_id: String(zoneId),
        zone_name: normalizedZone,
      },
    });
  } catch (error) {
    throw workerDomainPermissionError(error);
  }

  return verifyWorkerDomainAttachment(env, {
    hostname: normalizedHostname,
    zoneId: String(zoneId),
    zoneName: normalizedZone,
    workerService,
  });
}

export async function attachDefaultWorkerDomains(env, zone) {
  const state = publicZoneState(zone);
  if (!state.active) {
    const error = new Error("Zone belum aktif. Nameserver domain harus diarahkan ke Cloudflare dahulu.");
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
  return { apex, www };
}

function normalizeWorkerDomainId(input) {
  const value = String(input || "").trim();
  if (!value || value.length > 128 || !/^[a-z0-9_-]+$/i.test(value)) {
    const error = new Error("Cloudflare Worker Domain ID tidak valid.");
    error.code = "INVALID_WORKER_DOMAIN_ID";
    error.status = 400;
    throw error;
  }
  return value;
}

function normalizeZoneId(input) {
  const value = String(input || "").trim();
  if (!/^[0-9a-f]{32}$/i.test(value)) {
    const error = new Error("Cloudflare Zone ID tidak valid.");
    error.code = "INVALID_ZONE_ID";
    error.status = 400;
    throw error;
  }
  return value;
}

export async function detachWorkerDomain(env, domainId) {
  const normalizedDomainId = normalizeWorkerDomainId(domainId);
  const { accountId } = providerConfig(env);
  return cloudflareRequest(
    env,
    `/accounts/${accountId}/workers/domains/${encodeURIComponent(normalizedDomainId)}`,
    { method: "DELETE" },
  );
}

export async function deleteFullZone(env, zoneId) {
  return cloudflareRequest(
    env,
    `/zones/${encodeURIComponent(normalizeZoneId(zoneId))}`,
    { method: "DELETE" },
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
