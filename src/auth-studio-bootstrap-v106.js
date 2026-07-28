import "./auth-callback-authority-v107.js";
import { supabase, supabaseConfigured } from "./lib/supabase.js";

const RELEASE = "auth-studio-bootstrap-v106-20260728";
const PATCH_FLAG = Symbol.for("ngeblogging.authStudioBootstrapV106");
const GATE_ID = "ngeblogging-auth-gate-v106";

function installGate() {
  if (document.getElementById(GATE_ID)) return;
  const gate = document.createElement("div");
  gate.id = GATE_ID;
  gate.setAttribute("role", "status");
  gate.setAttribute("aria-live", "polite");
  gate.innerHTML = '<span aria-hidden="true"></span><b>Memulihkan dashboard…</b>';
  Object.assign(gate.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483000",
    display: "grid",
    placeContent: "center",
    justifyItems: "center",
    gap: "14px",
    background: "#f7f9fc",
    color: "#1d2b42",
    font: '700 15px/1.3 "DM Sans", sans-serif',
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
  return Boolean(document.querySelector(".sn-shell,.studio-shell,[data-studio-shell]"));
}

function landingVisible() {
  return Boolean(document.querySelector("body>header,.hero,.landing-page"));
}

function scheduleGateRemoval(hasSession) {
  const started = Date.now();
  const check = () => {
    if (!hasSession || studioVisible() || Date.now() - started > 6500) {
      removeGate();
      return;
    }
    requestAnimationFrame(check);
  };
  requestAnimationFrame(check);
}

function patchAuthListener() {
  if (!supabaseConfigured || !supabase || supabase.auth[PATCH_FLAG]) return;
  const original = supabase.auth.onAuthStateChange.bind(supabase.auth);
  supabase.auth.onAuthStateChange = (callback) => original((event, session) => {
    const normalizedEvent = event === "INITIAL_SESSION" && session ? "SIGNED_IN" : event;
    if (event === "INITIAL_SESSION") {
      window.__ngebloggingInitialSessionV106 = session || null;
      document.documentElement.dataset.initialSessionV106 = session ? "authenticated" : "anonymous";
      scheduleGateRemoval(Boolean(session));
    }
    return callback(normalizedEvent, session);
  });
  Object.defineProperty(supabase.auth, PATCH_FLAG, { value: true, configurable: false });
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
    window.__ngebloggingInitialSessionV106 = session;
    document.documentElement.dataset.authStudioBootstrapV106 = session ? RELEASE : "anonymous";
    scheduleGateRemoval(Boolean(session));
  } catch (error) {
    console.error("Dashboard session bootstrap failed", error);
    document.documentElement.dataset.authStudioBootstrapV106 = "error";
    removeGate();
  }
}

installGate();
patchAuthListener();
preflightSession();

window.addEventListener("pageshow", () => {
  if (window.__ngebloggingInitialSessionV106 && landingVisible() && !studioVisible()) {
    try {
      const key = "ngeblogging-dashboard-recovery-v106";
      const previous = Number(sessionStorage.getItem(key) || 0);
      if (Date.now() - previous > 15000) {
        sessionStorage.setItem(key, String(Date.now()));
        window.location.reload();
      }
    } catch {
      // Storage restrictions must not block the dashboard.
    }
  }
});
