import { handleRequest as handleCoreRequest } from "./nara-handler.mjs";

export const config = {
  path: "/api/nara",
  rateLimit: {
    windowLimit: 20,
    windowSize: 60,
    aggregateBy: ["ip", "domain"],
  },
};

function parseOrigin(value) {
  try {
    return new URL(String(value || ""));
  } catch {
    return null;
  }
}

function trustedDynamicOrigin(origin) {
  const parsed = parseOrigin(origin);
  if (!parsed) return false;
  const hostname = parsed.hostname.toLowerCase();
  if (parsed.protocol === "https:" && (hostname === "ngeblogging.com" || hostname.endsWith(".ngeblogging.com"))) {
    return true;
  }
  if (parsed.protocol === "https:" && /(?:^|\.)(?:pages|workers)\.dev$/.test(hostname)) {
    return true;
  }
  return ["localhost", "127.0.0.1", "[::1]"].includes(hostname)
    && ["http:", "https:"].includes(parsed.protocol);
}

function legacyProviderOrigin(origin) {
  const parsed = parseOrigin(origin);
  return Boolean(parsed && /(?:^|\.)netlify\.app$/i.test(parsed.hostname));
}

function runtimeEnvironment(env, origin) {
  const allowed = String(env.PUBLIC_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (trustedDynamicOrigin(origin) && !allowed.includes(origin)) allowed.push(origin);
  return {
    ...env,
    NARA_RUNTIME: env.NARA_RUNTIME || "portable-nara-v4",
    PUBLIC_ALLOWED_ORIGINS: allowed.join(","),
  };
}

export async function handleRequest(event, env = process.env) {
  const headers = { ...(event?.headers || {}) };
  const origin = headers.origin || headers.Origin || "";
  if (legacyProviderOrigin(origin)) {
    return {
      statusCode: 403,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "access-control-allow-origin": String(env.PUBLIC_SITE_URL || "https://ngeblogging.com").replace(/\/$/, ""),
        vary: "Origin",
      },
      body: JSON.stringify({ code: "ORIGIN_NOT_ALLOWED", error: "Origin permintaan tidak diizinkan." }),
    };
  }

  const clientIp = headers["x-client-ip"]
    || headers["cf-connecting-ip"]
    || headers["x-forwarded-for"]?.split(",")[0]?.trim();
  if (clientIp) headers["x-forwarded-for"] = String(clientIp).slice(0, 80);

  return handleCoreRequest({
    ...event,
    headers,
  }, runtimeEnvironment(env, origin));
}
