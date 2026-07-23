import test from "node:test";
import assert from "node:assert/strict";
import worker from "../cloudflare/worker.mjs";
import { handleRequest } from "../server/nara-runtime.mjs";

const baseEnv = {
  PUBLIC_SITE_URL: "https://ngeblogging.com",
  PUBLIC_ALLOWED_ORIGINS: "https://ngeblogging.com,https://www.ngeblogging.com",
  QWEN_REGION: "singapore",
  NARA_RUNTIME: "cloudflare-worker-v1",
  ASSETS: {
    fetch: async () => new Response("asset-ok", { status: 200 }),
  },
};

test("Cloudflare Worker menyediakan health check tanpa memanggil aset", async () => {
  const response = await worker.fetch(new Request("https://ngeblogging.example/api/health"), baseEnv);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, "ok");
  assert.equal(body.runtime, "cloudflare-worker-v1");
  assert.ok(response.headers.get("x-request-id"));
});

test("Cloudflare Worker meneruskan aset statis melalui binding ASSETS", async () => {
  const response = await worker.fetch(new Request("https://ngeblogging.example/assets/app.js"), baseEnv);

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "asset-ok");
});

test("Cloudflare Worker menolak endpoint API yang tidak dikenal", async () => {
  const response = await worker.fetch(new Request("https://ngeblogging.example/api/tidak-ada"), baseEnv);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error, "Endpoint tidak ditemukan.");
});

test("Cloudflare Worker menolak payload Nara di atas 20 MiB sebelum membaca body", async () => {
  const response = await worker.fetch(new Request("https://ngeblogging.example/api/nara", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "content-length": String(21 * 1024 * 1024),
      origin: "https://ngeblogging.com",
    },
    body: "{}",
  }), baseEnv);
  const body = await response.json();

  assert.equal(response.status, 413);
  assert.equal(body.code, "PAYLOAD_TOO_LARGE");
});

test("Preview Cloudflare diizinkan tanpa wildcard CORS", async () => {
  const result = await handleRequest({
    httpMethod: "GET",
    headers: { origin: "https://preview.ngeblogging.workers.dev" },
    body: "",
  }, baseEnv);

  assert.equal(result.statusCode, 200);
  assert.equal(result.headers["access-control-allow-origin"], "https://preview.ngeblogging.workers.dev");
  assert.notEqual(result.headers["access-control-allow-origin"], "*");
});
