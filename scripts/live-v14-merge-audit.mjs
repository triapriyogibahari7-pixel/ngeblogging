const base = "https://ngeblogging.com";
const tenantUrl = "https://tri-apriyogi-bahari.ngeblogging.com";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function read(url, options = {}) {
  const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}audit=${Date.now()}`, {
    redirect: "follow",
    ...options,
    headers: { "cache-control": "no-cache", ...(options.headers || {}) },
  });
  return { status: response.status, text: await response.text() };
}

async function inspect() {
  const [healthResult, indexResult, swResult, tenantResult] = await Promise.all([
    read(`${base}/api/health`, { headers: { accept: "application/json" } }),
    read(`${base}/`),
    read(`${base}/sw.js`),
    read(`${tenantUrl}/`),
  ]);
  let health = {};
  try { health = JSON.parse(healthResult.text || "{}"); } catch {}

  const initialAssets = [...indexResult.text.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/gi)]
    .map((match) => new URL(match[1], base).href);
  const queue = [...new Set(initialAssets)];
  const visited = new Set();
  const assets = [];
  while (queue.length && visited.size < 80) {
    const url = queue.shift();
    if (!url || visited.has(url)) continue;
    visited.add(url);
    const result = await read(url);
    assets.push({ url, ...result });
    if (result.status !== 200 || !/\.js(?:\?|$)/i.test(url)) continue;
    for (const match of result.text.matchAll(/["']((?:\/assets\/|\.\/)[^"']+\.(?:js|css)(?:\?[^"']*)?)["']/gi)) {
      const child = new URL(match[1], url).href;
      if (child.startsWith(`${base}/assets/`) && !visited.has(child)) queue.push(child);
    }
  }

  const combined = assets.map((asset) => asset.text).join("\n");
  const compact = combined.replace(/\s+/g, "");
  const hiddenInputsInert = compact.includes(".nara-native-file-input")
    && compact.includes("visibility:hidden!important")
    && compact.includes("pointer-events:none!important");
  const responsiveAuthority = compact.includes("--sn-phone-rail:58px")
    && compact.includes("--sn-panel-width:228px")
    && compact.includes(".nara-floating-button")
    && compact.includes("z-index:24000!important");

  return {
    ok: healthResult.status === 200
      && indexResult.status === 200
      && swResult.status === 200
      && tenantResult.status === 200
      && health.status === "ok"
      && health.release === "2026.07.24-studio-v14"
      && health.nara === true
      && health.naraProviders?.vision === true
      && health.imageGeneration === true
      && hiddenInputsInert
      && responsiveAuthority
      && swResult.text.includes("ngeblogging-app-v14-20260724")
      && !/Situs belum tersedia|>404<|404\s*[-–—]/i.test(tenantResult.text),
    http: { health: healthResult.status, index: indexResult.status, sw: swResult.status, tenant: tenantResult.status },
    release: health.release,
    runtime: health.runtime,
    nara: health.nara,
    vision: health.naraProviders?.vision,
    imageGeneration: health.imageGeneration,
    billing: health.billing,
    paypal: health.billingProviders?.paypal,
    emailRegistration: health.emailRegistration,
    customDomains: health.customDomains,
    managedSubdomains: health.managedSubdomains,
    siteLimits: health.siteLimits,
    assetCount: assets.length,
    assetBytes: assets.reduce((total, asset) => total + Buffer.byteLength(asset.text), 0),
    failedAssets: assets.filter((asset) => asset.status !== 200).map((asset) => ({ url: asset.url, status: asset.status })),
    hiddenInputsInert,
    responsiveAuthority,
    pwaV14: swResult.text.includes("ngeblogging-app-v14-20260724"),
    tenant404: /Situs belum tersedia|>404<|404\s*[-–—]/i.test(tenantResult.text),
  };
}

let latest = null;
for (let attempt = 1; attempt <= 24; attempt += 1) {
  try {
    latest = await inspect();
    console.log(`MERGED_V14_ATTEMPT_${attempt}=${JSON.stringify(latest)}`);
    if (latest.ok) process.exit(0);
  } catch (error) {
    latest = { ok: false, error: error.message };
    console.log(`MERGED_V14_ATTEMPT_${attempt}=${JSON.stringify(latest)}`);
  }
  await sleep(10000);
}
console.error(`MERGED_V14_LIVE_AUDIT_FAILED=${JSON.stringify(latest)}`);
process.exit(1);
