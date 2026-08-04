import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const jsUrl = new URL("src/studio-visual-native-v257.js", root);
const cssUrl = new URL("src/studio-visual-native-v257.css", root);

export const RELEASE = "studio-physical-mode-v259-20260804";
const JS_MARKER = "studioPhysicalModeV259";
const CSS_MARKER = "studio-physical-mode-v259";

function physicalModeBlock() {
  return `function installedApplicationV259() {
  try {
    return Boolean(
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.matchMedia?.("(display-mode: fullscreen)")?.matches ||
      window.navigator?.standalone === true ||
      String(document.referrer || "").startsWith("android-app://")
    );
  } catch {
    return false;
  }
}

function physicalViewportWidthV259() {
  const layoutWidth = Number(document.documentElement.clientWidth || window.innerWidth || 1);
  const visualWidth = Number(window.visualViewport?.width || layoutWidth || 1);
  return Math.max(1, Math.min(layoutWidth || visualWidth, visualWidth || layoutWidth));
}

function responsiveMode() {
  // v259: shell Studio selalu mengikuti viewport fisik. Dataset preview Tema
  // (studioResponsiveMode / studioDeviceVariant) tidak boleh lagi mengubah
  // sidebar, topbar, editor, atau lebar halaman nyata.
  const width = physicalViewportWidthV259();
  if (installedApplicationV259() && width <= 760) return "application";
  if (width <= 430) return "phone";
  if (width <= 600) return "mobile";
  if (width <= 760) return "compact";
  if (width <= 1180) return "tablet";
  if (width <= 1536) return "laptop";
  return "computer";
}`;
}

async function patchRuntime() {
  let source = await readFile(jsUrl, "utf8");
  if (!source.includes(JS_MARKER)) {
    const pattern = /function responsiveMode\(\) \{[\s\S]*?\n\}\n\nfunction family/;
    if (!pattern.test(source)) throw new Error("V259_RESPONSIVE_MODE_ANCHOR_MISSING");
    source = source.replace(pattern, `${physicalModeBlock()}\n\nfunction family`);
    source += `\n/* ${JS_MARKER}=${RELEASE}; physical shell is decoupled from Theme preview selection. */\n`;
  }

  for (const marker of [
    "function physicalViewportWidthV259()",
    "function installedApplicationV259()",
    'width <= 430) return "phone"',
    'width <= 600) return "mobile"',
    'width <= 760) return "compact"',
    'width <= 1180) return "tablet"',
    'width <= 1536) return "laptop"',
    'return "computer"',
    JS_MARKER,
  ]) {
    if (!source.includes(marker)) throw new Error(`V259_RUNTIME_MARKER_MISSING:${marker}`);
  }

  const modeStart = source.indexOf("function responsiveMode()");
  const familyStart = source.indexOf("function family", modeStart);
  const activeModeBlock = source.slice(modeStart, familyStart);
  if (/studioResponsiveMode|studioDeviceVariant/.test(activeModeBlock)) {
    throw new Error("V259_PREVIEW_DATASET_STILL_CONTROLS_PHYSICAL_MODE");
  }

  await writeFile(jsUrl, source, "utf8");
}

