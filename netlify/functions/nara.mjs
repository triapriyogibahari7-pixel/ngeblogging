const INTELLIGENCE = {
  light: {
    label: "Ringan",
    temperature: 0.3,
    maxTokens: 900,
    historyItems: 4,
    timeoutMs: 30_000,
    thinking: false,
    pro: false,
    instruction: "Jawab cepat, langsung, dan praktis. Hindari uraian panjang jika tidak diperlukan.",
  },
  standard: {
    label: "Sedang",
    temperature: 0.35,
    maxTokens: 1800,
    historyItems: 8,
    timeoutMs: 45_000,
    thinking: false,
    pro: false,
    instruction: "Berikan jawaban seimbang, terstruktur, dan cukup mendalam.",
  },
  high: {
    label: "Tinggi",
    temperature: 0.25,
    maxTokens: 3200,
    historyItems: 12,
    timeoutMs: 50_000,
    thinking: true,
    pro: true,
    instruction: "Analisis mendalam, periksa asumsi dan konsistensi, lalu susun hasil profesional.",
  },
  xhigh: {
    label: "Ekstra tinggi",
    temperature: 0.18,
    maxTokens: 5000,
    historyItems: 16,
    timeoutMs: 55_000,
    thinking: true,
    pro: true,
    instruction: "Gunakan penalaran paling teliti, uji alternatif, periksa kembali kesimpulan, dan berikan hasil komprehensif.",
  },
};

const MODELS = {
  "nara-mini": {
    label: "Nara Mini",
    env: "NARA_MODEL_MINI",
    fallback: "QWEN_MODEL",
    defaultModel: "qwen3.6-flash",
    pro: false,
    vision: true,
    instruction: "Utamakan kecepatan, efisiensi, dan jawaban praktis.",
  },
  "nara-writer": {
    label: "Nara Writer",
    env: "NARA_MODEL_WRITER",
    defaultModel: "qwen3.7-plus",
    pro: true,
    vision: false,
    instruction: "Utamakan kualitas penulisan, struktur, alur, suara merek, keterbacaan, dan SEO alami.",
  },
  "nara-vision": {
    label: "Nara Vision",
    env: "NARA_MODEL_VISION",
    defaultModel: "qwen3-vl-plus",
    pro: true,
    vision: true,
    instruction: "Analisis unsur visual secara teliti dan bedakan dengan jelas antara hal yang terlihat dan kesimpulan.",
  },
  "nara-max": {
    label: "Nara Max",
    env: "NARA_MODEL_MAX",
    defaultModel: "qwen3.7-max",
    pro: true,
    vision: true,
    instruction: "Gunakan kemampuan tertinggi untuk pekerjaan kompleks, lintas format, dan hasil siap pakai.",
  },
};

const QWEN_REGIONS = {
  singapore: (workspaceId) => `https://${workspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1`,
  tokyo: (workspaceId) => `https://${workspaceId}.ap-northeast-1.maas.aliyuncs.com/compatible-mode/v1`,
  frankfurt: (workspaceId) => `https://${workspaceId}.eu-central-1.maas.aliyuncs.com/compatible-mode/v1`,
  hongkong: (workspaceId) => `https://${workspaceId}.cn-hongkong.maas.aliyuncs.com/compatible-mode/v1`,
  virginia: () => "https://dashscope-us.aliyuncs.com/compatible-mode/v1",
};

const guestUsage = globalThis.__ngebloggingGuestUsage || new Map();
globalThis.__ngebloggingGuestUsage = guestUsage;

export const config = {
  path: "/api/nara",
  rateLimit: {
    windowLimit: 20,
    windowSize: 60,
    aggregateBy: ["ip", "domain"],
  },
};

function allowedOrigin(event) {
  const origin = event.headers?.origin || event.headers?.Origin || "";
  const configured = (process.env.PUBLIC_SITE_URL || "https://ngeblogging.com").replace(/\/$/, "");
  const allowed = new Set([configured, "https://ngeblogging.com", "https://www.ngeblogging.com", "http://localhost:5173"]);
  if (/^https:\/\/[a-z0-9-]+\.netlify\.app$/i.test(origin)) allowed.add(origin);
  return { origin: allowed.has(origin) ? origin : configured, valid: !origin || allowed.has(origin) };
}

function json(event, statusCode, body) {
  const cors = allowedOrigin(event);
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": cors.origin,
      "access-control-allow-headers": "content-type, authorization",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      vary: "Origin",
    },
    body: statusCode === 204 ? "" : JSON.stringify(body),
  };
}

