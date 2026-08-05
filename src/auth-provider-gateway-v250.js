import { supabase, supabaseConfigured } from "./lib/supabase.js";

export const AUTH_PROVIDER_GATEWAY_RELEASE = "auth-provider-navigation-v291-20260805";
export const AUTH_PROVIDER_GATEWAY_LEGACY_RELEASE = "auth-provider-gateway-v250-20260804";
const PATCH_FLAG = Symbol.for("ngeblogging.auth.providerGatewayV250");

function gatewayAuthorizeUrl(value) {
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
    document.documentElement.dataset.authProviderTransportV291 = "direct-provider-authorize-root-callback";
    return routedUrl === originalUrl
      ? result
      : { ...result, data: { ...result.data, url: routedUrl } };
  };
  Object.defineProperty(supabase.auth, PATCH_FLAG, { value: true, configurable: false });
  document.documentElement.dataset.authProviderGatewayV250 = AUTH_PROVIDER_GATEWAY_LEGACY_RELEASE;
  document.documentElement.dataset.authProviderNavigationV260 = AUTH_PROVIDER_GATEWAY_RELEASE;
  document.documentElement.dataset.authProviderNavigationV291 = AUTH_PROVIDER_GATEWAY_RELEASE;
}

if (typeof document !== "undefined") installProviderGateway();

export { gatewayAuthorizeUrl, installProviderGateway };
