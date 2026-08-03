import { supabase, supabaseConfigured } from "./lib/supabase.js";

export const AUTH_PROVIDER_GATEWAY_RELEASE_V248 = "auth-provider-gateway-v248-20260803";
const PATCH_FLAG = Symbol.for("ngeblogging.auth.providerGatewayV248");
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
    const target = new URL(`${AUTH_GATEWAY_PREFIX}${source.pathname}${source.search}`, window.location.origin);
    return target.toString();
  } catch {
    return value;
  }
}

function installProviderGateway() {
  if (!supabaseConfigured || !supabase || supabase.auth[PATCH_FLAG]) return;
  const original = supabase.auth.signInWithOAuth.bind(supabase.auth);
  supabase.auth.signInWithOAuth = async (credentials) => {
    const result = await original(credentials);
    const url = result?.data?.url;
    if (!url) return result;
    const routed = gatewayAuthorizeUrl(url);
    if (routed === url) {
      document.documentElement.dataset.authProviderTransportV248 = "direct-provider-authorize";
      return result;
    }
    document.documentElement.dataset.authProviderTransportV248 = "same-origin-auth-gateway";
    return { ...result, data: { ...result.data, url: routed } };
  };
  Object.defineProperty(supabase.auth, PATCH_FLAG, { value: true, configurable: false });
  document.documentElement.dataset.authProviderGatewayV248 = AUTH_PROVIDER_GATEWAY_RELEASE_V248;
}

if (typeof document !== "undefined") installProviderGateway();

export { gatewayAuthorizeUrl, installProviderGateway };
