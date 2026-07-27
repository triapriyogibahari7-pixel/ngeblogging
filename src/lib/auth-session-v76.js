import { supabase, supabaseConfigured } from "./supabase.js";

export const AUTH_SESSION_RELEASE = "auth-session-authority-v76-20260727";
export const SESSION_REAUTH_REQUIRED = "SESSION_REAUTH_REQUIRED";
const VERIFY_TIMEOUT_MS = 8_000;
let verificationPromise = null;

function withDeadline(promise, milliseconds, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = globalThis.setTimeout(() => reject(Object.assign(new Error(message), {
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
      // Always remove the stale browser token even when the remote session is gone.
    }
  }
  clearPersistedAuthStorage();
  window.__ngebloggingVerifiedSession = null;
}

function reauthError(cause = null) {
  const error = new Error("Sesi Anda sudah berakhir atau telah dicabut. Silakan masuk kembali.");
  error.name = "SessionReauthError";
  error.code = SESSION_REAUTH_REQUIRED;
  error.status = 401;
  error.requiresReauth = true;
  error.cause = cause || undefined;
  return error;
}

async function authenticateSession(session) {
  if (!session?.access_token) return null;
  const { data, error } = await withDeadline(
    supabase.auth.getUser(session.access_token),
    VERIFY_TIMEOUT_MS,
    "Verifikasi sesi melewati batas waktu.",
  );
  if (error || !data?.user) throw error || reauthError();
  return { session, user: data.user };
}

async function verifyInternal() {
  if (!supabaseConfigured || !supabase) {
    throw Object.assign(new Error("Autentikasi Supabase belum dikonfigurasi."), {
      code: "AUTH_NOT_CONFIGURED",
      status: 503,
    });
  }

  const { data, error } = await withDeadline(
    supabase.auth.getSession(),
    VERIFY_TIMEOUT_MS,
    "Pembacaan sesi melewati batas waktu.",
  );
  if (error) throw error;
  if (!data?.session) return null;

  try {
    const verified = await authenticateSession(data.session);
    window.__ngebloggingVerifiedSession = verified;
    return verified;
  } catch (initialError) {
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
        detail: { release: AUTH_SESSION_RELEASE, userId: verified.user.id },
      }));
      return verified;
    } catch (refreshError) {
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
  const code = String(error?.code || error?.error_code || "").toLowerCase();
  const message = String(error?.message || error?.error || "").toLowerCase();
  return Boolean(
    error?.requiresReauth
    || code === SESSION_REAUTH_REQUIRED.toLowerCase()
    || code === "invalid_session"
    || code === "session_not_found"
    || code === "refresh_token_not_found"
    || code === "refresh_token_already_used"
    || ((error?.status === 401 || error?.status === 403) && /session|token|jwt|masuk kembali/.test(message))
  );
}
