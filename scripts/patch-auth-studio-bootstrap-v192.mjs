import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "auth-studio-bootstrap-v192-20260801";

function replaceOnce(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) throw new Error(`V192_${label}_ANCHOR_MISSING`);
  return source.replace(search, replacement);
}

async function patchAuthCallback() {
  const path = "src/lib/auth-callback-v162.js";
  let source = await read(path);
  const current = [
    '  const oauthError = callbackErrorFromUrl(url);',
    '  if (oauthError) {',
    '    cleanCallbackUrl();',
    '    return callbackResult("error", { error: oauthError, mode });',
    '  }',
  ].join("\n");
  const hardened = [
    '  const oauthError = callbackErrorFromUrl(url);',
    '  if (oauthError) {',
    '    // A provider callback can be replayed after Supabase already consumed its OAuth/PKCE state.',
    '    // If the browser already owns a valid persisted session, recover that session instead of',
    '    // presenting a false login failure. A real provider error without a session still fails.',
    '    if (isConsumedCodeError(oauthError)) {',
    '      const recovered = await currentSession().catch(() => null);',
    '      if (recovered?.access_token && recovered?.refresh_token) {',
    '        writeMarker({ codeFingerprint, mode, status: "recovered-provider-replay-v192", session: recovered });',
    '        cleanCallbackUrl({ success: true, recovery: mode === "recovery" });',
    '        announce("recovered-provider-replay-v192", recovered, mode);',
    '        return callbackResult("recovered", { session: recovered, mode, singleFlight: true, replayRecovered: true });',
    '      }',
    '    }',
    '    cleanCallbackUrl();',
    '    return callbackResult("error", { error: oauthError, mode });',
    '  }',
  ].join("\n");
  source = replaceOnce(source, current, hardened, "CALLBACK_REPLAY_RECOVERY");
  if (!source.includes("AUTH_CALLBACK_BOOTSTRAP_V192")) {
    source = source.replace(
      'export const AUTH_CALLBACK_COMPAT_RELEASE = "auth-callback-v162-20260730";',
      'export const AUTH_CALLBACK_COMPAT_RELEASE = "auth-callback-v162-20260730";\nexport const AUTH_CALLBACK_BOOTSTRAP_V192 = "auth-studio-bootstrap-v192-20260801";',
    );
  }
  await write(path, source);
}

