import { getBillingProduct } from "./billing-catalog.mjs";
import { handleMidtrans as baseHandler, paths } from "./midtrans-api.mjs";
export { paths };

export function configurationDiagnostics(env = {}) {
  const required = ["MIDTRANS_SERVER_KEY", "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
  return {
    version: "midtrans-config-diagnostics-v1",
    missing: required.filter(name => !env[name]),
    environmentValid: ["sandbox", "production"].includes(env.MIDTRANS_ENV),
    scope: "presence-only; credentials and connectivity not verified"
  };
}

// Only products supported by the installed order/activation schema may be sold.
export function catalogEnvironment(env) {
  const prices = Object.fromEntries(["pro_monthly", "pro_yearly"].map(id => {
    const product = getBillingProduct(id);
    if (product.currency !== "IDR" || !Number.isSafeInteger(product.amount) || product.amount <= 0) throw new Error("INVALID_CATALOG_PRICE");
    return [id, product.amount];
  }));
  return { ...env, MIDTRANS_PLAN_PRICES_JSON: JSON.stringify(prices) };
}
export async function handleMidtrans(request, env, options) {
  const effectiveEnv = catalogEnvironment(env);
  const response = await baseHandler(request, effectiveEnv, options);
  if (request.method !== "GET" || new URL(request.url).pathname !== "/api/billing/midtrans/config" || response.status !== 200) return response;
  const body = await response.json();
  return new Response(JSON.stringify({ ...body, diagnostics: configurationDiagnostics(effectiveEnv) }), {
    status: response.status,
    headers: response.headers
  });
}
