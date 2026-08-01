import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const match = String(process.env.DIAG_MATCH || "");
const childEnv = { ...process.env, SKIP_V192: process.env.SKIP_V192 || "1" };
const result = spawnSync(process.execPath, ["scripts/patch-service-worker-v179.mjs"], {
  cwd: process.cwd(),
  encoding: "utf8",
  env: childEnv,
});
const combined = `${result.stdout || ""}\n${result.stderr || ""}`;
const matched = result.status === 0 || (match && new RegExp(match).test(combined));
mkdirSync("dist", { recursive: true });
writeFileSync("dist/index.html", `<!doctype html><title>probe ${matched ? "match" : "miss"}</title>`, "utf8");
writeFileSync("dist/probe.txt", `status=${result.status}\nmatch=${match}\nmatched=${matched}\n`, "utf8");
if (!matched) process.exit(1);