async function patchOnboardingGate() {
  const path = "src/StudioOnboardingGate.jsx";
  let source = await read(path);

  if (!source.includes("DIRECT_MEMBERSHIP_TIMEOUT_MS")) {
    source = replaceOnce(
      source,
      'const CHECK_TIMEOUT_MS = 12_000;\nconst STARTUP_RETRY_DELAYS = [450, 900, 1_800];',
      'const CHECK_TIMEOUT_MS = 12_000;\nconst DIRECT_MEMBERSHIP_TIMEOUT_MS = 10_000;\nconst ACTIVE_SITE_SNAPSHOT_V192 = "ngeblogging-active-site-snapshot-v192";\nconst STARTUP_RETRY_DELAYS = [450, 900, 1_800];',
      "GATE_CONSTANTS",
    );
  }

  const helperAnchor = "async function loadStudioMembership(userId) {";
  if (!source.includes("async function listUserSitesDirectV192")) {
    const helper = [
      'async function listUserSitesDirectV192(userId, accessToken) {',
      '  const env = import.meta.env || {};',
      '  const base = String(env.VITE_SUPABASE_URL || "").trim().replace(/\\/$/, "");',
      '  const key = String(env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || "").trim();',
      '  if (!base || !key || !accessToken) {',
      '    throw Object.assign(new Error("Jalur data langsung belum siap."), { code: "DATA_DIRECT_NOT_CONFIGURED" });',
      '  }',
      '',
      '  const endpoint = new URL(`${base}/rest/v1/site_members`);',
      '  endpoint.searchParams.set("select", "site_id,role,joined_at,sites(id,name,slug,description,status,is_public,blueprint,theme_key,settings,published_at,created_at,updated_at)");',
      '  endpoint.searchParams.set("user_id", `eq.${userId}`);',
      '  endpoint.searchParams.set("order", "joined_at.asc");',
      '  endpoint.searchParams.set("limit", "100");',
      '',
      '  const response = await withDeadline(fetch(endpoint.toString(), {',
      '    method: "GET",',
      '    cache: "no-store",',
      '    headers: {',
      '      apikey: key,',
      '      Authorization: `Bearer ${accessToken}`,',
      '      Accept: "application/json",',
      '      "x-client-info": "ngeblogging-studio-bootstrap-v192",',
      '    },',
      '  }), DIRECT_MEMBERSHIP_TIMEOUT_MS, "Jalur data langsung melewati batas waktu.");',
      '',
      '  if (!response.ok) {',
      '    const detail = await response.text().catch(() => "");',
      '    const error = new Error(detail || `Data membership gagal (${response.status}).`);',
      '    error.status = response.status;',
      '    error.code = response.status === 401 || response.status === 403',
      '      ? "SESSION_REAUTH_REQUIRED"',
      '      : "DATA_DIRECT_HTTP_ERROR";',
      '    throw error;',
      '  }',
      '',
      '  const rows = await response.json();',
      '  return (Array.isArray(rows) ? rows : []).map((record) => {',
      '    const nested = Array.isArray(record?.sites) ? record.sites[0] : record?.sites;',
      '    return nested ? { ...nested, role: record.role } : null;',
      '  }).filter(Boolean);',
      '}',
      '',
      'function rememberActiveSiteV192(site, userId) {',
      '  if (!site?.id || !site?.slug || !userId) return;',
      '  try {',
      '    localStorage.setItem(ACTIVE_SITE_SNAPSHOT_V192, JSON.stringify({',
      '      ...site,',
      '      __userId: userId,',
      '      __release: "auth-studio-bootstrap-v192-20260801",',
      '      __savedAt: Date.now(),',
      '    }));',
      '  } catch {',
      '    // Storage privat tidak boleh memblokir Studio.',
      '  }',
      '}',
      '',
      '',
    ].join("\n");
    if (!source.includes(helperAnchor)) throw new Error("V192_DIRECT_MEMBERSHIP_HELPER_ANCHOR_MISSING");
    source = source.replace(helperAnchor, helper + helperAnchor);
  }

  source = source.replace(
    'getVerifiedSession({ force: true })',
    'getVerifiedSession({ force: attempt > 0 })',
  );

  const membershipLine = '      const sites = await withDeadline(listUserSites(verified.user.id || userId), CHECK_TIMEOUT_MS, "Pemeriksaan situs melewati batas waktu.");';
  const membershipBlock = [
    '      if (!verified?.session?.access_token) {',
    '        throw Object.assign(new Error("Token sesi belum tersedia. Silakan masuk kembali."), { code: "SESSION_REAUTH_REQUIRED", status: 401 });',
    '      }',
    '',
    '      // Bootstrap membership is a critical read. Prefer direct Supabase REST with the',
    '      // current user bearer token so a stale same-origin Worker/data gateway cannot',
    '      // trap a valid session on the connection screen. Supabase RLS remains authoritative.',
    '      let sites;',
    '      try {',
    '        sites = await listUserSitesDirectV192(verified.user.id || userId, verified.session.access_token);',
    '        document.documentElement.dataset.studioMembershipTransportV192 = "direct-supabase-rls";',
    '      } catch (directError) {',
    '        if (isSessionReauthError(directError)) throw directError;',
    '        lastError = directError;',
    '        sites = await withDeadline(listUserSites(verified.user.id || userId), CHECK_TIMEOUT_MS, "Pemeriksaan situs melewati batas waktu.");',
    '        document.documentElement.dataset.studioMembershipTransportV192 = "client-gateway-fallback";',
    '      }',
  ].join("\n");
  if (!source.includes("studioMembershipTransportV192")) {
    source = replaceOnce(source, membershipLine, membershipBlock, "MEMBERSHIP_TRANSPORT");
  }

  if (!source.includes("rememberActiveSiteV192(site, userId)")) {
    source = replaceOnce(
      source,
      'function publishActiveSite(site) {\n  if (!site?.id || !site?.slug) return;',
      'function publishActiveSite(site, userId = "") {\n  if (!site?.id || !site?.slug) return;\n  rememberActiveSiteV192(site, userId);',
      "ACTIVE_SITE_SNAPSHOT",
    );
  }

  source = source.replace(
    '      publishActiveSite(selected);\n      onCreated(selected);',
    '      publishActiveSite(selected, user?.id);\n      onCreated(selected);',
  );
  source = source.replace(
    '        const { sites } = await loadStudioMembership(props.user.id);',
    '        const { verified, sites } = await loadStudioMembership(props.user.id);',
  );
  source = source.replace(
    '        if (site) { publishActiveSite(site); setPhase("ready"); } else setPhase("onboarding");',
    '        if (site) { publishActiveSite(site, verified?.user?.id || props.user.id); setPhase("ready"); } else setPhase("onboarding");',
  );

  if (!source.includes("studio-bootstrap-online-retry-v192")) {
    source = source.replace(
      '  const [run, setRun] = useState(0);\n\n  useEffect(() => {',
      '  const [run, setRun] = useState(0);\n\n  useEffect(() => {\n    const retryWhenOnline = () => setRun((value) => value + 1);\n    window.addEventListener("online", retryWhenOnline);\n    document.documentElement.dataset.studioBootstrapOnlineRetryV192 = "studio-bootstrap-online-retry-v192";\n    return () => window.removeEventListener("online", retryWhenOnline);\n  }, []);\n\n  useEffect(() => {',
    );
  }

  await write(path, source);
}

