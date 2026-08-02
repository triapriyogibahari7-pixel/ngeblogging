import { supabase, supabaseConfigured } from "./supabase.js";

export const AUTH_CALLBACK_RELEASE = "auth-callback-singleflight-v162-20260730";
export const AUTH_CALLBACK_COMPAT_RELEASE = "auth-callback-v162-20260730";
export const AUTH_CALLBACK_REPLAY_RECOVERY_V205 = "auth-callback-replay-recovery-v205-20260802";

const OPERATION_KEY = Symbol.for("ngeblogging.auth.callbackOperationV162");
const CALLBACK_MARKER = "ngeblogging-auth-callback-singleflight-v162";
const CALLBACK_TTL_MS = 15 * 60 * 1000;

function callbackErrorFromUrl(url) {
  const description = url.searchParams.get("error_description");
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("error_code");
  if (!description && !error && !code) return null;
  const next = new Error(description || error || "Login provider tidak berhasil.");
  next.code = code || error || "oauth_callback_error";
  return next;
}

function callbackCode(url) {
  return String(url.searchParams.get("code") || "").trim();
}

function callbackMode(url) {
  return url.searchParams.get("auth") === "recovery" ? "recovery" : "callback";
}

function fingerprint(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function readMarker(codeFingerprint) {
  try {
    const stored = JSON.parse(sessionStorage.getItem(CALLBACK_MARKER) || "null");
    if (!stored || stored.fingerprint !== codeFingerprint) return null;
    if (Date.now() - Number(stored.completedAt || 0) > CALLBACK_TTL_MS) return null;
    return stored;
  } catch {
    return null;
  }
}

function writeMarker({ codeFingerprint, mode, status, session }) {
  try {
    sessionStorage.setItem(CALLBACK_MARKER, JSON.stringify({
      completedAt: Date.now(),
      fingerprint: codeFingerprint,
      mode,
      status,
      userId: session?.user?.id || "",
    }));
  } catch {
    // Storage privat atau penuh tidak boleh menggagalkan login.
  }
}

function cleanCallbackUrl({ success = false, recovery = false } = {}) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  for (const key of ["code", "error", "error_code", "error_description", "state"]) url.searchParams.delete(key);
  url.searchParams.delete("auth");
  if (success) {
    url.searchParams.set("auth_success", "v162");
    url.searchParams.set("source", recovery ? "recovery" : "oauth-callback");
  }
  if (recovery) url.searchParams.set("auth", "recovery");
  url.pathname = recovery ? "/reset-password" : success ? "/studio" : url.pathname;
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

function callbackResult(status, extra = {}) {
  return { status, release: AUTH_CALLBACK_RELEASE, compatibility: AUTH_CALLBACK_COMPAT_RELEASE, ...extra };
}

function isConsumedCodeError(error) {
  const value = `${error?.code || error?.error_code || ""} ${error?.message || error?.error || ""}`.toLowerCase();
  return /flow state|state.*not found|oauth state.*expired|pkce|already.*used|invalid.*code/.test(value);
}

async function currentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session || null;
}

function announce(status, session, mode) {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.authCallbackV162 = status;
    document.documentElement.dataset.authCallbackSingleflightV162 = AUTH_CALLBACK_RELEASE;
    if (status === "recovered-provider-state-replay") {
      document.documentElement.dataset.authCallbackReplayRecoveryV205 = AUTH_CALLBACK_REPLAY_RECOVERY_V205;
    }
  }
  window.dispatchEvent(new CustomEvent("ngeblogging:auth-callback-complete", {
    detail: {
      release: AUTH_CALLBACK_RELEASE,
      compatibility: AUTH_CALLBACK_COMPAT_RELEASE,
      replayRecovery: AUTH_CALLBACK_REPLAY_RECOVERY_V205,
      status,
      mode,
      userId: session?.user?.id || "",
    },
  }));
}

async function recoverExistingSessionFromReplay(mode) {
  const session = await currentSession().catch(() => null);
  if (!session?.access_token || !session?.refresh_token) return null;
  cleanCallbackUrl({ success: true, recovery: mode === "recovery" });
  announce("recovered-provider-state-replay", session, mode);
  return callbackResult("recovered", {
    session,
    mode,
    singleFlight: true,
    providerStateReplayRecovered: true,
    replayRecovery: AUTH_CALLBACK_REPLAY_RECOVERY_V205,
  });
}

async function consumeInternal(url, code, mode, codeFingerprint) {
  const oauthError = callbackErrorFromUrl(url);
  if (oauthError) {
    /* A provider callback can be revisited after its original PKCE exchange has
       already succeeded. Supabase then reports an expired/missing OAuth state.
       If a valid persisted session still exists, keep that valid login and clean
       the stale callback URL instead of presenting a false authentication loss. */
    if (isConsumedCodeError(oauthError) && supabaseConfigured && supabase) {
      const recovered = await recoverExistingSessionFromReplay(mode);
      if (recovered) return recovered;
    }
    cleanCallbackUrl();
    return callbackResult("error", { error: oauthError, mode });
  }

  if (!code) return callbackResult("none", { mode });
  if (!supabaseConfigured || !supabase) {
    return callbackResult("error", { mode, error: new Error("Autentikasi belum dikonfigurasi pada deployment ini.") });
  }

  const completed = readMarker(codeFingerprint);
  if (completed) {
    const session = await currentSession().catch(() => null);
    if (session?.access_token && session?.refresh_token) {
      cleanCallbackUrl({ success: true, recovery: mode === "recovery" });
      announce("reused-completed-callback", session, mode);
      return callbackResult("recovered", { session, mode, singleFlight: true });
    }
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    if (isConsumedCodeError(error)) {
      const recovered = await currentSession().catch(() => null);
      if (recovered?.access_token && recovered?.refresh_token) {
        writeMarker({ codeFingerprint, mode, status: "recovered-consumed-code", session: recovered });
        cleanCallbackUrl({ success: true, recovery: mode === "recovery" });
        announce("recovered-consumed-code", recovered, mode);
        return callbackResult("recovered", { session: recovered, mode, singleFlight: true });
      }
    }
    cleanCallbackUrl();
    return callbackResult("error", { error, mode });
  }

  const session = data?.session || await currentSession().catch(() => null);
  if (!session?.access_token || !session?.refresh_token) {
    cleanCallbackUrl();
    return callbackResult("error", { mode, error: new Error("Callback diterima tetapi sesi login tidak terbentuk.") });
  }

  writeMarker({ codeFingerprint, mode, status: "exchanged-singleflight", session });
  cleanCallbackUrl({ success: true, recovery: mode === "recovery" });
  announce("exchanged-singleflight", session, mode);
  return callbackResult("exchanged", { session, mode, singleFlight: true });
}

export function consumeAuthCallbackV162() {
  if (typeof window === "undefined") return Promise.resolve(callbackResult("server"));
  const url = new URL(window.location.href);
  const code = callbackCode(url);
  const mode = callbackMode(url);
  const codeFingerprint = code ? fingerprint(code) : "none";

  const current = globalThis[OPERATION_KEY];
  if (current?.promise && current.fingerprint === codeFingerprint) return current.promise;

  const promise = consumeInternal(url, code, mode, codeFingerprint);
  globalThis[OPERATION_KEY] = { fingerprint: codeFingerprint, startedAt: Date.now(), promise };

  globalThis.setTimeout(() => {
    const active = globalThis[OPERATION_KEY];
    if (active?.promise === promise) delete globalThis[OPERATION_KEY];
  }, CALLBACK_TTL_MS);

  return promise;
}
