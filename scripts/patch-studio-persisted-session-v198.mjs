import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-persisted-session-recovery-v198-20260802";
const VERSION = "ngeblogging-app-v198-persisted-session-20260802";
const CACHE = "studio-persisted-session-cache-v198";

function replaceTopLevelFunction(source, signature, replacement, label) {
  const start = source.indexOf(signature);
  if (start < 0) throw new Error(`V198_${label}_START_MISSING`);
  const end = source.indexOf("\n}\n", start);
  if (end < 0) throw new Error(`V198_${label}_END_MISSING`);
  return `${source.slice(0, start)}${replacement}${source.slice(end + 3)}`;
}

async function patchGate() {
  const path = "src/StudioOnboardingGate.jsx";
  let source = await read(path);

  if (!source.includes("STUDIO_PERSISTED_SESSION_RELEASE_V198")) {
    const anchor = 'const STUDIO_SESSION_RACE_RELEASE_V197 = "studio-session-race-recovery-v197-20260802";';
    if (!source.includes(anchor)) throw new Error("V198_REQUIRES_V197_GATE");
    source = source.replace(
      anchor,
      `${anchor}\nconst STUDIO_PERSISTED_SESSION_RELEASE_V198 = "${RELEASE}";\nconst LOCAL_STORAGE_SESSION_TIMEOUT_V198_MS = 1_800;`,
    );
  }

  if (!source.includes("function readPersistedSupabaseSessionV198")) {
    const anchor = "async function readLocalStudioSessionV195(userId) {";
    const index = source.indexOf(anchor);
    if (index < 0) throw new Error("V198_LOCAL_SESSION_ANCHOR_MISSING");
    const helper = `function supabaseProjectRefV198() {
  try {
    const configured = String(import.meta.env?.VITE_SUPABASE_URL || "").trim();
    return configured ? new URL(configured).hostname.split(".")[0] || "" : "";
  } catch {
    return "";
  }
}

function sessionFromPersistedValueV198(value) {
  if (!value || typeof value !== "object") return null;
  const candidates = [
    value,
    value.session,
    value.currentSession,
    value.data?.session,
  ];
  return candidates.find((candidate) => candidate?.access_token && candidate?.user?.id) || null;
}

function readPersistedSupabaseSessionV198(userId) {
  if (!userId || typeof localStorage === "undefined") return null;
  const projectRef = supabaseProjectRefV198();
  if (!projectRef) return null;
  const key = \`sb-\${projectRef}-auth-token\`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const persisted = sessionFromPersistedValueV198(JSON.parse(raw));
    if (!persisted?.access_token || persisted.user?.id !== userId) return null;
    return {
      session: persisted,
      user: persisted.user,
      verification: "persisted-storage-v198",
      persistedStorageKey: key,
    };
  } catch {
    return null;
  }
}

`;
    source = `${source.slice(0, index)}${helper}${source.slice(index)}`;
  }

  const readLocalReplacement = `async function readLocalStudioSessionV195(userId) {
  const cached = window.__ngebloggingVerifiedSession;
  const cachedUserId = cached?.user?.id || cached?.session?.user?.id || "";
  if (cached?.session?.access_token && cachedUserId === userId) {
    return { ...cached, verification: cached.verification || "memory-session-v195" };
  }

  // v198: Supabase persists the browser session locally. Read that scoped project key
  // before waiting for getSession(), because a mobile browser can temporarily hold the
  // GoTrue client lock while the valid access token is already present in storage.
  const persisted = readPersistedSupabaseSessionV198(userId);
  if (persisted?.session?.access_token) {
    window.__ngebloggingVerifiedSession = persisted;
    document.documentElement.dataset.studioSessionBootstrapV198 = "persisted-storage-first";
    return persisted;
  }

  const result = await withDeadline(
    supabase.auth.getSession(),
    LOCAL_STORAGE_SESSION_TIMEOUT_V198_MS,
    "Pembacaan sesi Supabase melewati batas waktu.",
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
  document.documentElement.dataset.studioSessionBootstrapV198 = "supabase-client-session";
  return local;
}`;
  source = replaceTopLevelFunction(source, "async function readLocalStudioSessionV195(userId) {", readLocalReplacement, "LOCAL_SESSION");

  if (!source.includes("persisted-newer-token-reused-v198")) {
    const anchor = `  // v197: a 401 from an old bearer token is not automatically a failed login.\n  // Supabase may already have rotated the persisted session while that request was in flight.\n  try {`;
    if (!source.includes(anchor)) throw new Error("V198_V197_ROTATION_ANCHOR_MISSING");
    const replacement = `  // v197: a 401 from an old bearer token is not automatically a failed login.\n  // Supabase may already have rotated the persisted session while that request was in flight.\n  const persistedReplacementV198 = readPersistedSupabaseSessionV198(\n    window.__ngebloggingVerifiedSession?.user?.id\n      || window.__ngebloggingVerifiedSession?.session?.user?.id\n      || "",\n  );\n  if (\n    persistedReplacementV198?.session?.access_token\n    && typeof rejectedToken === "string"\n    && persistedReplacementV198.session.access_token !== rejectedToken\n  ) {\n    window.__ngebloggingVerifiedSession = persistedReplacementV198;\n    document.documentElement.dataset.studioSessionRaceV198 = "persisted-newer-token-reused-v198";\n    return persistedReplacementV198;\n  }\n\n  try {`;
    source = source.replace(anchor, replacement);
  }

  if (!source.includes("studioPersistedSessionReleaseV198")) {
    const anchor = "document.documentElement.dataset.studioSessionRaceReleaseV197 = STUDIO_SESSION_RACE_RELEASE_V197;";
    if (!source.includes(anchor)) throw new Error("V198_RELEASE_DATASET_ANCHOR_MISSING");
    source = source.replace(
      anchor,
      `${anchor}\n  document.documentElement.dataset.studioPersistedSessionReleaseV198 = STUDIO_PERSISTED_SESSION_RELEASE_V198;`,
    );
  }

  if (/service_role|SUPABASE_SERVICE_ROLE/.test(source)) throw new Error("V198_PRIVILEGED_BROWSER_KEY_FORBIDDEN");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|supabase\.auth\.signOut\s*\(/.test(source)) {
    throw new Error("V198_SESSION_DESTRUCTIVE_ACTION_FOUND");
  }
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "studio-persisted-session-v198";');

  for (const marker of [
    'const STUDIO_PERSISTED_SESSION_COMPAT_VERSION_V197 = "ngeblogging-app-v197-session-race-20260802";',
    'const STUDIO_PERSISTED_SESSION_COMPAT_CACHE_V197 = "studio-session-race-cache-v197";',
  ]) {
    if (!source.includes(marker)) source = source.replace(/^(const VERSION = .*;\n)/m, `$1${marker}\n`);
  }
  if (!source.includes("STUDIO_PERSISTED_SESSION_RELEASE_V198")) {
    source = source.replace(/^(const VERSION = .*;\n)/m, `$1const STUDIO_PERSISTED_SESSION_RELEASE_V198 = "${RELEASE}";\n`);
  }

  source = source
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V197", "NGE_BLOGGING_UPDATE_AVAILABLE_V198")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V196", "NGE_BLOGGING_UPDATE_AVAILABLE_V198")
    .replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v198 never forces navigation; browser session and drafts remain intact.");

  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V198_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) {
    throw new Error("V198_SERVICE_WORKER_SESSION_DESTRUCTION_FOUND");
  }
  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/StudioOnboardingGate.jsx", "STUDIO_PERSISTED_SESSION_RELEASE_V198"],
    ["src/StudioOnboardingGate.jsx", "readPersistedSupabaseSessionV198"],
    ["src/StudioOnboardingGate.jsx", "sb-${projectRef}-auth-token"],
    ["src/StudioOnboardingGate.jsx", "persisted-storage-first"],
    ["src/StudioOnboardingGate.jsx", "persisted-newer-token-reused-v198"],
    ["src/StudioOnboardingGate.jsx", "listUserSitesDirectV192"],
    ["src/StudioOnboardingGate.jsx", "studioMembershipSingleFlightV197"],
    ["src/StudioOnboardingGate.jsx", "studioRecoverySingleFlightV197"],
    ["public/sw.js", "STUDIO_PERSISTED_SESSION_RELEASE_V198"],
    ["public/sw.js", VERSION],
    ["public/sw.js", CACHE],
    ["public/release-v198.json", RELEASE],
  ];
  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V198_VERIFY_FAILED:${path}:${marker}`);
  }
}

await patchGate();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
