import { getBillingProduct } from "./billing-catalog.mjs";
import { handleMidtrans as baseHandler, paths } from "./midtrans-api.mjs";
export { paths };

export function catalogEnvironment(env) {
  const prices = Object.fromEntries(["pro_monthly", "pro_yearly", "max_monthly", "max_yearly"].map(id => {
    const product = getBillingProduct(id);
    if (product.currency !== "IDR" || !Number.isSafeInteger(product.amount) || product.amount <= 0) throw new Error("INVALID_CATALOG_PRICE");
    return [id, product.amount];
  }));
  return { ...env, MIDTRANS_PLAN_PRICES_JSON: JSON.stringify(prices) };
}
export function handleMidtrans(request, env, options) {
  return baseHandler(request, catalogEnvironment(env), options);
}
