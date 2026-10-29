export const BILLING_PRODUCTS = Object.freeze({
  pro_monthly: Object.freeze({ id: "pro_monthly", label: "Nara Pro Bulanan", currency: "IDR", amount: 300000, entitlement: "nara_pro", periodMonths: 1 }),
  pro_yearly: Object.freeze({ id: "pro_yearly", label: "Nara Pro Tahunan", currency: "IDR", amount: 3000000, entitlement: "nara_pro", periodMonths: 12 }),
  max_monthly: Object.freeze({ id: "max_monthly", label: "Nara Max Bulanan", currency: "IDR", amount: 499000, entitlement: "nara_max", periodMonths: 1 }),
  max_yearly: Object.freeze({ id: "max_yearly", label: "Nara Max Tahunan", currency: "IDR", amount: 5000000, entitlement: "nara_max", periodMonths: 12 }),
  verification_monthly: Object.freeze({ id: "verification_monthly", label: "Verifikasi Akun Ngeblogging Bulanan", currency: "IDR", amount: 100000, entitlement: "verification_subscription", periodMonths: 1 }),
});
export const FREE_SITE_LIMIT = 12;
export function getBillingProduct(id) {
  if (!Object.hasOwn(BILLING_PRODUCTS, id)) throw new Error("UNKNOWN_BILLING_PRODUCT");
  return BILLING_PRODUCTS[id];
}
export function qualifiesForAdditionalSites({plan, expiresAt}, now = Date.now()) {
  if (!["pro", "max", "business"].includes(plan)) return false;
  if (!expiresAt) return false;
  const expiry = Date.parse(expiresAt);
  return Number.isFinite(expiry) && expiry > now;
}
export function requiresProForNextSite(ownedCount) {
  if (!Number.isSafeInteger(ownedCount) || ownedCount < 0) throw new Error("INVALID_SITE_COUNT");
  return ownedCount >= FREE_SITE_LIMIT;
}
