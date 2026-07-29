import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");

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

test("production shell executes only React v139 as the Studio runtime owner", () => {
  assert.match(index, /ngeblogging-studio-runtime-authority" content="react-v139"/);

  for (const runtime of disabledLayoutRuntimes) {
    const escaped = runtime.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(
      index,
      new RegExp(`type="application/x-disabled" src="/src/${escaped}`),
      `${runtime} must be inert in the production shell`,
    );
    assert.doesNotMatch(
      index,
      new RegExp(`type="module" src="/src/${escaped}`),
      `${runtime} must not execute beside React v139`,
    );
  }
});

test("authentication, PWA, Nara, quota, billing, and favicon features stay active", () => {
  for (const runtime of [
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
  ]) {
    const escaped = runtime.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(index, new RegExp(`type="module" src="/src/${escaped}`));
  }
});
