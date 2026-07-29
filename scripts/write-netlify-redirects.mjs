import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const PRODUCTION_ENTRY_RELEASE = "2026.07.30-production-entry-v154";
const AUTH_ENTRY_RELEASE = "2026.07.30-auth-entry-v154";

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
    `/*\n  X-Ngeblogging-Production-Entry: ${PRODUCTION_ENTRY_RELEASE}\n  X-Ngeblogging-Auth-Entry: ${AUTH_ENTRY_RELEASE}\n/index.html\n  Cache-Control: no-store, max-age=0, must-revalidate\n/\n  Cache-Control: no-store, max-age=0, must-revalidate\n/login\n  Cache-Control: no-store, max-age=0, must-revalidate\n/signin\n  Cache-Control: no-store, max-age=0, must-revalidate\n/signup\n  Cache-Control: no-store, max-age=0, must-revalidate\n/release-v154.json\n  Cache-Control: no-store, max-age=0\n`,
    "utf8",
  );

  writeFileSync(
    resolve(dist, "release-v154.json"),
    `${JSON.stringify({
      status: "ok",
      release: PRODUCTION_ENTRY_RELEASE,
      authEntryRelease: AUTH_ENTRY_RELEASE,
      shell: "react-vite-dist-index",
      legacyWhiteR4: false,
      deployment: "netlify-static-fallback",
    }, null, 2)}\n`,
    "utf8",
  );

  const indexPath = resolve(dist, "index.html");
  let html = readFileSync(indexPath, "utf8");
  if (!html.includes('name="ngeblogging-production-entry"')) {
    const markers = [
      `<meta name="ngeblogging-production-entry" content="${PRODUCTION_ENTRY_RELEASE}">`,
      `<meta name="ngeblogging-auth-entry" content="${AUTH_ENTRY_RELEASE}">`,
      '<meta name="ngeblogging-legacy-white-r4" content="disabled">',
    ].join("");
    html = html.replace(/<head(\s[^>]*)?>/i, (match) => `${match}${markers}`);
    writeFileSync(indexPath, html, "utf8");
  }

  console.log(`Netlify React entry ${PRODUCTION_ENTRY_RELEASE} aktif; API diarahkan ke ${apiOrigin}`);
}
