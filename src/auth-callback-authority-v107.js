import { supabase, supabaseConfigured } from "./lib/supabase.js";

const RELEASE = "auth-callback-authority-v139-20260729";
const GATE_ID = "ngeblogging-auth-callback-gate-v139";
const CALLBACK_MARKER = "ngeblogging-auth-callback-v139";
const PASSWORD_PATCH = Symbol.for("ngeblogging.auth.passwordFallbackV139");
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

function installGate(mode) {
  if (document.getElementById(GATE_ID)) return;
  const gate = document.createElement("div");
  gate.id = GATE_ID;
  gate.setAttribute("role", "status");
  gate.setAttribute("aria-live", "assertive");
  gate.innerHTML = `<span aria-hidden="true"></span><b>${mode === "recovery" ? "Menyiapkan pemulihan akun…" : "Menyelesaikan login dan membuka dashboard…"}</b><small>Jangan tutup halaman ini.</small>`;
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
    animation: "ngeblogging-callback-spin-v139 .75s linear infinite",
  });
  const heading = gate.querySelector("b");
  if (heading) Object.assign(heading.style, { fontSize: "16px", lineHeight: "1.35" });
  const note = gate.querySelector("small");
  if (note) Object.assign(note.style, { color: "#718097", fontSize: "13px" });
  const style = document.createElement("style");
  style.textContent = "@keyframes ngeblogging-callback-spin-v139{to{transform:rotate(360deg)}}";
  style.dataset.authCallbackV139 = "true";
  document.head.append(style);
  document.body.append(gate);
}

function successTarget(mode) {
  const url = new URL(window.location.href);
  ["code", "error", "error_code", "error_description"].forEach((key) => url.searchParams.delete(key));
  if (mode === "recovery") url.searchParams.set("auth", "recovery");
  else url.searchParams.delete("auth");
  url.searchParams.set("auth_success", "v139");
  return `${url.pathname}${url.search}${url.hash}`;
}

function failureTarget(message) {
  const url = new URL(window.location.href);
  ["code", "error", "error_code"].forEach((key) => url.searchParams.delete(key));
  url.searchParams.set("auth", "callback-error");
  url.searchParams.set("error_description", message || "Login belum dapat diselesaikan. Silakan masuk kembali.");
  return `${url.pathname}${url.search}${url.hash}`;
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
      "x-client-info": "ngeblogging-auth-v139",
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
      document.documentElement.dataset.authPasswordTransportV139 = "direct-recovery";
      return recovered;
    } catch (fallbackError) {
      document.documentElement.dataset.authPasswordTransportV139 = "failed";
      return { data: originalResult?.data || null, error: fallbackError };
    }
  };
  Object.defineProperty(supabase.auth, PASSWORD_PATCH, { value: true, configurable: false });
  document.documentElement.dataset.authPasswordFallbackV139 = "installed";
}

async function completeCallback(mode, code) {
  installGate(mode);
  document.documentElement.dataset.authCallbackAuthority = RELEASE;
  try {
    let session = await exchangeFreshCode(code);
    if (!session?.access_token) throw new Error("Sesi login tidak terbentuk setelah callback diproses.");
    window.__ngebloggingOAuthCallbackSessionV139 = session;
    document.documentElement.dataset.authCallbackV139 = "completed";
    try {
      sessionStorage.setItem(CALLBACK_MARKER, JSON.stringify({
        completedAt: Date.now(),
        mode,
        userId: session.user?.id || "",
      }));
    } catch {
      // Storage restrictions must not prevent login completion.
    }
    window.location.replace(successTarget(mode));
  } catch (initialError) {
    try {
      const recovered = await storedSession();
      if (recovered?.access_token) {
        window.__ngebloggingOAuthCallbackSessionV139 = recovered;
        document.documentElement.dataset.authCallbackV139 = "recovered-existing-session";
        window.location.replace(successTarget(mode));
        return;
      }
    } catch {
      // Use the original callback failure below.
    }
    console.error("OAuth callback v139 failed", initialError);
    document.documentElement.dataset.authCallbackV139 = "failed";
    window.location.replace(failureTarget(initialError?.message));
  }
}

installPasswordFallback();
const state = callbackState();
if (supabaseConfigured && supabase && isSupportedCallback(state.mode, state.code) && !state.error) {
  completeCallback(state.mode, state.code);
} else {
  document.documentElement.dataset.authCallbackAuthority = state.error ? "provider-error" : "idle";
}
