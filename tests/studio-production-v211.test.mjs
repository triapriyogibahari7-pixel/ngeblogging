import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, WIDGET_COUNT } from "../src/widget-system.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const entry = read("src/Studio.jsx");
const runtime = read("src/studio-production-v211.js");
const css = read("src/studio-production-v211.css");
const themeStudio = read("src/ThemeStudio.jsx");
const nara = read("src/NaraAssistant.jsx");
const publicSite = read("src/PublicSiteNext.jsx");
const chain = read("scripts/patch-service-worker-v179.mjs");
const patch = read("scripts/patch-production-v211.mjs");
const worker = read("public/sw.js");
const release = JSON.parse(read("public/release-v211.json"));
const RELEASE = "studio-production-v211-20260802";

test("v211 runs after v210 and keeps v210 as compatibility authority", () => {
  assert.match(entry, /studio-production-v210\.js/);
  assert.match(entry, /studio-production-v211\.js/);
  assert.ok(entry.indexOf("studio-production-v210.js") < entry.indexOf("studio-production-v211.js"));
  assert.ok(chain.indexOf("patch-production-v211.mjs") > chain.indexOf("patch-production-v210.mjs"));
  assert.match(runtime, new RegExp(RELEASE));
  assert.match(worker, /STUDIO_PRODUCTION_RELEASE_V211/);
  assert.match(worker, /ngeblogging-app-v210-theme-nara-domain-mobile-20260802/);
});

test("physical mobile rules do not depend only on CSS viewport width", () => {
  assert.match(runtime, /studioMobileV211/);
  assert.match(runtime, /studioDesktopSitePhone/);
  assert.match(runtime, /physicalShortEdge/);
  assert.match(css, /data-studio-mobile-v211="true"/);
  assert.match(css, /tn-code-workspace\[data-v211-workspace="stacked"\]/);
  assert.match(css, /tn-layout-canvas-v170\[data-v211-layout-canvas="physical-mobile-map"\]/);
});

test("Theme code modal escapes Studio clipping and preserves desktop split plus mobile stack", () => {
  assert.match(themeStudio, /createPortal/);
  assert.match(themeStudio, /data-theme-modal-portal="body"/);
  assert.match(css, /tn-modal-layer\[data-theme-modal-portal="body"\]/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(css, /data-v211-workspace="stacked"[\s\S]*grid-template-columns:minmax\(0,1fr\)/);
  for (const marker of ["HTML", "CSS", "JavaScript", "PREVIEW LANGSUNG"]) assert.ok(themeStudio.includes(marker), marker);
});

test("layout map keeps four left and four right slots readable on physical phones", () => {
  for (const slot of ["sidebar-left-1", "sidebar-left-2", "sidebar-left-3", "sidebar-left-4", "sidebar-right-1", "sidebar-right-2", "sidebar-right-3", "sidebar-right-4"]) {
    assert.ok(css.includes(slot), `v211 CSS missing ${slot}`);
  }
  assert.match(css, /sidebar-left-4 content-main sidebar-right-4/);
  assert.match(runtime, /data-v211-map-slot|v211MapSlot/);
});

test("Nara plus is a real Camera Photo File menu and model intelligence stay visible", () => {
  assert.match(nara, /aria-controls="nara-attachment-menu-v211"/);
  assert.match(nara, /aria-expanded=\{attachmentMenu\}/);
  assert.match(nara, /role="menu"/);
  for (const label of ["Kamera", "Foto", "File"]) assert.ok(nara.includes(label), label);
  assert.match(runtime, /nara-select\.intelligence/);
  assert.match(runtime, /nara-select\.model/);
  assert.match(css, /nara-select\[data-v211-select="visible"\]/);
  assert.match(css, /nara-assistant-shell\[data-v211-size="small"\][\s\S]*52dvh/);
  assert.match(css, /nara-assistant-shell\[data-v211-size="medium"\][\s\S]*72dvh/);
  assert.match(css, /data-v211-mode="nonmodal"/);
});

test("Domain publication control remains horizontal on synthetic desktop-site phones", () => {
  assert.match(runtime, /jadikan draf\|terbitkan/);
  assert.match(css, /data-v211-domain-action="horizontal"/);
  assert.match(css, /sv124-free-domain>aside \.sv124-primary[\s\S]*min-width:150px/);
  assert.match(css, /sv124-free-domain>div h2[\s\S]*overflow-wrap:anywhere/);
});

test("one hundred themes, custom code widget, and single public-site initial render remain preserved", () => {
  assert.equal(THEME_COUNT, 100);
  assert.equal(BUILT_IN_THEMES.length, 100);
  assert.equal(new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size, 100);
  assert.equal(WIDGET_COUNT, 26);
  assert.ok(BUILT_IN_WIDGETS.some((widget) => widget.id === "custom-html"));
  assert.match(publicSite, /PUBLIC_SITE_SINGLE_RENDER_V209/);
});

test("v211 build patch remains non-destructive to login and rotates cache safely", () => {
  assert.doesNotMatch(patch, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
  assert.doesNotMatch(runtime, /localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/);
  assert.match(patch, /ngeblogging-app-v211-mobile-theme-nara-domain-20260802/);
  assert.match(patch, /mobile-theme-nara-domain-cache-v211/);
  assert.doesNotMatch(worker, /await refreshStaleWindow\(client, url\);/);
});

test("v211 metadata is factual and does not claim unsupported mass capacity", () => {
  assert.equal(release.release, RELEASE);
  assert.equal(release.preserved.themeCount, 100);
  assert.equal(release.preserved.widgetCount, 26);
  assert.equal(release.repairs.themeModalPortaledToBody, true);
  assert.equal(release.repairs.naraAttachmentPlusOpensCameraPhotoFile, true);
  assert.equal(release.repairs.domainPublicationActionHorizontal, true);
  assert.equal(release.validation.massCapacityClaimed, false);
  assert.equal(release.validation.realDeviceRequiredBeforeHundredPercentClaim, true);
});
