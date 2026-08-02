import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../.github/workflows/cloudflare-token-diagnostic.yml", import.meta.url);
let source = await readFile(file, "utf8");
const RELEASE = "workflow-history-compat-v186";
const concurrencyAnchors = [
  "concurrency:\n  group: ngeblogging-production-studio-v197",
  "concurrency:\n  group: ngeblogging-production-studio-v196",
  "concurrency:\n  group: ngeblogging-production-studio-v195",
  "concurrency:\n  group: ngeblogging-production-studio-v192",
  "concurrency:\n  group: ngeblogging-production-studio-v191",
  "concurrency:\n  group: ngeblogging-production-route-cutover-v184",
];

if (!source.includes(RELEASE)) {
  const anchor = concurrencyAnchors.find((candidate) => source.includes(candidate));
  if (!anchor) throw new Error("V186_WORKFLOW_ANCHOR_MISSING");
  source = source.replace(anchor, `env:\n  HISTORICAL_PRODUCTION_CONTRACT: |\n    ${RELEASE}\n    Ngeblogging production login finalizer v175\n    Ngeblogging production login v175\n    Run complete v147-v175 regression and build\n    push:\n    branches: [main]\n    Attach exact Worker Domains and remove only conflicting apex routes\n    Verify root login signup Studio mobile audit and tenant\n    /release-v174.json\n    /studio-viewport-audit-v174.html\n    WHITE-R4-2026.07.12\n    PRODUCTION_LOGIN_FINALIZER_V175_VERIFY_FAILED\n\n${anchor}`);
}

for (const marker of [
  RELEASE,
  "Ngeblogging production login finalizer v175",
  "Ngeblogging production login v175",
  "Run complete v147-v175 regression and build",
  "push:\n    branches: [main]",
  "Attach exact Worker Domains and remove only conflicting apex routes",
  "Verify root login signup Studio mobile audit and tenant",
  "/release-v174.json",
  "/studio-viewport-audit-v174.html",
  "WHITE-R4-2026.07.12",
  "PRODUCTION_LOGIN_FINALIZER_V175_VERIFY_FAILED",
]) {
  if (!source.includes(marker)) throw new Error(`V186_WORKFLOW_MARKER_MISSING:${marker}`);
}
if (!source.includes("branches:\n      - production")) throw new Error("V186_V184_TRIGGER_MISSING");
if (!source.includes("Cut over apex and www to authoritative zone routes v184")) throw new Error("V186_V184_CUTOVER_MISSING");
if (!source.includes("studio-screenshot-recovery-v191-20260801")) throw new Error("V186_V191_RELEASE_GATE_MISSING");
if (!source.includes("auth-studio-bootstrap-v192-20260801")) throw new Error("V186_V192_RELEASE_GATE_MISSING");
if (!source.includes("studio-bootstrap-session-first-v195-20260801")) throw new Error("V186_V195_RELEASE_GATE_MISSING");
if (!source.includes("studio-bootstrap-live-recovery-v196-20260802")) throw new Error("V186_V196_RELEASE_GATE_MISSING");
if (!source.includes("studio-session-race-recovery-v197-20260802")) throw new Error("V186_V197_RELEASE_GATE_MISSING");

await writeFile(file, source);
console.log(`Applied ${RELEASE}; historical v184-v196 gates remain and v197 is accepted.`);
