import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v323 Theme geometry preserves the real 100-theme 26-area authority without touching sidebar or Nara", async () => {
  const [runtime, css, theme, release] = await Promise.all([
    read("src/studio-production-polish-v323.js"),
    read("src/studio-production-polish-v323.css"),
    read("src/ThemeStudio.jsx"),
    read("public/release-v323.json"),
  ]);

  assert.match(runtime, /studio-production-polish-v323-20260806/);
  assert.match(runtime, /productionModelRowsV323/);
  assert.match(runtime, /productionMapV323/);
  assert.match(runtime, /productionCodeV323/);
  assert.match(css, /data-production-polish-v323="ready"/);
  assert.match(css, /width:680px!important/);
  assert.match(css, /grid-template-areas:"code preview"/);
  assert.match(css, /grid-template-areas:"preview" "code"/);
  assert.match(css, /tn-layout-popover-v312/);
  assert.doesNotMatch(css, /#ngeblogging-studio-sidebar|\.sn-side|\.sn-logo-mark|\.nara-assistant|\.nara-floating-button/);

  // The build-time v312 authority must still be present after production prebuild.
  assert.match(theme, /theme-map-code-editor-v312-20260806/);
  assert.match(theme, /Model editorial/);
  assert.match(theme, /Model majalah/);
  assert.match(theme, /Array\.from\(\{ length: 10000 \}/);

  assert.match(release, /"themesPreserved": 100/);
  assert.match(release, /"layoutAreasPreserved": 26/);
  assert.match(release, /"layoutModelsPreserved": 2/);
  assert.match(release, /"previewModesPreserved": 8/);
  assert.match(release, /"codeLineGuidePreserved": 10000/);
  assert.match(release, /"sidebarUntouched": true/);
  assert.match(release, /"naraBehaviorUntouched": true/);
});

test("v323 shared Posts and Pages editor keeps the 30,000-word non-destructive rule and responsive geometry", async () => {
  const [entry, runtime, css, guard, editor, release] = await Promise.all([
    read("src/studio-content-editor-responsive-v308.js"),
    read("src/studio-production-polish-v323.js"),
    read("src/studio-production-polish-v323.css"),
    read("src/studio-content-editor-final-v316.js"),
    read("src/ContentEditor.jsx"),
    read("public/release-v323.json"),
  ]);

  assert.match(entry, /studio-production-polish-v323\.js/);
  assert.match(runtime, /productionEditorV323/);
  assert.match(css, /data-production-editor-v323="ready"/);
  assert.match(css, /grid-template-areas:"back file" "actions actions"/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) clamp\(300px,26vw,360px\)/);
  assert.match(css, /\.ce-paper\{width:100%!important/);

  assert.match(editor, /const isPage = doc\.type === "page"/);
  assert.match(guard, /CONTENT_WORD_LIMIT_V316 = 30000/);
  assert.match(guard, /CONTENT_WORD_WARNING_V316 = 27000/);
  assert.match(guard, /Draf tetap aman dan tidak dipotong/);
  assert.match(guard, /publishButton\.disabled = over/);
  assert.doesNotMatch(guard, /slice\([^\n]*30000|substring\([^\n]*30000/);
  assert.match(release, /"publicationWordLimit": 30000/);
  assert.match(release, /"draftsNeverTrimmedByWordGuard": true/);
});

test("v323 keeps custom-domain status truthful for public NXDOMAIN and makes compact actions readable", async () => {
  const [provider, css, release] = await Promise.all([
    read("server/cloudflare-full-zone-provider.mjs"),
    read("src/studio-production-polish-v323.css"),
    read("public/release-v323.json"),
  ]);

  assert.match(provider, /PUBLIC_DNS_VERIFY_RELEASE_V321/);
  assert.match(provider, /publicDnsResolvesV321/);
  assert.match(provider, /PUBLIC_DNS_NOT_READY/);
  assert.match(provider, /\["A", "AAAA"\]/);
  assert.match(css, /data-production-domain-v323="ready"/);
  assert.match(css, /\.sv124-domain-item footer/);
  assert.match(css, /width:100%!important/);
  assert.match(release, /"nxdomainNeverReportedActive": true/);
  assert.match(release, /"registrarNameserverDelegationRequired": true/);
  assert.match(release, /"registrarNameserverDelegationAutomated": false/);
});

test("v323 production path is wired to Cloudflare and the service-worker rotation patch", async () => {
  const [chain, patch, workflow, wrangler, release] = await Promise.all([
    read("scripts/patch-posts-pages-30k-v322.mjs"),
    read("scripts/patch-studio-production-polish-v323.mjs"),
    read(".github/workflows/deploy-production-v273.yml"),
    read("wrangler.production.jsonc"),
    read("public/release-v323.json"),
  ]);

  assert.match(chain, /patch-studio-production-polish-v323\.mjs/);
  assert.match(patch, /ngeblogging-app-v323-production-polish-20260806/);
  assert.match(patch, /studio-production-polish-cache-v323/);
  assert.match(patch, /STUDIO_PRODUCTION_POLISH_RELEASE_V323/);
  assert.match(patch, /POSTS_PAGES_30000_RELEASE_V322/);
  assert.match(patch, /STUDIO_THEME_DOMAIN_RELEASE_V321/);

  assert.match(workflow, /Deploy Ngeblogging Production v323/);
  assert.match(workflow, /npx wrangler deploy --config wrangler\.production\.jsonc --keep-vars/);
  assert.match(workflow, /release-v323\.json/);
  assert.match(workflow, /release-v322\.json/);
  assert.match(workflow, /release-v321\.json/);
  assert.match(wrangler, /studio-production-polish-v323-20260806/);
  assert.match(release, /"cloudflareWorkflowUpgraded": true/);
  assert.match(release, /"liveReleaseVerificationRequired": true/);
});
