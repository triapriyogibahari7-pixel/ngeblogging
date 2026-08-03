import baseWorker from "./worker.mjs";
import {
  NARA_FALLBACK_RELEASE_V226,
  naraIntelligenceProfileV226,
  workersAiProviderModelV226,
} from "../server/nara-model-contract-v226.mjs";

const TEXT_FALLBACK_MODELS = [
  "@cf/zai-org/glm-4.7-flash",
  "@cf/meta/llama-3.1-8b-instruct-fast",
];

function safeText(value, limit = 8_000) {
  return String(value || "").trim().slice(0, limit);
}

function safeHistory(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(-12).flatMap((item) => {
    const role = item?.role === "assistant" ? "assistant" : item?.role === "user" ? "user" : null;
    const content = safeText(item?.content, 6_000);
    return role && content ? [{ role, content }] : [];
  });
}

function textAttachments(value) {
  if (!Array.isArray(value)) return "";
  return value.slice(0, 4).flatMap((item) => {
    if (item?.kind !== "text") return [];
    const name = safeText(item?.name || "teks", 120);
    const text = safeText(item?.text, 40_000);
    return text ? [`\n\n--- Lampiran ${name} ---\n${text}`] : [];
  }).join("");
}

function hasImage(value) {
  return Array.isArray(value) && value.some((item) => item?.kind === "image" && typeof item?.dataUrl === "string");
}

function userContent(input) {
  const context = input?.context && typeof input.context === "object"
    ? `\n\nKonteks Ngeblogging:\n${JSON.stringify(input.context).slice(0, 12_000)}`
    : "";
  return `${safeText(input?.message)}${context}${textAttachments(input?.attachments)}`.trim();
}

function outputText(result) {
  const direct = result?.response
    || result?.result?.response
    || result?.result
    || result?.text
    || result?.output_text
    || result?.choices?.[0]?.message?.content
    || result?.choices?.[0]?.text
    || "";
  if (typeof direct === "string") return direct.trim();
  if (Array.isArray(direct)) return direct.map((part) => typeof part === "string" ? part : part?.text || part?.content || "").join("\n").trim();
  return "";
}

async function runWithTimeout(promise, milliseconds = 48_000) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(Object.assign(new Error("Fallback inference timeout"), { timeout: true })), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function fallbackNara(request, env, originalResponse) {
  if (!env?.AI || typeof env.AI.run !== "function") return originalResponse;

  let input;
  try { input = await request.json(); }
  catch { return originalResponse; }

  // Secondary fallback remains text-only. Vision must never pretend that it read
  // an image when the dedicated vision path has failed.
  if (hasImage(input.attachments)) return originalResponse;

  const prompt = userContent(input);
  if (!prompt) return originalResponse;

  const selection = workersAiProviderModelV226(env, input.model, false);
  const intelligence = naraIntelligenceProfileV226(input.intelligence);
  const messages = [
    {
      role: "system",
      content: `Anda adalah Nara, asisten AI resmi Ngeblogging. Jawab terutama dalam Bahasa Indonesia yang alami. Bantu penulisan, ide, SEO, strategi konten, riset yang jujur, dan penggunaan platform. Jangan mengarang data, transaksi, hasil, sumber, atau kemampuan. Jangan pernah mengungkap rahasia server. Gunakan Markdown ringan dan berikan jawaban praktis. ${selection.profile.instruction} ${intelligence.instruction}`,
    },
    ...safeHistory(input.history),
    { role: "user", content: prompt },
  ];

  const primary = String(env.CF_AI_MODEL || "").trim();
  const configuredFallback = String(env.CF_AI_FALLBACK_MODEL || "").trim();
  const candidates = [...new Set([
    selection.model,
    configuredFallback,
    ...TEXT_FALLBACK_MODELS,
  ].filter((model) => model && model !== primary))];

  for (const model of candidates) {
    try {
      const result = await runWithTimeout(env.AI.run(model, {
        messages,
        max_tokens: intelligence.maxTokens,
        temperature: intelligence.temperature,
      }));
      const answer = outputText(result);
      if (!answer) continue;

      const headers = new Headers(originalResponse.headers);
      headers.set("content-type", "application/json; charset=utf-8");
      headers.set("cache-control", "no-store");
      headers.set("x-nara-fallback", model);
      headers.set("x-nara-fallback-contract", NARA_FALLBACK_RELEASE_V226);
      return new Response(JSON.stringify({
        answer,
        model: selection.profile.id,
        modelLabel: selection.profile.label,
        intelligence: intelligence.id,
        intelligenceLabel: intelligence.label,
        providerModel: model,
        provider: "Cloudflare Workers AI",
        capability: "text",
        fallback: true,
        fallbackContract: NARA_FALLBACK_RELEASE_V226,
      }), { status: 200, headers });
    } catch (error) {
      console.error("Nara fallback model failed", {
        model,
        requestedModel: selection.profile.id,
        requestedIntelligence: intelligence.id,
        name: error?.name || "Error",
        timeout: Boolean(error?.timeout),
      });
    }
  }

  return originalResponse;
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    const originalResponse = await baseWorker.fetch(request.clone(), env, context);
    if (url.pathname !== "/api/nara" || request.method !== "POST" || ![502, 504].includes(originalResponse.status)) return originalResponse;
    return fallbackNara(request, env, originalResponse);
  },
};
