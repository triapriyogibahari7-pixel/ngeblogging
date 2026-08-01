import { mkdir, writeFile } from "node:fs/promises";

const steps = [
  "./patch-auth-callback-v162.mjs",
  "./patch-content-editor-v162.mjs",
  "./patch-studio-content-v161.mjs",
  "./run-patch-theme-layout-v170.mjs",
  "./run-patch-mobile-public-v171.mjs",
  "./run-patch-mobile-interaction-v174.mjs",
  "./run-patch-mobile-stability-v176.mjs",
  "./patch-studio-mobile-v176.mjs",
  "./patch-nara-native-v177.mjs",
  "./run-patch-screenshot-stability-v177.mjs",
  "./patch-service-worker-v179.mjs",
];

for (const step of steps) {
  console.log(`PATCH_DIAGNOSTIC_START ${step}`);
  await import(step);
  console.log(`PATCH_DIAGNOSTIC_OK ${step}`);
}

await mkdir("dist", { recursive: true });
await writeFile("dist/index.html", "<!doctype html><html><body><h1>PATCH_CHAIN_OK</h1></body></html>", "utf8");
console.log("PATCH_CHAIN_OK");
