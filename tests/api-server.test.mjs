import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createApiServer } from "../api/server.mjs";

async function withServer(overrides, callback) {
  const server = createApiServer({
    env: {
      ...process.env,
      TRUST_PROXY: "1",
      MAX_REQUEST_BYTES: "1024",
      ...overrides,
    },
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

test("health check portable tidak membocorkan secret", async () => {
  await withServer({}, async (origin) => {
    const response = await fetch(`${origin}/api/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
    assert.equal(body.service, "ngeblogging-api");
    assert.match(response.headers.get("x-request-id"), /^[0-9a-f-]{36}$/);
    assert.equal(JSON.stringify(body).includes("QWEN_API_KEY"), false);
  });
});

test("server hanya membuka endpoint API yang dikenal", async () => {
  await withServer({}, async (origin) => {
    const response = await fetch(`${origin}/private/config`);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Endpoint tidak ditemukan." });
  });
});

test("server menolak payload yang melewati batas", async () => {
  await withServer({ MAX_REQUEST_BYTES: "128" }, async (origin) => {
    const response = await fetch(`${origin}/api/nara`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "x".repeat(300) }),
    });
    const body = await response.json();

    assert.equal(response.status, 413);
    assert.equal(body.code, "PAYLOAD_TOO_LARGE");
  });
});

test("health check menolak metode mutasi", async () => {
  await withServer({}, async (origin) => {
    const response = await fetch(`${origin}/api/health`, { method: "POST" });
    assert.equal(response.status, 405);
  });
});

test("portable API membatasi lonjakan POST per IP dan host", async () => {
  await withServer({ RATE_LIMIT_PER_MINUTE: "2" }, async (origin) => {
    const request = () => fetch(`${origin}/api/nara`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.10" },
      body: JSON.stringify({ message: "Uji batas" }),
    });

    assert.equal((await request()).status, 503);
    assert.equal((await request()).status, 503);
    const limited = await request();
    assert.equal(limited.status, 429);
    assert.equal((await limited.json()).code, "RATE_LIMIT");
    assert.match(limited.headers.get("retry-after"), /^\d+$/);
  });
});
