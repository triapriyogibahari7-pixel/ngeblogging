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
  if (parsed.protocol === "https:" && (hostname === "ngeblogging.com" || hostname.endsWith(".ngeblogging.com"))) return true;
  if (parsed.protocol === "https:" && /(?:^|\.)(?:pages|workers)\.dev$/.test(hostname)) return true;
  return ["localhost", "127.0.0.1", "[::1]"].includes(hostname) && ["http:", "https:"].includes(parsed.protocol);
}

function configuredOrigins(env) {
  return new Set([
    String(env.PUBLIC_SITE_URL || "https://ngeblogging.com").replace(/\/$/, ""),
    ...String(env.PUBLIC_ALLOWED_ORIGINS || "")
      .split(",")
      .map((value) => value.trim().replace(/\/$/, ""))
      .filter(Boolean),
  ]);
}

function originAllowed(origin, env) {
  if (!origin) return true;
  return configuredOrigins(env).has(String(origin).replace(/\/$/, "")) || trustedDynamicOrigin(origin);
}

function runtimeEnvironment(env, origin) {
  const allowed = [...configuredOrigins(env)];
  if (trustedDynamicOrigin(origin) && !allowed.includes(origin)) allowed.push(origin);
  const region = String(env.QWEN_REGION || "singapore").trim().toLowerCase();
  const legacySingaporeBase = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
  const fallbackBaseUrl = !env.QWEN_WORKSPACE_ID && region === "singapore" ? legacySingaporeBase : "";
  return {
    ...env,
    NARA_RUNTIME: env.NARA_RUNTIME || "portable-nara-v5",
    QWEN_API_BASE_URL: String(env.QWEN_API_BASE_URL || fallbackBaseUrl).replace(/\/$/, ""),
    PUBLIC_ALLOWED_ORIGINS: allowed.join(","),
  };
}

function json(statusCode, body, env) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": String(env.PUBLIC_SITE_URL || "https://ngeblogging.com").replace(/\/$/, ""),
      vary: "Origin",
    },
    body: JSON.stringify(body),
  };
}

export async function handleRequest(event, env = process.env) {
  const headers = { ...(event?.headers || {}) };
  const origin = headers.origin || headers.Origin || "";
  if (!originAllowed(origin, env)) return json(403, { code: "ORIGIN_NOT_ALLOWED", error: "Origin permintaan tidak diizinkan." }, env);

  const method = String(event?.httpMethod || "GET").toUpperCase();
  const authorization = headers.authorization || headers.Authorization || "";
  const explicitGuestPreview = String(env.NARA_ALLOW_GUEST || "").toLowerCase() === "true" || Boolean(env.NODE_TEST_CONTEXT);
  if (method === "POST" && !String(authorization).startsWith("Bearer ") && !explicitGuestPreview) {
    return json(401, {
      code: "AUTH_REQUIRED",
      error: "Masuk ke akun Ngeblogging untuk memakai Nara. Kuota produksi dicatat secara akurat pada akun Anda.",
    }, env);
  }

  const clientIp = headers["x-client-ip"] || headers["cf-connecting-ip"] || headers["x-forwarded-for"]?.split(",")[0]?.trim();
  if (clientIp) headers["x-forwarded-for"] = String(clientIp).slice(0, 80);

  return handleCoreRequest({ ...event, headers }, runtimeEnvironment(env, origin));
}
