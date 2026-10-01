import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const theme = await readFile(new URL("../src/ThemeStudio.jsx", import.meta.url), "utf8");
const css = await readFile(new URL("../src/theme-mobile-recovery-v360.css", import.meta.url), "utf8");

test("Theme mobile recovery is loaded after the existing Theme Studio surface CSS", () => {
  const widgetAt = theme.indexOf('import "./studio-widget-studio-v369.css";');
  const recoveryAt = theme.indexOf('import "./theme-mobile-recovery-v360.css";');
  assert.ok(widgetAt >= 0, "existing Theme Studio CSS import missing");
  assert.ok(recoveryAt > widgetAt, "mobile recovery must load last in ThemeStudio");
});

test("Theme mobile recovery is scoped to explicit mobile/application roots", () => {
  assert.match(css, /html\\[data-studio-device-variant="application"\\]/);
  assert.match(css, /html\\[data-studio-device-variant="phone"\\]/);
  assert.match(css, /html\\[data-studio-device-variant="mobile"\\]/);
  assert.doesNotMatch(css, /data-v15-mobile="true"/);
  assert.doesNotMatch(css, /data-studio-device-variant="laptop"/);
  assert.doesNotMatch(css, /data-studio-device-variant="desktop"/);
  assert.doesNotMatch(css, /data-studio-device-variant="computer"/);
  assert.doesNotMatch(css, /data-v340-theme-device="laptop"/);
  assert.doesNotMatch(css, /data-v340-theme-device="desktop"/);
  assert.doesNotMatch(css, /data-v340-theme-device="computer"/);
});

test("Theme mobile recovery fixes the current Theme markup rather than retired layout selectors", () => {
  for (const selector of [
    ".tn-hero",
    ".tn-active-stage",
    ".tn-command",
    ".tn-layout-studio",
    ".tn-layout-canvas",
    ".tn-blueprints",
    ".tn-library",
    ".tn-theme-grid",
    ".tn-modal",
  ]) assert.match(css, new RegExp(selector.replace(/[.*+?^{}()|[\]\\]/g, "\\$&")));
});


test("v361 mobile-only repair blocks desktop selectors and fixes overlay/icon geometry", () => {
  assert.match(css, /v361 mobile-only overlap\\/icon repair/);
  assert.match(css, /sn-sidebar-scrim-v15\\[hidden\\][\\s\\S]*display:none!important/);
  assert.match(css, /nara-floating-button[\\s\\S]*width:56px!important[\\s\\S]*height:56px!important/);
  assert.match(css, /sn-icon\\.sn-sidebar-edge-owner-v17[\\s\\S]*width:40px!important[\\s\\S]*height:40px!important/);
  assert.doesNotMatch(css, /data-studio-device-variant="laptop"/);
  assert.doesNotMatch(css, /data-studio-device-variant="desktop"/);
  assert.doesNotMatch(css, /data-studio-device-variant="computer"/);
  assert.doesNotMatch(css, /data-v340-theme-device="laptop"/);
  assert.doesNotMatch(css, /data-v340-theme-device="desktop"/);
  assert.doesNotMatch(css, /data-v340-theme-device="computer"/);
});