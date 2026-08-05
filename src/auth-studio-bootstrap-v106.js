import { supabase, supabaseConfigured } from "./lib/supabase.js";

export const RELEASE = "auth-studio-bootstrap-retired-v297-20260805";
export const AUTH_STARTUP_OWNER_V297 = "react-main-plus-startup-v292";

function publishCompatibilityState() {
  document.documentElement.dataset.authStudioBootstrapV106 = RELEASE;
  document.documentElement.dataset.authStartupOwnerV297 = AUTH_STARTUP_OWNER_V297;
  document.documentElement.dataset.authLegacyGateV297 = "retired";
  document.getElementById("ngeblogging-auth-gate-v106")?.remove();
}

async function exposePersistedSessionWithoutRedirect() {
  publishCompatibilityState();
  if (!supabaseConfigured || !supabase) return;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data?.session?.access_token) return;
    window.__ngebloggingInitialSessionV106 = data.session;
    window.__ngebloggingRecoveredSessionV109 = data.session;
    window.dispatchEvent(new CustomEvent("ngeblogging:authenticated-session-ready", {
      detail: {
        release: RELEASE,
        authHandoff: AUTH_STARTUP_OWNER_V297,
        userId: data.session.user?.id || "",
      },
    }));
  } catch (error) {
    console.warn("Auth compatibility bootstrap deferred; persisted session is not cleared.", error);
  }
}

if (typeof document !== "undefined") {
  publishCompatibilityState();
  exposePersistedSessionWithoutRedirect();
  window.addEventListener("pageshow", publishCompatibilityState, { passive:true });
}
