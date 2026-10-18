export function checkoutTarget(value, environment) {
  const url = new URL(value);
  const origin = environment === "production" ? "https://app.midtrans.com" : environment === "sandbox" ? "https://app.sandbox.midtrans.com" : "";
  if (!origin || url.origin !== origin || url.username || url.password) throw Error("Alamat checkout ditolak.");
  return url.href;
}
export function attemptKey(userId, planId, environment) {
  return `ngeblogging:midtrans:${environment}:${userId}:${planId}`;
}
export function finished(status) {
  return ["completed", "failed", "sandbox_paid", "sandbox_failed"].includes(status);
}
