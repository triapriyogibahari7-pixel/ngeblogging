const INTELLIGENCE = {
  light: { temperature: 0.3, maxTokens: 900, pro: false, instruction: "Jawab cepat, langsung, dan praktis." },
  standard: { temperature: 0.35, maxTokens: 1800, pro: false, instruction: "Berikan jawaban seimbang, terstruktur, dan cukup mendalam." },
  high: { temperature: 0.25, maxTokens: 3200, pro: true, instruction: "Analisis mendalam, periksa asumsi, dan susun hasil profesional." },
  xhigh: { temperature: 0.18, maxTokens: 5000, pro: true, instruction: "Gunakan penalaran paling teliti, evaluasi alternatif, dan berikan hasil komprehensif." },
};

const MODELS = {
  "nara-mini": { label: "Nara Mini", env: "NARA_MODEL_MINI", fallback: "QWEN_MODEL", pro: false },
  "nara-writer": { label: "Nara Writer", env: "NARA_MODEL_WRITER", pro: true },
  "nara-vision": { label: "Nara Vision", env: "NARA_MODEL_VISION", pro: true, vision: true },
  "nara-max": { label: "Nara Max", env: "NARA_MODEL_MAX", pro: true },
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
      "access-control-allow-methods": "POST, OPTIONS",
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

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-8).flatMap((item) => {
    const role = item?.role === "assistant" ? "assistant" : item?.role === "user" ? "user" : null;
    const content = String(item?.content || "").trim().slice(0, 8000);
    return role && content ? [{ role, content }] : [];
  });
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

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json(event, 204, {});
  if (!allowedOrigin(event).valid) return json(event, 403, { error: "Origin tidak diizinkan." });
  if (event.httpMethod !== "POST") return json(event, 405, { error: "Metode tidak didukung." });
  if (!process.env.QWEN_API_BASE_URL || !process.env.QWEN_API_KEY) return json(event, 503, { error: "Nara belum dihubungkan ke server inference." });

  let input;
  try { input = JSON.parse(event.body || "{}"); } catch { return json(event, 400, { error: "Payload JSON tidak valid." }); }
  const message = String(input.message || "").trim();
  if (!message || message.length > 8000) return json(event, 400, { error: "Pesan wajib diisi dan maksimal 8.000 karakter." });

  const intelligenceKey = INTELLIGENCE[input.intelligence] ? input.intelligence : "standard";
  const modelKey = MODELS[input.model] ? input.model : "nara-mini";
  const intelligence = INTELLIGENCE[intelligenceKey];
  const model = MODELS[modelKey];
  const token = bearerToken(event);
  const actualModel = process.env[model.env] || (model.fallback ? process.env[model.fallback] : "") || (modelKey === "nara-mini" ? "Qwen/Qwen3.5-4B" : "");
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
  if (hasImages && !model.vision && modelKey !== "nara-mini") {
    return json(event, 400, { error: "Gunakan Nara Vision untuk analisis gambar pada pilihan model ini." });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), intelligenceKey === "xhigh" ? 60000 : 45000);
  try {
    const response = await fetch(`${process.env.QWEN_API_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.QWEN_API_KEY}` },
      body: JSON.stringify({
        model: actualModel,
        temperature: intelligence.temperature,
        max_tokens: intelligence.maxTokens,
        messages: [
          {
            role: "system",
            content: `Anda adalah Nara, asisten resmi Ngeblogging berbahasa Indonesia. Bantu penulisan, riset, SEO, strategi konten, dan penggunaan platform dengan hasil akurat, jelas, orisinal, serta berguna. Jangan mengarang fakta atau sumber. Nyatakan ketidakpastian dan minta konteks bila data tidak cukup. Jangan pernah menerbitkan, menghapus, mengubah domain, atau melakukan tindakan berisiko tanpa konfirmasi eksplisit pengguna. ${intelligence.instruction}`,
          },
          ...sanitizeHistory(input.history),
          { role: "user", content: buildUserContent(message, attachments, input.context, model.vision || modelKey === "nara-mini") },
        ],
      }),
    });
    if (!response.ok) return json(event, 502, { error: "Layanan model Nara sedang tidak tersedia." });
    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content;
    return json(event, 200, {
      answer: typeof answer === "string" && answer.trim() ? answer : "Nara belum menghasilkan jawaban.",
      model: data.model || actualModel,
      modelLabel: model.label,
      intelligence: intelligenceKey,
      plan: quota.account_plan,
      remaining: quota.remaining,
    });
  } catch (error) {
    return json(event, error.name === "AbortError" ? 504 : 500, {
      error: error.name === "AbortError" ? "Nara melewati batas waktu. Coba lagi." : "Terjadi gangguan pada Nara.",
    });
  } finally {
    clearTimeout(timer);
  }
}
