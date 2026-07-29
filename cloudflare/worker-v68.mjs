import baseWorker from "./worker-v67.mjs";
import { handleWorkersAiNara, workersAiReady, workersVisionReady } from "../server/workers-ai-nara.mjs";

const RELEASE = "2026.07.29-nara-workers-ai-v68";

function allowedOrigin(origin) {
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname.toLowerCase();
    if (parsed.protocol === "https:" && (hostname === "ngeblogging.com" || hostname.endsWith(".ngeblogging.com"))) return true;
    if (parsed.protocol === "https:" && /(?:^|\.)(?:pages|workers)\.dev$/.test(hostname)) return true;
    return ["localhost", "127.0.0.1", "[::1]"].includes(hostname) && ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function json(status, body, requestId, origin = "") {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-request-id": requestId,
    "x-ngeblogging-nara-runtime": RELEASE,
  });
  if (origin) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-headers", "content-type, authorization");
    headers.set("access-control-allow-methods", "POST, OPTIONS");
    headers.set("vary", "Origin");
  }
  return new Response(JSON.stringify(body), { status, headers });
}

async function enrichHealth(response, env) {
  if (!response.ok) return response;
  try {
    const payload = await response.clone().json();
    const ready = workersAiReady(env);
    const headers = new Headers(response.headers);
    headers.set("content-type", "application/json; charset=utf-8");
    headers.set("cache-control", "no-store");
    headers.set("x-ngeblogging-nara-runtime", RELEASE);
    return new Response(JSON.stringify({
      ...payload,
      nara: ready || payload.nara === true,
      naraWorkersAi: ready,
      naraVisionWorkersAi: workersVisionReady(env),
      naraRuntimeCurrent: RELEASE,
      naraPrimaryProvider: ready ? "cloudflare-workers-ai" : payload.naraPrimaryProvider || "unavailable",
    }), { status: response.status, statusText: response.statusText, headers });
  } catch {
    return response;
  }
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    const requestId = crypto.randomUUID();
    const origin = request.headers.get("origin") || "";

    if (url.pathname === "/api/nara" && workersAiReady(env)) {
      if (!allowedOrigin(origin)) return json(403, { code: "ORIGIN_NOT_ALLOWED", error: "Origin permintaan tidak diizinkan." }, requestId);
      if (request.method === "OPTIONS") {
        const response = await handleWorkersAiNara(request, env, requestId, origin || "https://ngeblogging.com");
        const headers = new Headers(response.headers);
        headers.set("x-ngeblogging-nara-runtime", RELEASE);
        return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
      }
      if (request.method === "POST") {
        const response = await handleWorkersAiNara(request, env, requestId, origin || "https://ngeblogging.com");
        const headers = new Headers(response.headers);
        headers.set("x-ngeblogging-nara-runtime", RELEASE);
        return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
      }
    }

    const response = await baseWorker.fetch(request, env, context);
    if (url.pathname === "/api/health" && request.method !== "HEAD") return enrichHealth(response, env);
    return response;
  },
};
