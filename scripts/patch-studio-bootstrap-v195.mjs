import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-bootstrap-session-first-v195-20260801";
const VERSION = "ngeblogging-app-v195-session-first-20260801";
const CACHE = "studio-bootstrap-session-first-cache-v195";

function replaceOnce(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) throw new Error(`V195_${label}_ANCHOR_MISSING`);
  return source.replace(search, replacement);
}

function replaceTopLevelFunction(source, signature, replacement, label) {
  const start = source.indexOf(signature);
  if (start < 0) throw new Error(`V195_${label}_START_MISSING`);
  const end = source.indexOf("\n}\n", start);
  if (end < 0) throw new Error(`V195_${label}_END_MISSING`);
  return `${source.slice(0, start)}${replacement}${source.slice(end + 3)}`;
}

async function patchOnboardingGate() {
  const path = "src/StudioOnboardingGate.jsx";
  let source = await read(path);

  if (!source.includes('const ACTIVE_SITE_SNAPSHOT_V195 = "ngeblogging-active-site-snapshot-v195";')) {
    const anchor = 'const ACTIVE_SITE_SNAPSHOT_V192 = "ngeblogging-active-site-snapshot-v192";';
    if (!source.includes(anchor)) throw new Error("V195_REQUIRES_V192_GATE");
    source = source.replace(anchor, `${anchor}\nconst ACTIVE_SITE_SNAPSHOT_V195 = "ngeblogging-active-site-snapshot-v195";\nconst LOCAL_SESSION_TIMEOUT_V195_MS = 2_500;\nconst DIRECT_MEMBERSHIP_TIMEOUT_V195_MS = 7_000;\nconst CLIENT_MEMBERSHIP_TIMEOUT_V195_MS = 5_000;`);
  }

  if (!source.includes("async function readLocalStudioSessionV195")) {
    const anchor = "async function listUserSitesDirectV192(userId, accessToken) {";
    const index = source.indexOf(anchor);
    if (index < 0) throw new Error("V195_DIRECT_HELPER_ANCHOR_MISSING");
    const helper = `async function readLocalStudioSessionV195(userId) {
  const cached = window.__ngebloggingVerifiedSession;
  const cachedUserId = cached?.user?.id || cached?.session?.user?.id || "";
  if (cached?.session?.access_token && cachedUserId === userId) {
    return { ...cached, verification: cached.verification || "memory-session-v195" };
  }

  const result = await withDeadline(
    supabase.auth.getSession(),
    LOCAL_SESSION_TIMEOUT_V195_MS,
    "Pembacaan sesi lokal melewati batas waktu.",
  );
  if (result?.error) throw result.error;
  const session = result?.data?.session || null;
  const sessionUser = session?.user || null;
  if (!session?.access_token || !sessionUser?.id || sessionUser.id !== userId) {
    throw Object.assign(new Error("Sesi lokal tidak cocok dengan akun Studio."), {
      code: "SESSION_REAUTH_REQUIRED",
      status: 401,
      requiresReauth: true,
    });
  }

  const local = { session, user: sessionUser, verification: "local-session-first-v195" };
  window.__ngebloggingVerifiedSession = local;
  document.documentElement.dataset.studioSessionBootstrapV195 = "local-session-first";
  return local;
}

function cachedActiveSiteV195(userId) {
  try {
    for (const key of [ACTIVE_SITE_SNAPSHOT_V195, ACTIVE_SITE_SNAPSHOT_V192]) {
      const cached = JSON.parse(localStorage.getItem(key) || "null");
      if (cached?.id && cached?.slug && cached?.__userId === userId) return cached;
    }
  } catch {
    // Cache hanya percepatan; RLS tetap menjadi authority.
  }
  return null;
}

function rememberActiveSiteV195(site, userId) {
  if (!site?.id || !site?.slug || !userId) return;
  try {
    localStorage.setItem(ACTIVE_SITE_SNAPSHOT_V195, JSON.stringify({
      ...site,
      __userId: userId,
      __release: "${RELEASE}",
      __savedAt: Date.now(),
    }));
  } catch {
    // Private browsing tidak boleh menghalangi Studio.
  }
}

`;
    source = `${source.slice(0, index)}${helper}${source.slice(index)}`;
  }

  const replacement = `async function loadStudioMembership(userId) {
  let lastError = null;
  let localSession = await readLocalStudioSessionV195(userId);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const accessToken = localSession?.session?.access_token || "";
    if (!accessToken) {
      throw Object.assign(new Error("Token sesi belum tersedia. Silakan masuk kembali."), {
        code: "SESSION_REAUTH_REQUIRED",
        status: 401,
        requiresReauth: true,
      });
    }

    try {
      const sites = await withDeadline(
        listUserSitesDirectV192(userId, accessToken),
        DIRECT_MEMBERSHIP_TIMEOUT_V195_MS,
        "Pemeriksaan Workspace langsung melewati batas waktu.",
      );
      document.documentElement.dataset.studioMembershipTransportV195 = "direct-supabase-rls";
      document.documentElement.dataset.studioMembershipTransportV192 = "direct-supabase-rls";
      return { verified: localSession, sites };
    } catch (directError) {
      lastError = directError;
      const directStatus = Number(directError?.status || 0);
      const directCode = String(directError?.code || "").toLowerCase();
      const rejectedToken = directStatus === 401 || directStatus === 403
        || directCode === "session_reauth_required";

      if (rejectedToken && attempt === 0) {
        const refreshed = await withDeadline(
          getVerifiedSession({ force: Boolean(rejectedToken) }),
          CHECK_TIMEOUT_MS,
          "Pembaruan sesi melewati batas waktu.",
        );
        if (!refreshed?.user?.id || refreshed.user.id !== userId || !refreshed?.session?.access_token) {
          throw Object.assign(new Error("Sesi sudah tidak berlaku. Silakan masuk kembali."), {
            code: "SESSION_REAUTH_REQUIRED",
            status: 401,
            requiresReauth: true,
          });
        }
        localSession = refreshed;
        continue;
      }

      if (rejectedToken) throw directError;

      try {
        const sites = await withDeadline(
          listUserSites(userId),
          CLIENT_MEMBERSHIP_TIMEOUT_V195_MS,
          "Jalur data cadangan melewati batas waktu.",
        );
        document.documentElement.dataset.studioMembershipTransportV195 = "supabase-client-fallback";
        document.documentElement.dataset.studioMembershipTransportV192 = "client-gateway-fallback";
        return { verified: localSession, sites };
      } catch (clientError) {
        lastError = clientError;
        if (!isTransientStudioError(clientError) && !isTransientStudioError(directError)) throw clientError;
      }
    }
  }

  throw Object.assign(new Error(
    "Koneksi Workspace belum merespons dalam batas waktu. Sesi login tetap disimpan dan tidak ada logout otomatis.",
  ), { name: "DataTransportError", code: "DATA_NETWORK_UNAVAILABLE", cause: lastError });
}`;

  if (!source.includes("studioMembershipTransportV195")) {
    source = replaceTopLevelFunction(source, "async function loadStudioMembership(userId) {", replacement, "MEMBERSHIP_FUNCTION");
  }

  if (!source.includes("rememberActiveSiteV195(site, userId);")) {
    source = replaceOnce(
      source,
      'function publishActiveSite(site, userId = "") {\n  if (!site?.id || !site?.slug) return;\n  rememberActiveSiteV192(site, userId);',
      'function publishActiveSite(site, userId = "") {\n  if (!site?.id || !site?.slug) return;\n  rememberActiveSiteV192(site, userId);\n  rememberActiveSiteV195(site, userId);',
      "PUBLISH_CACHE",
    );
  }

  if (!source.includes("session-first-cache-v195")) {
    const current = `    const check = async () => {
      setPhase("checking"); setError("");
      if (!props.user?.id) { setError("Sesi pengguna tidak ditemukan. Silakan masuk kembali."); setPhase("error"); return; }
      if (!supabaseConfigured || !supabase) { setError("Penyimpanan cloud belum dikonfigurasi."); setPhase("error"); return; }
      try {`;
    const next = `    const check = async () => {
      setPhase("checking"); setError("");
      if (!props.user?.id) { setError("Sesi pengguna tidak ditemukan. Silakan masuk kembali."); setPhase("error"); return; }
      if (!supabaseConfigured || !supabase) { setError("Penyimpanan cloud belum dikonfigurasi."); setPhase("error"); return; }

      const cached = cachedActiveSiteV195(props.user.id);
      if (cached?.id && cached?.slug) {
        publishActiveSite(cached, props.user.id);
        document.documentElement.dataset.studioStartupV195 = "session-first-cache-v195";
        setPhase("ready");
        return;
      }

      try {`;
    source = replaceOnce(source, current, next, "FAST_SCOPED_CACHE");
  }

  await write(path, source);
}

