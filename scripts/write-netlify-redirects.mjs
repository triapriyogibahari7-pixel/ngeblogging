import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

if (String(process.env.NETLIFY || "").toLowerCase() === "true") {
  const dist = resolve("dist");
  mkdirSync(dist, { recursive: true });
  writeFileSync(
    resolve(dist, "_redirects"),
    "/api/*  https://ngeblogging.com/api/:splat  200!\n/*       /index.html                         200\n",
    "utf8",
  );
  console.log("Netlify bridge redirects written to dist/_redirects");
}
