import { supabase, supabaseConfigured } from "./supabase.js";

export const AUTH_SESSION_RELEASE = "auth-session-authority-v108-20260728";
export const SESSION_REAUTH_REQUIRED = "SESSION_REAUTH_REQUIRED";
// Historical compatibility marker: auth-session-authority-v76-20260727
const VERIFY_TIMEOUT_MS = 10_000;
let verificationPromise = null;

function withDeadline(promise, milliseconds, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = globalThis.setTimeout(() => reject(Object.assign(new Error(message), {
        name: "TimeoutError",
        code: "AUTH_SESSION_TIMEOUT",
      })), milliseconds);
    }),
  ]).finally(() => globalThis.clearTimeout(timer));
}

function projectRef() {
  try {
    const url = String(import.meta.env?.VITE_SUPABASE_URL || "");
    return new URL(url).hostname.split(".")[0] || "";
  } catch {
    return "";
  }
}

function clearPersistedAuthStorage() {
  if (typeof localStorage === "undefined") return;
  const ref = projectRef();
  const prefixes = ref ? [`sb-${ref}-auth-token`] : [];
  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index) || "";
      if (prefixes.some((prefix) => key === prefix || key.startsWith(`${prefix}.`))) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Hardened browsers may deny direct storage access.
  }
}

export async function clearInvalidLocalSession() {
  if (supabaseConfigured && supabase) {
    try {
      await withDeadline(
        supabase.auth.signOut({ scope: "local" }),
        4_000,
        "Pembersihan sesi lokal melewati batas waktu.",
      );
    } catch {
      // Always remove a definitively invalid browser token even when remote auth is unavailable.
    }
  }
  clearPersistedAuthStorage();
  window.__ngebloggingVerifiedSession = null;
}

function normalizedError(error) {
  return {
    code: String(error?.code || error?.error_code || "").toLowerCase(),
    message: String(error?.message || error?.error || "").toLowerCase(),
    name: String(error?.name || "").toLowerCase(),
    status: Number(error?.status || 0),
  };
}

export function isTransientSessionError(error) {
  const { code, message, name, status } = normalizedError(error);
  return Boolean(
    name === "typeerror"
    || name === "aborterror"
    || name === "timeouterror"
    || name === "authtransporterror"
    || code === "auth_network_unavailable"
    || code === "auth_session_timeout"
    || code === "network_error"
    || status >= 500
    || /failed to fetch|network|jaringan|timeout|time out|temporarily|sementara|unreachable|tidak dapat dijangkau/.test(message)
  );
}

function definitiveInvalidSession(error) {
  const { code, message, status } = normalizedError(error);
  const invalidCodes = new Set([
    "invalid_session",
    "session_not_found",
    "refresh_token_not_found",
    "refresh_token_already_used",
    "bad_jwt",
    "invalid_jwt",
    "jwt_expired",
    "token_expired",
    "invalid_token",
  ]);
  return Boolean(
    invalidCodes.has(code)
    || ((status === 401 || status === 403) && /session|token|jwt|refresh|not found|expired|revoked/.test(message))
  );
}

function reauthError(cause = null) {
  const error = new Error("Sesi Anda dinyatakan tidak berlaku oleh server. Silakan autentikasi ulang.");
  error.name = "SessionReauthError";
  error.code = SESSION_REAUTH_REQUIRED;
  error.status = 401;
  error.requiresReauth = true;
  error.cause = cause || undefined;
  return error;
}

function retainSessionDuringNetworkFailure(session, cause, phase) {
  const retained = {
    session,
    user: session?.user || null,
    verification: "deferred",
    retainedDuringNetworkFailure: true,
    phase,
    cause: cause?.message || "Gangguan jaringan sementara",
  };
  window.__ngebloggingVerifiedSession = retained;
  window.dispatchEvent(new CustomEvent("ngeblogging:session-retained", {
    detail: {
      release: AUTH_SESSION_RELEASE,
      phase,
      userId: session?.user?.id || "",
      message: "Sesi lokal dipertahankan selama layanan autentikasi belum dapat dijangkau.",
    },
  }));
  return retained;
}

async function authenticateSession(session) {
  if (!session?.access_token) return null;
  try {
    const { data, error } = await withDeadline(
      supabase.auth.getUser(session.access_token),
      VERIFY_TIMEOUT_MS,
      "Verifikasi sesi melewati batas waktu.",
    );
    if (error || !data?.user) throw error || Object.assign(new Error("Pengguna sesi tidak ditemukan."), { status: 401, code: "session_not_found" });
    return { session, user: data.user, verification: "verified" };
  } catch (error) {
    if (definitiveInvalidSession(error)) throw error;
    return retainSessionDuringNetworkFailure(session, error, "verify-user");
  }
}

async function verifyInternal() {
  if (!supabaseConfigured || !supabase) {
    throw Object.assign(new Error("Autentikasi Supabase belum dikonfigurasi."), {
      code: "AUTH_NOT_CONFIGURED",
      status: 503,
    });
  }

  let data;
  try {
    const result = await withDeadline(
      supabase.auth.getSession(),
      VERIFY_TIMEOUT_MS,
      "Pembacaan sesi melewati batas waktu.",
    );
    if (result.error) throw result.error;
    data = result.data;
  } catch (error) {
    if (window.__ngebloggingVerifiedSession?.session?.access_token && isTransientSessionError(error)) {
      return window.__ngebloggingVerifiedSession;
    }
    throw error;
  }

  if (!data?.session) return null;

  try {
    const verified = await authenticateSession(data.session);
    window.__ngebloggingVerifiedSession = verified;
    return verified;
  } catch (initialError) {
    if (!definitiveInvalidSession(initialError)) {
      return retainSessionDuringNetworkFailure(data.session, initialError, "verify-session");
    }

    try {
      const refreshed = await withDeadline(
        supabase.auth.refreshSession(data.session),
        VERIFY_TIMEOUT_MS,
        "Pembaruan sesi melewati batas waktu.",
      );
      if (refreshed.error || !refreshed.data?.session) throw refreshed.error || initialError;
      const verified = await authenticateSession(refreshed.data.session);
      window.__ngebloggingVerifiedSession = verified;
      window.dispatchEvent(new CustomEvent("ngeblogging:session-refreshed", {
        detail: { release: AUTH_SESSION_RELEASE, userId: verified.user?.id || "" },
      }));
      return verified;
    } catch (refreshError) {
      if (!definitiveInvalidSession(refreshError) || isTransientSessionError(refreshError)) {
        return retainSessionDuringNetworkFailure(data.session, refreshError, "refresh-session");
      }
      await clearInvalidLocalSession();
      throw reauthError(refreshError || initialError);
    }
  }
}

export function getVerifiedSession({ force = false } = {}) {
  if (!force && window.__ngebloggingVerifiedSession?.session?.access_token) {
    return Promise.resolve(window.__ngebloggingVerifiedSession);
  }
  if (!force && verificationPromise) return verificationPromise;

  const operation = verifyInternal();
  const wrapped = operation.finally(() => {
    if (verificationPromise === wrapped) verificationPromise = null;
  });
  verificationPromise = wrapped;
  return wrapped;
}

export function isSessionReauthError(error) {
  if (isTransientSessionError(error)) return false;
  const code = String(error?.code || error?.error_code || "").toLowerCase();
  return Boolean(
    error?.requiresReauth
    || code === SESSION_REAUTH_REQUIRED.toLowerCase()
    || definitiveInvalidSession(error)
  );
}
