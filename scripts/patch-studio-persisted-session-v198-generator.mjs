import { readFile, writeFile } from "node:fs/promises";

const file = new URL("./patch-studio-bootstrap-v195.mjs", import.meta.url);
let source = await readFile(file, "utf8");
const RELEASE = "studio-persisted-session-recovery-v198-20260802";

if (!source.includes("function readPersistedSupabaseSessionV198")) {
  const startMarker = '    const helper = `async function readLocalStudioSessionV195(userId) {';
  const endMarker = '\n\nfunction cachedActiveSiteV195(userId) {';
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error("V198_GENERATOR_V195_LOCAL_SESSION_START_MISSING");
  const bodyStart = start + '    const helper = `'.length;
  const end = source.indexOf(endMarker, bodyStart);
  if (end < 0) throw new Error("V198_GENERATOR_V195_LOCAL_SESSION_END_MISSING");

  const enhanced = [
    'function supabaseProjectRefV198() {',
    '  try {',
    '    const configured = String(import.meta.env?.VITE_SUPABASE_URL || "").trim();',
    '    return configured ? new URL(configured).hostname.split(".")[0] || "" : "";',
    '  } catch {',
    '    return "";',
    '  }',
    '}',
    '',
    'function sessionFromPersistedValueV198(value) {',
    '  if (!value || typeof value !== "object") return null;',
    '  const candidates = [value, value.session, value.currentSession, value.data?.session];',
    '  return candidates.find((candidate) => candidate?.access_token && candidate?.user?.id) || null;',
    '}',
    '',
    'function readPersistedSupabaseSessionV198(userId) {',
    '  if (!userId || typeof localStorage === "undefined") return null;',
    '  const projectRef = supabaseProjectRefV198();',
    '  if (!projectRef) return null;',
    '  const storageKey = "sb-" + projectRef + "-auth-token";',
    '  try {',
    '    const raw = localStorage.getItem(storageKey);',
    '    if (!raw) return null;',
    '    const persisted = sessionFromPersistedValueV198(JSON.parse(raw));',
    '    if (!persisted?.access_token || persisted.user?.id !== userId) return null;',
    '    return {',
    '      session: persisted,',
    '      user: persisted.user,',
    '      verification: "persisted-storage-v198",',
    '      persistedStorageKey: storageKey,',
    '    };',
    '  } catch {',
    '    return null;',
    '  }',
    '}',
    '',
    'async function readLocalStudioSessionV195(userId) {',
    '  const cached = window.__ngebloggingVerifiedSession;',
    '  const cachedUserId = cached?.user?.id || cached?.session?.user?.id || "";',
    '  if (cached?.session?.access_token && cachedUserId === userId) {',
    '    return { ...cached, verification: cached.verification || "memory-session-v195" };',
    '  }',
    '',
    '  const persisted = readPersistedSupabaseSessionV198(userId);',
    '  if (persisted?.session?.access_token) {',
    '    window.__ngebloggingVerifiedSession = persisted;',
    '    document.documentElement.dataset.studioSessionBootstrapV198 = "persisted-storage-first";',
    '    return persisted;',
    '  }',
    '',
    '  const result = await withDeadline(',
    '    supabase.auth.getSession(),',
    '    LOCAL_SESSION_TIMEOUT_V195_MS,',
    '    "Pembacaan sesi lokal melewati batas waktu.",',
    '  );',
    '  if (result?.error) throw result.error;',
    '  const session = result?.data?.session || null;',
    '  const sessionUser = session?.user || null;',
    '  if (!session?.access_token || !sessionUser?.id || sessionUser.id !== userId) {',
    '    throw Object.assign(new Error("Sesi lokal tidak cocok dengan akun Studio."), {',
    '      code: "SESSION_REAUTH_REQUIRED",',
    '      status: 401,',
    '      requiresReauth: true,',
    '    });',
    '  }',
    '',
    '  const local = { session, user: sessionUser, verification: "local-session-first-v195" };',
    '  window.__ngebloggingVerifiedSession = local;',
    '  document.documentElement.dataset.studioSessionBootstrapV195 = "local-session-first";',
    '  document.documentElement.dataset.studioSessionBootstrapV198 = "supabase-client-session";',
    '  return local;',
    '}',
  ].join('\n');

  source = `${source.slice(0, bodyStart)}${enhanced}${source.slice(end)}`;
}

for (const marker of [
  "function readPersistedSupabaseSessionV198",
  'const storageKey = "sb-" + projectRef + "-auth-token";',
  "persisted-storage-v198",
  "persisted-storage-first",
  "async function readLocalStudioSessionV195",
  "supabase.auth.getSession()",
]) {
  if (!source.includes(marker)) throw new Error(`V198_GENERATOR_VERIFY_FAILED:${marker}`);
}
await writeFile(file, source);
console.log(`Applied ${RELEASE} to stable v195 generator.`);
