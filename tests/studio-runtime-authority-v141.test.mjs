import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const disabledLayoutRuntimes = [
  "comments-studio-runtime-v93.jsx",
  "studio-interaction-v49.js",
  "studio-layout-route-v29.js",
  "studio-shell-v30.js",
  "studio-mobile-route-reset-v32.js",
  "studio-content-flow-v34.js",
  "studio-domain-backup-v35.js",
  "studio-production-audit-v37.js",
  "studio-production-repair-v38.js",
  "production-contract-v38.js",
  "studio-layout-builder-v39.js",
  "studio-quality-v39.js",
  "studio-layout-device-v40.js",
  "studio-responsive-repair-v43.js",
  "studio-operations-v41.js",
  "studio-reflow-v48.js",
  "studio-theme-domain-v50.js",
  "studio-site-switcher-v52.js",
  "studio-ui-stability-v95.js",
  "studio-surface-authority-v100.js",
  "studio-mobile-precision-v99.js",
  "studio-final-v106.js",
];

const activeFeatureRuntimes = [
  "pwa-runtime.js",
  "auth-session-authority-v76.js",
  "auth-studio-bootstrap-v106.js",
  "api-origin-failover-v60.js",
  "main.jsx",
  "site-favicon-bridge.js",
  "site-quota-bridge.js",
  "billing-availability-bridge.js",
  "auth-readiness-bridge.js",
  "nara-command-center-bridge.js",
  "nara-request-mode-v29.js",
  "nara-connectors-v29.js",
];

test("production shell executes only React v141 as Studio layout runtime", () => {
  assert.match(index, /ngeblogging-studio-runtime-authority" content="react-v141"/);
  for (const runtime of disabledLayoutRuntimes) {
    const escaped = escapeRegExp(runtime);
    assert.match(index, new RegExp(`type="application/x-disabled" src="/src/${escaped}`));
    assert.doesNotMatch(index, new RegExp(`type="module" src="/src/${escaped}`));
  }
});

test("authentication, PWA, Nara, billing, quota, favicon, and connectors remain active", () => {
  for (const runtime of activeFeatureRuntimes) {
    assert.match(index, new RegExp(`type="module" src="/src/${escapeRegExp(runtime)}`));
  }
});
