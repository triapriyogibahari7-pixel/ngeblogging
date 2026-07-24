const base = "https://ngeblogging.com";
const tenantUrl = "https://tri-apriyogi-bahari.ngeblogging.com";
const stamp = Date.now();

async function read(url, options = {}) {
  try {
    const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}audit=${stamp}`, {
      redirect: "follow",
      ...options,
      headers: { "cache-control": "no-cache", ...(options.headers || {}) },
    });
    return { status: response.status, text: await response.text() };
  } catch (error) {
    return { status: 0, text: "", error: error.message };
  }
}

const [healthResult, indexResult, swResult, tenantResult] = await Promise.all([
  read(`${base}/api/health`, { headers: { accept: "application/json" } }),
  read(`${base}/`),
  read(`${base}/sw.js`),
  read(`${tenantUrl}/`),
]);
let health = {};
try { health = JSON.parse(healthResult.text || "{}"); } catch {}

const assetUrls = [...indexResult.text.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/gi)]
  .map((match) => new URL(match[1], base).href)
  .filter((url, index, all) => all.indexOf(url) === index);
const assets = await Promise.all(assetUrls.map(async (url) => ({ url, ...(await read(url)) })));
const combined = assets.map((asset) => asset.text).join("\n");
const compact = combined.replace(/\s+/g, "");

const unauth = await read(`${base}/api/nara`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: base },
  body: JSON.stringify({ message: "uji autentikasi", model: "nara-mini", intelligence: "standard", attachments: [], history: [] }),
});
let unauthPayload = {};
try { unauthPayload = JSON.parse(unauth.text || "{}"); } catch {}

const markers = {
  responsiveAuthority: compact.includes("--sn-phone-rail") && compact.includes(".nara-floating-button"),
  rawFileInputsHidden: compact.includes(".nara-native-file-input") || (compact.includes(".nara-composer") && compact.includes('input[type="file"]')),
  assistantLayer: compact.includes(".nara-assistant-layer") && compact.includes("z-index:30000"),
  studioV14Runtime: combined.includes("studio-source-navigation-v14-20260724"),
  commandCenterRelease: combined.includes("nara-command-center-v13-20260724"),
  commandCenterDedupe: combined.includes("nara-capability-shortcuts") && combined.includes("data-release"),
  projects: combined.includes("Projects"),
  memory: combined.includes("Memori") && combined.includes("Memory"),
  images: combined.includes("Buat gambar") && combined.includes("Images"),
  plugins: combined.includes("Plugins"),
  qr: combined.includes("Baca QR") && combined.includes("BarcodeDetector"),
  microphone: combined.includes("nara-mic") || combined.includes("SpeechRecognition") || combined.includes("webkitSpeechRecognition"),
  imageVisionAttachment: combined.includes("dataUrl") && combined.includes("attachments"),
};

const legacy = [
  "WHITE-R4-2026.07.12",
  "studio-runtime-layout-guard.js",
  "studio-mobile-navigation.js",
  "studio-production-guard.js",
  "nara-availability-bridge.js",
  "studio-v10-authority.css",
  "studio-v11-mobile-repair.css",
  "nara-interaction-authority.css",
  "nara-interaction-guard.js",
].filter((value) => indexResult.text.includes(value));

const result = {
  http: { health: healthResult.status, index: indexResult.status, sw: swResult.status, tenant: tenantResult.status },
  health: {
    status: health.status,
    service: health.service,
    release: health.release,
    runtime: health.runtime,
    billing: health.billing,
    paypal: health.billingProviders?.paypal,
    localBilling: health.billingProviders?.local,
    nara: health.nara,
    qwen: health.naraProviders?.qwen,
    workersAi: health.naraProviders?.workersAi,
    vision: health.naraProviders?.vision,
    imageGeneration: health.imageGeneration,
    imageProviders: health.imageProviders,
    customDomains: health.customDomains,
    emailRegistration: health.emailRegistration,
    managedSubdomains: health.managedSubdomains,
    siteLimits: health.siteLimits,
  },
  bundle: {
    indexBytes: Buffer.byteLength(indexResult.text),
    assetCount: assets.length,
    failedAssets: assets.filter((asset) => asset.status !== 200).map((asset) => ({ url: asset.url, status: asset.status })),
    assetBytes: assets.reduce((total, asset) => total + Buffer.byteLength(asset.text), 0),
    markers,
    legacy,
  },
  pwa: { bytes: Buffer.byteLength(swResult.text), v14: swResult.text.includes("ngeblogging-app-v14-20260724") },
  tenant: {
    bytes: Buffer.byteLength(tenantResult.text),
    is404: /Situs belum tersedia|>404<|404\s*[-–—]/i.test(tenantResult.text),
    appShell: tenantResult.text.includes("/src/main.jsx") || tenantResult.text.includes("/assets/"),
  },
  naraAuthGate: { status: unauth.status, code: unauthPayload.code, correct: unauth.status === 401 && unauthPayload.code === "NARA_SESSION_REQUIRED" },
};
console.log(`LIVE_V14_ASSET_RESULT=${JSON.stringify(result)}`);
