import { readFile, writeFile } from "node:fs/promises";
import {
  NARA_FALLBACK_RELEASE_V226,
  NARA_MODEL_PROFILES_V226,
  NARA_INTELLIGENCE_PROFILES_V226,
} from "../server/nara-model-contract-v226.mjs";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

async function patchPrimaryLabels() {
  const path = "server/nara-handler.mjs";
  let source = await read(path);
  source = source.replace('label: "Ringan",\n    temperature: 0.3,', 'label: "Instan",\n    temperature: 0.3,');
  source = source.replace('label: "Ekstra tinggi",\n    temperature: 0.18,', 'label: "Maksimal",\n    temperature: 0.18,');
  if (!source.includes('light: {\n    label: "Instan"')) throw new Error("V226_PRIMARY_INSTANT_LABEL_MISSING");
  if (!source.includes('xhigh: {\n    label: "Maksimal"')) throw new Error("V226_PRIMARY_MAX_LABEL_MISSING");
  await write(path, source);
}

async function patchWorkerHealthMarker() {
  const path = "cloudflare/worker.mjs";
  let source = await read(path);
  if (!source.includes("naraFallbackModelContract")) {
    source = source.replace(
      'naraProviders: { qwen: qwenTextReady(env), workersAi: workersAiReady(env), vision: workersVisionReady(env) },',
      `naraProviders: { qwen: qwenTextReady(env), workersAi: workersAiReady(env), vision: workersVisionReady(env) },\n          naraFallbackModelContract: "${NARA_FALLBACK_RELEASE_V226}",`,
    );
  }
  if (!source.includes(NARA_FALLBACK_RELEASE_V226)) throw new Error("V226_WORKER_HEALTH_MARKER_MISSING");
  await write(path, source);
}

async function patchWranglerMarker() {
  const path = "wrangler.production.jsonc";
  let source = await read(path);
  if (!source.includes('"NARA_FALLBACK_MODEL_CONTRACT"')) {
    source = source.replace(
      '"NARA_RUNTIME": "cloudflare-worker-production-v160"',
      `"NARA_RUNTIME": "cloudflare-worker-production-v160",\n    "NARA_FALLBACK_MODEL_CONTRACT": "${NARA_FALLBACK_RELEASE_V226}"`,
    );
  }
  if (!source.includes(NARA_FALLBACK_RELEASE_V226)) throw new Error("V226_WRANGLER_MARKER_MISSING");
  await write(path, source);
}

async function verify() {
  const [frontend, workerFallback, secondaryFallback, primary, contract, worker, wrangler, release] = await Promise.all([
    read("src/NaraAssistant.jsx"),
    read("server/workers-ai-nara.mjs"),
    read("cloudflare/worker-v22.mjs"),
    read("server/nara-handler.mjs"),
    read("server/nara-model-contract-v226.mjs"),
    read("cloudflare/worker.mjs"),
    read("wrangler.production.jsonc"),
    read("public/release-v226.json"),
  ]);

  const checks = [
    [frontend, "model: requestModel", "frontend model payload"],
    [frontend, "intelligence: requestIntelligence", "frontend intelligence payload"],
    [frontend, 'fetch("/api/nara"', "frontend Nara endpoint"],
    [workerFallback, "workersAiProviderModelV226", "Workers AI model selection"],
    [workerFallback, "naraIntelligenceProfileV226", "Workers AI intelligence selection"],
    [workerFallback, "VISION_MODEL_REQUIRED", "Workers AI vision restriction"],
    [workerFallback, "requested_model", "Workers AI quota model"],
    [workerFallback, "requested_intelligence", "Workers AI quota intelligence"],
    [secondaryFallback, "workersAiProviderModelV226", "secondary fallback model selection"],
    [secondaryFallback, "NARA_FALLBACK_RELEASE_V226", "secondary fallback contract"],
    [primary, 'label: "Instan"', "primary instant label"],
    [primary, 'label: "Maksimal"', "primary maximum label"],
    [primary, '"nara-mini"', "primary Mini model"],
    [primary, '"nara-writer"', "primary Writer model"],
    [primary, '"nara-vision"', "primary Vision model"],
    [primary, '"nara-max"', "primary Max model"],
    [contract, "CF_AI_MODEL_MINI", "fallback Mini configurable provider"],
    [contract, "CF_AI_MODEL_WRITER", "fallback Writer configurable provider"],
    [contract, "CF_AI_MODEL_VISION", "fallback Vision configurable provider"],
    [contract, "CF_AI_MODEL_MAX", "fallback Max configurable provider"],
    [worker, NARA_FALLBACK_RELEASE_V226, "Worker health contract"],
    [wrangler, NARA_FALLBACK_RELEASE_V226, "Wrangler contract"],
    [release, NARA_FALLBACK_RELEASE_V226, "release artifact"],
  ];
  for (const [source, marker, label] of checks) {
    if (!source.includes(marker)) throw new Error(`V226_VERIFY_FAILED:${label}:${marker}`);
  }

  if (Object.keys(NARA_MODEL_PROFILES_V226).join(",") !== "nara-mini,nara-writer,nara-vision,nara-max") throw new Error("V226_MODEL_LIST_REGRESSION");
  if (Object.keys(NARA_INTELLIGENCE_PROFILES_V226).join(",") !== "light,standard,high,xhigh") throw new Error("V226_INTELLIGENCE_LIST_REGRESSION");
  if (NARA_MODEL_PROFILES_V226["nara-writer"].vision !== false) throw new Error("V226_WRITER_VISION_REGRESSION");
  if (!NARA_MODEL_PROFILES_V226["nara-vision"].vision || !NARA_MODEL_PROFILES_V226["nara-max"].vision) throw new Error("V226_VISION_CAPABILITY_REGRESSION");
}

await patchPrimaryLabels();
await patchWorkerHealthMarker();
await patchWranglerMarker();
await verify();
console.log(`Applied ${NARA_FALLBACK_RELEASE_V226}`);
