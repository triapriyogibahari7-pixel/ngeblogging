import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

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
  console.log(`Netlify API bridge diarahkan ke ${apiOrigin}`);
}