function physicalCss() {
  return `
/* ${CSS_MARKER} — hard physical viewport guard. Theme preview selection must not offset the real Studio. */
@media (max-width:760px) {
  html[data-studio-visual-native-v257],
  html[data-studio-visual-native-v257] body,
  html[data-studio-visual-native-v257] #root,
  html[data-studio-visual-native-v257] .sn-shell {
    width:100%!important;
    min-width:0!important;
    max-width:100%!important;
    overflow-x:clip!important;
  }

  html[data-studio-visual-native-v257] .sn-main {
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

  html[data-studio-visual-native-v257] .sn-top {
    left:0!important;
    right:0!important;
    width:100%!important;
    min-width:0!important;
    max-width:100%!important;
    padding-left:10px!important;
    padding-right:62px!important;
    transform:none!important;
  }

  html[data-studio-visual-native-v257] .sn-sidebar-toggle {
    display:grid!important;
    visibility:visible!important;
    opacity:1!important;
    pointer-events:auto!important;
    width:46px!important;
    height:46px!important;
    min-width:46px!important;
    min-height:46px!important;
    max-width:46px!important;
    max-height:46px!important;
    place-items:center!important;
    padding:0!important;
    margin:0!important;
    border-radius:13px!important;
    overflow:hidden!important;
  }

  html[data-studio-visual-native-v257] .sn-sidebar-toggle .sn-desktop-sidebar-icon {display:none!important}
  html[data-studio-visual-native-v257] .sn-mobile-menu-mark,
  html[data-studio-visual-native-v257] .sn-mobile-menu-mark strong {
    width:100%!important;
    height:100%!important;
    display:grid!important;
    place-items:center!important;
    margin:0!important;
    padding:0!important;
  }
  html[data-studio-visual-native-v257] .sn-mobile-menu-mark strong {
    color:#fff!important;
    font:850 28px/1 Arial,Helvetica,sans-serif!important;
    text-align:center!important;
    visibility:visible!important;
    opacity:1!important;
    filter:none!important;
    transform:none!important;
  }

  html[data-studio-visual-native-v257] #ngeblogging-studio-sidebar {
    display:flex!important;
    position:fixed!important;
    z-index:9900!important;
    inset:0 auto 0 0!important;
    width:min(82vw,310px)!important;
    min-width:0!important;
    max-width:calc(100vw - 38px)!important;
    height:100dvh!important;
    min-height:100dvh!important;
    margin:0!important;
    background:#fff!important;
    border-right:1px solid #dfe6ef!important;
    overflow:hidden!important;
    transform:translate3d(-105%,0,0)!important;
    visibility:hidden!important;
    opacity:1!important;
    pointer-events:none!important;
    filter:none!important;
    box-shadow:none!important;
  }

  html[data-studio-visual-native-v257] #ngeblogging-studio-sidebar.mobile-open {
    transform:translate3d(0,0,0)!important;
    visibility:visible!important;
    opacity:1!important;
    pointer-events:auto!important;
    box-shadow:0 16px 48px rgba(18,38,72,.12)!important;
  }

  html[data-studio-visual-native-v257] #ngeblogging-studio-sidebar.mobile-open ~ .sn-main .sn-sidebar-toggle,
  html[data-studio-v257-sidebar="open"] .sn-sidebar-toggle {
    visibility:hidden!important;
    opacity:0!important;
    pointer-events:none!important;
  }

  html[data-studio-visual-native-v257] #ngeblogging-studio-sidebar .sn-logo {
    grid-template-columns:46px minmax(0,1fr)!important;
  }
  html[data-studio-visual-native-v257] #ngeblogging-studio-sidebar .sn-logo>b {
    display:block!important;
    align-self:center!important;
    font:800 20px/1.08 system-ui,sans-serif!important;
    white-space:nowrap!important;
  }

  html[data-studio-visual-native-v257] .sn-side-backdrop {
    position:fixed!important;
    z-index:9800!important;
    inset:0 0 0 min(82vw,310px)!important;
    width:auto!important;
    height:100dvh!important;
    margin:0!important;
    border:0!important;
    background:transparent!important;
    opacity:1!important;
    filter:none!important;
    backdrop-filter:none!important;
    -webkit-backdrop-filter:none!important;
    box-shadow:none!important;
  }
  html[data-studio-v257-sidebar="closed"] .sn-side-backdrop {
    display:none!important;
    pointer-events:none!important;
  }
  html[data-studio-v257-sidebar="open"] .sn-side-backdrop {
    display:block!important;
    pointer-events:auto!important;
  }

  html[data-studio-visual-native-v257] :is(
    .sn-view-pad,.sv124-page,.mv176-page,.sn-api-page,.sn-media-library,.tn-studio,.ce-app,
    .sn-view-pad>*,.sv124-page>*,.mv176-page>*,.sn-api-page>*,.sn-media-library>*,.tn-studio>*,.ce-app>*,
    .sn-home-grid,.sn-home-grid>*,.sn-settings-grid,.sn-settings-grid>*,.sn-content-card,.sn-content-card>*
  ) {
    min-width:0!important;
    max-width:100%!important;
    box-sizing:border-box!important;
  }
  html[data-studio-visual-native-v257] :is(.sn-view-pad,.sv124-page,.mv176-page,.sn-api-page,.sn-media-library,.tn-studio,.ce-app) {
    width:100%!important;
    margin-left:0!important;
    margin-right:0!important;
    left:auto!important;
    right:auto!important;
    transform:none!important;
    overflow-x:clip!important;
  }
  html[data-studio-visual-native-v257] :is(.sn-view-pad,.sv124-page,.mv176-page,.sn-api-page,.sn-media-library) {
    padding-left:12px!important;
    padding-right:12px!important;
  }
  html[data-studio-visual-native-v257] :is(.sn-home-grid,.sn-settings-grid) {
    width:100%!important;
    grid-template-columns:minmax(0,1fr)!important;
  }

  html[data-studio-visual-native-v257] .tn-code-workspace {
    width:100%!important;
    min-width:0!important;
    max-width:100%!important;
    height:auto!important;
    min-height:0!important;
    display:flex!important;
    flex-direction:column!important;
    gap:10px!important;
    overflow:visible!important;
  }
  html[data-studio-visual-native-v257] .tn-code-preview-pane {
    order:1!important;
    width:100%!important;
    min-width:0!important;
    max-width:100%!important;
    min-height:300px!important;
    overflow:hidden!important;
  }
  html[data-studio-visual-native-v257] .tn-code-pane {
    order:2!important;
    width:100%!important;
    min-width:0!important;
    max-width:100%!important;
    min-height:540px!important;
    overflow:hidden!important;
  }
  html[data-studio-visual-native-v257] .tn-code-pane textarea {
    width:100%!important;
    min-width:0!important;
    max-width:100%!important;
    min-height:480px!important;
    max-height:72dvh!important;
    overflow:auto!important;
    white-space:pre!important;
    overflow-wrap:normal!important;
  }

  html[data-studio-visual-native-v257] :is(.tn-device-switch,.ce-tabs,.ce-ribbon) {
    max-width:100%!important;
    overflow-x:auto!important;
    overflow-y:hidden!important;
    flex-wrap:nowrap!important;
  }

  html[data-studio-visual-native-v257] .nara-floating-button {
    position:fixed!important;
    right:max(14px,env(safe-area-inset-right,0px))!important;
    bottom:max(14px,env(safe-area-inset-bottom,0px))!important;
    left:auto!important;
    top:auto!important;
    width:56px!important;
    height:56px!important;
    min-width:56px!important;
    min-height:56px!important;
    max-width:56px!important;
    max-height:56px!important;
    margin:0!important;
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
  if (!source.includes(CSS_MARKER)) source += physicalCss();

  for (const marker of [
    CSS_MARKER,
    "@media (max-width:760px)",
    ".sn-main",
    "margin-left:0!important",
    "#ngeblogging-studio-sidebar.mobile-open",
    "background:transparent!important",
    ".tn-code-workspace",
    "flex-direction:column!important",
    ".nara-floating-button",
    "position:fixed!important",
  ]) {
    if (!source.includes(marker)) throw new Error(`V259_CSS_MARKER_MISSING:${marker}`);
  }

  await writeFile(cssUrl, source, "utf8");
}

await patchRuntime();
await patchStyles();
console.log(`Applied ${RELEASE}; physical shell no longer follows Theme preview datasets.`);
