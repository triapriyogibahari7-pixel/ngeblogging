import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-persisted-session-recovery-v198-20260802";

const path = "src/StudioOnboardingGate.jsx";
let source = await read(path);

if (!source.includes("function readPersistedSupabaseSessionV198")) {
  const anchor = "async function listUserSitesDirectV192(userId, accessToken) {";
  const index = source.indexOf(anchor);
  if (index < 0) throw new Error("V198_PRIMER_REQUIRES_V192_DIRECT_MEMBERSHIP");

  const helpers = `function supabaseProjectRefV198() {
  try {
    const configured = String(import.meta.env?.VITE_SUPABASE_URL || "").trim();
    return configured ? new URL(configured).hostname.split(".")[0] || "" : "";
  } catch {
    return "";
  }
}

function sessionFromPersistedValueV198(value) {
  if (!value || typeof value !== "object") return null;
  const candidates = [value, value.session, value.currentSession, value.data?.session];
  return candidates.find((candidate) => candidate?.access_token && candidate?.user?.id) || null;
}

function readPersistedSupabaseSessionV198(userId) {
  if (!userId || typeof localStorage === "undefined") return null;
  const projectRef = supabaseProjectRefV198();
  if (!projectRef) return null;
  const storageKey = \`sb-\${projectRef}-auth-token\`;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const persisted = sessionFromPersistedValueV198(JSON.parse(raw));
    if (!persisted?.access_token || persisted.user?.id !== userId) return null;
    return {
      session: persisted,
      user: persisted.user,
      verification: "persisted-storage-v198",
      persistedStorageKey: storageKey,
    };
  } catch {
    return null;
  }
}

async function readLocalStudioSessionV195(userId) {
  const cached = window.__ngebloggingVerifiedSession;
  const cachedUserId = cached?.user?.id || cached?.session?.user?.id || "";
  if (cached?.session?.access_token && cachedUserId === userId) {
    return { ...cached, verification: cached.verification || "memory-session-v195" };
  }

  const persisted = readPersistedSupabaseSessionV198(userId);
  if (persisted?.session?.access_token) {
    window.__ngebloggingVerifiedSession = persisted;
    document.documentElement.dataset.studioSessionBootstrapV198 = "persisted-storage-first";
    return persisted;
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
  document.documentElement.dataset.studioSessionBootstrapV198 = "supabase-client-session";
  return local;
}

function cachedActiveSiteV195(userId) {
  try {
    for (const key of [ACTIVE_SITE_SNAPSHOT_V195, ACTIVE_SITE_SNAPSHOT_V192]) {
      const cachedSite = JSON.parse(localStorage.getItem(key) || "null");
      if (cachedSite?.id && cachedSite?.slug && cachedSite?.__userId === userId) return cachedSite;
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
      __release: "studio-bootstrap-session-first-v195-20260801",
      __savedAt: Date.now(),
    }));
  } catch {
    // Private browsing tidak boleh menghalangi Studio.
  }
}

`;
  source = `${source.slice(0, index)}${helpers}${source.slice(index)}`;
}

for (const marker of [
  "function readPersistedSupabaseSessionV198",
  "async function readLocalStudioSessionV195",
  "persisted-storage-v198",
  "persisted-storage-first",
  "function cachedActiveSiteV195",
  "function rememberActiveSiteV195",
]) {
  if (!source.includes(marker)) throw new Error(`V198_PRIMER_VERIFY_FAILED:${marker}`);
}
if (/service_role|SUPABASE_SERVICE_ROLE/.test(source)) throw new Error("V198_PRIMER_PRIVILEGED_BROWSER_KEY_FORBIDDEN");
await write(path, source);
console.log(`Applied ${RELEASE} primer before v195 bootstrap.`);
