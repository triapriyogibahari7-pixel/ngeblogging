import { supabase, supabaseConfigured } from "./lib/supabase.js";

export const AUTH_PROVIDER_GATEWAY_RELEASE = "auth-provider-navigation-v260-20260804";
export const AUTH_PROVIDER_GATEWAY_LEGACY_RELEASE = "auth-provider-gateway-v250-20260804";
const PATCH_FLAG = Symbol.for("ngeblogging.auth.providerGatewayV250");

function gatewayAuthorizeUrl(value) {
  // OAuth authorize is a top-level browser navigation, not an API fetch. Keeping
  // Google/GitHub/LinkedIn on the Supabase authorize URL avoids an unnecessary
  // same-origin proxy redirect hop while password/magic-link traffic can still
  // use the resilient /api/auth-proxy transport in lib/supabase.js.
  try {
    return new URL(String(value)).toString();
  } catch {
    return value;
  }
}

function installProviderGateway() {
  if (!supabaseConfigured || !supabase || supabase.auth[PATCH_FLAG]) return;
  const original = supabase.auth.signInWithOAuth.bind(supabase.auth);
  supabase.auth.signInWithOAuth = async (credentials) => {
    const result = await original(credentials);
    const originalUrl = result?.data?.url;
    if (!originalUrl) return result;
    const routedUrl = gatewayAuthorizeUrl(originalUrl);
    document.documentElement.dataset.authProviderTransportV250 = "direct-provider-authorize";
    document.documentElement.dataset.authProviderTransportV260 = "direct-provider-authorize";
    return routedUrl === originalUrl
      ? result
      : { ...result, data: { ...result.data, url: routedUrl } };
  };
  Object.defineProperty(supabase.auth, PATCH_FLAG, { value: true, configurable: false });
  document.documentElement.dataset.authProviderGatewayV250 = AUTH_PROVIDER_GATEWAY_LEGACY_RELEASE;
  document.documentElement.dataset.authProviderNavigationV260 = AUTH_PROVIDER_GATEWAY_RELEASE;
}

if (typeof document !== "undefined") installProviderGateway();

export { gatewayAuthorizeUrl, installProviderGateway };