import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v345 lowers both real site switching surfaces below Studio chrome", async () => {
  const [entry, runtime, css, release] = await Promise.all([
    read("src/studio-theme-surface-final-v341.js"),
    read("src/studio-site-switcher-surface-v345.js"),
    read("src/studio-site-switcher-surface-v345.css"),
    read("public/release-v345.json"),
  ]);

  assert.match(entry, /import "\.\/studio-site-switcher-surface-v345\.js";/);
  assert.match(runtime, /studio-site-switcher-surface-v345-20260807/);
  assert.match(css, /\.sn-modal-layer:has\(\.sn-site-manager\)/);
  assert.match(css, /\.sn-site-switcher-v304-layer/);
  assert.match(css, /\+ 84px/);
  assert.match(css, /place-items:end center!important/);
  assert.match(release, /"desktopDialogBelowTopbar": true/);
  assert.match(release, /"mobileBottomSheetBelowHeader": true/);
});

test("v345 separates title, close button and active site rows without touching protected surfaces", async () => {
  const css = await read("src/studio-site-switcher-surface-v345.css");

  assert.match(css, /\.sn-site-manager>header\{/);
  assert.match(css, /z-index:6!important/);
  assert.match(css, /\.sn-sites-list article\{/);
  assert.match(css, /grid-template-columns:48px minmax\(0,1fr\) auto auto!important/);
  assert.match(css, /\.sn-site-switcher-v304-row\{/);
  assert.match(css, /overflow-wrap:anywhere!important/);
  assert.doesNotMatch(css, /#ngeblogging-studio-sidebar|\.sn-side|\.sn-logo-mark|\.nara-assistant|\.nara-floating-button|\.sv124-domain-page|\.ce-app|\.tn-studio/);
});

test("v345 covers application, phone, mobile, compact, tablet and desktop family geometry", async () => {
  const css = await read("src/studio-site-switcher-surface-v345.css");
  for (const marker of [
    'data-studio-responsive-mode="application"',
    'data-studio-responsive-mode="phone"',
    'data-studio-responsive-mode="mobile"',
    'data-studio-responsive-mode="compact"',
    'data-studio-responsive-mode="tablet"',
    'data-studio-device-mode="small"',
  ]) assert.match(css, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  assert.match(css, /width:min\(920px,calc\(100vw - 32px\)\)!important/);
  assert.match(css, /max-height:calc\(100dvh - env\(safe-area-inset-top,0px\) - 70px\)!important/);
});
