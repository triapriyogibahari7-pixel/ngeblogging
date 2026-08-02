import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const write = (path, value) => writeFile(new URL(path, root), value);
const RELEASE = "studio-production-v206-20260802";
const SW_VERSION = "ngeblogging-app-v206-native-theme-nara-session-20260802";
const SW_CACHE = "native-theme-nara-session-cache-v206";
const SW_REFRESH = "native-theme-nara-session-v206";

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V206_SW_ANCHOR_MISSING:${line}`);
  return next;
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  if (!source.includes('import "./studio-production-v206.js";')) {
    const anchor = 'import "./studio-production-v205-hotfix.js";';
    if (!source.includes(anchor)) throw new Error("V206_V205_HOTFIX_ENTRY_MISSING");
    source = source.replace(anchor, `${anchor}\nimport "./studio-production-v206.js";`);
    await write(path, source);
  }
}

async function patchThemeStudio() {
  const path = "src/ThemeStudio.jsx";
  let source = await read(path);
  if (!source.includes('data-v206-theme-action="layout"')) {
    const oldActions = '<div className="tn-hero-actions"><button className="primary" onClick={() => setModal("customize")}><SlidersHorizontal/> Sesuaikan</button><button onClick={() => setModal("code")}><Code2/> Edit HTML</button><button onClick={() => setModal("widgets")}><Blocks/> {WIDGET_COUNT} Widget</button><button onClick={openSite}><ExternalLink/> Lihat situs</button></div>';
    const newActions = '<div className="tn-hero-actions"><button className="primary" onClick={() => setModal("customize")}><SlidersHorizontal/> Sesuaikan</button><button data-v202-theme-action="layout" data-v206-theme-action="layout" onClick={() => { const target = document.querySelector(".tn-layout-studio"); target?.scrollIntoView({ behavior: "smooth", block: "start" }); window.setTimeout(() => { target?.setAttribute("tabindex", "-1"); target?.focus({ preventScroll: true }); }, 260); }}><Blocks/> Edit Tata Letak</button><button data-v206-theme-action="code" onClick={() => setModal("code")}><Code2/> Edit Kode</button><button onClick={openSite}><ExternalLink/> Lihat situs</button></div>';
    if (!source.includes(oldActions)) throw new Error("V206_NATIVE_THEME_ACTIONS_ANCHOR_MISSING");
    source = source.replace(oldActions, newActions);
    await write(path, source);
  }
}

async function patchNaraSource() {
  const path = "src/NaraAssistant.jsx";
  let source = await read(path);
  if (!source.includes("nara-close-stops-media-v206")) {
    const v194 = `  const closeNara = () => {\n    recognition.current?.stop?.();\n    recognition.current = null;\n    setListening(false);\n    stopSpeech();\n    setAttachmentMenu(false);\n    setOpen(false);\n  };`;
    const v206 = `  const closeNara = () => {\n    // nara-close-stops-media-v206: release microphone and speech before closing.\n    try { recognition.current?.stop?.(); } catch { /* already stopped */ }\n    recognition.current = null;\n    setListening(false);\n    stopSpeech();\n    setAttachmentMenu(false);\n    setOpen(false);\n  };`;
    if (source.includes(v194)) source = source.replace(v194, v206);
    else if (source.includes("recognition.current = null;") && source.includes("const closeNara = () =>")) source = source.replace("  const closeNara = () => {", "  // nara-close-stops-media-v206\n  const closeNara = () => {");
    else throw new Error("V206_NARA_CLOSE_ANCHOR_MISSING");
    await write(path, source);
  }
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${SW_VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${SW_CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, `const FORCE_REFRESH_VALUE = "${SW_REFRESH}";`);
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V205_HOTFIX", "NGE_BLOGGING_UPDATE_AVAILABLE_V206");
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V205", "NGE_BLOGGING_UPDATE_AVAILABLE_V206");
  for (const marker of [
    `const STUDIO_PRODUCTION_RELEASE_V206 = "${RELEASE}";`,
    'const STUDIO_PRODUCTION_COMPAT_HOTFIX_V205 = "studio-production-v205-hotfix-logo-auth-20260802";',
    'const STUDIO_PRODUCTION_COMPAT_VERSION_V205_HOTFIX = "ngeblogging-app-v205-hotfix-logo-auth-20260802";',
    'const STUDIO_PRODUCTION_COMPAT_CACHE_V205_HOTFIX = "v205-hotfix-logo-auth-cache";',
  ]) source = insertAfterVersion(source, marker);
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v206 update notification only; never force navigation through auth or editor state.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V206_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V206_DESTRUCTIVE_SESSION_ACTION");
  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/Studio.jsx", 'import "./studio-production-v206.js";'],
    ["src/studio-production-v206.js", RELEASE],
    ["src/studio-production-v206.js", "fetchMembershipDirect"],
    ["src/studio-production-v206.css", 'content:"Edit Tata Letak"'],
    ["src/studio-production-v206.css", 'grid-template-areas:"orb brand voice close" "sizes sizes sizes reset"'],
    ["src/ThemeStudio.jsx", 'data-v206-theme-action="layout"'],
    ["src/ThemeStudio.jsx", 'data-v206-theme-action="code"'],
    ["src/NaraAssistant.jsx", "nara-close-stops-media-v206"],
    ["src/lib/supabase.js", "persistSession: true"],
    ["src/lib/supabase.js", "autoRefreshToken: true"],
    ["public/release-v206.json", RELEASE],
  ];
  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V206_VERIFY_FAILED:${path}:${marker}`);
  }
  const runtime = await read("src/studio-production-v206.js");
  if (/signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|createUserSite|getOrCreatePrimarySite/.test(runtime)) throw new Error("V206_RECOVERY_CONTRACT_VIOLATION");
}

await patchStudioEntry();
await patchThemeStudio();
await patchNaraSource();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
