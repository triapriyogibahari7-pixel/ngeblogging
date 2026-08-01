import { readFileSync } from "node:fs";

const worker = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
const patch = readFileSync(new URL("./patch-production-v190.mjs", import.meta.url), "utf8");
const checks = [
  /ngeblogging-app-v190-real-device-20260801/.test(worker),
  /real-device-cache-v190/.test(worker),
  /REAL_DEVICE_RELEASE_V190/.test(worker),
  /PRODUCTION_MOBILE_RELEASE_V189/.test(worker),
  !/await refreshStaleWindow\(client, url\);/.test(worker),
  !/localStorage\.clear\s*\(|signOut\s*\(/.test(patch),
];
const group = String(process.env.CHECK_GROUP || "all");
const selected = group === "first" ? checks.slice(0, 3)
  : group === "second" ? checks.slice(3, 6)
  : checks;
if (!selected.every(Boolean)) process.exit(1);
