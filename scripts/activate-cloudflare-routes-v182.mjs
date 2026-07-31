/*
 * Postbuild compatibility guard for route authority v182.
 *
 * Netlify Deploy Preview, Cloudflare preview builds, and local builds must never
 * mutate production DNS/Worker routes. The real cutover remains an explicit
 * workflow step through scripts/finalize-cloudflare-route-cutover-v182.mjs.
 */

const enabled = String(process.env.NGEBLOGGING_ALLOW_POSTBUILD_ROUTE_CUTOVER || "") === "true";

if (!enabled) {
  console.log("Ngeblogging v182: postbuild route mutation skipped; production cutover is an explicit workflow step.");
  process.exit(0);
}

const required = [
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ZONE_ID",
];
const missing = required.filter((name) => !String(process.env[name] || "").trim());
if (missing.length) {
  throw new Error(`Route cutover postbuild ditolak karena kredensial tidak lengkap: ${missing.join(", ")}`);
}

await import("./finalize-cloudflare-route-cutover-v182.mjs");
