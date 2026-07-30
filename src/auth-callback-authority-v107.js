import { supabase, supabaseConfigured } from "./lib/supabase.js";

const RELEASE = "auth-callback-singleflight-v162-20260730";
const COMPAT_RELEASE = "auth-callback-authority-v142-20260729";
const GATE_ID = "ngeblogging-auth-callback-gate-v162";
const CALLBACK_MARKER = "ngeblogging-auth-callback-v162";
const CALLBACK_OPERATIONS_KEY = "__ngebloggingAuthCallbackOperationsV162";
const CALLBACK_RESULT_TTL_MS = 15 * 60 * 1000;
const PASSWORD_PATCH = Symbol.for("ngeblogging.auth.passwordFallbackV142");
const CALLBACK_INSTALL_FLAG = Symbol.for("ngeblogging.auth.callbackSingleflightV162");
const SUPABASE_URL = String(import.meta.env?.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_KEY = String(
  import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env?.VITE_SUPABASE_ANON_KEY
  || "",
);

function callbackState() {
  const url = new URL(window.location.href);
  return {
    url,
    mode: url.searchParams.get("auth") || "",
    code: url.searchParams.get("code") || "",
    error: url.searchParams.get("error_description") || url.searchParams.get("error") || "",
  };
}

function isSupportedCallback(mode, code) {
  return Boolean(code && (mode === "callback" || mode === "recovery" || !mode));
}

function callbackFingerprint(code) {
  let hash = 2166136261;
  for (let index = 0; index < code.length; index += 1) {
    hash ^= code.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0).toString(36);
}

function operations() {
  if (!(window[CALLBACK_OPERATIONS_KEY] instanceof Map)) {
    window[CALLBACK_OPERATIONS_KEY] = new Map();
  }
  return window[CALLBACK_OPERATIONS_KEY];
}

function storedCallbackResult(fingerprint) {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(CALLBACK_MARKER) || "null");
    if (!parsed || parsed.fingerprint !== fingerprint) return null;
    if (Date.now() - Number(parsed.completedAt || 0) > CALLBACK_RESULT_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function rememberCallbackResult({ fingerprint, mode, session, state }) {
  try {
    sessionStorage.setItem(CALLBACK_MARKER, JSON.stringify({
      completedAt: Date.now(),
      fingerprint,
      mode,
      state,
      userId: session?.user?.id || "",
    }));
  } catch {
    // Pembatasan storage tidak boleh menggagalkan login.
  }
}

function installGate(mode) {
  if (document.getElementById(GATE_ID)) return;
  const gate = document.createElement("div");
  gate.id = GATE_ID;
  gate.setAttribute("role", "status");
  gate.setAttribute("aria-live", "assertive");
  gate.innerHTML = `<span aria-hidden="true"></span><b>${mode === "recovery" ? "Menyiapkan pemulihan akun…" : "Menyelesaikan login dan membuka Studio…"}</b><small>Kode login diproses satu kali. Jangan tutup halaman ini.</small>`;
  Object.assign(gate.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    display: "grid",
    placeContent: "center",
    justifyItems: "center",
    gap: "12px",
    padding: "24px",
    background: "#f7f9fc",
    color: "#1d2b42",
    textAlign: "center",
    fontFamily: '"DM Sans",system-ui,sans-serif',
  });
  const spinner = gate.querySelector("span");
  Object.assign(spinner.style, {
    width: "38px",
    height: "38px",
    borderRadius: "999px",
    border: "3px solid #dbe5f5",
    borderTopColor: "#2d6edf",
    animation: "ngeblogging-callback-spin-v162 .75s linear infinite",
  });
  const heading = gate.querySelector("b");
  if (heading) Object.assign(heading.style, { fontSize: "16px", lineHeight: "1.35" });
  const note = gate.querySelector("small");
  if (note) Object.assign(note.style, { color: "#718097", fontSize: "13px" });
  const style = document.createElement("style");
  style.textContent = "@keyframes ngeblogging-callback-spin-v162{to{transform:rotate(360deg)}}";
  style.dataset.authCallbackV162 = "true";
  document.head.append(style);
  document.body.append(gate);
}

function removeGate() {
  document.getElementById(GATE_ID)?.remove();
}

function cleanCallbackUrl(mode) {
  const url = new URL(window.location.href);
  ["code", "error", "error_code", "error_description"].forEach((key) => url.searchParams.delete(key));
  if (mode === "recovery") url.searchParams.set("auth", "recovery");
  else url.searchParams.delete("auth");
  url.searchParams.set("auth_success", "v162");
  return `${url.pathname}${url.search}${url.hash}`;
}

function studioTarget(source = "oauth") {
  const target = new URL("/studio", window.location.origin);
  target.searchParams.set("auth_success", "v162");
  target.searchParams.set("source", source);
  return `${target.pathname}${target.search}`;
}

function failureTarget(message) {
  const url = new URL("/login", window.location.origin);
  url.searchParams.set("auth", "callback-error");
  url.searchParams.set("error_description", message || "Login belum dapat diselesaikan. Silakan masuk kembali.");
  return `${url.pathname}${url.search}`;
}

async function storedSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session || null;
}

