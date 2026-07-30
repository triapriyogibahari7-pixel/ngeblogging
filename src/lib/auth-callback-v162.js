import { supabase, supabaseConfigured } from "./supabase.js";

export const AUTH_CALLBACK_RELEASE = "auth-callback-v162-20260730";
let callbackPromise = null;

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

function cleanCallbackUrl({ success = false, recovery = false } = {}) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  for (const key of ["code", "error", "error_code", "error_description", "state"]) {
    url.searchParams.delete(key);
  }
  url.searchParams.delete("auth");
  if (success) url.searchParams.set("auth_success", "v162");
  if (recovery) url.searchParams.set("auth", "recovery");
  url.pathname = recovery ? "/reset-password" : success ? "/studio" : url.pathname;
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

function callbackResult(status, extra = {}) {
  return { status, release: AUTH_CALLBACK_RELEASE, ...extra };
}

function isConsumedCodeError(error) {
  const value = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
  return /flow state|state.*not found|pkce|expired|already.*used|invalid.*code/.test(value);
}

async function consumeInternal() {
  if (typeof window === "undefined") return callbackResult("server");
  const url = new URL(window.location.href);
  const oauthError = callbackErrorFromUrl(url);
  if (oauthError) {
    cleanCallbackUrl();
    return callbackResult("error", { error: oauthError });
  }

  const code = callbackCode(url);
  if (!code) return callbackResult("none");
  if (!supabaseConfigured || !supabase) {
    return callbackResult("error", { error: new Error("Autentikasi belum dikonfigurasi pada deployment ini.") });
  }

  const existing = await supabase.auth.getSession();
  if (existing.data?.session?.access_token) {
    cleanCallbackUrl({ success: true });
    return callbackResult("recovered", { session: existing.data.session });
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    if (isConsumedCodeError(error)) {
      const recovered = await supabase.auth.getSession();
      if (recovered.data?.session?.access_token) {
        cleanCallbackUrl({ success: true });
        return callbackResult("recovered", { session: recovered.data.session });
      }
    }
    cleanCallbackUrl();
    return callbackResult("error", { error });
  }

  const session = data?.session || (await supabase.auth.getSession()).data?.session || null;
  if (!session?.access_token || !session?.refresh_token) {
    cleanCallbackUrl();
    return callbackResult("error", { error: new Error("Callback diterima tetapi sesi login tidak terbentuk.") });
  }

  cleanCallbackUrl({ success: true });
  document.documentElement.dataset.authCallbackV162 = "exchanged";
  window.dispatchEvent(new CustomEvent("ngeblogging:auth-callback-complete", {
    detail: { release: AUTH_CALLBACK_RELEASE, userId: session.user?.id || "" },
  }));
  return callbackResult("exchanged", { session });
}

export function consumeAuthCallbackV162() {
  if (!callbackPromise) {
    callbackPromise = consumeInternal().finally(() => {
      globalThis.setTimeout(() => { callbackPromise = null; }, 0);
    });
  }
  return callbackPromise;
}
