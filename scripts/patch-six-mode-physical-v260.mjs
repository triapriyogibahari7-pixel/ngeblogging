import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const runtimeUrl = new URL("src/studio-six-mode-authority-v259.js", root);
const cssUrl = new URL("src/studio-six-mode-authority-v259.css", root);

export const RELEASE = "studio-six-mode-physical-v260-20260804";
const RUNTIME_MARKER = "studioSixModePhysicalV260";
const CSS_MARKER = "studio-six-mode-physical-v260";

function resolvedModeBlock() {
  return `function installedApplicationV260() {
  try {
    return Boolean(
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.matchMedia?.("(display-mode: fullscreen)")?.matches ||
      navigator.standalone === true ||
      String(document.referrer || "").startsWith("android-app://")
    );
  } catch {
    return false;
  }
}

function resolvedMode() {
  const view = metrics();

  // Chrome Android "Situs desktop" is allowed to be a real large layout only
  // while the browser is physically reporting the desktop-size layout viewport.
  // A stale v232/data attribute must never keep a normal phone in desktop mode.
  if (view.desktopSitePhone) {
    return { family: "large", mode: "desktop", desktopSitePhone: true };
  }

  const width = Math.max(1, Number(view.layoutWidth || window.innerWidth || 1));
  if (installedApplicationV260() && width <= 760) {
    return { family: "small", mode: "application", desktopSitePhone: false };
  }
  if (width <= 430) return { family: "small", mode: "phone", desktopSitePhone: false };
  if (width <= 600) return { family: "small", mode: "mobile", desktopSitePhone: false };
  if (width <= 760) return { family: "small", mode: "compact", desktopSitePhone: false };
  if (width <= 1180) return { family: "large", mode: "tablet", desktopSitePhone: false };
  if (width <= 1366) return { family: "large", mode: "laptop", desktopSitePhone: false };
  if (width <= 1720) return { family: "large", mode: "desktop", desktopSitePhone: false };
  return { family: "large", mode: "computer", desktopSitePhone: false };
}`;
}

function syncModeLockBlock() {
  return `function syncModeLock() {
  const html = root();
  const mode = resolvedMode();
  html.dataset.studioSixModeAuthorityV259 = RELEASE;
  html.dataset.studioSixModePhysicalV260 = "${RELEASE}";
  html.dataset.studioV259Family = mode.family;
  html.dataset.studioV259Mode = mode.mode;
  html.dataset.studioV259DesktopSitePhone = String(mode.desktopSitePhone);

  // Keep the historical desktop-site markers only while Chrome Android is
  // actually exposing the desktop layout viewport. These markers remain for
  // compatibility, but they no longer decide resolvedMode().
  if (mode.desktopSitePhone) {
    html.dataset.studioDesktopSitePhone = "true";
    html.dataset.studioResponsiveMode = "desktop";
    html.dataset.studioDeviceMode = "large";
    html.dataset.studioDeviceVariant = "desktop";
    html.dataset.v232ModeLock = "desktop-site-large";
  } else {
    if (html.dataset.v232ModeLock === "desktop-site-large") delete html.dataset.v232ModeLock;
    if (html.dataset.studioDesktopSitePhone === "true") delete html.dataset.studioDesktopSitePhone;
  }
  return mode;
}`;
}

async function patchRuntime() {
  let source = await readFile(runtimeUrl, "utf8");
  if (!source.includes(RUNTIME_MARKER)) {
    const resolvedPattern = /function resolvedMode\(\) \{[\s\S]*?\n\}\n\nfunction syncModeLock/;
    if (!resolvedPattern.test(source)) throw new Error("V260_RESOLVED_MODE_ANCHOR_MISSING");
    source = source.replace(resolvedPattern, `${resolvedModeBlock()}\n\nfunction syncModeLock`);

    const syncPattern = /function syncModeLock\(\) \{[\s\S]*?\n\}\n\nfunction revealControl/;
    if (!syncPattern.test(source)) throw new Error("V260_SYNC_MODE_LOCK_ANCHOR_MISSING");
    source = source.replace(syncPattern, `${syncModeLockBlock()}\n\nfunction revealControl`);
    source += `\n/* ${RUNTIME_MARKER}=${RELEASE}; Theme preview datasets no longer decide the physical shell family. */\n`;
  }

  const start = source.indexOf("function resolvedMode()");
  const end = source.indexOf("function syncModeLock", start);
  const block = source.slice(start, end);
  if (!start || end <= start) throw new Error("V260_ACTIVE_RESOLVED_MODE_MISSING");
  if (/studioResponsiveMode|studioDeviceVariant|v232ModeLock/.test(block)) {
    throw new Error("V260_STALE_PREVIEW_OR_LOCK_CONTROLS_PHYSICAL_MODE");
  }

  for (const marker of [
    RUNTIME_MARKER,
    "function installedApplicationV260()",
    "if (view.desktopSitePhone)",
    'width <= 430) return { family: "small", mode: "phone"',
    'width <= 600) return { family: "small", mode: "mobile"',
    'width <= 760) return { family: "small", mode: "compact"',
    'width <= 1180) return { family: "large", mode: "tablet"',
    'width <= 1366) return { family: "large", mode: "laptop"',
    'width <= 1720) return { family: "large", mode: "desktop"',
    'mode: "computer"',
    'delete html.dataset.v232ModeLock',
  ]) {
    if (!source.includes(marker)) throw new Error(`V260_RUNTIME_MARKER_MISSING:${marker}`);
  }

  await writeFile(runtimeUrl, source, "utf8");
}

