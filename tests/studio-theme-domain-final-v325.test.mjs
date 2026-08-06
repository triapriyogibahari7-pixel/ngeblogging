import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v325 runtime is chained after the existing production polish authority", async () => {
  const entry = await read("src/studio-content-editor-responsive-v308.js");
  const runtime = await read("src/studio-theme-domain-final-v325.js");
  assert.match(entry, /import "\.\/studio-theme-domain-final-v325\.js"/);
  assert.match(entry, /STUDIO_THEME_DOMAIN_FINAL_RELEASE_V325/);
  assert.match(runtime, /studio-theme-domain-final-v325-20260806/);
  assert.match(runtime, /THEME_CODE_LINE_GUIDE_V325 = 10000/);
  assert.match(runtime, /v325LegacyMap/);
  assert.match(runtime, /v325ModelStack/);
  assert.match(runtime, /v325CodeModal/);
  assert.doesNotMatch(runtime, /new MutationObserver|setInterval\s*\(|stopImmediatePropagation/);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(|location\.(?:reload|replace)\s*\(/);
});

test("v325 stacks the two real Theme maps and gives code a desktop plus compact geometry", async () => {
  const css = await read("src/studio-theme-domain-final-v325.css");
  assert.match(css, /data-v325-theme-layout="ready"/);
  assert.match(css, /data-v325-model-stack="ready"/);
  assert.match(css, /data-v325-legacy-map="hidden"/);
  assert.match(css, /data-v325-layout-map="ready"/);
  assert.match(css, /grid-template-areas:"code preview"/);
  assert.match(css, /grid-template-areas:"preview" "code"/);
  assert.match(css, /tn-code-gutter-v325/);
  assert.match(css, /width:720px!important/);
  assert.match(css, /width:100%!important/);
  assert.doesNotMatch(css, /#ngeblogging-studio-sidebar|\.sn-side|\.sn-logo-mark|\.nara-assistant|\.nara-floating-button/);
});

test("v325 preserves v312 Theme authority and v322 30k Posts Pages authority", async () => {
  const theme = await read("src/ThemeStudio.jsx");
  const guard = await read("src/studio-content-editor-final-v316.js");
  const release = await read("public/release-v325.json");
  for (const marker of [
    "theme-map-code-editor-v312-20260806",
    "Model editorial",
    "Model majalah",
    "Array.from({ length: 10000 }",
  ]) assert.ok(theme.includes(marker), `missing Theme authority marker: ${marker}`);
  for (const marker of [
    'CONTENT_WORD_LIMIT_RELEASE_V322 = "posts-pages-30000-v322-20260806"',
    "CONTENT_WORD_LIMIT_V316 = 30000",
    "CONTENT_WORD_WARNING_V316 = 27000",
    "publishButton.disabled = over",
  ]) assert.ok(guard.includes(marker), `missing 30k editor marker: ${marker}`);
  assert.match(release, /"themesPreserved": 100/);
  assert.match(release, /"layoutAreasPreserved": 26/);
  assert.match(release, /"layoutModelsPreserved": 2/);
  assert.match(release, /"previewModesPreserved": 8/);
  assert.match(release, /"publicationWordLimit": 30000/);
  assert.match(release, /"draftsRemainUntrimmed": true/);
});

test("v325 keeps custom-domain status truthful when public DNS is NXDOMAIN", async () => {
  const provider = await read("server/cloudflare-full-zone-provider.mjs");
  const release = await read("public/release-v325.json");
  for (const marker of [
    "PUBLIC_DNS_VERIFY_RELEASE_V321",
    "publicDnsResolvesV321",
    "PUBLIC_DNS_NOT_READY",
    '["A", "AAAA"]',
  ]) assert.ok(provider.includes(marker), `missing public DNS marker: ${marker}`);
  assert.match(release, /"nxdomainNeverReportedActive": true/);
  assert.match(release, /"registrarNameserverDelegationRequired": true/);
  assert.match(release, /"registrarNameserverDelegationAutomated": false/);
  assert.match(release, /"fakeProductionDomainStatusAllowed": false/);
});