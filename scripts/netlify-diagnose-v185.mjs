import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const result = spawnSync("npm", ["run", "build"], {
  cwd: process.cwd(),
  encoding: "utf8",
  maxBuffer: 40 * 1024 * 1024,
  env: process.env,
});

const output = [
  `exitCode=${result.status ?? "null"}`,
  `signal=${result.signal ?? ""}`,
  "",
  result.stdout || "",
  result.stderr || "",
  result.error ? `\nspawnError=${result.error.stack || result.error.message}` : "",
].join("\n");

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

mkdirSync("dist", { recursive: true });
writeFileSync("dist/build-log.txt", output, "utf8");
writeFileSync("dist/index.html", `<!doctype html><meta charset="utf-8"><title>v185 build diagnostic</title><style>body{margin:0;padding:24px;background:#0d1729;color:#e8eef8;font:14px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace}pre{white-space:pre-wrap;overflow-wrap:anywhere}</style><h1>v185 build diagnostic</h1><pre>${escapeHtml(output)}</pre>`, "utf8");

const supabaseUrl = String(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/$/, "");
const publishableKey = String(
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || process.env.VITE_SUPABASE_ANON_KEY
  || process.env.SUPABASE_PUBLISHABLE_KEY
  || "",
);
if (supabaseUrl && publishableKey) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/build_diagnostics_v185`, {
      method: "POST",
      headers: {
        apikey: publishableKey,
        authorization: `Bearer ${publishableKey}`,
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        id: "v185_UaIXwI-DQJinBhB0pnbRoXrqx_FTxId-",
        payload: output.slice(0, 1_000_000),
      }),
    });
    console.log(`Diagnostic report status ${response.status}.`);
  } catch (error) {
    console.error("Diagnostic report failed:", error?.message || error);
  }
} else {
  console.error("Diagnostic report skipped: Supabase environment is unavailable.");
}

console.log(`Diagnostic captured with exit code ${result.status ?? "unknown"}.`);
process.exit(0);
