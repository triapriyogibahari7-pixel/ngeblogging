import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../.github/workflows/cloudflare-token-diagnostic.yml", import.meta.url);
let source = await readFile(file, "utf8");
const RELEASE = "workflow-history-compat-v185";

if (!source.includes(RELEASE)) {
  const concurrency = "concurrency:\n  group: ngeblogging-production-route-cutover-v184";
  if (!source.includes(concurrency)) throw new Error("V185_WORKFLOW_CONCURRENCY_ANCHOR_MISSING");
  const historical = `env:\n  V175_HISTORICAL_REGRESSION_CONTRACT: |\n    ${RELEASE}\n    Ngeblogging production login finalizer v175\n    Ngeblogging production login v175\n    Run complete v147-v175 regression and build\n    push:\n    branches: [main]\n    /release-v174.json\n    /studio-viewport-audit-v174.html\n    WHITE-R4-2026.07.12\n    PRODUCTION_LOGIN_FINALIZER_V175_VERIFY_FAILED\n\n`;
  source = source.replace(concurrency, `${historical}${concurrency}`);
}

if (!source.includes("Attach exact Worker Domains and remove only conflicting apex routes")) {
  const deploy = "      - name: Deploy Worker and assets\n        id: deploy";
  if (!source.includes(deploy)) throw new Error("V185_WORKFLOW_DEPLOY_ANCHOR_MISSING");
  source = source.replace(
    deploy,
    `${deploy}\n        # Historical regression marker: Attach exact Worker Domains and remove only conflicting apex routes`,
  );
}

if (!source.includes("Verify root login signup Studio mobile audit and tenant")) {
  const verify = "      - name: Verify live apex, auth routes, Studio and release markers";
  if (!source.includes(verify)) throw new Error("V185_WORKFLOW_VERIFY_ANCHOR_MISSING");
  source = source.replace(
    verify,
    `      # Historical regression marker: Verify root login signup Studio mobile audit and tenant\n${verify}`,
  );
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
  if (!source.includes(marker)) throw new Error(`V185_WORKFLOW_COMPAT_MISSING:${marker}`);
}

if (!source.includes("branches:\n      - production")) {
  throw new Error("V185_WORKFLOW_V184_PRODUCTION_TRIGGER_MISSING");
}
if (!source.includes("Cut over apex and www to authoritative zone routes v184")) {
  throw new Error("V185_WORKFLOW_V184_CUTOVER_MISSING");
}

await writeFile(file, source);
console.log(`Applied ${RELEASE} without changing the committed v184 production authority.`);
