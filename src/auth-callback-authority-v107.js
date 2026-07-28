import { supabase, supabaseConfigured } from "./lib/supabase.js";

const RELEASE = "auth-callback-authority-v108-20260728";
const GATE_ID = "ngeblogging-auth-callback-gate-v108";
const CALLBACK_MARKER = "ngeblogging-auth-callback-v108";

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
    animation: "ngeblogging-callback-spin-v108 .75s linear infinite",
  });
  const heading = gate.querySelector("b");
  if (heading) Object.assign(heading.style, { fontSize: "16px", lineHeight: "1.35" });
  const note = gate.querySelector("small");
  if (note) Object.assign(note.style, { color: "#718097", fontSize: "13px" });
  const style = document.createElement("style");
  style.textContent = "@keyframes ngeblogging-callback-spin-v108{to{transform:rotate(360deg)}}";
  style.dataset.authCallbackV108 = "true";
  document.head.append(style);
  document.body.append(gate);
}

function successTarget(mode) {
  const url = new URL(window.location.href);
  ["code", "error", "error_code", "error_description"].forEach((key) => url.searchParams.delete(key));
  if (mode === "recovery") url.searchParams.set("auth", "recovery");
  else url.searchParams.delete("auth");
  url.searchParams.set("auth_success", "v108");
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

async function completeCallback(mode, code) {
  installGate(mode);
  document.documentElement.dataset.authCallbackAuthority = RELEASE;
  try {
    // A fresh callback code must always be consumed. Never skip this because an
    // older local session happens to exist; doing so leaves the new PKCE login unfinished.
    let session = await exchangeFreshCode(code);
    if (!session?.access_token) throw new Error("Sesi login tidak terbentuk setelah callback diproses.");

    window.__ngebloggingOAuthCallbackSessionV108 = session;
    document.documentElement.dataset.authCallbackV108 = "completed";
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
    // The callback may have been consumed just before a reload. In that one case,
    // accept an already-persisted valid session instead of forcing another login.
    try {
      const recovered = await storedSession();
      if (recovered?.access_token) {
        window.__ngebloggingOAuthCallbackSessionV108 = recovered;
        document.documentElement.dataset.authCallbackV108 = "recovered-existing-session";
        window.location.replace(successTarget(mode));
        return;
      }
    } catch {
      // Use the original callback failure below.
    }
    console.error("OAuth callback v108 failed", initialError);
    document.documentElement.dataset.authCallbackV108 = "failed";
    window.location.replace(failureTarget(initialError?.message));
  }
}

const state = callbackState();
if (supabaseConfigured && supabase && isSupportedCallback(state.mode, state.code) && !state.error) {
  completeCallback(state.mode, state.code);
} else {
  document.documentElement.dataset.authCallbackAuthority = state.error ? "provider-error" : "idle";
}
