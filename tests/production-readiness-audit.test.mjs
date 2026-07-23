import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const worker = readFileSync(new URL("../cloudflare/worker.mjs", import.meta.url), "utf8");
const domainHandler = readFileSync(new URL("../server/domain-handler.mjs", import.meta.url), "utf8");
const domainBridge = readFileSync(new URL("../src/domain-management-bridge.js", import.meta.url), "utf8");
const quotaBridge = readFileSync(new URL("../src/site-quota-bridge.js", import.meta.url), "utf8");
const quotaMigration = readFileSync(new URL("../supabase/migrations/202607231845_site_account_limits.sql", import.meta.url), "utf8");
const quotaHardeningMigration = readFileSync(new URL("../supabase/migrations/20260723133500_harden_quota_rpc_and_domain_indexes.sql", import.meta.url), "utf8");
const billing = readFileSync(new URL("../src/BillingView.jsx", import.meta.url), "utf8");
const billingBridge = readFileSync(new URL("../src/billing-availability-bridge.js", import.meta.url), "utf8");
const auth = readFileSync(new URL("../src/AuthModal.jsx", import.meta.url), "utf8");
const authReadiness = readFileSync(new URL("../src/auth-readiness-bridge.js", import.meta.url), "utf8");
const supabase = readFileSync(new URL("../src/lib/supabase.js", import.meta.url), "utf8");
const serviceWorker = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
const appShell = readFileSync(new URL("../src/app-shell-bridge.js", import.meta.url), "utf8");
const wrangler = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");


test("account site limits are enforced in Postgres and shown in Studio", () => {
  assert.match(quotaMigration, /when lower\(coalesce\(plan_name, 'free'\)\) = 'free' then 5 else 12/);
  assert.match(quotaMigration, /pg_advisory_xact_lock/);
  assert.match(quotaMigration, /before insert on public\.sites/);
  assert.match(quotaMigration, /SITE_LIMIT_REACHED/);
  assert.match(quotaMigration, /get_site_creation_quota/);
  assert.match(quotaBridge, /get_site_creation_quota/);
  assert.match(quotaBridge, /\$\{free\} situs pada paket gratis/);
  assert.match(quotaBridge, /maksimum \$\{maximum\} situs per akun/);
  assert.match(quotaBridge, /createButton\.disabled = remaining <= 0/);
  assert.match(index, /site-quota-bridge\.js/);
});


test("quota reads keep RLS active and duplicate primary-domain indexes are removed", () => {
  assert.match(quotaHardeningMigration, /security invoker/);
  assert.match(quotaHardeningMigration, /revoke all on function public\.get_site_creation_quota\(\) from anon/);
  assert.match(quotaHardeningMigration, /grant execute on function public\.get_site_creation_quota\(\) to authenticated/);
  assert.match(quotaHardeningMigration, /when lower\(coalesce\(state\.plan, 'free'\)\) = 'free' then 5 else 12/);
  assert.match(quotaHardeningMigration, /drop index if exists public\.site_domains_one_primary_idx/);
  assert.doesNotMatch(quotaHardeningMigration, /security definer/);
});


test("custom domains use authenticated server-side Cloudflare for SaaS operations", () => {
  assert.match(worker, /handleDomainRequest/);
  assert.match(worker, /url\.pathname\.startsWith\("\/api\/domains\/"\)/);
  assert.match(domainHandler, /CLOUDFLARE_API_TOKEN/);
  assert.match(domainHandler, /CLOUDFLARE_ZONE_ID/);
  assert.match(domainHandler, /CLOUDFLARE_CUSTOM_HOSTNAME_TARGET/);
  assert.match(domainHandler, /verifySiteManager/);
  assert.match(domainHandler, /new Set\(\["owner", "admin"\]\)/);
  assert.match(domainHandler, /\/custom_hostnames/);
  assert.match(domainHandler, /providerStatus === "active" && sslStatus === "active"/);
  assert.match(domainHandler, /ssl: \{ method: "txt", type: "dv"/);
  assert.match(domainBridge, /Belum dibuka untuk produksi/);
  assert.match(domainBridge, /data-action="refresh"/);
  assert.match(domainBridge, /data-action="remove"/);
  assert.match(domainBridge, /Target CNAME Ngeblogging/);
  assert.match(worker, /managedSubdomains: true/);
  assert.match(worker, /siteLimits: \{ free: 5, maximum: 12 \}/);
});


test("inactive payment methods and the payment menu are hidden", () => {
  assert.match(billing, /paypalReady=Boolean\(config\?\.paypal&&config\?\.paypalWebhook&&String\(config\?\.paypalEnvironment\)\.toLowerCase\(\)==="live"\)/);
  assert.match(billing, /const checkoutReady=paypalReady\|\|localReady/);
  assert.match(billing, /\{checkoutReady&&\(config\?\.plans\|\|\[\]\)\.map/);
  assert.match(billing, /Tidak ada tombol checkout palsu/);
  assert.match(billingBridge, /dataset\.billingReady = "pending"/);
  assert.match(billingBridge, /cache: "no-store"/);
  assert.match(billingBridge, /config\.plans\.some/);
  assert.match(billingBridge, /if \(billingOpen\) homeButton\(\)\?\.click\(\)/);
  assert.match(billingBridge, /function conceal\(button\)/);
  assert.match(billingBridge, /button\.hidden = true/);
  assert.match(billingBridge, /button\.disabled = true/);
  assert.doesNotMatch(billingBridge, /button\.remove\(\)/);
  assert.match(index, /billing-availability-bridge\.js/);
});


test("email code remains available but public signup is hidden until branded SMTP is verified", () => {
  assert.match(supabase, /resendSignUpConfirmation/);
  assert.match(supabase, /client\.auth\.resend/);
  assert.match(supabase, /shouldCreateUser: false/);
  assert.match(auth, /verificationPending/);
  assert.match(worker, /function brandedEmailReady\(env\)/);
  assert.match(worker, /sender\.endsWith\("@ngeblogging\.com"\)/);
  assert.match(worker, /emailRegistration: brandedEmailReady\(env\)/);
  assert.match(wrangler, /"AUTH_BRANDED_EMAIL_READY": "false"/);
  assert.match(authReadiness, /Pendaftaran, magic link, verifikasi, dan pemulihan email disembunyikan/);
  assert.match(authReadiness, /leaveSignupMode\(modal\)/);
  assert.match(authReadiness, /\.magic-link-button,\.forgot-link/);
  assert.match(index, /auth-readiness-bridge\.js/);
});


test("the installable app shell never keeps production CSS or bridge scripts stale", () => {
  assert.match(serviceWorker, /request\.method !== "GET"/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(serviceWorker, /ngeblogging-app-v\d+-\d{8}/);
  assert.match(serviceWorker, /async function networkFirst\(/);
  assert.match(serviceWorker, /fetch\(request, \{ cache: "no-store" \}\)/);
  assert.match(serviceWorker, /async function cacheFirstImmutable\(/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/src\/"\)/);
  assert.match(appShell, /beforeinstallprompt/);
  assert.match(appShell, /mobileUserAgent\(\)/);
  assert.match(appShell, /physicalShortSide\(\)/);
  assert.match(appShell, /controllerchange/);
  assert.match(appShell, /dataset\.deviceMode/);
  assert.match(index, /app-shell-bridge\.js/);
});
