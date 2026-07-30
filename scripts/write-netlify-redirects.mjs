import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const PRODUCTION_ENTRY_RELEASE = "2026.07.30-production-authority-v160";
const AUTH_ENTRY_RELEASE = "2026.07.30-auth-entry-v158";
const STUDIO_ROUTE_RELEASE = "2026.07.30-studio-route-v160";
const UI_CONTRACT_RELEASE = "2026.07.30-studio-ui-contract-v160";
const CONTENT_WORKFLOW_RELEASE = "2026.07.30-studio-content-workflow-v161";
const AUTH_EDITOR_RELEASE = "2026.07.30-auth-editor-v162";
const PRODUCTION_ROUTE_RELEASE = "2026.07.30-production-route-authority-v163";

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
    `/*\n  X-Ngeblogging-Production-Entry: ${PRODUCTION_ENTRY_RELEASE}\n  X-Ngeblogging-Auth-Entry: ${AUTH_ENTRY_RELEASE}\n  X-Ngeblogging-Studio-Route: ${STUDIO_ROUTE_RELEASE}\n  X-Ngeblogging-UI-Contract: ${UI_CONTRACT_RELEASE}\n  X-Ngeblogging-Content-Workflow: ${CONTENT_WORKFLOW_RELEASE}\n  X-Ngeblogging-Auth-Editor: ${AUTH_EDITOR_RELEASE}\n  X-Ngeblogging-Production-Route: ${PRODUCTION_ROUTE_RELEASE}\n  X-Ngeblogging-Custom-Domain-Authority: netlify-fallback-v163\n/index.html\n  Cache-Control: no-store, max-age=0, must-revalidate\n/\n  Cache-Control: no-store, max-age=0, must-revalidate\n/studio\n  Cache-Control: no-store, max-age=0, must-revalidate\n/dashboard\n  Cache-Control: no-store, max-age=0, must-revalidate\n/workspace\n  Cache-Control: no-store, max-age=0, must-revalidate\n/login\n  Cache-Control: no-store, max-age=0, must-revalidate\n/signin\n  Cache-Control: no-store, max-age=0, must-revalidate\n/signup\n  Cache-Control: no-store, max-age=0, must-revalidate\n/forgot-password\n  Cache-Control: no-store, max-age=0, must-revalidate\n/reset-password\n  Cache-Control: no-store, max-age=0, must-revalidate\n/auth/callback\n  Cache-Control: no-store, max-age=0, must-revalidate\n/release-v154.json\n  Cache-Control: no-store, max-age=0\n/release-v158.json\n  Cache-Control: no-store, max-age=0\n/release-v159.json\n  Cache-Control: no-store, max-age=0\n/release-v160.json\n  Cache-Control: no-store, max-age=0\n/release-v161.json\n  Cache-Control: no-store, max-age=0\n/release-v162.json\n  Cache-Control: no-store, max-age=0\n/release-v163.json\n  Cache-Control: no-store, max-age=0\n`,
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
    productionRouteRelease: PRODUCTION_ROUTE_RELEASE,
    authCallbackRelease: "auth-callback-v162-20260730",
    contentEditorRelease: "content-editor-v162-20260730",
    routeAuthority: "netlify-static-fallback-v163",
    routePatterns: ["ngeblogging.com/*", "www.ngeblogging.com/*", "*.ngeblogging.com/*"],
    studioRoutes: ["/studio", "/dashboard", "/workspace"],
    responsiveFamilies: ["application", "phone", "mobile", "compact", "tablet", "desktop"],
    desktopVariants: ["laptop", "computer"],
    summaryRealCounts: true,
    previewPublishedOnly: true,
    duplicateCreatesDraft: true,
    pagesUseSameWorkflow: true,
    pkceExplicitExchange: true,
    emailPasswordSessionHandoff: true,
    wordLimit: 5000,
    shell: "react-vite-dist-index",
    customDomainAuthority: "netlify-fallback-v163",
    legacyWhiteR4: false,
    deployment: "netlify-static-fallback",
  };
  for (const filename of ["release-v154.json", "release-v158.json", "release-v159.json", "release-v160.json"]) {
    writeFileSync(resolve(dist, filename), `${JSON.stringify(release, null, 2)}\n`, "utf8");
  }

  const indexPath = resolve(dist, "index.html");
  let html = readFileSync(indexPath, "utf8");
  if (!html.includes('name="ngeblogging-production-route-v163"')) {
    const markers = [
      `<meta name="ngeblogging-production-authority-v160" content="${PRODUCTION_ENTRY_RELEASE}">`,
      `<meta name="ngeblogging-production-entry" content="${PRODUCTION_ENTRY_RELEASE}">`,
      `<meta name="ngeblogging-auth-entry" content="${AUTH_ENTRY_RELEASE}">`,
      `<meta name="ngeblogging-studio-route" content="${STUDIO_ROUTE_RELEASE}">`,
      `<meta name="ngeblogging-ui-contract" content="${UI_CONTRACT_RELEASE}">`,
      `<meta name="ngeblogging-studio-content-v161" content="${CONTENT_WORKFLOW_RELEASE}">`,
      `<meta name="ngeblogging-auth-editor-v162" content="${AUTH_EDITOR_RELEASE}">`,
      `<meta name="ngeblogging-production-route-v163" content="${PRODUCTION_ROUTE_RELEASE}">`,
      '<meta name="ngeblogging-custom-domain-authority" content="netlify-fallback-v163">',
      '<meta name="ngeblogging-legacy-white-r4" content="disabled">',
    ].join("");
    html = html.replace(/<head(\s[^>]*)?>/i, (match) => `${match}${markers}`);
    writeFileSync(indexPath, html, "utf8");
  }

  console.log(`Netlify fallback ${PRODUCTION_ROUTE_RELEASE}, auth/editor ${AUTH_EDITOR_RELEASE}, dan konten ${CONTENT_WORKFLOW_RELEASE} aktif; API diarahkan ke ${apiOrigin}`);
}
