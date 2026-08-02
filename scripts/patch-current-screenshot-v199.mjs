import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-current-screenshot-v199-20260802";
const VERSION = "ngeblogging-app-v199-mobile-auth-ui-20260802";
const CACHE = "mobile-auth-ui-cache-v199";

function replaceOnce(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) throw new Error(`V199_${label}_ANCHOR_MISSING`);
  return source.replace(search, replacement);
}

async function patchSupabaseRuntime() {
  const path = "src/lib/supabase.js";
  let source = await read(path);

  const currentConfig = `const browserEnv = import.meta.env || {};
const url = String(browserEnv.VITE_SUPABASE_URL || "").trim().replace(/\\/$/, "");
const key = String(
  browserEnv.VITE_SUPABASE_PUBLISHABLE_KEY
  || browserEnv.VITE_SUPABASE_ANON_KEY
  || "",
).trim();
const nativeFetch = typeof globalThis.fetch === "function"
  ? globalThis.fetch.bind(globalThis)
  : null;

export const supabaseConfigured = Boolean(url && key);`;

  const gatewayConfig = `const browserEnv = import.meta.env || {};
const configuredSupabaseUrlV199 = String(browserEnv.VITE_SUPABASE_URL || "").trim().replace(/\\/$/, "");
const configuredSupabaseKeyV199 = String(
  browserEnv.VITE_SUPABASE_PUBLISHABLE_KEY
  || browserEnv.VITE_SUPABASE_ANON_KEY
  || "",
).trim();
const runtimeGatewayOriginV199 = (() => {
  if (typeof window === "undefined") return "";
  const hostname = window.location.hostname.toLowerCase();
  const trusted = hostname === "ngeblogging.com"
    || hostname === "www.ngeblogging.com"
    || hostname.endsWith(".ngeblogging.com")
    || hostname.endsWith(".netlify.app")
    || hostname.endsWith(".pages.dev")
    || hostname.endsWith(".workers.dev");
  return trusted ? window.location.origin : "";
})();
const sameOriginGatewayOnlyV199 = Boolean(
  runtimeGatewayOriginV199 && (!configuredSupabaseUrlV199 || !configuredSupabaseKeyV199),
);
const url = sameOriginGatewayOnlyV199 ? runtimeGatewayOriginV199 : configuredSupabaseUrlV199;
const key = sameOriginGatewayOnlyV199 ? "ngeblogging-public-gateway-v199" : configuredSupabaseKeyV199;
const nativeFetch = typeof globalThis.fetch === "function"
  ? globalThis.fetch.bind(globalThis)
  : null;

export const supabaseConfigured = Boolean(url && key);`;

  if (!source.includes("sameOriginGatewayOnlyV199")) {
    source = replaceOnce(source, currentConfig, gatewayConfig, "SUPABASE_RUNTIME_CONFIG");
  }

  const currentGatewayHost = `  return hostname === "ngeblogging.com"
    || hostname === "www.ngeblogging.com"
    || hostname.endsWith(".ngeblogging.com")
    || hostname.endsWith(".workers.dev");`;
  const expandedGatewayHost = `  return hostname === "ngeblogging.com"
    || hostname === "www.ngeblogging.com"
    || hostname.endsWith(".ngeblogging.com")
    || hostname.endsWith(".netlify.app")
    || hostname.endsWith(".pages.dev")
    || hostname.endsWith(".workers.dev");`;
  if (!source.includes('hostname.endsWith(".netlify.app")')) {
    source = replaceOnce(source, currentGatewayHost, expandedGatewayHost, "GATEWAY_HOSTS");
  }

  const fallbackResponse = `    console.warn(\`Gateway \${kind} mengembalikan \${response.status}; mencoba Supabase langsung.\`);`;
  const guardedFallbackResponse = `    if (sameOriginGatewayOnlyV199) {
      if (typeof document !== "undefined") document.documentElement.dataset.supabaseGatewayOnlyV199 = kind;
      return response;
    }
    console.warn(\`Gateway \${kind} mengembalikan \${response.status}; mencoba Supabase langsung.\`);`;
  if (!source.includes("dataset.supabaseGatewayOnlyV199")) {
    source = replaceOnce(source, fallbackResponse, guardedFallbackResponse, "GATEWAY_ONLY_RESPONSE");
  }

  const fallbackCatch = `  } catch (error) {
    console.warn(\`Gateway \${kind} tidak terjangkau; mencoba Supabase langsung.\`, error);
  }
  if (typeof document !== "undefined") {`;
  const guardedFallbackCatch = `  } catch (error) {
    if (sameOriginGatewayOnlyV199) throw error;
    console.warn(\`Gateway \${kind} tidak terjangkau; mencoba Supabase langsung.\`, error);
  }
  if (typeof document !== "undefined") {`;
  if (!source.includes("if (sameOriginGatewayOnlyV199) throw error;")) {
    source = replaceOnce(source, fallbackCatch, guardedFallbackCatch, "GATEWAY_ONLY_CATCH");
  }

  const currentProviderDestination = `function providerDestination(value) {
  const direct = new URL(value);
  if (typeof document !== "undefined") {
    document.documentElement.dataset.authProviderTransportV189 = "direct-supabase-oauth";
    document.documentElement.dataset.authProviderTransportV190 = "direct-supabase-oauth";
  }
  return direct.toString();
}`;
  const gatewayProviderDestination = `function providerDestination(value) {
  const direct = new URL(value);
  if (sameOriginGatewayOnlyV199 && typeof window !== "undefined" && direct.origin === window.location.origin && direct.pathname.startsWith("/auth/v1/")) {
    const gateway = new URL(\`${AUTH_GATEWAY_PREFIX}\${direct.pathname}\${direct.search}\`, window.location.origin);
    document.documentElement.dataset.authProviderTransportV199 = "same-origin-gateway";
    return gateway.toString();
  }
  if (typeof document !== "undefined") {
    document.documentElement.dataset.authProviderTransportV189 = "direct-supabase-oauth";
    document.documentElement.dataset.authProviderTransportV190 = "direct-supabase-oauth";
    document.documentElement.dataset.authProviderTransportV199 = "configured-supabase";
  }
  return direct.toString();
}`;
  if (!source.includes("authProviderTransportV199")) {
    source = replaceOnce(source, currentProviderDestination, gatewayProviderDestination, "PROVIDER_GATEWAY_DESTINATION");
  }

  const currentDataset = `  document.documentElement.dataset.supabaseTransport = supabaseConfigured ? "auth-data-resilience-v190" : "not-configured";`;
  const v199Dataset = `  document.documentElement.dataset.supabaseTransport = supabaseConfigured ? (sameOriginGatewayOnlyV199 ? "same-origin-gateway-v199" : "auth-data-resilience-v190") : "not-configured";
  document.documentElement.dataset.supabaseGatewayFallbackV199 = String(sameOriginGatewayOnlyV199);`;
  if (!source.includes("supabaseGatewayFallbackV199")) {
    source = replaceOnce(source, currentDataset, v199Dataset, "SUPABASE_DATASET");
  }

  await write(path, source);
}

