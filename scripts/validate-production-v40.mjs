import { readFile } from "node:fs/promises";

const validatorUrl = new URL("./validate-production.mjs", import.meta.url);
let source = await readFile(validatorUrl, "utf8");

const replacements = [
  [
    'for (const [label, config] of [["default", wrangler], ["production", cloudflareProduction]]) {',
    'for (const [label, config] of [["default", wrangler], ["production", cloudflareProduction], ["production upload", productionWrangler]]) {',
  ],
  [
    'if (productionWrangler.routes || productionWrangler.env) throw new Error("Konfigurasi upload produksi tidak boleh menulis ulang route atau environment yang sudah aktif.");',
    'if (productionWrangler.env) throw new Error("Konfigurasi upload produksi tidak boleh mendefinisikan environment bertingkat.");',
  ],
  [
    'if (wrangler.vars?.APP_RELEASE !== "2026.07.24-studio-v14" || cloudflareProduction.vars?.APP_RELEASE !== "2026.07.24-studio-v14" || productionWrangler.vars?.APP_RELEASE !== "2026.07.24-studio-v14") throw new Error("Release Worker belum v14.");',
    'if (wrangler.vars?.APP_RELEASE !== "2026.07.24-studio-v14" || cloudflareProduction.vars?.APP_RELEASE !== "2026.07.24-studio-v14") throw new Error("Release Worker kanonis belum v14.");\nif (productionWrangler.vars?.APP_RELEASE !== "2026.07.27-free-subdomains-full-zone-v71") throw new Error("Release upload produksi belum Full Zone gratis v71.");',
  ],
  [
    'for (const marker of ["handleNaraImage", "imageGenerationReady", "workersVisionReady", "handleBillingRequest", "handlePayPalWebhook", "seoEndpoint", "injectTenantSeo", "handleWorkersAiNara", "/api/nara/image", "/api/billing/paypal/webhook", "/api/billing/", "2026.07.24-studio-v14"]) {',
    'for (const marker of ["handleNaraImage", "imageGenerationReady", "workersVisionReady", "handleBillingRequest", "handlePayPalWebhook", "seoEndpoint", "injectTenantSeo", "handleWorkersAiNara", "handleDomainRequest", "handleDomainRedirectRequest", "/api/nara/image", "/api/domains/", "/api/domain-redirects/", "/api/billing/paypal/webhook", "/api/billing/", "2026.07.27-domain-api-v60"]) {',
  ],
  [
    'for (const marker of ["npm run deploy:cloudflare", "studio-v14-authority.css", "nara-command-center-bridge.js", "ngeblogging-app-v14-20260724", "2026.07.24-studio-v14", "health.naraProviders?.vision", "health.imageGeneration", "TENANT_SMOKE_TEST_URL", "tenant-404"]) {',
    'for (const marker of ["npx wrangler deploy --config wrangler.production.active-zone.jsonc --keep-vars", "Resolve authoritative Cloudflare zone and account", "RESOLVED_CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_DOMAIN_API_TOKEN", "studio-v14-authority.css", "nara-command-center-bridge.js", "ngeblogging-app-v14-20260724", "TENANT_SMOKE_TEST_URL", "tenant-404", "health.customDomainProvider", "cloudflare-full-zone", "domain-full-zone-v54.js", "ngeblogging.triapriyogibahari7.workers.dev", "2026.07.27-domain-api-v60"]) {',
  ],
  [
    'const studio = await readFile(new URL("../src/Studio.jsx", import.meta.url), "utf8");\nif (!studio.includes("StudioSecure.jsx")) throw new Error("Studio belum mengaktifkan pusat cadangan di Pengaturan.");',
    'const studio = await readFile(new URL("../src/Studio.jsx", import.meta.url), "utf8");\nconst studioGate = await readFile(new URL("../src/StudioOnboardingGate.jsx", import.meta.url), "utf8");\nconst domainAuthorityV75 = await readFile(new URL("../src/domain-authority-v75.js", import.meta.url), "utf8");\nconst onboardingCssV75 = await readFile(new URL("../src/site-onboarding-v75.css", import.meta.url), "utf8");\nconst domainCssV75 = await readFile(new URL("../src/domain-authority-v75.css", import.meta.url), "utf8");\nconst authSessionV76 = await readFile(new URL("../src/lib/auth-session-v76.js", import.meta.url), "utf8");\nconst authAuthorityV76 = await readFile(new URL("../src/auth-session-authority-v76.js", import.meta.url), "utf8");\nif (!studio.includes("StudioOnboardingGate.jsx") || !studioGate.includes("StudioSecure.jsx")) throw new Error("Studio wajib melewati onboarding sebelum wrapper aman dan pusat cadangan.");\nfor (const marker of ["first-site-onboarding-v76-20260727", "listUserSites", "createUserSite", "is_site_slug_available", "getVerifiedSession({ force: true })", "isSessionReauthError", "Pilih jenis situs", "Nama situs dan subdomain tidak diambil dari email", "Portal berita", "Forum", "Komunitas", "Landing page", "Diary"]) if (!studioGate.includes(marker)) throw new Error(`Onboarding v76 kehilangan ${marker}.`);\nif (/email\\?\\.split|email\\.split/.test(studioGate)) throw new Error("Onboarding tidak boleh membentuk identitas situs dari email.");\nconst normalizedDomainAuthorityV75 = domainAuthorityV75.toLowerCase();\nfor (const marker of ["domain-authority-v75-20260727", "DEADLINE_MS = 10_000", "domainAuthoritySuperseded", "Subdomain gratis · tetap ada", "Tidak memakai Cloudflare for SaaS", "Panel domain berhenti menunggu.", "/api/domains/register", "/api/domains/refresh", "/api/domains/address"]) if (!normalizedDomainAuthorityV75.includes(marker.toLowerCase())) throw new Error(`Domain Authority v75 kehilangan ${marker}.`);\nif (/Memuat domain situs…|class=\\"dfz-loading\\"/.test(domainAuthorityV75)) throw new Error("Domain Authority v75 tidak boleh mengembalikan spinner lama.");\nfor (const marker of ["auth-session-authority-v76-20260727", "supabase.auth.getUser(session.access_token)", "supabase.auth.refreshSession(data.session)", "signOut({ scope: \\"local\\" })", "SESSION_REAUTH_REQUIRED", "session_not_found", "clearPersistedAuthStorage"]) if (!authSessionV76.includes(marker)) throw new Error(`Pemulihan sesi v76 kehilangan ${marker}.`);\nfor (const marker of ["ngeblogging:session-invalid", "session-expired", "window.location.replace", "clearInvalidLocalSession"]) if (!authAuthorityV76.includes(marker)) throw new Error(`Otoritas sesi browser v76 kehilangan ${marker}.`);\nfor (const legacy of ["domain-free-subdomain-recovery-v73.js", "domain-full-zone-v54.js", "studio-domain-v41.js", "domain-layout-authority-v56.js", "domain-experience-authority-v59.js", "domain-feedback-authority-v60.js", "domain-mobile-precision-v61.js", "domain-operation-authority-v65.js"]) { if (!index.includes(`type=\\"application/x-disabled\\" src=\\"/src/${legacy}\\"`) || index.includes(`type=\\"module\\" src=\\"/src/${legacy}\\"`)) throw new Error(`Runtime domain lama masih aktif: ${legacy}`); }\nif (!index.includes("single-domain-authority-v76") || !index.includes("auth-session-authority-v76.js")) throw new Error("Shell produksi belum memakai kepemilikan domain dan sesi v76.");\nif (!onboardingCssV75.includes(".so75-shell") || !onboardingCssV75.includes("@media(max-width:700px)")) throw new Error("CSS onboarding v75 belum responsif.");\nif (!domainCssV75.includes(".d75-root") || !domainCssV75.includes("@media(max-width:700px)")) throw new Error("CSS Domain Authority v75 belum responsif.");',
  ],
  [
    'if (!serviceWorker.includes("ngeblogging-app-v14-20260724")) throw new Error("Service worker belum menginvalidasi cache ke v14.");',
    'if (!serviceWorker.includes("ngeblogging-app-v76-20260727") || !serviceWorker.includes("ngeblogging-app-v75-20260727") || !serviceWorker.includes("ngeblogging-app-v74-20260727") || !serviceWorker.includes("ngeblogging-app-v14-20260724")) throw new Error("Service worker belum menginvalidasi cache domain dan sesi ke v76.");',
  ],
];

for (const [before, after] of replacements) {
  if (!source.includes(before)) throw new Error(`Kontrak validator berubah; patch v40 tidak menemukan: ${before.slice(0, 90)}`);
  source = source.replace(before, after);
}

const importMarker = 'import { existsSync } from "node:fs";';
if (!source.includes(importMarker)) throw new Error("Validator produksi kehilangan import marker.");
source = source.replace(importMarker, `${importMarker}\nconst VALIDATOR_URL = ${JSON.stringify(validatorUrl.href)};`);
source = source.replaceAll("import.meta.url", "VALIDATOR_URL");

await import(`data:text/javascript;base64,${Buffer.from(source, "utf8").toString("base64")}`);
