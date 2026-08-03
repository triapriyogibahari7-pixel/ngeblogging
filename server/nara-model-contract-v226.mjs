export const NARA_FALLBACK_RELEASE_V226 = "nara-fallback-model-contract-v226-20260803";

export const NARA_MODEL_PROFILES_V226 = Object.freeze({
  "nara-mini": Object.freeze({
    id: "nara-mini",
    label: "Nara Mini",
    vision: true,
    textEnv: "CF_AI_MODEL_MINI",
    visionEnv: "CF_AI_MODEL_MINI_VISION",
    instruction: "Utamakan kecepatan, jawaban ringkas, akurat, dan langkah praktis yang mudah dijalankan.",
  }),
  "nara-writer": Object.freeze({
    id: "nara-writer",
    label: "Nara Writer",
    vision: false,
    textEnv: "CF_AI_MODEL_WRITER",
    visionEnv: "",
    instruction: "Utamakan mutu tulisan, struktur, alur, keterbacaan, suara merek, dan SEO yang alami tanpa keyword stuffing.",
  }),
  "nara-vision": Object.freeze({
    id: "nara-vision",
    label: "Nara Vision",
    vision: true,
    textEnv: "CF_AI_MODEL_VISION_TEXT",
    visionEnv: "CF_AI_MODEL_VISION",
    instruction: "Utamakan analisis visual yang teliti. Bedakan hal yang benar-benar terlihat dari inferensi dan jangan mengarang teks atau objek yang tidak terlihat.",
  }),
  "nara-max": Object.freeze({
    id: "nara-max",
    label: "Nara Max",
    vision: true,
    textEnv: "CF_AI_MODEL_MAX",
    visionEnv: "CF_AI_MODEL_MAX_VISION",
    instruction: "Utamakan kualitas tertinggi untuk pekerjaan kompleks: periksa asumsi, konsistensi, alternatif, dan hasil akhir sebelum menjawab.",
  }),
});

export const NARA_INTELLIGENCE_PROFILES_V226 = Object.freeze({
  light: Object.freeze({
    id: "light",
    label: "Instan",
    maxTokens: 900,
    temperature: 0.35,
    instruction: "Jawab cepat dan langsung. Jangan memperpanjang jawaban bila tidak diperlukan.",
  }),
  standard: Object.freeze({
    id: "standard",
    label: "Sedang",
    maxTokens: 1800,
    temperature: 0.32,
    instruction: "Berikan jawaban seimbang, terstruktur, dan cukup mendalam.",
  }),
  high: Object.freeze({
    id: "high",
    label: "Tinggi",
    maxTokens: 2800,
    temperature: 0.24,
    instruction: "Analisis lebih dalam, periksa asumsi dan konsistensi, lalu susun hasil profesional.",
  }),
  xhigh: Object.freeze({
    id: "xhigh",
    label: "Maksimal",
    maxTokens: 4000,
    temperature: 0.18,
    instruction: "Gunakan penalaran paling teliti, uji alternatif, periksa kembali kesimpulan, dan berikan hasil komprehensif.",
  }),
});

export function normalizeNaraModelV226(value) {
  const key = String(value || "nara-mini").trim().toLowerCase();
  return NARA_MODEL_PROFILES_V226[key] ? key : "nara-mini";
}

export function normalizeNaraIntelligenceV226(value) {
  const key = String(value || "standard").trim().toLowerCase();
  return NARA_INTELLIGENCE_PROFILES_V226[key] ? key : "standard";
}

export function naraModelProfileV226(value) {
  return NARA_MODEL_PROFILES_V226[normalizeNaraModelV226(value)];
}

export function naraIntelligenceProfileV226(value) {
  return NARA_INTELLIGENCE_PROFILES_V226[normalizeNaraIntelligenceV226(value)];
}

export function workersAiProviderModelV226(env, requestedModel, hasImage = false) {
  const profile = naraModelProfileV226(requestedModel);
  if (hasImage && !profile.vision) return { profile, model: "", capability: "vision", supported: false };

  const configured = (name) => String(name ? env?.[name] || "" : "").trim();
  if (hasImage) {
    const model = configured(profile.visionEnv)
      || configured("CF_AI_VISION_MODEL")
      || "@cf/google/gemma-4-26b-a4b-it";
    return { profile, model, capability: "vision", supported: true };
  }

  const model = configured(profile.textEnv)
    || (profile.id === "nara-writer" || profile.id === "nara-max" ? configured("CF_AI_FALLBACK_MODEL") : "")
    || configured("CF_AI_MODEL")
    || "@cf/zai-org/glm-4.7-flash";
  return { profile, model, capability: "text", supported: true };
}
