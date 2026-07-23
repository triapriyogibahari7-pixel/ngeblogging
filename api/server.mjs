import http from "node:http";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { handleRequest } from "../server/nara-runtime.mjs";

const DEFAULT_MAX_REQUEST_BYTES = 20 * 1024 * 1024;

function numberFromEnv(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function jsonResponse(response, statusCode, body, requestId, method = "GET") {
  const payload = JSON.stringify(body);
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-request-id": requestId,
  });
  response.end(method === "HEAD" ? undefined : payload);
}

function clientIp(request, trustProxy) {
  if (trustProxy) {
    const forwarded = request.headers["x-forwarded-for"];
    const first = Array.isArray(forwarded) ? forwarded[0] : String(forwarded || "").split(",")[0];
    if (first?.trim()) return first.trim().slice(0, 80);
  }
  return String(request.socket.remoteAddress || "unknown").slice(0, 80);
}

function readBody(request, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;

    request.on("data", (chunk) => {
      if (settled) return;
      size += chunk.length;
      if (size > limit) {
        settled = true;
        request.resume();
        reject(Object.assign(new Error("Payload terlalu besar."), { statusCode: 413 }));
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (!settled) resolve(Buffer.concat(chunks).toString("utf8"));
    });
    request.on("error", (error) => {
      if (!settled) reject(error);
    });
    request.on("aborted", () => {
      if (!settled) reject(Object.assign(new Error("Permintaan dibatalkan."), { statusCode: 400 }));
    });
  });
}

function healthPayload() {
  return {
    status: "ok",
    service: "ngeblogging-api",
    runtime: process.env.NARA_RUNTIME || "portable-api-v1",
    version: process.env.APP_VERSION || "development",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}

export function createApiServer(options = {}) {
  const env = options.env || process.env;
  const trustProxy = env.TRUST_PROXY === "1" || env.TRUST_PROXY === "true";
  const maxRequestBytes = numberFromEnv(env.MAX_REQUEST_BYTES, DEFAULT_MAX_REQUEST_BYTES);
  const rateLimit = numberFromEnv(env.RATE_LIMIT_PER_MINUTE, 20);
  const rateWindowMs = 60_000;
  const rateBuckets = new Map();

  function consumeRateLimit(key) {
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      rateBuckets.set(key, { count: 1, resetAt: now + rateWindowMs });
      return { allowed: true, retryAfter: 0 };
    }
    if (bucket.count >= rateLimit) {
      return { allowed: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
    }
    bucket.count += 1;
    if (rateBuckets.size > 10_000) {
      for (const [storedKey, stored] of rateBuckets) if (stored.resetAt <= now) rateBuckets.delete(storedKey);
    }
    return { allowed: true, retryAfter: 0 };
  }

  const server = http.createServer(async (request, response) => {
    const startedAt = performance.now();
    const requestId = randomUUID();
    let statusCode = 500;
    let pathname = "/";

    try {
      const url = new URL(request.url || "/", "http://internal.ngeblogging");
      pathname = url.pathname;

      if (pathname === "/api/health") {
        if (!["GET", "HEAD"].includes(request.method || "")) {
          statusCode = 405;
          jsonResponse(response, statusCode, { error: "Metode tidak didukung." }, requestId, request.method);
          return;
        }
        statusCode = 200;
        jsonResponse(response, statusCode, healthPayload(), requestId, request.method);
        return;
      }

      if (pathname !== "/api/nara") {
        statusCode = 404;
        jsonResponse(response, statusCode, { error: "Endpoint tidak ditemukan." }, requestId, request.method);
        return;
      }

      const method = request.method || "GET";
      const requestIp = clientIp(request, trustProxy);
      if (method === "POST") {
        const host = String(request.headers.host || "unknown").toLowerCase().slice(0, 255);
        const rate = consumeRateLimit(`${requestIp}:${host}`);
        if (!rate.allowed) {
          statusCode = 429;
          response.setHeader("retry-after", String(rate.retryAfter));
          jsonResponse(response, statusCode, {
            code: "RATE_LIMIT",
            error: "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.",
          }, requestId, method);
          return;
        }
      }
      const body = ["GET", "HEAD", "OPTIONS"].includes(method)
        ? ""
        : await readBody(request, maxRequestBytes);
      const headers = { ...request.headers };
      headers["x-client-ip"] = requestIp;
      headers["x-forwarded-for"] = requestIp;
      headers["x-request-id"] = requestId;

      const result = await handleRequest({ httpMethod: method, headers, body }, env);
      statusCode = result.statusCode;
      const responseHeaders = {
        ...result.headers,
        "x-content-type-options": "nosniff",
        "x-request-id": requestId,
      };
      response.writeHead(statusCode, responseHeaders);
      response.end(method === "HEAD" ? undefined : result.body || undefined);
    } catch (error) {
      statusCode = error.statusCode || 500;
      if (!response.headersSent) {
        jsonResponse(response, statusCode, {
          code: statusCode === 413 ? "PAYLOAD_TOO_LARGE" : "API_INTERNAL_ERROR",
          error: statusCode === 413 ? "Lampiran atau payload terlalu besar." : "Terjadi gangguan sementara pada API.",
        }, requestId, request.method);
      } else {
        response.end();
      }
    } finally {
      console.log(JSON.stringify({
        level: "info",
        requestId,
        method: request.method,
        path: pathname,
        statusCode,
        durationMs: Math.round(performance.now() - startedAt),
      }));
    }
  });

  server.requestTimeout = numberFromEnv(env.REQUEST_TIMEOUT_MS, 65_000);
  server.headersTimeout = numberFromEnv(env.HEADERS_TIMEOUT_MS, 10_000);
  server.keepAliveTimeout = numberFromEnv(env.KEEP_ALIVE_TIMEOUT_MS, 5_000);
  server.maxRequestsPerSocket = numberFromEnv(env.MAX_REQUESTS_PER_SOCKET, 100);
  return server;
}

export function startApiServer(options = {}) {
  const env = options.env || process.env;
  const host = env.HOST || "0.0.0.0";
  const port = numberFromEnv(env.PORT, 3000);
  const server = createApiServer({ env });

  server.listen(port, host, () => {
    console.log(JSON.stringify({ level: "info", message: "Ngeblogging API aktif", host, port }));
  });

  const shutdown = (signal) => {
    console.log(JSON.stringify({ level: "info", message: "Menghentikan API", signal }));
    server.close((error) => process.exit(error ? 1 : 0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startApiServer();
}