function bearerToken(event) {
  const header = event.headers?.authorization || event.headers?.Authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

function supabaseConfig() {
  return {
    url: (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, ""),
    key: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "",
  };
}

function qwenConfig() {
  const key = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || "";
  const region = String(process.env.QWEN_REGION || "singapore").trim().toLowerCase();
  const workspaceId = String(process.env.QWEN_WORKSPACE_ID || "").trim();
  let baseUrl = String(process.env.QWEN_API_BASE_URL || "").trim().replace(/\/$/, "");

  if (!baseUrl && !QWEN_REGIONS[region]) {
    throw Object.assign(new Error("QWEN_REGION tidak dikenal. Gunakan singapore, tokyo, frankfurt, hongkong, atau virginia."), { code: "QWEN_CONFIG_INVALID" });
  }

  if (!baseUrl && QWEN_REGIONS[region] && (workspaceId || region === "virginia")) {
    if (workspaceId && !/^[a-z0-9-]+$/i.test(workspaceId)) {
      throw Object.assign(new Error("QWEN_WORKSPACE_ID tidak valid."), { code: "QWEN_CONFIG_INVALID" });
    }
    baseUrl = QWEN_REGIONS[region](workspaceId);
  }

  if (baseUrl) {
    let parsed;
    try { parsed = new URL(baseUrl); } catch {
      throw Object.assign(new Error("QWEN_API_BASE_URL tidak valid."), { code: "QWEN_CONFIG_INVALID" });
    }
    if (parsed.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(parsed.hostname)) {
      throw Object.assign(new Error("QWEN_API_BASE_URL wajib menggunakan HTTPS."), { code: "QWEN_CONFIG_INVALID" });
    }
  }

  const endpoint = baseUrl
    ? (/\/chat\/completions$/i.test(baseUrl) ? baseUrl : `${baseUrl}/chat/completions`)
    : "";
  return { key, region, workspaceId, baseUrl, endpoint };
}

function modelId(model) {
  return process.env[model.env]
    || (model.fallback ? process.env[model.fallback] : "")
    || model.defaultModel;
}

function naraStatus() {
  let qwen;
  try { qwen = qwenConfig(); } catch (error) {
    return { ready: false, code: error.code || "QWEN_CONFIG_INVALID", error: error.message };
  }
  const missing = [];
  if (!qwen.key) missing.push("QWEN_API_KEY");
  if (!qwen.baseUrl) missing.push(qwen.region === "virginia" ? "QWEN_API_BASE_URL" : "QWEN_WORKSPACE_ID atau QWEN_API_BASE_URL");
  return {
    ready: missing.length === 0,
    runtime: "netlify-modern-v1",
    provider: "Qwen · Alibaba Cloud Model Studio",
    region: qwen.region,
    missing,
    models: Object.entries(MODELS).map(([id, model]) => ({ id, label: model.label, configured: Boolean(modelId(model)) })),
  };
}

async function verifyUser(token) {
  if (!token) return null;
  const { url, key } = supabaseConfig();
  if (!url || !key) throw Object.assign(new Error("Konfigurasi autentikasi Nara belum lengkap."), { status: 503 });
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw Object.assign(new Error("Sesi login tidak valid. Silakan masuk kembali."), { status: 401 });
  return response.json();
}

async function consumeMemberQuota(token, model, intelligence) {
  const { url, key } = supabaseConfig();
  const response = await fetch(`${url}/rest/v1/rpc/consume_nara_quota`, {
    method: "POST",
    headers: {
      apikey: key,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ requested_model: model, requested_intelligence: intelligence }),
  });
  if (!response.ok) throw Object.assign(new Error("Batas penggunaan belum dapat diperiksa."), { status: 503 });
  const payload = await response.json();
  return Array.isArray(payload) ? payload[0] : payload;
}

function consumeGuestQuota(event) {
  const ip = event.headers?.["x-nf-client-connection-ip"] || event.headers?.["x-forwarded-for"]?.split(",")[0] || "guest";
  const key = `${new Date().toISOString().slice(0, 10)}:${ip}`;
  const used = guestUsage.get(key) || 0;
  const limit = 5;
  if (used >= limit) return { allowed: false, account_plan: "guest", remaining: 0, daily_limit: limit, reason: "DAILY_LIMIT" };
  guestUsage.set(key, used + 1);
  if (guestUsage.size > 5000) {
    const today = new Date().toISOString().slice(0, 10);
    for (const storedKey of guestUsage.keys()) if (!storedKey.startsWith(today)) guestUsage.delete(storedKey);
  }
  return { allowed: true, account_plan: "guest", remaining: limit - used - 1, daily_limit: limit, reason: "OK" };
}

