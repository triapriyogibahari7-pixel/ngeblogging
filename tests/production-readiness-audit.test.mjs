import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const worker = read("cloudflare/worker.mjs");
const domainHandler = read("server/domain-handler.mjs");
const domainBridge = read("src/domain-management-bridge.js");
const quotaBridge = read("src/site-quota-bridge.js");
const quotaMigration = read("supabase/migrations/202607231845_site_account_limits.sql");
const quotaHardeningMigration = read("supabase/migrations/20260723133500_harden_quota_rpc_and_domain_indexes.sql");
const billing = read("src/BillingView.jsx");
const billingBridge = read("src/billing-availability-bridge.js");
const auth = read("src/AuthModal.jsx");
const authReadiness = read("src/auth-readiness-bridge.js");
const supabase = read("src/lib/supabase.js");
const serviceWorker = read("public/sw.js");
const pwa = read("src/pwa-runtime.js");
const wrangler = read("wrangler.jsonc");

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
  assert.match(quotaHardeningMigration, /drop index if exists public\.site_domains_one_primary_idx/);
  assert.doesNotMatch(quotaHardeningMigration, /security definer/);
});

test("custom domains use authenticated server-side Cloudflare operations and stay hidden until provisioned", () => {
  assert.match(worker, /handleDomainRequest/);
  assert.match(worker, /url\.pathname\.startsWith\("\/api\/domains\/"\)/);
  for (const marker of ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ZONE_ID", "CLOUDFLARE_CUSTOM_HOSTNAME_TARGET", "verifySiteManager", "/custom_hostnames"]) {
    assert.ok(domainHandler.includes(marker), marker);
  }
  assert.match(domainHandler, /new Set\(\["owner", "admin"\]\)/);
  assert.match(domainHandler, /providerStatus === "active" && sslStatus === "active"/);
  assert.match(domainBridge, /if \(loading \|\| error \|\| !config\?\.enabled\)/);
  assert.match(domainBridge, /container\.hidden = true/);
  assert.match(domainBridge, /container\.hidden = false/);
  assert.match(worker, /managedSubdomains: true/);
  assert.match(worker, /siteLimits: \{ free: 5, maximum: 12 \}/);
});

test("inactive payment methods and the payment menu are hidden", () => {
  assert.match(billing, /paypalReady=Boolean\(config\?\.paypal&&config\?\.paypalWebhook&&String\(config\?\.paypalEnvironment\)\.toLowerCase\(\)==="live"\)/);
  assert.match(billing, /const checkoutReady=paypalReady\|\|localReady/);
  assert.match(billing, /Tidak ada tombol checkout palsu/);
  assert.match(billingBridge, /dataset\.billingReady = "pending"/);
  assert.match(billingBridge, /cache: "no-store"/);
  assert.match(billingBridge, /function conceal\(button\)/);
  assert.match(billingBridge, /button\.hidden = true/);
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
  assert.match(authReadiness, /leaveSignupMode\(modal\)/);
  assert.match(authReadiness, /\.magic-link-button,\.forgot-link/);
  assert.match(authReadiness, /row\.hidden = true/);
  assert.match(index, /auth-readiness-bridge\.js/);
});

test("installable v16 shell never keeps production CSS or scripts stale", () => {
  assert.match(serviceWorker, /request\.method !== "GET"/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(serviceWorker, /ngeblogging-app-v16-20260724/);
  assert.match(serviceWorker, /async function networkFirst\(/);
  assert.match(serviceWorker, /fetch\(request, \{ cache: "no-store" \}\)/);
  assert.match(serviceWorker, /async function cacheFirstImmutable\(/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/src\/"\)/);
  assert.match(pwa, /beforeinstallprompt/);
  assert.match(pwa, /navigator\.serviceWorker\.register\("\/sw\.js"/);
  assert.match(pwa, /dataset\.deviceMode/);
  assert.doesNotMatch(pwa, /window\.location\.reload/);
  assert.match(index, /pwa-runtime\.js/);
  assert.match(index, /studio-v16-authority\.css/);
});
