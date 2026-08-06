import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v321 keeps the real v312 Theme Studio while repairing map and code-editor geometry", async () => {
  const [studio, runtime, css, entry, release] = await Promise.all([
    read("src/ThemeStudio.jsx"),
    read("src/studio-theme-domain-v321.js"),
    read("src/studio-theme-domain-v321.css"),
    read("src/studio-content-editor-responsive-v308.js"),
    read("public/release-v321.json"),
  ]);

  for (const marker of [
    "theme-map-code-editor-v312-20260806",
    "Model editorial",
    "Model majalah",
    "Array.from({ length: 10000 }",
    'data-theme-code-v312="line-numbers-10000"',
  ]) assert.match(studio, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  assert.match(runtime, /STUDIO_THEME_DOMAIN_RELEASE_V321/);
  assert.match(runtime, /themeModelRowsV321/);
  assert.match(runtime, /themeMapScrollShellV321/);
  assert.match(runtime, /codeGeometryV321/);
  assert.match(entry, /studio-theme-domain-v321\.js/);

  assert.match(css, /data-theme-model-rows-v321="true"/);
  assert.match(css, /data-theme-map-scroll-shell-v321="true"/);
  assert.match(css, /width:720px!important/);
  assert.match(css, /overflow-x:auto!important/);
  assert.match(css, /grid-template-areas:"code preview"/);
  assert.match(css, /grid-template-areas:"preview" "code"/);
  assert.match(css, /\.tn-code-pane textarea/);
  assert.match(css, /min-height:520px!important/);
  assert.match(css, /tn-layout-popover-v312/);

  assert.match(release, /"themesPreserved": 100/);
  assert.match(release, /"layoutAreasPreserved": 26/);
  assert.match(release, /"layoutModelsPreserved": 2/);
  assert.match(release, /"previewModesPreserved": 8/);
  assert.match(release, /"codeLineGuidePreserved": 10000/);
});

test("v321 preserves 100 distinct themes, 26 layout areas and the custom HTML CSS JavaScript widget", async () => {
  const { BUILT_IN_THEMES } = await import("../src/theme-system.js");
  const { BUILT_IN_WIDGETS, LAYOUT_AREAS } = await import("../src/widget-system.js");
  assert.equal(BUILT_IN_THEMES.length, 100);
  assert.equal(LAYOUT_AREAS.length, 26);
  assert.equal(BUILT_IN_WIDGETS.length, 26);
  assert.equal(BUILT_IN_WIDGETS.find((item) => item.id === "custom-html")?.name, "HTML / CSS / JavaScript");
});

test("v321 custom domains require real public DNS and expose useful NXDOMAIN diagnostics", async () => {
  const [provider, panel, css, release] = await Promise.all([
    read("server/cloudflare-full-zone-provider.mjs"),
    read("src/DomainPanelV124.jsx"),
    read("src/studio-theme-domain-v321.css"),
    read("public/release-v321.json"),
  ]);

  assert.match(provider, /PUBLIC_DNS_VERIFY_RELEASE_V321/);
  assert.match(provider, /publicDnsResolvesV321/);
  assert.match(provider, /\["A", "AAAA"\]/);
  assert.match(provider, /application\/dns-json/);
  assert.match(provider, /PUBLIC_DNS_NOT_READY/);
  assert.match(panel, /public_dns_verified === true/);
  assert.match(panel, /worker-domain-dns-verified/);
  assert.match(panel, /DNS publik belum aktif/);
  assert.match(panel, /sv124-domain-dns-v321/);
  assert.match(panel, /browser dapat menampilkan NXDOMAIN/);
  assert.match(css, /sv124-domain-dns-v321/);
  assert.match(css, /flex:1 1 100%!important/);
  assert.match(release, /"nxdomainNeverReportedActive": true/);
  assert.match(release, /"registrarNameserverDelegationAutomated": false/);
});

test("v321 Theme and Domain layer is non-destructive to auth, storage, sidebar and Nara", async () => {
  const [runtime, css, release] = await Promise.all([
    read("src/studio-theme-domain-v321.js"),
    read("src/studio-theme-domain-v321.css"),
    read("public/release-v321.json"),
  ]);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(/);
  assert.doesNotMatch(runtime, /sessionStorage\.clear\s*\(/);
  assert.doesNotMatch(runtime, /signOut\s*\(/);
  assert.doesNotMatch(runtime, /location\.(?:reload|replace)\s*\(/);
  assert.doesNotMatch(css, /#ngeblogging-studio-sidebar|\.sn-side|\.sn-logo-mark|\.nara-assistant/);
  assert.match(release, /"sidebarUntouched": true/);
  assert.match(release, /"authSessionUntouched": true/);
  assert.match(release, /"naraBehaviorUntouched": true/);
});