function sanitizeHistory(history, limit) {
  if (!Array.isArray(history)) return [];
  return history.slice(-limit).flatMap((item) => {
    const role = item?.role === "assistant" ? "assistant" : item?.role === "user" ? "user" : null;
    const content = String(item?.content || "").trim().slice(0, 8000);
    return role && content ? [{ role, content }] : [];
  });
}

async function qwenError(response) {
  let providerCode = "";
  try {
    const payload = await response.json();
    providerCode = String(payload?.error?.code || payload?.code || "").slice(0, 120);
  } catch {
    // The public response remains useful even when the provider returns non-JSON.
  }
  const requestId = response.headers?.get?.("x-request-id") || response.headers?.get?.("request-id") || "";
  console.error("Qwen request failed", { status: response.status, providerCode, requestId });

  if (response.status === 401) return { status: 503, code: "QWEN_AUTH_FAILED", error: "API key Qwen ditolak. Buat atau salin ulang key dari workspace dan region yang sama." };
  if (response.status === 403) return { status: 503, code: "QWEN_ACCESS_DENIED", error: "Akses Qwen ditolak. Periksa aktivasi Model Studio, izin workspace, dan saldo akun." };
  if (response.status === 404) return { status: 503, code: "QWEN_NOT_FOUND", error: "Endpoint atau model Qwen tidak ditemukan. Periksa Workspace ID, region, dan nama model." };
  if (response.status === 429) return { status: 429, code: "QWEN_RATE_LIMIT", error: "Kapasitas atau kuota Qwen sedang penuh. Tunggu sebentar lalu coba lagi." };
  if (response.status === 400) return { status: 502, code: "QWEN_BAD_REQUEST", error: "Qwen menolak konfigurasi permintaan. Periksa kecocokan model dengan region dan format lampiran." };
  return { status: 502, code: "QWEN_UNAVAILABLE", error: "Server Qwen sedang bermasalah. Coba lagi beberapa saat." };
}

function sanitizeAttachments(attachments) {
  if (!Array.isArray(attachments)) return [];
  return attachments.slice(0, 4).flatMap((item) => {
    const name = String(item?.name || "lampiran").replace(/[\r\n]/g, " ").slice(0, 180);
    const type = String(item?.type || "application/octet-stream").slice(0, 100);
    const size = Number(item?.size || 0);
    if (!Number.isFinite(size) || size < 0 || size > 2_500_000) return [];
    if (item?.kind === "image" && /^data:image\/(jpeg|png|webp|gif);base64,/i.test(item?.dataUrl || "") && String(item.dataUrl).length <= 3_500_000) {
      return [{ name, type, size, kind: "image", dataUrl: item.dataUrl }];
    }
    if (item?.kind === "text") return [{ name, type, size, kind: "text", text: String(item?.text || "").slice(0, 50_000) }];
    return [{ name, type, size, kind: "file" }];
  });
}

function buildUserContent(message, attachments, context, visionEnabled) {
  const contextText = context && typeof context === "object" ? `\n\nKonteks Ngeblogging:\n${JSON.stringify(context).slice(0, 14_000)}` : "";
  const textAttachments = attachments.map((item) => item.kind === "text"
    ? `\n\n--- Lampiran ${item.name} ---\n${item.text}`
    : item.kind === "file"
      ? `\n\n[Lampiran tersedia: ${item.name}, ${item.type}, ${item.size} byte. Isi biner tidak dapat diekstrak oleh gateway ini.]`
      : "").join("");
  const text = `${message}${contextText}${textAttachments}`;
  const images = attachments.filter((item) => item.kind === "image");
  if (!images.length || !visionEnabled) return text;
  return [
    { type: "text", text },
    ...images.map((item) => ({ type: "image_url", image_url: { url: item.dataUrl } })),
  ];
}