function physicalGuardCss() {
  return `
/* ${CSS_MARKER} — physical viewport wins even during the first frame before JS datasets synchronize. */
@media (max-width:760px) {
  html[data-studio-six-mode-authority-v259] .sn-main {
    margin-left:0!important;
    margin-right:0!important;
    left:0!important;
    right:auto!important;
    width:100%!important;
    min-width:0!important;
    max-width:100%!important;
    transform:none!important;
    translate:none!important;
    overflow-x:clip!important;
  }
  html[data-studio-six-mode-authority-v259] .sn-top {
    left:0!important;
    right:0!important;
    width:100%!important;
    min-width:0!important;
    max-width:100%!important;
    padding-left:10px!important;
    padding-right:62px!important;
    transform:none!important;
  }
  html[data-studio-six-mode-authority-v259] .sn-sidebar-toggle {
    display:grid!important;
    visibility:visible!important;
    opacity:1!important;
    pointer-events:auto!important;
  }
  html[data-studio-six-mode-authority-v259] #ngeblogging-studio-sidebar {
    width:var(--v259-drawer)!important;
    min-width:min(var(--v259-drawer),calc(100vw - 28px))!important;
    max-width:calc(100vw - 28px)!important;
    transform:translate3d(-105%,0,0)!important;
    visibility:hidden!important;
    pointer-events:none!important;
  }
  html[data-studio-six-mode-authority-v259] #ngeblogging-studio-sidebar.mobile-open {
    transform:translate3d(0,0,0)!important;
    visibility:visible!important;
    pointer-events:auto!important;
  }
  html[data-studio-six-mode-authority-v259] .sn-side-backdrop {
    background:transparent!important;
    filter:none!important;
    backdrop-filter:none!important;
    -webkit-backdrop-filter:none!important;
    box-shadow:none!important;
  }
  html[data-studio-six-mode-authority-v259] :is(
    .sn-view-pad,.sv124-page,.mv176-page,.sn-api-page,.sn-media-library,.tn-studio,.ce-app,
    .sn-view-pad>*,.sv124-page>*,.mv176-page>*,.sn-api-page>*,.sn-media-library>*,.tn-studio>*,.ce-app>*,
    .sn-settings-grid,.sn-settings-grid>*,.sn-home-grid,.sn-home-grid>*,.sn-content-card,.sn-content-card>*
  ) {
    min-width:0!important;
    max-width:100%!important;
    box-sizing:border-box!important;
  }
  html[data-studio-six-mode-authority-v259] :is(.sn-view-pad,.sv124-page,.mv176-page,.sn-api-page,.sn-media-library,.tn-studio,.ce-app) {
    width:100%!important;
    margin-left:0!important;
    margin-right:0!important;
    left:auto!important;
    right:auto!important;
    transform:none!important;
    overflow-x:clip!important;
  }
  html[data-studio-six-mode-authority-v259] :is(.sn-home-grid,.sn-settings-grid) {
    width:100%!important;
    grid-template-columns:minmax(0,1fr)!important;
  }
  html[data-studio-six-mode-authority-v259] .tn-code-workspace {
    width:100%!important;
    min-width:0!important;
    max-width:100%!important;
    display:grid!important;
    grid-template-columns:minmax(0,1fr)!important;
    overflow:hidden!important;
  }
  html[data-studio-six-mode-authority-v259] .tn-code-preview-pane {
    order:1!important;
    min-width:0!important;
    max-width:100%!important;
  }
  html[data-studio-six-mode-authority-v259] .tn-code-pane {
    order:2!important;
    min-width:0!important;
    max-width:100%!important;
  }
  html[data-studio-six-mode-authority-v259] .ce-actions {
    width:100%!important;
    min-width:0!important;
    max-width:100%!important;
    grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
  }
  html[data-studio-six-mode-authority-v259] .nara-floating-button {
    position:fixed!important;
    right:calc(var(--v259-safe-right) + 2px)!important;
    bottom:calc(var(--v259-safe-bottom) + 2px)!important;
    left:auto!important;
    top:auto!important;
    transform:none!important;
    animation:none!important;
    transition:none!important;
    visibility:visible!important;
    opacity:1!important;
    pointer-events:auto!important;
  }
}
`;
}

async function patchStyles() {
  let source = await readFile(cssUrl, "utf8");
  if (!source.includes(CSS_MARKER)) source += physicalGuardCss();

  for (const marker of [
    CSS_MARKER,
    "@media (max-width:760px)",
    "margin-left:0!important",
    "#ngeblogging-studio-sidebar.mobile-open",
    "background:transparent!important",
    ".tn-code-workspace",
    "grid-template-columns:minmax(0,1fr)!important",
    ".nara-floating-button",
    "position:fixed!important",
  ]) {
    if (!source.includes(marker)) throw new Error(`V260_CSS_MARKER_MISSING:${marker}`);
  }
  await writeFile(cssUrl, source, "utf8");
}

await patchRuntime();
await patchStyles();
console.log(`Applied ${RELEASE}; the six-mode shell follows the real viewport and keeps Theme preview independent.`);