async function exchangeFreshCode(code) {
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
  return data?.session || await storedSession();
}

function flowStateFailure(error) {
  const code = String(error?.code || error?.error_code || "").toLowerCase();
  const message = String(error?.message || error?.error || "").toLowerCase();
  return code === "flow_state_not_found"
    || /invalid flow state|oauth state not found|state not found|state.*expired/.test(message);
}

async function exchangeCodeSingleFlight(mode, code) {
  const fingerprint = callbackFingerprint(code);
  const activeOperations = operations();
  if (activeOperations.has(fingerprint)) return activeOperations.get(fingerprint);

  const operation = (async () => {
    const prior = storedCallbackResult(fingerprint);
    if (prior) {
      const existing = await storedSession();
      if (existing?.access_token) return { session: existing, state: "reused-completed-callback", fingerprint };
    }

    try {
      const session = await exchangeFreshCode(code);
      if (!session?.access_token) throw new Error("Sesi login tidak terbentuk setelah callback diproses.");
      return { session, state: "completed-singleflight", fingerprint };
    } catch (error) {
      if (flowStateFailure(error)) {
        const existing = await storedSession().catch(() => null);
        if (existing?.access_token) {
          return { session: existing, state: "recovered-after-duplicate-flow", fingerprint };
        }
      }
      throw error;
    }
  })();

  activeOperations.set(fingerprint, operation);
  window.setTimeout(() => {
    if (activeOperations.get(fingerprint) === operation) activeOperations.delete(fingerprint);
  }, CALLBACK_RESULT_TTL_MS);
  return operation;
}

function transportFailure(error) {
  const name = String(error?.name || "").toLowerCase();
  const code = String(error?.code || error?.error_code || "").toLowerCase();
  const message = String(error?.message || error?.error || "").toLowerCase();
  return name === "typeerror"
    || name === "timeouterror"
    || name === "authtransporterror"
    || code === "auth_network_unavailable"
    || code === "gateway_response_mismatch"
    || /failed to fetch|network|jaringan|gateway|timeout|unreachable|tidak dapat dijangkau/.test(message);
}

