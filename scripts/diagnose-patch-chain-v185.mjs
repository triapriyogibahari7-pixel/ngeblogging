import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[character]));
}

const result = spawnSync(process.execPath, [
  "--test",
  "tests/studio-interface-v147.test.mjs",
  "tests/studio-interface-v148.test.mjs",
  "tests/studio-interface-v149.test.mjs",
  "tests/studio-recovery-v150.test.mjs",
  "tests/studio-completion-v151.test.mjs",
  "tests/studio-production-sync-v151.test.mjs",
  "tests/studio-continuity-v152.test.mjs",
  "tests/auth-production-v153.test.mjs",
  "tests/production-entry-v154.test.mjs",
  "tests/netlify-production-publisher-v156.test.mjs",
  "tests/legacy-worker-entry-v157.test.mjs",
  "tests/release-v157-probe.test.mjs",
  "tests/auth-studio-route-v158.test.mjs",
  "tests/studio-ui-contract-v159.test.mjs",
  "tests/studio-pwa-v159.test.mjs",
  "tests/production-authority-v160.test.mjs",
  "tests/studio-platform-v160.test.mjs",
  "tests/studio-content-v161.test.mjs",
  "tests/studio-content-release-v161.test.mjs",
  "tests/auth-callback-v162.test.mjs",
  "tests/content-editor-v162.test.mjs",
  "tests/auth-editor-release-v162.test.mjs",
  "tests/auth-capacity-v162.test.mjs",
  "tests/production-route-v163.test.mjs",
  "tests/production-authority-v164.test.mjs",
  "tests/production-domain-attach-v165.test.mjs",
  "tests/production-route-recovery-v168.test.mjs",
  "tests/first-site-onboarding-v169.test.mjs",
  "tests/theme-layout-v170.test.mjs",
  "tests/theme-layout-v170-idempotency.test.mjs",
  "tests/mobile-public-layout-v171.test.mjs",
  "tests/production-custom-domain-v172.test.mjs",
  "tests/mobile-interaction-v174.test.mjs",
  "tests/production-login-finalizer-v175.test.mjs",
  "tests/mobile-stability-v176.test.mjs",
  "tests/studio-mobile-stability-v176.test.mjs",
  "tests/members-v176.test.mjs",
  "tests/studio-layout-model-v176.test.mjs",
  "tests/studio-screenshot-stability-v177.test.mjs",
  "tests/auth-readiness-v177.test.mjs",
  "tests/studio-finalization-v178.test.mjs",
  "tests/studio-mobile-runtime-v179.test.mjs",
  "tests/studio-mobile-hardening-v181.test.mjs",
], {
  cwd: process.cwd(),
  encoding: "utf8",
  env: process.env,
  maxBuffer: 16 * 1024 * 1024,
});

const output = `${result.stdout || ""}\n${result.stderr || ""}`;
const tail = output.slice(-600_000);
const state = result.status === 0 ? "TESTS_OK" : `TESTS_FAILED_${result.status}`;

await mkdir("dist", { recursive: true });
await writeFile("dist/index.html", `<!doctype html><html><head><meta charset="utf-8"><title>${state}</title><style>body{font-family:ui-monospace,monospace;margin:24px;background:#111827;color:#e5e7eb}h1{font-family:system-ui,sans-serif}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#030712;padding:20px;border-radius:14px}</style></head><body><h1>${state}</h1><pre>${escapeHtml(tail)}</pre></body></html>`, "utf8");
console.log(state);
process.exitCode = 0;
