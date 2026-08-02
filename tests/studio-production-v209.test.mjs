import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("v209 loads after v208 and neutralizes the historical second Studio reload", async () => {
  const studio = await read("src/Studio.jsx");
  const runtime = await read("src/studio-production-v209.js");
  const chain = await read("scripts/patch-service-worker-v179.mjs");
  assert.ok(studio.indexOf('import "./studio-production-v209.js";') > studio.indexOf('import "./studio-production-v208.js";'));
  assert.match(chain, /patch-production-v208\.mjs[\s\S]*patch-production-v209\.mjs[\s\S]*patch-public-site-v209\.mjs/);
  assert.match(runtime, /ngeblogging-v208-resume-once/);
  assert.match(runtime, /in-place-recovery/);
  assert.doesNotMatch(runtime, /window\.location\.(replace|reload)/);
});

test("Theme hero has one canonical label for each of four real actions", async () => {
  const runtime = await read("src/studio-production-v209.js");
  const css = await read("src/studio-production-v209.css");
  for (const label of ["Sesuaikan", "Edit Tata Letak", "Edit Kode", "Lihat situs"]) assert.ok(runtime.includes(label));
  assert.match(runtime, /childNodes/);
  assert.match(runtime, /Node\.TEXT_NODE/);
  assert.match(css, /\.v209-button-label/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test("Theme layout map has four real left and four real right areas and each box opens its area", async () => {
  const css = await read("src/studio-production-v209.css");
  const widgets = await read("src/widget-system.js");
  const layoutRuntime = await read("src/theme-layout-runtime-v170.js");
  const theme = await read("src/ThemeStudio.jsx");
  for (const area of ["sidebar-left-1","sidebar-left-2","sidebar-left-3","sidebar-left-4","sidebar-right-1","sidebar-right-2","sidebar-right-3","sidebar-right-4"]) {
    assert.ok(css.includes(`.${area}`), `CSS missing ${area}`);
  }
  assert.match(widgets, /id: "sidebar-right-4"/);
  assert.match(layoutRuntime, /RIGHT_AREAS = \["sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4"\]/);
  assert.match(theme, /onOpenWidgets\(area\.id\)/);
  assert.match(theme, /preferredArea=\{widgetArea\}/);
  assert.match(theme, /ngeblogging-layout-map/);
});

test("Widget Studio keeps all built-ins and makes HTML JavaScript a real sandbox editor", async () => {
  const widgets = await read("src/widget-system.js");
  const theme = await read("src/ThemeStudio.jsx");
  assert.match(widgets, /name: "HTML \/ JavaScript"/);
  assert.match(widgets, /sandbox="allow-scripts allow-forms"/);
  assert.match(theme, /orderedWidgets/);
  assert.match(theme, /a\.id === "custom-html"/);
  assert.match(theme, /tn-widget-custom-code-v209/);
  assert.match(theme, />HTML<textarea/);
  assert.match(theme, />JavaScript<textarea/);
  assert.match(theme, /Tema Custom/);
});

test("Edit Kode retains HTML CSS JavaScript and live preview", async () => {
  const theme = await read("src/ThemeStudio.jsx");
  assert.match(theme, /id:"html",label:"HTML"/);
  assert.match(theme, /id:"css",label:"CSS"/);
  assert.match(theme, /id:"javascript",label:"JavaScript"/);
  assert.match(theme, /PREVIEW LANGSUNG/);
  assert.match(theme, /setModal\("code"\)/);
  assert.match(theme, /Editor HTML, CSS, dan JavaScript/);
});

test("Nara plus keeps native Camera Photo File and small medium nonmodal containment", async () => {
  const nara = await read("src/NaraAssistant.jsx");
  const runtime = await read("src/studio-production-v209.js");
  const css = await read("src/studio-production-v209.css");
  assert.match(nara, /<b>Kamera<\/b>/);
  assert.match(nara, /<b>Foto<\/b>/);
  assert.match(nara, /<b>File teks<\/b>/);
  assert.match(nara, /capture="environment"/);
  assert.match(runtime, /camera-photo-file/);
  assert.match(runtime, /full \? "modal" : "nonmodal"/);
  assert.match(css, /data-v209-attachment-menu="camera-photo-file"/);
  assert.match(css, /nara-assistant-layer\[data-v209-mode="nonmodal"\]/);
});

test("Domain mobile explicitly prevents vertical one-character typography", async () => {
  const css = await read("src/studio-production-v209.css");
  assert.match(css, /\.sv124-domain-page :is\(h1,h2,h3,p,b,small,label,span,code\)/);
  assert.match(css, /writing-mode:horizontal-tb!important/);
  assert.match(css, /word-break:normal!important/);
  assert.match(css, /\.sv124-domain-register h2/);
});

test("public site publishes site state only after Pages and Posts are ready", async () => {
  const publicSite = await read("src/PublicSiteNext.jsx");
  assert.match(publicSite, /PUBLIC_SITE_SINGLE_RENDER_V209/);
  const marker = publicSite.indexOf("PUBLIC_SITE_SINGLE_RENDER_V209");
  const posts = publicSite.indexOf("setPosts(postPage.contents)", marker);
  const pages = publicSite.indexOf("setPages(pageRows.sort", marker);
  const site = publicSite.indexOf("setSite(resolved)", marker);
  assert.ok(posts > marker && pages > marker && site > posts && site > pages, "site must be committed last");
});

test("v209 service worker rotates cache without destructive logout or forced old-tab navigation", async () => {
  const patch = await read("scripts/patch-production-v209.mjs");
  const sw = await read("public/sw.js");
  assert.match(patch, /ngeblogging-app-v209-theme-domain-nara-20260802/);
  assert.match(patch, /theme-domain-nara-cache-v209/);
  assert.match(sw, /studio-production-v209-20260802/);
  assert.doesNotMatch(patch, /localStorage\.clear\s*\(|signOut\s*\(/);
  assert.doesNotMatch(sw, /await refreshStaleWindow\(client, url\);/);
});
