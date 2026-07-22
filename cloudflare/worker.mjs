import { handleRequest } from "../netlify/functions/nara.mjs";

const MAX_REQUEST_BYTES = 20 * 1024 * 1024;

function jsonResponse(status, body, requestId, method = "GET") {
  const payload = JSON.stringify(body);
  return new Response(method === "HEAD" ? null : payload, {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-request-id": requestId,
    },
  });
}

function clientAddress(request) {
  return request.headers.get("cf-connecting-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "cloudflare-guest";
}

async function naraResponse(request, env, requestId) {
  const length = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(length) && length > MAX_REQUEST_BYTES) {
    return jsonResponse(413, {
      code: "PAYLOAD_TOO_LARGE",
      error: "Lampiran atau payload terlalu besar.",
    }, requestId, request.method);
  }

  const headers = Object.fromEntries(request.headers.entries());
  headers["x-nf-client-connection-ip"] = clientAddress(request).slice(0, 80);
  headers["x-request-id"] = requestId;
  const body = ["GET", "HEAD", "OPTIONS"].includes(request.method)
    ? ""
    : await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES) {
    return jsonResponse(413, {
      code: "PAYLOAD_TOO_LARGE",
      error: "Lampiran atau payload terlalu besar.",
    }, requestId, request.method);
  }

  const result = await handleRequest({
    httpMethod: request.method,
    headers,
    body,
  }, env);
  const responseHeaders = new Headers(result.headers || {});
  responseHeaders.set("x-content-type-options", "nosniff");
  responseHeaders.set("x-request-id", requestId);
  return new Response(request.method === "HEAD" ? null : result.body || null, {
    status: result.statusCode,
    headers: responseHeaders,
  });
}

export default {
  async fetch(request, env) {
    const requestId = crypto.randomUUID();
    const url = new URL(request.url);

    try {
      if (url.pathname === "/api/health") {
        if (!["GET", "HEAD"].includes(request.method)) {
          return jsonResponse(405, { error: "Metode tidak didukung." }, requestId, request.method);
        }
        return jsonResponse(200, {
          status: "ok",
          service: "ngeblogging-cloudflare",
          runtime: env.NARA_RUNTIME || "cloudflare-worker-v1",
          timestamp: new Date().toISOString(),
        }, requestId, request.method);
      }

      if (url.pathname === "/api/nara") {
        return await naraResponse(request, env, requestId);
      }

      if (url.pathname.startsWith("/api/")) {
        return jsonResponse(404, { error: "Endpoint tidak ditemukan." }, requestId, request.method);
      }

      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error("Cloudflare Worker request failed", {
        requestId,
        path: url.pathname,
        name: error?.name || "Error",
      });
      return jsonResponse(500, {
        code: "WORKER_INTERNAL_ERROR",
        error: "Terjadi gangguan sementara pada layanan.",
      }, requestId, request.method);
    }
  },
};
