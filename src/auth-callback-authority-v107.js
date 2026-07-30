import { consumeAuthCallbackV162, AUTH_CALLBACK_RELEASE } from "./lib/auth-callback-v162.js";
import { supabase, supabaseConfigured } from "./lib/supabase.js";

const RELEASE = "auth-callback-authority-v162-20260730";
const COMPAT_RELEASE = "auth-callback-authority-v142-20260729";
const GATE_ID = "ngeblogging-auth-callback-gate-v162";
const PASSWORD_PATCH = Symbol.for("ngeblogging.auth.passwordFallbackV142");
const AUTHORITY_INSTALL_FLAG = Symbol.for("ngeblogging.auth.callbackAuthorityV162");
const SUPABASE_URL = String(import.meta.env?.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_KEY = String(
  import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env?.VITE_SUPABASE_ANON_KEY
  || "",
);

function callbackState() {
  const url = new URL(window.location.href);
  return {
    mode: url.searchParams.get("auth") || "",
    code: url.searchParams.get("code") || "",
    error: url.searchParams.get("error_description") || url.searchParams.get("error") || "",
  };
}

function isSupportedCallback(mode, code) {
  return Boolean(code && (mode === "callback" || mode === "recovery" || !mode));
}

function installGate(mode) {
  if (document.getElementById(GATE_ID)) return;
  const gate = document.createElement("div");
  gate.id = GATE_ID;
  gate.setAttribute("role", "status");
  gate.setAttribute("aria-live", "assertive");
  gate.innerHTML = `<span aria-hidden="true"></span><b>${mode === "recovery" ? "Menyiapkan pemulihan akun…" : "Menyelesaikan login dan membuka Studio…"}</b><small>Satu callback diproses oleh satu authority.</small>`;
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
  const note = gate.querySelector("small");
  if (note) Object.assign(note.style, { color: "#718097", fontSize: "13px" });
  const style = document.createElement("style");
  style.textContent = "@keyframes ngeblogging-callback-spin-v162{to{transform:rotate(360deg)}}";
  style.dataset.authCallbackAuthorityV162 = "true";
  document.head.append(style);
  document.body.append(gate);
}

function removeGate() {
  document.getElementById(GATE_ID)?.remove();
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

function studioVisible() {
  return Boolean(document.querySelector(".sn-shell,.studio-shell,[data-studio-shell],.so75-shell,.app-loading"));
}

function failureTarget(message) {
  const url = new URL("/login", window.location.origin);
  url.searchParams.set("auth", "callback-error");
  url.searchParams.set("error_description", message || "Login belum dapat diselesaikan. Silakan masuk kembali.");
  return `${url.pathname}${url.search}`;
}

function publishToBootstrap(result) {
  const session = result?.session || null;
  if (!session?.access_token) return false;
  window.__ngebloggingOAuthCallbackSessionV142 = session;
  window.__ngebloggingOAuthCallbackSessionV162 = session;
  document.documentElement.dataset.authCallbackAuthority = RELEASE;
  document.documentElement.dataset.authCallbackCompatibility = COMPAT_RELEASE;
  document.documentElement.dataset.authCallbackConsumer = AUTH_CALLBACK_RELEASE;
  window.dispatchEvent(new CustomEvent("ngeblogging:auth-session-ready", {
    detail: {
      session,
      mode: result.mode || "callback",
      release: AUTH_CALLBACK_RELEASE,
      authority: RELEASE,
      state: result.status,
    },
  }));
  return true;
}

function scheduleStudioWatchdog(result) {
  if (result?.mode === "recovery") {
    removeGate();
    return;
  }
  window.setTimeout(() => {
    if (studioVisible()) {
      removeGate();
      return;
    }
    const target = new URL("/studio", window.location.origin);
    target.searchParams.set("auth_success", "v162");
    target.searchParams.set("source", "callback-watchdog");
    window.location.replace(`${target.pathname}${target.search}`);
  }, 1800);
}

installPasswordFallback();
const state = callbackState();
if (!window[AUTHORITY_INSTALL_FLAG]) {
  window[AUTHORITY_INSTALL_FLAG] = true;
  document.documentElement.dataset.authCallbackAuthority = RELEASE;
  if (supabaseConfigured && supabase && isSupportedCallback(state.mode, state.code) && !state.error) {
    installGate(state.mode);
    consumeAuthCallbackV162().then((result) => {
      if (result.status === "error") {
        removeGate();
        window.location.replace(failureTarget(result.error?.message));
        return;
      }
      if (publishToBootstrap(result)) scheduleStudioWatchdog(result);
      else removeGate();
    }).catch((error) => {
      console.error("OAuth callback authority v162 failed", error);
      removeGate();
      window.location.replace(failureTarget(error?.message));
    });
  } else {
    document.documentElement.dataset.authCallbackAuthority = state.error ? "provider-error" : "idle";
  }
}
