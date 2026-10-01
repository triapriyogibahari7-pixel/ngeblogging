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

test("Theme mobile recovery is limited to handheld Theme modes", () => {
  for (const mode of ["application", "phone", "mobile", "compact"]) {
    assert.match(css, new RegExp(`data-studio-device-variant="${mode}"`));
    assert.match(css, new RegExp(`data-studio-responsive-mode="${mode}"`));
  }
  assert.doesNotMatch(css, /data-studio-device-variant="laptop"/);
  assert.doesNotMatch(css, /data-studio-device-variant="desktop"/);
  assert.doesNotMatch(css, /data-studio-device-variant="computer"/);
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
