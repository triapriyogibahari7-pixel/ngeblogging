import "./auth-callback-authority-v107.js";
import { supabase, supabaseConfigured } from "./lib/supabase.js";

const RELEASE = "auth-studio-bootstrap-v109-20260728";
const LEGACY_RELEASE = "auth-studio-bootstrap-v106-20260728";
const AUTH_HANDOFF_RELEASE = "auth-route-handoff-v143-20260729";
const AUTH_SUCCESS_VALUE = "v143";
const PATCH_FLAG = Symbol.for("ngeblogging.authStudioBootstrapV106");
const GATE_ID = "ngeblogging-auth-gate-v106";
const subscribers = new Set();
let recoveredSession = null;
let replayScheduled = false;
let routeRedirecting = false;

function installGate() {
  if (document.getElementById(GATE_ID)) return;
  const gate = document.createElement("div");
  gate.id = GATE_ID;
  gate.setAttribute("role", "status");
  gate.setAttribute("aria-live", "polite");
  gate.innerHTML = '<span aria-hidden="true"></span><b>Memulihkan dashboard…</b><small>Sesi aman sedang disambungkan ke Studio.</small>';
  Object.assign(gate.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483000",
    display: "grid",
    placeContent: "center",
    justifyItems: "center",
    gap: "12px",
    padding: "24px",
    background: "#f7f9fc",
    color: "#1d2b42",
    font: '700 15px/1.3 "DM Sans", sans-serif',
    textAlign: "center",
  });
  const spinner = gate.querySelector("span");
  Object.assign(spinner.style, {
    width: "34px",
    height: "34px",
    borderRadius: "999px",
    border: "3px solid #dbe5f5",
    borderTopColor: "#2d6edf",
    animation: "ngeblogging-auth-spin-v106 .8s linear infinite",
  });
  const note = gate.querySelector("small");
  if (note) Object.assign(note.style, { color: "#718097", font: '500 12px/1.5 "DM Sans", sans-serif' });
  const style = document.createElement("style");
  style.textContent = "@keyframes ngeblogging-auth-spin-v106{to{transform:rotate(360deg)}}";
  style.dataset.authStudioBootstrapV106 = "true";
  document.head.append(style);
  document.body.append(gate);
}

function removeGate() {
  document.getElementById(GATE_ID)?.remove();
}

function studioVisible() {
  return Boolean(document.querySelector(".sn-shell,.studio-shell,[data-studio-shell],.so75-shell,.so75-startup,.app-loading"));
}

function landingVisible() {
  return Boolean(document.querySelector("body>header,.hero,.landing-page"));
}

function callbackInProgress() {
  const params = new URLSearchParams(window.location.search);
  return Boolean(
    params.get("code")
    || params.get("auth") === "callback"
    || params.get("auth") === "recovery"
  );
}

function loginSurface() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const params = new URLSearchParams(window.location.search);
  const authMode = params.get("auth") || "";
  return path === "/login"
    || path === "/signup"
    || path === "/signin"
    || authMode === "session-expired"
    || authMode === "callback-error";
}

function redirectAuthenticatedSurface(session, reason = "session") {
  if (routeRedirecting || !session?.access_token || callbackInProgress() || !loginSurface()) return false;
  routeRedirecting = true;
  installGate();
  document.documentElement.dataset.authRouteHandoff = AUTH_HANDOFF_RELEASE;
  document.documentElement.dataset.authRouteHandoffReason = reason;
  const target = new URL("/", window.location.origin);
  target.searchParams.set("auth_success", AUTH_SUCCESS_VALUE);
  window.location.replace(`${target.pathname}${target.search}`);
  return true;
}

function scheduleGateRemoval(hasSession) {
  const started = Date.now();
  const check = () => {
    if (!hasSession || studioVisible()) {
      removeGate();
      return;
    }
    if (Date.now() - started > 12_000) {
      const gate = document.getElementById(GATE_ID);
      const heading = gate?.querySelector("b");
      const note = gate?.querySelector("small");
      if (heading) heading.textContent = "Sesi sudah aktif. Membuka Studio…";
      if (note) note.textContent = "Dashboard sedang dipulihkan tanpa mengeluarkan akun Anda.";
    }
    requestAnimationFrame(check);
  };
  requestAnimationFrame(check);
}

function notifySubscriber(callback, session) {
  try {
    callback("SIGNED_IN", session);
  } catch (error) {
    console.error("Studio auth subscriber replay failed", error);
  }
}