async function patchFastGate() {
  const path = "src/StudioFastGate.jsx";
  let source = await read(path);
  if (!source.includes('"ngeblogging-active-site-snapshot-v192"')) {
    source = source.replace(
      'const SNAPSHOT_KEYS = [\n  "ngeblogging-active-site-snapshot-v190",',
      'const SNAPSHOT_KEYS = [\n  "ngeblogging-active-site-snapshot-v192",\n  "ngeblogging-active-site-snapshot-v190",',
    );
  }
  source = source.replace(
    'const RELEASE = "studio-fast-entry-v190-20260801";',
    'const RELEASE = "studio-fast-entry-v192-20260801";',
  );
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, 'const VERSION = "ngeblogging-app-v192-auth-studio-bootstrap-20260801";');
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, 'const CACHE_RELEASE = "auth-studio-bootstrap-cache-v192";');
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "auth-studio-bootstrap-v192";');
  if (!source.includes("AUTH_STUDIO_BOOTSTRAP_RELEASE_V192")) {
    source = source.replace(
      /^(const VERSION = .*;\n)/m,
      '$1const AUTH_STUDIO_BOOTSTRAP_RELEASE_V192 = "auth-studio-bootstrap-v192-20260801";\n',
    );
  }
  source = source
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V191", "NGE_BLOGGING_UPDATE_AVAILABLE_V192")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V190", "NGE_BLOGGING_UPDATE_AVAILABLE_V192")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v192 tidak pernah memaksa navigasi tab; sesi/callback tetap utuh.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V192_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) {
    throw new Error("V192_SESSION_DESTRUCTIVE_ACTION_FOUND");
  }
  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/lib/auth-callback-v162.js", "recovered-provider-replay-v192"],
    ["src/StudioOnboardingGate.jsx", "listUserSitesDirectV192"],
    ["src/StudioOnboardingGate.jsx", "force: attempt > 0"],
    ["src/StudioOnboardingGate.jsx", "direct-supabase-rls"],
    ["src/StudioOnboardingGate.jsx", "studio-bootstrap-online-retry-v192"],
    ["src/StudioFastGate.jsx", "ngeblogging-active-site-snapshot-v192"],
    ["public/sw.js", "AUTH_STUDIO_BOOTSTRAP_RELEASE_V192"],
    ["public/sw.js", "auth-studio-bootstrap-cache-v192"],
    ["public/release-v192.json", RELEASE],
  ];
  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V192_VERIFY_FAILED:${path}:${marker}`);
  }

  const callback = await read("src/lib/auth-callback-v162.js");
  if (!/oauthError[\s\S]*isConsumedCodeError\(oauthError\)[\s\S]*currentSession/.test(callback)) {
    throw new Error("V192_OAUTH_REPLAY_RECOVERY_INCOMPLETE");
  }

  const gate = await read("src/StudioOnboardingGate.jsx");
  if (/getVerifiedSession\(\{ force: true \}\)/.test(gate)) throw new Error("V192_FORCE_TRUE_BOOTSTRAP_REINTRODUCED");
  if (/service_role|SUPABASE_SERVICE_ROLE/.test(gate)) throw new Error("V192_PRIVILEGED_KEY_MUST_NOT_BE_USED_IN_BROWSER");

  const worker = await read("public/sw.js");
  if (/await refreshStaleWindow\(client, url\);/.test(worker)) throw new Error("V192_FORCED_NAVIGATION_REINTRODUCED");
}

await patchAuthCallback();
await patchOnboardingGate();
await patchFastGate();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
