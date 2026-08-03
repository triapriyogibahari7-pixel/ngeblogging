import "./auth-provider-gateway-v248.js";
import {
  AUTH_SESSION_RELEASE,
  SESSION_REAUTH_REQUIRED,
  clearInvalidLocalSession,
  getVerifiedSession,
  isSessionReauthError,
} from "./lib/auth-session-v76.js";

const LEGACY_SESSION_COMPATIBILITY = "auth-session-authority-v76-20260727";
const REDIRECT_GUARD = "ngeblogging-session-reauth-v76";
const LIVE_BROWSER_CONTRACT = Object.freeze({
  onboarding: "first-site-onboarding-v76-20260727",
  domain: "domain-authority-v75-20260727",
  session: AUTH_SESSION_RELEASE,
  sessionCompatibility: LEGACY_SESSION_COMPATIBILITY,
});
const nativeFetch = window.fetch.bind(window);
let redirecting = false;

document.documentElement.dataset.ngebloggingBrowserContractV76 = [
  LIVE_BROWSER_CONTRACT.session,
  LIVE_BROWSER_CONTRACT.sessionCompatibility,
  LIVE_BROWSER_CONTRACT.onboarding,
  LIVE_BROWSER_CONTRACT.domain,
].join("|");
document.documentElement.dataset.authSessionCompatibilityV76 = LEGACY_SESSION_COMPATIBILITY;
window.__ngebloggingBrowserContractV76 = LIVE_BROWSER_CONTRACT;
window.__ngebloggingAuthSessionCompatibilityV76 = LEGACY_SESSION_COMPATIBILITY;

function callbackInProgress() {
  const params = new URLSearchParams(window.location.search);
  return Boolean(
    params.get("code")
    || params.get("auth") === "callback"
    || params.get("auth") === "recovery"
  );
}

async function redirectToSignIn(message) {
  if (redirecting) return;
  redirecting = true;
  await clearInvalidLocalSession();
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("error");
  url.searchParams.delete("error_code");
  url.searchParams.set("auth", "session-expired");
  url.searchParams.set("error_description", message || "Sesi sudah berakhir. Silakan masuk kembali.");
  try { sessionStorage.setItem(REDIRECT_GUARD, String(Date.now())); } catch { /* noop */ }
  window.location.replace(`${url.pathname}${url.search}${url.hash}`);
}

function announceInvalidSession(error) {
  window.dispatchEvent(new CustomEvent("ngeblogging:session-invalid", {
    detail: {
      code: SESSION_REAUTH_REQUIRED,
      message: error?.message || error?.error || "Sesi sudah berakhir. Silakan masuk kembali.",
      release: AUTH_SESSION_RELEASE,
    },
  }));
}

function requestUrl(input) {
  try {
    return new URL(input instanceof Request ? input.url : String(input), window.location.href);
  } catch {
    return null;
  }
}

window.fetch = async function sessionAwareFetch(input, init) {
  const response = await nativeFetch(input, init);
  if (![401, 403].includes(response.status)) return response;
  const url = requestUrl(input);
  if (!url || !url.pathname.startsWith("/api/domains/") && !url.pathname.startsWith("/api/domain-redirects/")) return response;
  const payload = await response.clone().json().catch(() => ({}));
  const error = Object.assign(new Error(payload.error || "Sesi sudah berakhir. Silakan masuk kembali."), {
    code: payload.code || "INVALID_SESSION",
    status: response.status,
  });
  if (isSessionReauthError(error)) announceInvalidSession(error);
  return response;
};

async function verifyBrowserSession() {
  if (callbackInProgress()) return;
  try {
    await getVerifiedSession({ force: true });
    document.documentElement.dataset.authSessionAuthorityV76 = AUTH_SESSION_RELEASE;
  } catch (error) {
    if (isSessionReauthError(error)) {
      announceInvalidSession(error);
      await redirectToSignIn(error.message);
    }
  }
}

window.__ngebloggingGetVerifiedSession = getVerifiedSession;
window.addEventListener("ngeblogging:session-invalid", (event) => {
  redirectToSignIn(event.detail?.message || "Sesi sudah berakhir. Silakan masuk kembali.");
});
window.addEventListener("pageshow", verifyBrowserSession);
window.addEventListener("online", verifyBrowserSession);
verifyBrowserSession();