async function patchAuthGateway() {
  const path = "server/auth-gateway-v108.mjs";
  let source = await read(path);
  source = source.replace(
    'export const AUTH_GATEWAY_RELEASE = "2026.07.30-auth-gateway-v153";',
    'export const AUTH_GATEWAY_RELEASE = "2026.08.02-auth-gateway-v199";',
  );
  source = source.replace(
    '  if (!headers.has("apikey")) headers.set("apikey", publishableKey);',
    '  headers.set("apikey", publishableKey); // v199: never trust a browser-supplied project key.',
  );
  source = source.replace(
    'headers.get("x-client-info") || "ngeblogging-auth-gateway-v153"',
    'headers.get("x-client-info") || "ngeblogging-auth-gateway-v199"',
  );
  if (!source.includes("2026.08.02-auth-gateway-v199") || !source.includes("never trust a browser-supplied project key")) {
    throw new Error("V199_AUTH_GATEWAY_PATCH_FAILED");
  }
  await write(path, source);
}

async function patchDataGateway() {
  const path = "server/data-gateway-v110.mjs";
  let source = await read(path);
  source = source.replace(
    'export const DATA_GATEWAY_RELEASE = "2026.07.28-data-gateway-v110";',
    'export const DATA_GATEWAY_RELEASE = "2026.08.02-data-gateway-v199";',
  );
  source = source.replace(
    '  if (!headers.has("apikey")) headers.set("apikey", publishableKey);',
    '  headers.set("apikey", publishableKey); // v199: server authority owns the project key.',
  );
  const originCurrent = `    return url.protocol === "https:"
      && (hostname === "ngeblogging.com" || hostname.endsWith(".ngeblogging.com"));`;
  const originV199 = `    return url.protocol === "https:" && (
      hostname === "ngeblogging.com"
      || hostname.endsWith(".ngeblogging.com")
      || hostname.endsWith(".netlify.app")
      || hostname.endsWith(".pages.dev")
      || hostname.endsWith(".workers.dev")
    );`;
  if (!source.includes('hostname.endsWith(".netlify.app")')) {
    source = replaceOnce(source, originCurrent, originV199, "DATA_GATEWAY_ORIGINS");
  }
  if (!source.includes("2026.08.02-data-gateway-v199") || !source.includes("server authority owns the project key")) {
    throw new Error("V199_DATA_GATEWAY_PATCH_FAILED");
  }
  await write(path, source);
}

