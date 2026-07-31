/*
 * Safe postbuild guard for route authority v184.
 * Preview and local builds never mutate production routes. The real cutover is
 * an explicit Cloudflare production workflow step.
 */
const enabled = String(process.env.NGEBLOGGING_ALLOW_POSTBUILD_ROUTE_CUTOVER || "") === "true";

if (!enabled) {
  console.log("Ngeblogging v184: postbuild route mutation skipped; production cutover is an explicit workflow step.");
  process.exit(0);
}

const required = ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ZONE_ID"];
const missing = required.filter((name) => !String(process.env[name] || "").trim());
if (missing.length) {
  throw new Error(`Route cutover postbuild ditolak karena kredensial tidak lengkap: ${missing.join(", ")}`);
}

await import("./finalize-cloudflare-route-cutover-v182.mjs");