async function directPasswordGrant(credentials) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Konfigurasi login produksi belum tersedia.");
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    cache: "no-store",
    credentials: "omit",
    headers: {
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${SUPABASE_KEY}`,
      "content-type": "application/json",
      "x-client-info": "ngeblogging-auth-v162",
    },
    body: JSON.stringify({
      email: String(credentials?.email || "").trim().toLowerCase(),
      password: String(credentials?.password || ""),
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.access_token || !payload?.refresh_token) {
    const error = new Error(payload?.msg || payload?.error_description || payload?.message || "Email atau password tidak cocok.");
    error.status = response.status;
    error.code = payload?.error_code || payload?.code || "DIRECT_PASSWORD_LOGIN_FAILED";
    throw error;
  }
  const { data, error } = await supabase.auth.setSession({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
  });
  if (error) throw error;
  return { data, error: null };
}

function installPasswordFallback() {
  if (!supabaseConfigured || !supabase || supabase.auth[PASSWORD_PATCH]) return;
  const original = supabase.auth.signInWithPassword.bind(supabase.auth);
  supabase.auth.signInWithPassword = async (credentials) => {
    let originalResult;
    try {
      originalResult = await original(credentials);
      if (!originalResult?.error || !transportFailure(originalResult.error)) return originalResult;
    } catch (error) {
      if (!transportFailure(error)) throw error;
      originalResult = { data: null, error };
    }
    try {
      const recovered = await directPasswordGrant(credentials);
      document.documentElement.dataset.authPasswordTransportV142 = "direct-recovery";
      document.documentElement.dataset.authPasswordTransportV162 = "direct-recovery";
      return recovered;
    } catch (fallbackError) {
      document.documentElement.dataset.authPasswordTransportV142 = "failed";
      document.documentElement.dataset.authPasswordTransportV162 = "failed";
      return { data: originalResult?.data || null, error: fallbackError };
    }
  };
  Object.defineProperty(supabase.auth, PASSWORD_PATCH, { value: true, configurable: false });
  document.documentElement.dataset.authPasswordFallbackV142 = "installed";
  document.documentElement.dataset.authPasswordFallbackV162 = "installed";
}

function publishSession(mode, result) {
  const { session, state, fingerprint } = result;
  window.__ngebloggingOAuthCallbackSessionV142 = session;
  window.__ngebloggingOAuthCallbackSessionV162 = session;
  document.documentElement.dataset.authCallbackV142 = state;
  document.documentElement.dataset.authCallbackV162 = state;
  document.documentElement.dataset.authCallbackCompatibility = COMPAT_RELEASE;
  rememberCallbackResult({ fingerprint, mode, session, state });
  history.replaceState(history.state, "", cleanCallbackUrl(mode));
  window.dispatchEvent(new CustomEvent("ngeblogging:auth-session-ready", {
    detail: { session, mode, release: RELEASE, state },
  }));

  if (mode === "recovery") {
    removeGate();
    return;
  }

  document.documentElement.dataset.authStudioHandoffV162 = "redirecting";
  window.location.replace(studioTarget("oauth-callback"));
}

async function completeCallback(mode, code) {
  installGate(mode);
  document.documentElement.dataset.authCallbackAuthority = RELEASE;
  try {
    const result = await exchangeCodeSingleFlight(mode, code);
    publishSession(mode, result);
  } catch (initialError) {
    try {
      const recovered = await storedSession();
      if (recovered?.access_token) {
        publishSession(mode, {
          session: recovered,
          state: "recovered-existing-session",
          fingerprint: callbackFingerprint(code),
        });
        return;
      }
    } catch {
      // Gunakan kegagalan callback awal di bawah.
    }
    console.error("OAuth callback v162 failed", initialError);
    document.documentElement.dataset.authCallbackV142 = "failed";
    document.documentElement.dataset.authCallbackV162 = "failed";
    window.location.replace(failureTarget(initialError?.message));
  }
}

installPasswordFallback();
const state = callbackState();
if (!window[CALLBACK_INSTALL_FLAG]) {
  window[CALLBACK_INSTALL_FLAG] = true;
  if (supabaseConfigured && supabase && isSupportedCallback(state.mode, state.code) && !state.error) {
    completeCallback(state.mode, state.code);
  } else {
    document.documentElement.dataset.authCallbackAuthority = state.error ? "provider-error" : "idle";
  }
} else if (isSupportedCallback(state.mode, state.code)) {
  document.documentElement.dataset.authCallbackV162 = "duplicate-install-ignored";
}