async function patchNaraComposer() {
  const path = "src/NaraAssistant.jsx";
  let source = await read(path);
  if (!source.includes("nara-mobile-direct-tools-v199")) {
    const anchor = `              <div className="nara-composer-tools">
                <div className="nara-attachment-menu-wrap">`;
    const replacement = `              <div className="nara-composer-tools">
                <div className="nara-mobile-direct-tools-v199" role="group" aria-label="Lampiran cepat Nara">
                  <button type="button" disabled={busy} onClick={() => cameraInput.current?.click()} title="Kamera" aria-label="Buka kamera"><Camera /></button>
                  <button type="button" disabled={busy} onClick={() => imageInput.current?.click()} title="Foto" aria-label="Pilih foto"><ImageIcon /></button>
                  <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} title="File" aria-label="Pilih file"><File /></button>
                </div>
                <div className="nara-attachment-menu-wrap">`;
    source = replaceOnce(source, anchor, replacement, "NARA_DIRECT_TOOLS");
  }
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "mobile-auth-ui-v199";');
  if (!source.includes("CURRENT_SCREENSHOT_RELEASE_V199")) {
    source = source.replace(/^(const VERSION = .*;\n)/m, `$1const CURRENT_SCREENSHOT_RELEASE_V199 = "${RELEASE}";\n`);
  }
  source = source
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V198", "NGE_BLOGGING_UPDATE_AVAILABLE_V199")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V194", "NGE_BLOGGING_UPDATE_AVAILABLE_V199");
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v199 announces the new shell without forced navigation or session destruction.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V199_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) {
    throw new Error("V199_SESSION_DESTRUCTIVE_ACTION_FOUND");
  }
  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/Studio.jsx", "studio-current-screenshot-v199.js"],
    ["src/studio-current-screenshot-v199.js", RELEASE],
    ["src/studio-current-screenshot-v199.js", "normalizeThemeActions"],
    ["src/studio-current-screenshot-v199.js", "normalizeAccountSurface"],
    ["src/studio-current-screenshot-v199.css", "nara-mobile-direct-tools-v199"],
    ["src/studio-current-screenshot-v199.css", 'grid-template-areas: "title sizes voice close"'],
    ["src/studio-current-screenshot-v199.css", '"top-left-1 top-right-1"'],
    ["src/NaraAssistant.jsx", "nara-mobile-direct-tools-v199"],
    ["src/NaraAssistant.jsx", "recognition.current = null;"],
    ["src/lib/supabase.js", "sameOriginGatewayOnlyV199"],
    ["src/lib/supabase.js", "supabaseGatewayFallbackV199"],
    ["server/auth-gateway-v108.mjs", "2026.08.02-auth-gateway-v199"],
    ["server/data-gateway-v110.mjs", "2026.08.02-data-gateway-v199"],
    ["public/release-v199.json", RELEASE],
    ["public/sw.js", VERSION],
    ["public/sw.js", CACHE],
    ["public/sw.js", RELEASE],
  ];

  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V199_VERIFY_FAILED:${path}:${marker}`);
  }

  const worker = await read("public/sw.js");
  if (/await refreshStaleWindow\(client, url\);/.test(worker)) throw new Error("V199_FORCED_NAVIGATION_REINTRODUCED");

  const authGateway = await read("server/auth-gateway-v108.mjs");
  const dataGateway = await read("server/data-gateway-v110.mjs");
  if (/if \(!headers\.has\("apikey"\)\)/.test(authGateway + dataGateway)) {
    throw new Error("V199_BROWSER_PROJECT_KEY_CAN_STILL_OVERRIDE_SERVER_AUTHORITY");
  }
}

await patchSupabaseRuntime();
await patchAuthGateway();
await patchDataGateway();
await patchNaraComposer();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
