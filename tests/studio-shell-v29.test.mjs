import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const index = read("index.html");
const css = read("src/studio-shell-v29.css");
const toolsCss = read("src/nara-tools-v29.css");
const runtime = read("src/studio-shell-v29.js");
const layout = read("src/studio-layout-route-v29.js");
const connectors = read("src/nara-connectors-v29.js");
const requestMode = read("src/nara-request-mode-v29.js");
const secure = read("src/StudioSecure.jsx");
const serviceWorker = read("public/sw.js");
const desktopBackup = read("backups/studio-desktop-sidebar-v29-locked.css");
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, "");

test("v29 is the only active compact Studio authority", () => {
  assert.match(index, /studio-shell-v29\.css" rel="stylesheet"/);
  assert.match(index, /nara-tools-v29\.css" rel="stylesheet"/);
  assert.match(index, /studio-shell-v29\.js/);
  assert.match(index, /studio-layout-route-v29\.js/);
  assert.match(index, /nara-connectors-v29\.js/);
  assert.match(index, /nara-request-mode-v29\.js/);
  for (const legacy of ["studio-mobile-nara-v24.css", "studio-interaction-v25.css", "studio-device-sidebar-v26.css", "studio-mobile-widget-v28.css"]) {
    const escaped = legacy.replaceAll(".", "\\.");
    assert.match(index, new RegExp(`${escaped}[^\\n]+media="not all"`));
  }
  assert.match(index, /type="application\/x-disabled" src="\/src\/studio-runtime-v23\.js"/);
  assert.doesNotMatch(index, /type="module" src="\/src\/(?:nara-mobile-window-v24|studio-device-sidebar-v26|studio-mobile-widget-v28)\.js"/);
});

test("mobile drawer follows the Cloudflare-style interaction contract", () => {
  for (const marker of ["sn-mobile-v29-header", "sn-mobile-v29-brand", "sn-mobile-v29-close", "sn-mobile-v29-search", "sn-mobile-v29-launcher", "sn-mobile-v29-scrim", "Cari menu…", "n<span>.</span>"]) assert.ok(runtime.includes(marker), marker);
  assert.match(css, /--sn-v29-panel: min\(84vw, 360px\)/);
  assert.match(css, /\.sn-side\.collapsed[\s\S]*translate3d\(calc\(-100% - 18px\), 0, 0\)/);
  assert.match(css, /\.sn-mobile-v29-close[\s\S]*width: 44px !important/);
  assert.match(css, /\.sn-mobile-v29-launcher[\s\S]*top: 50dvh !important/);
  assert.match(css, /\.sn-mobile-v29-scrim[\s\S]*backdrop-filter: none !important/);
  assert.match(runtime, /addEventListener\("input"/);
  assert.match(runtime, /clickSource\(shell, false\)/);
});

test("desktop, laptop and Desktop-site sidebar geometry is locked and backed up", () => {
  for (const source of [css, desktopBackup]) {
    assert.match(source, /width: (?:var\(--sn-v29-desktop-open\)|220px) !important/);
    assert.match(source, /width: (?:var\(--sn-v29-desktop-closed\)|70px) !important/);
    assert.match(source, /margin-left: (?:var\(--sn-v29-desktop-open\)|220px) !important/);
  }
  for (const mode of ["desktop", "laptop", "desktop-phone", "phone", "mobile", "app", "tablet"]) assert.ok(runtime.includes(`"${mode}"`), mode);
  assert.match(runtime, /root\.classList\.toggle\(`studio-v29-\$\{name\}`/);
});

test("Nara has mini, complete widget and fullscreen with controls beside close", () => {
  for (const size of ["mini", "compact", "expanded"]) assert.ok(css.includes(`data-nara-size-v29="${size}"`), size);
  assert.match(css, /data-nara-size-v29="mini"[\s\S]*width: min\(350px/);
  assert.match(css, /data-nara-size-v29="compact"[\s\S]*width: min\(430px/);
  assert.match(css, /data-nara-size-v29="expanded"[\s\S]*width: 100% !important/);
  assert.match(css, /grid-template-columns: 42px minmax\(0, 1fr\) 36px 36px 36px 36px !important/);
  assert.match(runtime, /close\.insertAdjacentElement\("beforebegin", expand\)/);
  assert.match(runtime, /expand\.insertAdjacentElement\("beforebegin", size\)/);
  assert.match(runtime, /profile\.compact \? "mini" : "compact"/);
  assert.match(runtime, /nara-speaker-v29/);
  assert.match(runtime, /SpeechSynthesisUtterance/);
  assert.match(runtime, /Mode kerja Nara/);
  assert.match(toolsCss, /nara-plugin-trigger-v29/);
});

test("plugins and task mode stay functional inside Nara", () => {
  for (const marker of ["INTEGRATION_CATALOG", "listUserIntegrations", "requestIntegration", "disableIntegration", "ACTIVE_SITE_STORAGE_KEY"]) assert.ok(connectors.includes(marker), marker);
  for (const provider of ["github", "supabase", "neon", "cloudflare", "paypal", "qris", "google-drive", "google-analytics", "webhook"]) assert.ok(connectors.includes(`${provider}:`) || connectors.includes(`"${provider}"`), provider);
  assert.match(connectors, /nara-plugin-panel-v29/);
  assert.match(connectors, /Hubungkan/);
  assert.match(connectors, /Connected/);
  assert.ok(requestMode.includes("\\/api\\/nara"));
  assert.match(requestMode, /taskMode/);
});

test("Nara workspace is visible in the drawer while duplicate top launchers remain hidden", () => {
  assert.match(secure, /naraRoute\.hidden = false/);
  assert.match(secure, /naraRoute\.removeAttribute\("aria-hidden"\)/);
  assert.match(secure, /\.sn-top-actions \.sn-nara-button, \.ce-nara/);
  assert.match(secure, /button\.hidden = true/);
});

test("v29 does not target the landing page, public tenants, or public themes", () => {
  assert.doesNotMatch(cssRules, /landing|public-site|public-tenant|hero-public|theme-renderer/i);
  assert.match(css, /Scope: authenticated Studio navigation and the Nara assistant window only/);
});

test("PWA cache rotates to v29", () => {
  assert.match(serviceWorker, /ngeblogging-app-v29-20260725/);
  assert.match(serviceWorker, /fetch\(request, \{ cache: "no-store" \}\)/);
});

test("Tata Letak remains a real route after the legacy runtime is disabled", () => {
  assert.match(layout, /Tata Letak/);
  assert.match(layout, /data-layout-route-v29/);
  assert.match(layout, /currentTheme\.click\(\)/);
  assert.match(layout, /openCustomizer/);
});
