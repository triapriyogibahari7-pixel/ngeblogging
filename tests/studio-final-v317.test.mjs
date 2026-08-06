import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v317 editor navigation never inherits live v301 inline geometry", async () => {
  const [runtime, css] = await Promise.all([
    read("src/studio-editor-navigation-v266.js"),
    read("src/studio-editor-navigation-v266.css"),
  ]);
  assert.match(runtime, /studio-editor-navigation-clean-clone-v317-20260806/);
  assert.match(runtime, /function stripRuntimeGeometry/);
  assert.match(runtime, /removeAttribute\("style"\)/);
  assert.match(runtime, /cloneNode\(true\)/);
  assert.match(css, />nav\{display:flex!important;flex:0 1 auto!important/);
  assert.match(css, /justify-content:flex-start!important/);
  assert.match(css, /#ngeblogging-editor-nav-v266\.collapsed/);
  assert.match(css, /html\.editor-v266-small \.ce-editor-sidebar-toggle-v266\{display:grid!important/);
  assert.match(css, /background:transparent!important;backdrop-filter:none!important/);
  assert.doesNotMatch(runtime, /localStorage\.clear|sessionStorage\.clear|signOut\s*\(|location\.(?:reload|replace)\s*\(/);
});

test("v317 contains the screenshot-driven responsive layout, code, API and Nara guards", async () => {
  const css = await read("src/studio-final-v317.css");
  assert.match(css, /studio-final-responsive-v317-20260806/);
  assert.match(css, /#ngeblogging-studio-sidebar>nav\{flex:0 1 auto!important/);
  assert.match(css, /html\.editor-v266-large \.ce-paper\{height:auto!important;min-height:clamp\(300px,38dvh,480px\)!important/);
  assert.match(css, /\.tn-layout-studio\{display:grid!important;grid-template-columns:minmax\(0,1fr\)!important/);
  assert.match(css, /\.tn-layout-popover-v312/);
  assert.match(css, /grid-template-areas:"code preview"/);
  assert.match(css, /grid-template-areas:"preview" "code"/);
  assert.match(css, /data-theme-code-v312="line-numbers-10000"/);
  assert.match(css, /\.sn-api-endpoint h2/);
  assert.match(css, /\.sv124-domain-page/);
  assert.match(css, /\.nara-floating-button\{position:fixed!important/);
  assert.match(css, /nara-assistant-shell\[data-nara-size="small"\]/);
  assert.match(css, /nara-assistant-shell\[data-nara-size="medium"\]/);
  assert.match(css, /\.nara-attachment-menu/);
});

test("v317 keeps the v312 two-map 100-theme source editor contract instead of replacing it with placeholders", async () => {
  const [studio, release312, release317] = await Promise.all([
    read("src/ThemeStudio.jsx"),
    read("public/release-v312.json"),
    read("public/release-v317.json"),
  ]);
  assert.match(studio, /theme-map-code-editor-v312-20260806/);
  assert.match(studio, /Model editorial/);
  assert.match(studio, /Model majalah/);
  assert.match(studio, /Array\.from\(\{ length: 10000 \}/);
  assert.match(release312, /"themes": 100/);
  assert.match(release312, /"layoutAreas": 26/);
  assert.match(release312, /"layoutModels": 2/);
  assert.match(release312, /"codeLineNumbers": 10000/);
  assert.match(release317, /"themeMapModels": 2/);
  assert.match(release317, /"themeCountPreserved": 100/);
});

test("v317 custom domain active path verifies the Cloudflare Worker Domain instead of trusting PUT alone", async () => {
  const [provider, handler, release] = await Promise.all([
    read("server/cloudflare-full-zone-provider.mjs"),
    read("server/domain-handler.mjs"),
    read("public/release-v317.json"),
  ]);
  assert.match(provider, /cloudflare-worker-domain-verified-v317-20260806/);
  assert.match(provider, /async function verifyWorkerDomainAttachment/);
  assert.match(provider, /\/workers\/domains/);
  assert.match(provider, /Workers Scripts Write/);
  assert.match(provider, /WORKER_DOMAIN_NOT_ATTACHED/);
  assert.match(provider, /WORKER_DOMAIN_SERVICE_MISMATCH/);
  assert.match(provider, /return verifyWorkerDomainAttachment/);
  assert.match(handler, /zoneState\.active && attached/);
  assert.match(handler, /workerDomainsReady\(workerDomains\)/);
  assert.match(release, /"fakeDomainActiveStatusAllowed": false/);
});

test("v317 external HTTPS custom domains can resolve public data even when Cloudflare Git build omits VITE env", async () => {
  const supabase = await read("src/lib/supabase.js");
  assert.match(supabase, /custom-domain-public-client-v317-20260806/);
  assert.match(supabase, /window\.location\?\.protocol/);
  assert.match(supabase, /hostname\.endsWith\("\.workers\.dev"\)/);
  assert.match(supabase, /return hostname\.includes\("\."\)/);
  assert.match(supabase, /PRODUCTION_SUPABASE_PUBLISHABLE_KEY_V245/);
  assert.match(supabase, /persistSession: true/);
  assert.match(supabase, /autoRefreshToken: true/);
});

test("v317 preserves v316 draft safety and v315 session persistence", async () => {
  const [guard, authRelease] = await Promise.all([
    read("src/studio-content-editor-final-v316.js"),
    read("public/release-v315.json"),
  ]);
  assert.match(guard, /CONTENT_WORD_LIMIT_V316 = 5000/);
  assert.match(guard, /Draf tetap aman dan tidak dipotong/);
  assert.match(authRelease, /"persistSessionPreserved": true/);
  assert.match(authRelease, /"networkFailureDoesNotLogout": true/);
});
