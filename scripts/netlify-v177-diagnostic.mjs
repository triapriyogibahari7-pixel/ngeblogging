import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";

const verification = spawnSync("npm", ["run", "verify:v177"], {
  encoding: "utf8",
  env: process.env,
});
const output = [
  `exit=${verification.status ?? "unknown"}`,
  verification.stdout || "",
  verification.stderr || "",
].join("\n");
mkdirSync("public", { recursive: true });
writeFileSync("public/v177-test-log.txt", output, "utf8");

const build = spawnSync("npx", ["vite", "build"], {
  stdio: "inherit",
  env: process.env,
});
if (build.status !== 0) process.exit(build.status || 1);
copyFileSync("public/v177-test-log.txt", "dist/v177-test-log.txt");
console.log(`V177 diagnostic captured with verification exit ${verification.status}.`);
