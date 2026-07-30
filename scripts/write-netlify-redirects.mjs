import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const PRODUCTION_ENTRY_RELEASE = "2026.07.30-production-entry-v154";
const AUTH_ENTRY_RELEASE = "2026.07.30-auth-entry-v154";
const STUDIO_ROUTE_RELEASE = "2026.07.30-auth-studio-route-v158";

if (String(process.env.NETLIFY || "").toLowerCase() === "true") {
  const dist = resolve("dist");
  const apiOrigin = String(
    process.env.NGEBLOGGING_API_ORIGIN
    || process.env.VITE_NGEBLOGGING_API_ORIGIN
    || "https://ngeblogging.triapriyogibahari7.workers.dev",
  ).trim().replace(/\/$/, "");

  if (!/^https:\/\//i.test(apiOrigin)) {
    throw new Error("NGEBLOGGING_API_ORIGIN harus berupa origin HTTPS yang valid.");
  }

  mkdirSync(dist, { recursive: true });
  writeFileSync(
    resolve(dist, "_redirects"),
    `/api/*  ${apiOrigin}/api/:splat  200!\n/*       /index.html                         200\n`,
    "utf8",
  );

  writeFileSync(
    resolve(dist, "_headers"),
    `/*\n  X-Ngeblogging-Production-Entry: ${PRODUCTION_ENTRY_RELEASE}\n  X-Ngeblogging-Auth-Entry: ${AUTH_ENTRY_RELEASE}\n  X-Ngeblogging-Studio-Route: ${STUDIO_ROUTE_RELEASE}\n/index.html\n  Cache-Control: no-store, max-age=0, must-revalidate\n/\n  Cache-Control: no-store, max-age=0, must-revalidate\n/studio\n  Cache-Control: no-store, max-age=0, must-revalidate\n/dashboard\n  Cache-Control: no-store, max-age=0, must-revalidate\n/workspace\n  Cache-Control: no-store, max-age=0, must-revalidate\n/login\n  Cache-Control: no-store, max-age=0, must-revalidate\n/signin\n  Cache-Control: no-store, max-age=0, must-revalidate\n/signup\n  Cache-Control: no-store, max-age=0, must-revalidate\n/release-v154.json\n  Cache-Control: no-store, max-age=0\n/release-v158.json\n  Cache-Control: no-store, max-age=0\n`,
    "utf8",
  );

  const release = {
    status: "ok",
    release: PRODUCTION_ENTRY_RELEASE,
    authEntryRelease: AUTH_ENTRY_RELEASE,
    studioRouteRelease: STUDIO_ROUTE_RELEASE,
    studioRoutes: ["/studio", "/dashboard", "/workspace"],
    shell: "react-vite-dist-index",
    legacyWhiteR4: false,
    deployment: "netlify-static-fallback",
  };
  writeFileSync(resolve(dist, "release-v154.json"), `${JSON.stringify(release, null, 2)}\n`, "utf8");
  writeFileSync(resolve(dist, "release-v158.json"), `${JSON.stringify(release, null, 2)}\n`, "utf8");

  const indexPath = resolve(dist, "index.html");
  let html = readFileSync(indexPath, "utf8");
  if (!html.includes('name="ngeblogging-studio-route"')) {
    const markers = [
      `<meta name="ngeblogging-production-entry" content="${PRODUCTION_ENTRY_RELEASE}">`,
      `<meta name="ngeblogging-auth-entry" content="${AUTH_ENTRY_RELEASE}">`,
      `<meta name="ngeblogging-studio-route" content="${STUDIO_ROUTE_RELEASE}">`,
      '<meta name="ngeblogging-legacy-white-r4" content="disabled">',
    ].join("");
    html = html.replace(/<head(\s[^>]*)?>/i, (match) => `${match}${markers}`);
    writeFileSync(indexPath, html, "utf8");
  }

  console.log(`Netlify React entry ${PRODUCTION_ENTRY_RELEASE} dan Studio ${STUDIO_ROUTE_RELEASE} aktif; API diarahkan ke ${apiOrigin}`);
}
