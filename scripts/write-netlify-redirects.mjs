import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const PRODUCTION_ENTRY_RELEASE = "2026.07.30-production-authority-v160";
const AUTH_ENTRY_RELEASE = "2026.07.30-auth-entry-v158";
const STUDIO_ROUTE_RELEASE = "2026.07.30-studio-route-v160";
const UI_CONTRACT_RELEASE = "2026.07.30-studio-ui-contract-v160";
const CONTENT_WORKFLOW_RELEASE = "2026.07.30-studio-content-workflow-v161";
const AUTH_EDITOR_RELEASE = "2026.07.30-auth-editor-v162";
const AUTH_CALLBACK_RELEASE = "auth-callback-singleflight-v162-20260730";
const AUTH_CALLBACK_COMPAT_RELEASE = "auth-callback-v162-20260730";
const AUTH_CAPACITY_RELEASE = "auth-capacity-model-v162-20260730";
const PRODUCTION_ROUTE_COMPAT_RELEASE = "2026.07.30-production-route-authority-v163";
const PRODUCTION_ROUTE_RELEASE = "2026.07.30-production-custom-domain-authority-v164";
const PRODUCTION_DOMAIN_ATTACH_RELEASE = "2026.07.30-production-domain-attach-v165";

if (String(process.env.NETLIFY || "").toLowerCase() === "true") {
  const dist = resolve("dist");
  const apiOrigin = String(
    process.env.NGEBLOGGING_API_ORIGIN
    || process.env.VITE_NGEBLOGGING_API_ORIGIN
    || "https://ngeblogging.triapriyogibahari7.workers.dev",
  ).trim().replace(/\/$/, "");

  if (!/^https:\/\//i.test(apiOrigin)) throw new Error("NGEBLOGGING_API_ORIGIN harus berupa origin HTTPS yang valid.");

  mkdirSync(dist, { recursive: true });
  writeFileSync(resolve(dist, "_redirects"), `/api/*  ${apiOrigin}/api/:splat  200!\n/*       /index.html                         200\n`, "utf8");
  writeFileSync(
    resolve(dist, "_headers"),
    `/*
  X-Ngeblogging-Production-Entry: ${PRODUCTION_ENTRY_RELEASE}
  X-Ngeblogging-Auth-Entry: ${AUTH_ENTRY_RELEASE}
  X-Ngeblogging-Studio-Route: ${STUDIO_ROUTE_RELEASE}
  X-Ngeblogging-UI-Contract: ${UI_CONTRACT_RELEASE}
  X-Ngeblogging-Content-Workflow: ${CONTENT_WORKFLOW_RELEASE}
  X-Ngeblogging-Auth-Editor: ${AUTH_EDITOR_RELEASE}
  X-Ngeblogging-Auth-Callback: ${AUTH_CALLBACK_RELEASE}
  X-Ngeblogging-Auth-Capacity: ${AUTH_CAPACITY_RELEASE}
  X-Ngeblogging-Production-Route: ${PRODUCTION_ROUTE_RELEASE}
  X-Ngeblogging-Production-Authority: ${PRODUCTION_ROUTE_RELEASE}
  X-Ngeblogging-Domain-Attach: ${PRODUCTION_DOMAIN_ATTACH_RELEASE}
  X-Ngeblogging-Custom-Domain-Authority: netlify-fallback-v164
/index.html
  Cache-Control: no-store, max-age=0, must-revalidate
/
  Cache-Control: no-store, max-age=0, must-revalidate
/studio
  Cache-Control: no-store, max-age=0, must-revalidate
/dashboard
  Cache-Control: no-store, max-age=0, must-revalidate
/workspace
  Cache-Control: no-store, max-age=0, must-revalidate
/login
  Cache-Control: no-store, max-age=0, must-revalidate
/signin
  Cache-Control: no-store, max-age=0, must-revalidate
/signup
  Cache-Control: no-store, max-age=0, must-revalidate
/forgot-password
  Cache-Control: no-store, max-age=0, must-revalidate
/reset-password
  Cache-Control: no-store, max-age=0, must-revalidate
/auth/callback
  Cache-Control: no-store, max-age=0, must-revalidate
/auth-capacity-v162.json
  Cache-Control: no-store, max-age=0, must-revalidate
/auth-capacity-v162.html
  Cache-Control: no-store, max-age=0, must-revalidate
/release-v154.json
  Cache-Control: no-store, max-age=0
/release-v158.json
  Cache-Control: no-store, max-age=0
/release-v159.json
  Cache-Control: no-store, max-age=0
/release-v160.json
  Cache-Control: no-store, max-age=0
/release-v161.json
  Cache-Control: no-store, max-age=0
/release-v162.json
  Cache-Control: no-store, max-age=0
/release-v163.json
  Cache-Control: no-store, max-age=0
/release-v164.json
  Cache-Control: no-store, max-age=0
/release-v165.json
  Cache-Control: no-store, max-age=0
`,
    "utf8",
  );

  const release = {
    status: "ok",
    release: PRODUCTION_ENTRY_RELEASE,
    authEntryRelease: AUTH_ENTRY_RELEASE,
    studioRouteRelease: STUDIO_ROUTE_RELEASE,
    uiContractRelease: UI_CONTRACT_RELEASE,
    contentWorkflowRelease: CONTENT_WORKFLOW_RELEASE,
    authEditorRelease: AUTH_EDITOR_RELEASE,
    authCallbackRelease: AUTH_CALLBACK_RELEASE,
    authCallbackCompatibility: AUTH_CALLBACK_COMPAT_RELEASE,
    authCapacityRelease: AUTH_CAPACITY_RELEASE,
    productionRouteCompatibility: PRODUCTION_ROUTE_COMPAT_RELEASE,
    productionRouteRelease: PRODUCTION_ROUTE_RELEASE,
    productionDomainAttachRelease: PRODUCTION_DOMAIN_ATTACH_RELEASE,
    contentEditorRelease: "content-editor-v162-20260730",
    routeAuthority: "netlify-static-fallback-v164",
    domainAttachAuthority: "cloudflare-workers-domains-api-v165",
    routePatterns: ["ngeblogging.com", "www.ngeblogging.com", "*.ngeblogging.com/*"],
    exactCustomDomains: ["ngeblogging.com", "www.ngeblogging.com"],
    tenantWildcardRoute: "*.ngeblogging.com/*",
    studioRoutes: ["/studio", "/dashboard", "/workspace"],
    responsiveFamilies: ["application", "phone", "mobile", "compact", "tablet", "desktop"],
    desktopVariants: ["laptop", "computer"],
    summaryRealCounts: true,
    previewPublishedOnly: true,
    duplicateCreatesDraft: true,
    pagesUseSameWorkflow: true,
    pkceExplicitExchange: true,
    pkceSingleFlight: true,
    callbackProcessors: 1,
    emailPasswordSessionHandoff: true,
    capacityModelOnly: true,
    capacityVisualization: "/auth-capacity-v162.html",
    productionCredentialLoadTest: false,
    wordLimit: 5000,
    shell: "react-vite-dist-index",
    customDomainAuthority: "netlify-fallback-v164",
    legacyWhiteR4: false,
    deployment: "netlify-static-fallback",
  };
  for (const filename of ["release-v154.json", "release-v158.json", "release-v159.json", "release-v160.json"]) {
    writeFileSync(resolve(dist, filename), `${JSON.stringify(release, null, 2)}\n`, "utf8");
  }

  const indexPath = resolve(dist, "index.html");
  let html = readFileSync(indexPath, "utf8");
  if (
    !html.includes('name="ngeblogging-production-custom-domain-v164"')
    || !html.includes('name="ngeblogging-production-domain-attach-v165"')
    || !html.includes('name="ngeblogging-auth-callback-singleflight-v162"')
  ) {
    const markers = [
      `<meta name="ngeblogging-production-authority-v160" content="${PRODUCTION_ENTRY_RELEASE}">`,
      `<meta name="ngeblogging-production-entry" content="${PRODUCTION_ENTRY_RELEASE}">`,
      `<meta name="ngeblogging-auth-entry" content="${AUTH_ENTRY_RELEASE}">`,
      `<meta name="ngeblogging-studio-route" content="${STUDIO_ROUTE_RELEASE}">`,
      `<meta name="ngeblogging-ui-contract" content="${UI_CONTRACT_RELEASE}">`,
      `<meta name="ngeblogging-studio-content-v161" content="${CONTENT_WORKFLOW_RELEASE}">`,
      `<meta name="ngeblogging-auth-editor-v162" content="${AUTH_EDITOR_RELEASE}">`,
      `<meta name="ngeblogging-auth-callback-singleflight-v162" content="${AUTH_CALLBACK_RELEASE}">`,
      `<meta name="ngeblogging-auth-capacity-v162" content="${AUTH_CAPACITY_RELEASE}">`,
      `<meta name="ngeblogging-production-route-v163" content="${PRODUCTION_ROUTE_COMPAT_RELEASE}">`,
      `<meta name="ngeblogging-production-custom-domain-v164" content="${PRODUCTION_ROUTE_RELEASE}">`,
      `<meta name="ngeblogging-production-domain-attach-v165" content="${PRODUCTION_DOMAIN_ATTACH_RELEASE}">`,
      '<meta name="ngeblogging-custom-domain-authority" content="netlify-fallback-v164">',
      '<meta name="ngeblogging-domain-attach-authority" content="cloudflare-workers-domains-api-v165">',
      '<meta name="ngeblogging-legacy-white-r4" content="disabled">',
    ].join("");
    html = html.replace(/<head(\s[^>]*)?>/i, (match) => `${match}${markers}`);
    writeFileSync(indexPath, html, "utf8");
  }

  console.log(`Netlify fallback ${PRODUCTION_ROUTE_RELEASE}, pengikatan ${PRODUCTION_DOMAIN_ATTACH_RELEASE}, kompatibilitas ${PRODUCTION_ROUTE_COMPAT_RELEASE}, callback ${AUTH_CALLBACK_RELEASE}, model ${AUTH_CAPACITY_RELEASE}, auth/editor ${AUTH_EDITOR_RELEASE}, dan konten ${CONTENT_WORKFLOW_RELEASE} aktif; API diarahkan ke ${apiOrigin}`);
}
