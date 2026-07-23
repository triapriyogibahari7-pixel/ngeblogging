import test from "node:test";
import assert from "node:assert/strict";
import { handleRequest as handler } from "../netlify/functions/nara.mjs";

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
  "PUBLIC_ALLOWED_ORIGINS",
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
  assert.equal(body.runtime, "netlify-modern-v3-vision-stable");
  assert.ok(body.missing.includes("QWEN_API_KEY"));
  assert.equal(JSON.stringify(body).includes("sk-"), false);
});

test("origin staging harus diizinkan secara eksplisit tanpa membuka wildcard CORS", { concurrency: false }, async () => {
  process.env.PUBLIC_ALLOWED_ORIGINS = "https://staging.ngeblogging.com";

  const allowed = await handler(event("GET", undefined, { origin: "https://staging.ngeblogging.com" }));
  const denied = await handler(event("GET", undefined, { origin: "https://evil.example" }));

  assert.equal(allowed.statusCode, 200);
  assert.equal(allowed.headers["access-control-allow-origin"], "https://staging.ngeblogging.com");
  assert.equal(denied.statusCode, 403);
  assert.notEqual(denied.headers["access-control-allow-origin"], "*");
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
  assert.equal(request.payload.max_completion_tokens, 1800);
  assert.equal(request.payload.max_tokens, undefined);
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
  assert.equal(qwenPayload.max_completion_tokens, 5000);
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

test("HTTP 400 mencoba payload minimal lalu alias Singapore yang stabil", { concurrency: false }, async () => {
  process.env.QWEN_API_KEY = "test-secret";
  process.env.QWEN_WORKSPACE_ID = "ws-test123";
  process.env.QWEN_REGION = "singapore";
  const requests = [];
  const originalError = console.error;
  console.error = () => {};
  globalThis.fetch = async (url, options) => {
    const payload = JSON.parse(options.body);
    requests.push(payload);
    if (requests.length < 3) {
      return new Response(JSON.stringify({ error: { code: "InvalidParameter", message: "Unsupported request" } }), { status: 400 });
    }
    return new Response(JSON.stringify({
      model: "qwen-flash",
      choices: [{ message: { content: "Mode kompatibilitas berhasil." } }],
      usage: { prompt_tokens: 10, completion_tokens: 4 },
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    const result = await handler(event("POST", {
      message: "Balas OK",
      model: "nara-mini",
      intelligence: "light",
    }));
    const body = parse(result);

    assert.equal(result.statusCode, 200);
    assert.equal(requests.length, 3);
    assert.equal(requests[0].model, "qwen3.6-flash");
    assert.equal(requests[0].enable_thinking, false);
    assert.equal(requests[1].model, "qwen3.6-flash");
    assert.equal(requests[1].enable_thinking, undefined);
    assert.equal(requests[1].temperature, undefined);
    assert.equal(requests[1].max_completion_tokens, undefined);
    assert.equal(requests[2].model, "qwen-flash");
    assert.equal(body.providerModel, "qwen-flash");
    assert.equal(body.compatibility, true);
    assert.equal(body.answer, "Mode kompatibilitas berhasil.");
  } finally {
    console.error = originalError;
  }
});

test("HTTP 400 terakhir menampilkan diagnosis provider dan menyamarkan secret", { concurrency: false }, async () => {
  process.env.QWEN_API_KEY = "test-secret";
  process.env.QWEN_WORKSPACE_ID = "ws-test123";
  process.env.QWEN_REGION = "singapore";
  const originalError = console.error;
  console.error = () => {};
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: { code: "InvalidParameter", message: "invalid value from sk-provider-secret" },
  }), { status: 400 });

  try {
    const result = await handler(event("POST", {
      message: "Balas OK",
      model: "nara-mini",
      intelligence: "light",
    }));
    const body = parse(result);

    assert.equal(result.statusCode, 502);
    assert.equal(body.code, "QWEN_BAD_REQUEST");
    assert.equal(body.providerCode, "InvalidParameter");
    assert.equal(body.providerMessage, "invalid value from [secret]");
    assert.match(body.error, /InvalidParameter/);
    assert.equal(JSON.stringify(body).includes("sk-provider-secret"), false);
  } finally {
    console.error = originalError;
  }
});

test("Endpoint workspace invalid otomatis memakai endpoint resmi lama Singapore", { concurrency: false }, async () => {
  process.env.QWEN_API_KEY = "test-secret";
  process.env.QWEN_WORKSPACE_ID = "ws-wrong-endpoint";
  process.env.QWEN_REGION = "singapore";
  const requests = [];
  const originalError = console.error;
  console.error = () => {};
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), payload: JSON.parse(options.body) });
    if (requests.length === 1) {
      return new Response(JSON.stringify({
        error: { code: "invalid_parameter_error", message: "Workspace endpoint is invalid." },
      }), { status: 400 });
    }
    return new Response(JSON.stringify({
      model: "qwen3.6-flash",
      choices: [{ message: { content: "OK" } }],
      usage: { prompt_tokens: 8, completion_tokens: 1 },
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    const result = await handler(event("POST", {
      message: "Balas OK",
      model: "nara-mini",
      intelligence: "standard",
    }));
    const body = parse(result);

    assert.equal(result.statusCode, 200);
    assert.equal(requests.length, 2);
    assert.equal(requests[0].url, "https://ws-wrong-endpoint.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions");
    assert.equal(requests[1].url, "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions");
    assert.equal(body.answer, "OK");
    assert.equal(body.endpointMode, "singapore-legacy");
  } finally {
    console.error = originalError;
  }
});

test("Lampiran gambar langsung memakai model vision stabil tanpa mencoba model teks", { concurrency: false }, async () => {
  process.env.QWEN_API_KEY = "test-secret";
  process.env.QWEN_WORKSPACE_ID = "ws-vision-route";
  process.env.QWEN_REGION = "singapore";
  const requests = [];
  const originalError = console.error;
  console.error = () => {};
  globalThis.fetch = async (url, options) => {
    const payload = JSON.parse(options.body);
    requests.push({ url: String(url), payload });
    return new Response(JSON.stringify({
      model: "qwen-vl-plus",
      choices: [{ message: { content: "Gambar berhasil dibaca." } }],
      usage: { prompt_tokens: 40, completion_tokens: 6 },
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    const result = await handler(event("POST", {
      message: "Jelaskan gambar ini",
      model: "nara-mini",
      intelligence: "standard",
      attachments: [{
        name: "contoh.png",
        type: "image/png",
        size: 68,
        kind: "image",
        dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      }],
    }));
    const body = parse(result);

    assert.equal(result.statusCode, 200);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].payload.model, "qwen-vl-plus");
    assert.equal(requests[0].url, "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions");
    assert.equal(requests.some((request) => request.payload.model === "qwen3.6-flash"), false);
    assert.equal(requests[0].payload.max_completion_tokens, undefined);
    assert.equal(requests[0].payload.messages.at(-1).content[1].type, "image_url");
    assert.equal(body.answer, "Gambar berhasil dibaca.");
    assert.equal(body.providerModel, "qwen-vl-plus");
  } finally {
    console.error = originalError;
  }
});

test("Format dokumen yang belum didukung ditolak sebelum memakai kuota atau provider", { concurrency: false }, async () => {
  process.env.QWEN_API_KEY = "test-secret";
  process.env.QWEN_WORKSPACE_ID = "ws-test123";
  process.env.QWEN_REGION = "singapore";
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error("fetch seharusnya tidak dipanggil");
  };

  const result = await handler(event("POST", {
    message: "Baca dokumen ini",
    model: "nara-mini",
    intelligence: "standard",
    attachments: [{ name: "proposal.pdf", type: "application/pdf", size: 2000, kind: "file" }],
  }));
  const body = parse(result);

  assert.equal(result.statusCode, 400);
  assert.equal(body.code, "ATTACHMENT_UNSUPPORTED");
  assert.match(body.error, /file teks/);
  assert.equal(fetchCalled, false);
});
