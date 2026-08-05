import { supabase, supabaseConfigured } from "./lib/supabase.js";

export const AUTH_STUDIO_HANDOFF_RELEASE_V290 = "auth-studio-handoff-v290-20260805";
const PATCH = Symbol.for("ngeblogging.auth.studioHandoffV290");

function appUrl(path) {
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).toString();
}

function studioCallbackUrl() {
  return appUrl("/studio?auth=callback");
}

function recoveryUrl() {
  return appUrl("/reset-password?auth=recovery");
}

function moveCallbackPathToStudio() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const callback = url.searchParams.has("code") || url.searchParams.get("auth") === "callback";
  if (!callback || url.pathname === "/studio") return;
  url.pathname = "/studio";
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

function patchMethod(name, transform) {
  if (!supabase?.auth || typeof supabase.auth[name] !== "function") return;
  const original = supabase.auth[name].bind(supabase.auth);
  supabase.auth[name] = (...args) => original(...transform(args));
}

function installAuthStudioHandoffV290() {
  if (!supabaseConfigured || !supabase?.auth || supabase.auth[PATCH]) {
    moveCallbackPathToStudio();
    return;
  }

  patchMethod("signInWithOAuth", ([credentials = {}]) => [{
    ...credentials,
    options: {
      ...(credentials.options || {}),
      redirectTo: studioCallbackUrl(),
    },
  }]);

  patchMethod("signInWithOtp", ([credentials = {}]) => [{
    ...credentials,
    options: {
      ...(credentials.options || {}),
      emailRedirectTo: studioCallbackUrl(),
    },
  }]);

  patchMethod("signUp", ([credentials = {}]) => [{
    ...credentials,
    options: {
      ...(credentials.options || {}),
      emailRedirectTo: studioCallbackUrl(),
    },
  }]);

  patchMethod("resend", ([credentials = {}]) => [{
    ...credentials,
    options: {
      ...(credentials.options || {}),
      emailRedirectTo: studioCallbackUrl(),
    },
  }]);

  patchMethod("resetPasswordForEmail", ([email, options = {}]) => [email, {
    ...options,
    redirectTo: recoveryUrl(),
  }]);

  Object.defineProperty(supabase.auth, PATCH, { value: true, configurable: false });
  if (typeof document !== "undefined") {
    document.documentElement.dataset.authStudioHandoffV290 = AUTH_STUDIO_HANDOFF_RELEASE_V290;
  }
  moveCallbackPathToStudio();
}

if (typeof window !== "undefined") {
  installAuthStudioHandoffV290();
  window.addEventListener("pageshow", moveCallbackPathToStudio, { passive: true });
}

export { installAuthStudioHandoffV290, moveCallbackPathToStudio, studioCallbackUrl };