async function patchFastGate() {
  const path = "src/StudioFastGate.jsx";
  let source = await read(path);
  if (!source.includes('"ngeblogging-active-site-snapshot-v195"')) {
    const anchor = 'const SNAPSHOT_KEYS = [\n  "ngeblogging-active-site-snapshot-v192",';
    if (!source.includes(anchor)) throw new Error("V195_FAST_GATE_V192_ANCHOR_MISSING");
    source = source.replace(anchor, 'const SNAPSHOT_KEYS = [\n  "ngeblogging-active-site-snapshot-v195",\n  "ngeblogging-active-site-snapshot-v192",');
  }
  source = source.replace(
    'const RELEASE = "studio-fast-entry-v192-20260801";',
    'const RELEASE = "studio-fast-entry-v195-20260801";',
  );
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "studio-bootstrap-session-first-v195";');
  if (!source.includes("STUDIO_BOOTSTRAP_SESSION_FIRST_RELEASE_V195")) {
    source = source.replace(
      /^(const VERSION = .*;\n)/m,
      `$1const STUDIO_BOOTSTRAP_SESSION_FIRST_RELEASE_V195 = "${RELEASE}";\n`,
    );
  }
  source = source
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V194", "NGE_BLOGGING_UPDATE_AVAILABLE_V195")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V193", "NGE_BLOGGING_UPDATE_AVAILABLE_V195")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V192", "NGE_BLOGGING_UPDATE_AVAILABLE_V195")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v195 tidak memaksa navigasi; sesi dan draf tetap utuh.");

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V195_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) {
    throw new Error("V195_SESSION_DESTRUCTIVE_ACTION_FOUND");
  }
  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/StudioOnboardingGate.jsx", "readLocalStudioSessionV195"],
    ["src/StudioOnboardingGate.jsx", "local-session-first-v195"],
    ["src/StudioOnboardingGate.jsx", "studioMembershipTransportV195"],
    ["src/StudioOnboardingGate.jsx", "direct-supabase-rls"],
    ["src/StudioOnboardingGate.jsx", "client-gateway-fallback"],
    ["src/StudioOnboardingGate.jsx", "session-first-cache-v195"],
    ["src/StudioOnboardingGate.jsx", "rememberActiveSiteV195"],
    ["src/StudioFastGate.jsx", "ngeblogging-active-site-snapshot-v195"],
    ["src/lib/supabase.js", "persistSession: true"],
    ["src/lib/supabase.js", "autoRefreshToken: true"],
    ["public/sw.js", "STUDIO_BOOTSTRAP_SESSION_FIRST_RELEASE_V195"],
    ["public/sw.js", VERSION],
    ["public/sw.js", CACHE],
    ["public/release-v195.json", RELEASE],
  ];

  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V195_VERIFY_FAILED:${path}:${marker}`);
  }

  const gate = await read("src/StudioOnboardingGate.jsx");
  const loadStart = gate.indexOf("async function loadStudioMembership(userId)");
  const loadEnd = gate.indexOf("\n}\n", loadStart);
  const load = gate.slice(loadStart, loadEnd + 3);
  if (!load.includes("readLocalStudioSessionV195")) throw new Error("V195_LOCAL_SESSION_NOT_FIRST");
  const directConditionalRefresh = "getVerifiedSession({ force: Boolean(rejectedToken) })";
  const compatConditionalRefresh = "refreshRejectedSessionV195(rejectedToken)";
  const refreshIndex = load.includes(directConditionalRefresh)
    ? load.indexOf(directConditionalRefresh)
    : load.indexOf(compatConditionalRefresh);
  if (refreshIndex < 0) throw new Error("V195_CONDITIONAL_REFRESH_MISSING");
  if (load.indexOf("readLocalStudioSessionV195") > refreshIndex) {
    throw new Error("V195_REMOTE_AUTH_PRECEDES_LOCAL_SESSION");
  }
  if (/getVerifiedSession\(\{ force: true \}\)/.test(gate)) throw new Error("V195_UNCONDITIONAL_FORCE_TRUE_REINTRODUCED");
  if (/service_role|SUPABASE_SERVICE_ROLE/.test(gate)) throw new Error("V195_BROWSER_PRIVILEGED_KEY_FORBIDDEN");

  const worker = await read("public/sw.js");
  if (/await refreshStaleWindow\(client, url\);/.test(worker)) throw new Error("V195_FORCED_NAVIGATION_REINTRODUCED");
}

const diagnosticStage = String(process.env.V195_DIAGNOSTIC_STAGE || "").trim().toLowerCase();
await patchOnboardingGate();
if (diagnosticStage === "gate") {
  console.log(`Applied ${RELEASE} diagnostic stage=gate`);
} else {
  await patchFastGate();
  if (diagnosticStage === "fast-gate") {
    console.log(`Applied ${RELEASE} diagnostic stage=fast-gate`);
  } else {
    await patchServiceWorker();
    if (diagnosticStage === "service-worker") {
      console.log(`Applied ${RELEASE} diagnostic stage=service-worker`);
    } else {
      await verify();
      console.log(`Applied ${RELEASE}`);
    }
  }
}