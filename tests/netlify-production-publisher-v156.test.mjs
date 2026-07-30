import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(new URL("../.github/workflows/deploy-netlify-production.yml", import.meta.url), "utf8");
const buildBridge = readFileSync(new URL("../scripts/write-netlify-redirects.mjs", import.meta.url), "utf8");

test("Netlify production publisher builds, unlocks, uploads, purges and verifies", () => {
  for (const marker of [
    "Publish Ngeblogging Netlify Production",
    "NETLIFY_AUTH_TOKEN",
    "NETLIFY_SITE_ID",
    "npm run build",
    "/unlock",
    "Content-Type: application/zip",
    "/deploys",
    "NETLIFY_DEPLOY_READY_TIMEOUT",
    "/api/v1/purge",
    "ngeblogging.netlify.app/release-v160.json",
    "WHITE-R4-2026.07.12",
    "ngeblogging-production-authority-v160",
  ]) assert.ok(workflow.includes(marker), `publisher missing ${marker}`);
});

test("publisher uses v160 static release while retaining old probe paths", () => {
  for (const marker of [
    "2026.07.30-production-authority-v160",
    "2026.07.30-auth-entry-v158",
    "2026.07.30-studio-route-v160",
    "2026.07.30-studio-ui-contract-v160",
    "release-v154.json",
    "release-v158.json",
    "release-v159.json",
    "release-v160.json",
    "legacyWhiteR4: false",
    "netlify-static-fallback",
  ]) assert.ok(buildBridge.includes(marker), `static build bridge missing ${marker}`);
});

test("publisher never modifies application data or authentication records", () => {
  for (const forbidden of [
    "supabase.from(",
    "delete from",
    "truncate ",
    "auth.admin",
    "site_members",
    "content_documents",
  ]) assert.ok(!workflow.toLowerCase().includes(forbidden.toLowerCase()), `publisher must not contain ${forbidden}`);
});
