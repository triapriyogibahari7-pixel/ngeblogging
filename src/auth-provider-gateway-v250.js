import { supabase, supabaseConfigured } from "./lib/supabase.js";

export const AUTH_PROVIDER_GATEWAY_RELEASE = "auth-provider-gateway-v250-20260804";
const PATCH_FLAG = Symbol.for("ngeblogging.auth.providerGatewayV250");
const AUTH_GATEWAY_PREFIX = "/api/auth-proxy";

function gatewayHost() {
  if (typeof window === "undefined") return false;
  const hostname = String(window.location.hostname || "").toLowerCase();
  return hostname === "ngeblogging.com"
    || hostname === "www.ngeblogging.com"
    || hostname.endsWith(".ngeblogging.com")
    || hostname.endsWith(".workers.dev");
}

function gatewayAuthorizeUrl(value) {
  if (!gatewayHost() || typeof window === "undefined") return value;
  try {
    const source = new URL(String(value));
    if (!source.pathname.startsWith("/auth/v1/authorize")) return value;
    return new URL(`${AUTH_GATEWAY_PREFIX}${source.pathname}${source.search}`, window.location.origin).toString();
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
    document.documentElement.dataset.authProviderTransportV250 = routedUrl === originalUrl
      ? "direct-provider-authorize"
      : "same-origin-auth-gateway";
    return routedUrl === originalUrl
      ? result
      : { ...result, data: { ...result.data, url: routedUrl } };
  };
  Object.defineProperty(supabase.auth, PATCH_FLAG, { value: true, configurable: false });
  document.documentElement.dataset.authProviderGatewayV250 = AUTH_PROVIDER_GATEWAY_RELEASE;
}

if (typeof document !== "undefined") installProviderGateway();

export { gatewayAuthorizeUrl, installProviderGateway };