export async function handleRequest(event) {
  if (event.httpMethod === "OPTIONS") return json(event, 204, {});
  if (!allowedOrigin(event).valid) return json(event, 403, { error: "Origin tidak diizinkan." });
  if (event.httpMethod === "GET") return json(event, 200, naraStatus());
  if (event.httpMethod !== "POST") return json(event, 405, { error: "Metode tidak didukung." });

  let qwen;
  try { qwen = qwenConfig(); } catch (error) {
    return json(event, 503, { code: error.code || "QWEN_CONFIG_INVALID", error: error.message });
  }
  if (!qwen.endpoint || !qwen.key) {
    return json(event, 503, {
      code: "QWEN_NOT_CONFIGURED",
      error: "Nara belum aktif. Isi QWEN_API_KEY serta QWEN_WORKSPACE_ID (region Singapura) di Netlify.",
    });
  }

  let input;
  try { input = JSON.parse(event.body || "{}"); } catch { return json(event, 400, { error: "Payload JSON tidak valid." }); }
  const message = String(input.message || "").trim();
  if (!message || message.length > 8000) return json(event, 400, { error: "Pesan wajib diisi dan maksimal 8.000 karakter." });

  const intelligenceKey = INTELLIGENCE[input.intelligence] ? input.intelligence : "standard";
  const modelKey = MODELS[input.model] ? input.model : "nara-mini";
  const intelligence = INTELLIGENCE[intelligenceKey];
  const model = MODELS[modelKey];
  const token = bearerToken(event);
  const actualModel = modelId(model);
  if (!actualModel) return json(event, 503, { error: `${model.label} belum dikonfigurasi pada server.` });

  let user = null;
  let quota;
  try {
    user = await verifyUser(token);
    if (user) quota = await consumeMemberQuota(token, modelKey, intelligenceKey);
    else {
      if (model.pro || intelligence.pro) return json(event, 403, { code: "PLAN_REQUIRED", error: "Pilihan ini tersedia untuk Nara Pro." });
      quota = consumeGuestQuota(event);
    }
  } catch (error) {
    return json(event, error.status || 500, { error: error.message || "Sesi belum dapat diverifikasi." });
  }

  if (!quota?.allowed) {
    if (quota?.reason === "PLAN_REQUIRED") return json(event, 403, { code: "PLAN_REQUIRED", error: "Model atau tingkat kecerdasan ini memerlukan Nara Pro." });
    return json(event, 429, { code: "DAILY_LIMIT", error: "Batas penggunaan Nara hari ini sudah tercapai. Silakan kembali besok atau gunakan paket Pro.", remaining: 0 });
  }

  const attachments = sanitizeAttachments(input.attachments);
  const hasImages = attachments.some((item) => item.kind === "image");
  if (hasImages && !model.vision) {
    return json(event, 400, { error: "Model ini khusus tulisan. Gunakan Nara Vision atau Nara Max untuk menganalisis gambar." });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), intelligence.timeoutMs);
  try {
    const response = await fetch(qwen.endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${qwen.key}` },
      body: JSON.stringify({
        model: actualModel,
        temperature: intelligence.temperature,
        max_tokens: intelligence.maxTokens,
        enable_thinking: intelligence.thinking,
        messages: [
          {
            role: "system",
            content: `Anda adalah Nara, asisten resmi Ngeblogging berbahasa Indonesia. Bantu penulisan, riset, SEO, strategi konten, dan penggunaan platform dengan hasil akurat, jelas, orisinal, serta berguna. Jangan mengarang fakta atau sumber. Nyatakan ketidakpastian dan minta konteks bila data tidak cukup. Jangan pernah menerbitkan, menghapus, mengubah domain, atau melakukan tindakan berisiko tanpa konfirmasi eksplisit pengguna. ${model.instruction} ${intelligence.instruction}`,
          },
          ...sanitizeHistory(input.history, intelligence.historyItems),
          { role: "user", content: buildUserContent(message, attachments, input.context, model.vision) },
        ],
      }),
    });
    if (!response.ok) {
      const failure = await qwenError(response);
      return json(event, failure.status, { code: failure.code, error: failure.error });
    }
    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content;
    return json(event, 200, {
      answer: typeof answer === "string" && answer.trim() ? answer : "Nara belum menghasilkan jawaban.",
      modelLabel: model.label,
      intelligence: intelligenceKey,
      intelligenceLabel: intelligence.label,
      thinking: intelligence.thinking,
      plan: quota.account_plan,
      remaining: quota.remaining,
      usage: {
        inputTokens: Number(data.usage?.prompt_tokens || 0),
        outputTokens: Number(data.usage?.completion_tokens || 0),
      },
    });
  } catch (error) {
    return json(event, error.name === "AbortError" ? 504 : 500, {
      error: error.name === "AbortError" ? "Nara melewati batas waktu. Coba lagi." : "Terjadi gangguan pada Nara.",
    });
  } finally {
    clearTimeout(timer);
  }
}

// Netlify's modern Functions API uses a Web Request and Response. Keep the
// request-processing core separate so it can be unit tested without a Netlify
// runtime while avoiding the deprecated Lambda `handler` export.
export default async function nara(request) {
  const headers = Object.fromEntries(request.headers.entries());
  const body = ["GET", "HEAD"].includes(request.method) ? "" : await request.text();
  const result = await handleRequest({
    httpMethod: request.method,
    headers,
    body,
  });

  return new Response(result.body || null, {
    status: result.statusCode,
    headers: result.headers,
  });
}