function replayAuthenticatedSession(session = recoveredSession) {
  if (!session?.access_token) return;
  recoveredSession = session;
  window.__ngebloggingInitialSessionV106 = session;
  window.__ngebloggingRecoveredSessionV109 = session;
  window.__ngebloggingAuthRouteHandoffV143 = AUTH_HANDOFF_RELEASE;
  document.documentElement.dataset.initialSessionV106 = "authenticated";
  document.documentElement.dataset.authStudioBootstrapV106 = RELEASE;
  if (redirectAuthenticatedSurface(session, "replay")) return;
  for (const callback of subscribers) notifySubscriber(callback, session);
  window.dispatchEvent(new CustomEvent("ngeblogging:authenticated-session-ready", {
    detail: {
      release: RELEASE,
      compatibility: LEGACY_RELEASE,
      authHandoff: AUTH_HANDOFF_RELEASE,
      userId: session.user?.id || "",
    },
  }));
  scheduleGateRemoval(true);
}

function scheduleReplay() {
  if (replayScheduled || !recoveredSession?.access_token) return;
  replayScheduled = true;
  queueMicrotask(() => {
    replayScheduled = false;
    replayAuthenticatedSession(recoveredSession);
  });
}

function patchAuthListener() {
  if (!supabaseConfigured || !supabase || supabase.auth[PATCH_FLAG]) return;
  const original = supabase.auth.onAuthStateChange.bind(supabase.auth);
  supabase.auth.onAuthStateChange = (callback) => {
    subscribers.add(callback);
    const result = original((event, session) => {
      const normalizedEvent = event === "INITIAL_SESSION" && session ? "SIGNED_IN" : event;
      if (event === "INITIAL_SESSION") {
        recoveredSession = session || recoveredSession;
        window.__ngebloggingInitialSessionV106 = session || null;
        document.documentElement.dataset.initialSessionV106 = session ? "authenticated" : "anonymous";
        if (session) scheduleReplay();
        else scheduleGateRemoval(false);
      }
      if ((normalizedEvent === "SIGNED_IN" || normalizedEvent === "TOKEN_REFRESHED") && session) {
        recoveredSession = session;
        redirectAuthenticatedSurface(session, normalizedEvent.toLowerCase());
      }
      return callback(normalizedEvent, session);
    });
    const subscription = result?.data?.subscription;
    if (subscription?.unsubscribe) {
      const unsubscribe = subscription.unsubscribe.bind(subscription);
      subscription.unsubscribe = () => {
        subscribers.delete(callback);
        return unsubscribe();
      };
    }
    if (recoveredSession?.access_token) scheduleReplay();
    return result;
  };
  Object.defineProperty(supabase.auth, PATCH_FLAG, { value: true, configurable: false });
}

function installRouteHandoffListener() {
  if (!supabaseConfigured || !supabase) return;
  supabase.auth.onAuthStateChange((event, session) => {
    if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") && session) {
      recoveredSession = session;
      redirectAuthenticatedSurface(session, event.toLowerCase());
    }
  });
  window.addEventListener("ngeblogging:auth-session-ready", (event) => {
    const session = event.detail?.session || null;
    if (!session?.access_token) return;
    recoveredSession = session;
    redirectAuthenticatedSurface(session, "oauth-callback");
  });
}

async function preflightSession() {
  if (!supabaseConfigured || !supabase) {
    document.documentElement.dataset.authStudioBootstrapV106 = "not-configured";
    removeGate();
    return;
  }
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const session = data?.session || null;
    recoveredSession = session;
    window.__ngebloggingInitialSessionV106 = session;
    document.documentElement.dataset.authStudioBootstrapV106 = session ? RELEASE : "anonymous";
    if (session) {
      if (!redirectAuthenticatedSurface(session, "preflight")) replayAuthenticatedSession(session);
    } else {
      scheduleGateRemoval(false);
    }
  } catch (error) {
    console.error("Dashboard session bootstrap failed", error);
    document.documentElement.dataset.authStudioBootstrapV106 = "network-deferred";
    // Gangguan jaringan sementara tidak boleh menghapus atau mengeluarkan akun tersimpan.
    if (recoveredSession?.access_token) replayAuthenticatedSession(recoveredSession);
    else removeGate();
  }
}

installGate();
patchAuthListener();
installRouteHandoffListener();
preflightSession();

window.addEventListener("pageshow", () => {
  if (recoveredSession?.access_token) {
    if (redirectAuthenticatedSurface(recoveredSession, "pageshow")) return;
    if (landingVisible() && !studioVisible()) replayAuthenticatedSession(recoveredSession);
  }
});
window.addEventListener("online", () => {
  if (recoveredSession?.access_token) {
    if (!redirectAuthenticatedSurface(recoveredSession, "online")) replayAuthenticatedSession(recoveredSession);
  }
});
