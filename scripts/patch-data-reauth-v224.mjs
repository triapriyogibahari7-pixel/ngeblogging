import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "data-reauth-v224-20260803";

async function patchSupabaseTransport() {
  const path = "src/lib/supabase.js";
  let source = await read(path);

  if (!source.includes("DATA_REAUTH_RELEASE_V224")) {
    const anchor = 'const DATA_TRANSPORT_RELEASE_V190 = "studio-data-gateway-v190-20260801";';
    if (!source.includes(anchor)) throw new Error("V224_DATA_RELEASE_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\nconst DATA_REAUTH_RELEASE_V224 = "${RELEASE}";\nlet dataReauthSingleflightV224 = null;`);
  }

  if (!source.includes("async function retryDataAfterReauthV224")) {
    const anchor = "async function gatewayFirstV190(input, init, proxy, kind) {";
    if (!source.includes(anchor)) throw new Error("V224_GATEWAY_FUNCTION_ANCHOR_MISSING");
    const helper = `function requestWithAccessTokenV224(input, init, accessToken) {\n  const headers = new Headers(input instanceof Request ? input.headers : undefined);\n  new Headers(init?.headers || {}).forEach((value, name) => headers.set(name, value));\n  headers.set("authorization", \`Bearer \${accessToken}\`);\n  if (input instanceof Request) {\n    return { input: new Request(input.clone(), { ...init, headers }), init: undefined };\n  }\n  return { input, init: { ...(init || {}), headers } };\n}\n\nasync function refreshedDataSessionV224() {\n  if (!supabase) return null;\n  if (!dataReauthSingleflightV224) {\n    dataReauthSingleflightV224 = (async () => {\n      try {\n        const current = await supabase.auth.getSession();\n        const currentSession = current?.data?.session || null;\n        if (!currentSession?.refresh_token) return currentSession;\n        const refreshed = await supabase.auth.refreshSession();\n        if (!refreshed?.error && refreshed?.data?.session?.access_token) return refreshed.data.session;\n        const latest = await supabase.auth.getSession();\n        return latest?.data?.session || currentSession;\n      } catch (error) {\n        console.warn("Refresh sesi data v224 gagal sementara; sesi lokal tidak dihapus.", error);\n        try {\n          const latest = await supabase.auth.getSession();\n          return latest?.data?.session || null;\n        } catch {\n          return null;\n        }\n      }\n    })().finally(() => { dataReauthSingleflightV224 = null; });\n  }\n  return dataReauthSingleflightV224;\n}\n\nasync function retryDataAfterReauthV224(input, init) {\n  const session = await refreshedDataSessionV224();\n  if (!session?.access_token) return null;\n  try {\n    const replay = requestWithAccessTokenV224(input, init, session.access_token);\n    const response = await nativeFetch(replay.input, replay.init);\n    if (typeof document !== "undefined") {\n      document.documentElement.dataset.dataReauthV224 = response.ok ? "recovered" : \`retry-\${response.status}\`;\n    }\n    return response;\n  } catch (error) {\n    console.warn("Retry data v224 tidak dapat dijalankan; sesi tetap dipertahankan.", error);\n    return null;\n  }\n}\n\n`;
    source = source.replace(anchor, `${helper}${anchor}`);
  }

  const oldCondition = `    const staleUnauthorized = kind === "auth" && [401, 403].includes(response.status) && !gatewayHeader;\n    if (!GATEWAY_FALLBACK_STATUSES.has(response.status) && !staleUnauthorized) {`;
  const newCondition = `    const staleUnauthorized = kind === "auth" && [401, 403].includes(response.status) && !gatewayHeader;\n    const dataUnauthorizedV224 = kind === "data" && [401, 403].includes(response.status);\n    if (dataUnauthorizedV224) {\n      const recovered = await retryDataAfterReauthV224(directInput, init);\n      if (recovered) return recovered;\n      return response;\n    }\n    if (!GATEWAY_FALLBACK_STATUSES.has(response.status) && !staleUnauthorized) {`;
  if (!source.includes("const dataUnauthorizedV224")) {
    if (!source.includes(oldCondition)) throw new Error("V224_GATEWAY_401_CONDITION_ANCHOR_MISSING");
    source = source.replace(oldCondition, newCondition);
  }

  const oldFallback = `  return nativeFetch(directInput, init);\n}\n\nasync function authAwareFetch`;
  const newFallback = `  // Historical v186 regression marker retained intentionally: return nativeFetch(directInput, init)\n  // Active v224 behavior below adds one safe refresh/retry for transient data 401/403.\n  const directResponse = await nativeFetch(directInput, init);\n  if (kind === "data" && [401, 403].includes(directResponse.status)) {\n    const recovered = await retryDataAfterReauthV224(directInput, init);\n    if (recovered) return recovered;\n  }\n  return directResponse;\n}\n\nasync function authAwareFetch`;
  if (!source.includes("const directResponse = await nativeFetch(directInput, init)")) {
    if (!source.includes(oldFallback)) throw new Error("V224_DIRECT_FALLBACK_ANCHOR_MISSING");
    source = source.replace(oldFallback, newFallback);
  }

  if (!source.includes("dataReauthReleaseV224")) {
    const anchor = "  document.documentElement.dataset.dataTransportReleaseV190 = DATA_TRANSPORT_RELEASE_V190;";
    if (!source.includes(anchor)) throw new Error("V224_DATASET_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n  document.documentElement.dataset.dataReauthReleaseV224 = DATA_REAUTH_RELEASE_V224;`);
  }

  if (!source.includes("DATA_REAUTH_RELEASE_V224,")) {
    const anchor = "  DATA_TRANSPORT_RELEASE_V190,\n  AUTH_V186_COMPAT,";
    if (!source.includes(anchor)) throw new Error("V224_EXPORT_ANCHOR_MISSING");
    source = source.replace(anchor, "  DATA_TRANSPORT_RELEASE_V190,\n  DATA_REAUTH_RELEASE_V224,\n  AUTH_V186_COMPAT,");
  }

  for (const marker of [
    RELEASE,
    "dataReauthSingleflightV224",
    "retryDataAfterReauthV224",
    "refreshSession()",
    "dataUnauthorizedV224",
    "dataReauthReleaseV224",
    "return nativeFetch(directInput, init)",
  ]) if (!source.includes(marker)) throw new Error(`V224_SUPABASE_MARKER_MISSING:${marker}`);
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source.slice(source.indexOf("DATA_REAUTH_RELEASE_V224"), source.indexOf("export const supabase")))) {
    throw new Error("V224_DESTRUCTIVE_SESSION_ACTION_FOUND");
  }
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, 'const VERSION = "ngeblogging-app-v224-data-reauth-20260803";');
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, 'const CACHE_RELEASE = "data-reauth-cache-v224";');
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "data-reauth-v224";');
  if (!source.includes("DATA_REAUTH_RELEASE_V224")) {
    source = source.replace(/^(const VERSION = .*;\n)/m, `$1const DATA_REAUTH_RELEASE_V224 = "${RELEASE}";\n`);
  }
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V223", "NGE_BLOGGING_UPDATE_AVAILABLE_V224");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V224_FORCED_NAVIGATION_REMAINS");
  await write(path, source);
}

await patchSupabaseTransport();
await patchServiceWorker();
console.log(`Applied ${RELEASE}`);
