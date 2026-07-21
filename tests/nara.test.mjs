import test from "node:test";
import assert from "node:assert/strict";
import { handler } from "../netlify/functions/nara.mjs";

const ENV_KEYS = [
  "QWEN_API_KEY",
  "DASHSCOPE_API_KEY",
  "QWEN_WORKSPACE_ID",
  "QWEN_REGION",
  "QWEN_API_BASE_URL",
  "QWEN_MODEL",
  "NARA_MODEL_MINI",
  "NARA_MODEL_WRITER",
  "NARA_MODEL_VISION",
  "NARA_MODEL_MAX",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
];

const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
const originalFetch = globalThis.fetch;

function resetEnvironment() {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  globalThis.fetch = originalFetch;
}

function event(method, body, extraHeaders = {}) {
  return {
    httpMethod: method,
    headers: {
      origin: "https://ngeblogging.com",
      "x-nf-client-connection-ip": `test-${Math.random()}`,
      ...extraHeaders,
    },
    body: body === undefined ? "" : JSON.stringify(body),
  };
}

function parse(result) {
  return result.body ? JSON.parse(result.body) : null;
}

test.afterEach(resetEnvironment);

test("GET /api/nara menjelaskan konfigurasi yang masih kurang tanpa membuka secret", { concurrency: false }, async () => {
  delete process.env.QWEN_API_KEY;
  delete process.env.DASHSCOPE_API_KEY;
  delete process.env.QWEN_WORKSPACE_ID;
  delete process.env.QWEN_API_BASE_URL;
  process.env.QWEN_REGION = "singapore";

  const result = await handler(event("GET"));
  const body = parse(result);

  assert.equal(result.statusCode, 200);
  assert.equal(body.ready, false);
  assert.equal(body.region, "singapore");
  assert.ok(body.missing.includes("QWEN_API_KEY"));
  assert.equal(JSON.stringify(body).includes("sk-"), false);
});

test("Nara Mini memakai model Flash dan mode Sedang tanpa deep thinking", { concurrency: false }, async () => {
  process.env.QWEN_API_KEY = "test-secret";
  process.env.QWEN_WORKSPACE_ID = "ws-test123";
  process.env.QWEN_REGION = "singapore";
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options, payload: JSON.parse(options.body) };
    return new Response(JSON.stringify({
      model: "qwen3.6-flash",
      choices: [{ message: { content: "Jawaban uji Nara." } }],
      usage: { prompt_tokens: 20, completion_tokens: 7 },
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  const result = await handler(event("POST", {
    message: "Buat judul singkat",
    model: "nara-mini",
    intelligence: "standard",
  }));
  const body = parse(result);

  assert.equal(result.statusCode, 200);
  assert.equal(request.url, "https://ws-test123.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions");
  assert.equal(request.options.headers.authorization, "Bearer test-secret");
  assert.equal(request.payload.model, "qwen3.6-flash");
  assert.equal(request.payload.enable_thinking, false);
  assert.equal(request.payload.max_tokens, 1800);
  assert.equal(body.modelLabel, "Nara Mini");
  assert.equal(body.intelligenceLabel, "Sedang");
  assert.deepEqual(body.usage, { inputTokens: 20, outputTokens: 7 });
});

test("Nara Max + Ekstra tinggi memakai model Max, deep thinking, dan riwayat lebih panjang", { concurrency: false }, async () => {
  process.env.QWEN_API_KEY = "test-secret";
  process.env.QWEN_WORKSPACE_ID = "ws-test123";
  process.env.QWEN_REGION = "singapore";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  let qwenPayload;

  globalThis.fetch = async (url, options = {}) => {
    if (String(url).endsWith("/auth/v1/user")) {
      return new Response(JSON.stringify({ id: "user-test" }), { status: 200 });
    }
    if (String(url).includes("/rest/v1/rpc/consume_nara_quota")) {
      return new Response(JSON.stringify([{ allowed: true, account_plan: "pro", remaining: 249 }]), { status: 200 });
    }
    qwenPayload = JSON.parse(options.body);
    return new Response(JSON.stringify({ choices: [{ message: { content: "Analisis mendalam." } }] }), { status: 200 });
  };

  const history = Array.from({ length: 24 }, (_, index) => ({
    role: index % 2 ? "assistant" : "user",
    content: `Pesan ${index}`,
  }));
  const result = await handler(event("POST", {
    message: "Analisis strategi ini",
    model: "nara-max",
    intelligence: "xhigh",
    history,
  }, { authorization: "Bearer valid-user-token" }));
  const body = parse(result);

  assert.equal(result.statusCode, 200);
  assert.equal(qwenPayload.model, "qwen3.7-max");
  assert.equal(qwenPayload.enable_thinking, true);
  assert.equal(qwenPayload.max_tokens, 5000);
  assert.equal(qwenPayload.messages.length, 18); // system + 16 history + current user
  assert.equal(body.modelLabel, "Nara Max");
  assert.equal(body.intelligenceLabel, "Ekstra tinggi");
  assert.equal(body.thinking, true);
});

test("Key yang ditolak Qwen menghasilkan petunjuk diagnosis yang jelas", { concurrency: false }, async () => {
  process.env.QWEN_API_KEY = "invalid-secret";
  process.env.QWEN_WORKSPACE_ID = "ws-test123";
  process.env.QWEN_REGION = "singapore";
  const originalError = console.error;
  console.error = () => {};
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: "InvalidApiKey" } }), { status: 401 });

  try {
    const result = await handler(event("POST", {
      message: "Tes koneksi",
      model: "nara-mini",
      intelligence: "light",
    }));
    const body = parse(result);

    assert.equal(result.statusCode, 503);
    assert.equal(body.code, "QWEN_AUTH_FAILED");
    assert.match(body.error, /API key Qwen ditolak/);
  } finally {
    console.error = originalError;
  }
});

