import { readFile, writeFile } from "node:fs/promises";
import {
  NARA_FALLBACK_RELEASE_V227,
  NARA_MODEL_PROFILES_V227,
  NARA_INTELLIGENCE_PROFILES_V227,
  workersAiProviderModelV227,
} from "../server/nara-model-contract-v227.mjs";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

async function patchPrimaryLabels() {
  const path = "server/nara-handler.mjs";
  let source = await read(path);
  source = source.replace('label: "Ringan",\n    temperature: 0.3,', 'label: "Instan",\n    temperature: 0.3,');
  source = source.replace('label: "Ekstra tinggi",\n    temperature: 0.18,', 'label: "Maksimal",\n    temperature: 0.18,');
  if (!source.includes('light: {\n    label: "Instan"')) throw new Error("V227_PRIMARY_INSTANT_LABEL_MISSING");
  if (!source.includes('xhigh: {\n    label: "Maksimal"')) throw new Error("V227_PRIMARY_MAX_LABEL_MISSING");
  await write(path, source);
}

async function patchWorkerHealthMarker() {
  const path = "cloudflare/worker.mjs";
  let source = await read(path);
  if (!source.includes("naraFallbackModelContract")) {
    source = source.replace(
      'naraProviders: { qwen: qwenTextReady(env), workersAi: workersAiReady(env), vision: workersVisionReady(env) },',
      `naraProviders: { qwen: qwenTextReady(env), workersAi: workersAiReady(env), vision: workersVisionReady(env) },\n          naraFallbackModelContract: "${NARA_FALLBACK_RELEASE_V227}",`,
    );
  } else {
    source = source.replace(/naraFallbackModelContract:\s*"[^"]+"/, `naraFallbackModelContract: "${NARA_FALLBACK_RELEASE_V227}"`);
  }
  if (!source.includes(NARA_FALLBACK_RELEASE_V227)) throw new Error("V227_WORKER_HEALTH_MARKER_MISSING");
  await write(path, source);
}

async function patchWranglerMarker() {
  const path = "wrangler.production.jsonc";
  let source = await read(path);
  if (!source.includes('"NARA_FALLBACK_MODEL_CONTRACT"')) {
    source = source.replace(
      '"NARA_RUNTIME": "cloudflare-worker-production-v160"',
      `"NARA_RUNTIME": "cloudflare-worker-production-v160",\n    "NARA_FALLBACK_MODEL_CONTRACT": "${NARA_FALLBACK_RELEASE_V227}"`,
    );
  } else {
    source = source.replace(/"NARA_FALLBACK_MODEL_CONTRACT"\s*:\s*"[^"]+"/, `"NARA_FALLBACK_MODEL_CONTRACT": "${NARA_FALLBACK_RELEASE_V227}"`);
  }
  if (!source.includes(NARA_FALLBACK_RELEASE_V227)) throw new Error("V227_WRANGLER_MARKER_MISSING");
  await write(path, source);
}

async function verify() {
  const [frontend, fallback, secondary, primary, contract, worker, wrangler, release, greenMap] = await Promise.all([
    read("src/NaraAssistant.jsx"),
    read("server/workers-ai-nara.mjs"),
    read("cloudflare/worker-v22.mjs"),
    read("server/nara-handler.mjs"),
    read("server/nara-model-contract-v227.mjs"),
    read("cloudflare/worker.mjs"),
    read("wrangler.production.jsonc"),
    read("public/release-v227.json"),
    read("src/ThemeStudio.jsx"),
  ]);

  const checks = [
    [frontend, "model: requestModel", "frontend model payload"],
    [frontend, "intelligence: requestIntelligence", "frontend intelligence payload"],
    [frontend, 'fetch("/api/nara"', "frontend endpoint"],
    [fallback, "workersAiProviderModelV227", "Workers AI model selection"],
    [fallback, "naraIntelligenceProfileV227", "Workers AI intelligence"],
    [fallback, "VISION_MODEL_REQUIRED", "Writer vision restriction"],
    [fallback, "requested_model", "quota model"],
    [fallback, "requested_intelligence", "quota intelligence"],
    [secondary, "workersAiProviderModelV227", "secondary model selection"],
    [secondary, "NARA_FALLBACK_RELEASE_V227", "secondary contract"],
    [primary, 'label: "Instan"', "primary Instan label"],
    [primary, 'label: "Maksimal"', "primary Maksimal label"],
    [primary, '"nara-mini"', "primary Mini"],
    [primary, '"nara-writer"', "primary Writer"],
    [primary, '"nara-vision"', "primary Vision"],
    [primary, '"nara-max"', "primary Max"],
    [contract, "CF_AI_MODEL_MINI", "configurable Mini"],
    [contract, "CF_AI_MODEL_WRITER", "configurable Writer"],
    [contract, "CF_AI_MODEL_VISION", "configurable Vision"],
    [contract, "CF_AI_MODEL_MAX", "configurable Max"],
    [worker, NARA_FALLBACK_RELEASE_V227, "Worker health contract"],
    [wrangler, NARA_FALLBACK_RELEASE_V227, "Wrangler contract"],
    [release, NARA_FALLBACK_RELEASE_V227, "release metadata"],
    [greenMap, "tn-layout-canvas", "v226 Theme map source preserved"],
  ];
  for (const [source, marker, label] of checks) {
    if (!source.includes(marker)) throw new Error(`V227_VERIFY_FAILED:${label}:${marker}`);
  }

  const sampleEnv = {
    CF_AI_MODEL: "mini-default",
    CF_AI_FALLBACK_MODEL: "writer-max-default",
    CF_AI_VISION_MODEL: "vision-default",
    CF_AI_MODEL_WRITER: "writer-specific",
    CF_AI_MODEL_MAX: "max-specific",
  };
  if (workersAiProviderModelV227(sampleEnv, "nara-mini", false).model !== "mini-default") throw new Error("V227_MINI_PROVIDER_SELECTION_FAILED");
  if (workersAiProviderModelV227(sampleEnv, "nara-writer", false).model !== "writer-specific") throw new Error("V227_WRITER_PROVIDER_SELECTION_FAILED");
  if (workersAiProviderModelV227(sampleEnv, "nara-max", false).model !== "max-specific") throw new Error("V227_MAX_PROVIDER_SELECTION_FAILED");
  if (workersAiProviderModelV227(sampleEnv, "nara-vision", true).model !== "vision-default") throw new Error("V227_VISION_PROVIDER_SELECTION_FAILED");
  if (workersAiProviderModelV227(sampleEnv, "nara-writer", true).supported !== false) throw new Error("V227_WRITER_VISION_RESTRICTION_FAILED");

  if (Object.keys(NARA_MODEL_PROFILES_V227).join(",") !== "nara-mini,nara-writer,nara-vision,nara-max") throw new Error("V227_MODEL_LIST_REGRESSION");
  if (Object.keys(NARA_INTELLIGENCE_PROFILES_V227).join(",") !== "light,standard,high,xhigh") throw new Error("V227_INTELLIGENCE_LIST_REGRESSION");
}

await patchPrimaryLabels();
await patchWorkerHealthMarker();
await patchWranglerMarker();
await verify();
console.log(`Applied ${NARA_FALLBACK_RELEASE_V227}`);
