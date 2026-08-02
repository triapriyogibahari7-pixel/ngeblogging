import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const write = (path, value) => writeFile(new URL(path, root), value);
const RELEASE = "studio-production-v206-20260802";
const SW_VERSION = "ngeblogging-app-v206-native-theme-nara-session-20260802";
const SW_CACHE = "native-theme-nara-session-cache-v206";
const SW_REFRESH = "native-theme-nara-session-v206";

function replaceOnce(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) throw new Error(`V206_${label}_ANCHOR_MISSING`);
  return source.replace(search, replacement);
}

function insertAfterVersion(source, line) {
  if (source.includes(line)) return source;
  const next = source.replace(/^(const VERSION = .*;\n)/m, `$1${line}\n`);
  if (next === source) throw new Error(`V206_SW_ANCHOR_MISSING:${line}`);
  return next;
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  const nextImport = 'import "./studio-production-v206.js";';
  if (!source.includes(nextImport)) {
    const anchor = 'import "./studio-production-v205.js";';
    if (!source.includes(anchor)) throw new Error("V206_STUDIO_V205_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n${nextImport}`);
    await write(path, source);
  }
}

async function patchThemeStudio() {
  const path = "src/ThemeStudio.jsx";
  let source = await read(path);
  if (!source.includes('data-v206-theme-action="layout"')) {
    const oldActions = '<div className="tn-hero-actions"><button className="primary" onClick={() => setModal("customize")}><SlidersHorizontal/> Sesuaikan</button><button onClick={() => setModal("code")}><Code2/> Edit HTML</button><button onClick={() => setModal("widgets")}><Blocks/> {WIDGET_COUNT} Widget</button><button onClick={openSite}><ExternalLink/> Lihat situs</button></div>';
    const newActions = '<div className="tn-hero-actions"><button className="primary" onClick={() => setModal("customize")}><SlidersHorizontal/> Sesuaikan</button><button data-v202-theme-action="layout" data-v206-theme-action="layout" onClick={() => { const target = document.querySelector(".tn-layout-studio"); target?.scrollIntoView({ behavior: "smooth", block: "start" }); window.setTimeout(() => { target?.setAttribute("tabindex", "-1"); target?.focus({ preventScroll: true }); }, 260); }}><Blocks/> Edit Tata Letak</button><button data-v206-theme-action="code" onClick={() => setModal("code")}><Code2/> Edit Kode</button><button onClick={openSite}><ExternalLink/> Lihat situs</button></div>';
    source = replaceOnce(source, oldActions, newActions, "NATIVE_THEME_ACTIONS");
  }
  await write(path, source);
}

async function patchNaraSource() {
  const path = "src/NaraAssistant.jsx";
  let source = await read(path);
  if (!source.includes("nara-close-stops-media-v206")) {
    const closeV194 = `  const closeNara = () => {\n    recognition.current?.stop?.();\n    recognition.current = null;\n    setListening(false);\n    stopSpeech();\n    setAttachmentMenu(false);\n    setOpen(false);\n  };`;
    const closeLegacy = `  const closeNara = () => {\n    stopSpeech();\n    setOpen(false);\n  };`;
    const closeV206 = `  const closeNara = () => {\n    // nara-close-stops-media-v206: closing the panel must release microphone and speech resources.\n    try { recognition.current?.stop?.(); } catch { /* SpeechRecognition may already be stopped. */ }\n    recognition.current = null;\n    setListening(false);\n    stopSpeech();\n    setAttachmentMenu(false);\n    setOpen(false);\n  };`;
    if (source.includes(closeV194)) source = source.replace(closeV194, closeV206);
    else if (source.includes(closeLegacy)) source = source.replace(closeLegacy, closeV206);
    else if (source.includes("recognition.current = null;") && source.includes("const closeNara = () =>")) {
      source = source.replace("  const closeNara = () => {", "  // nara-close-stops-media-v206\n  const closeNara = () => {");
    } else {
      throw new Error("V206_NARA_CLOSE_MEDIA_ANCHOR_MISSING");
    }
  }
  source = source.replace(
    '<div className="nara-assistant-layer" role="dialog" aria-modal="true" aria-label="Nara AI Assistant">',
    '<div className="nara-assistant-layer" role="dialog" aria-modal={size === "full"} data-nara-mode={size === "full" ? "modal" : "nonmodal"} aria-label="Nara AI Assistant">',
  );
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${SW_VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${SW_CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, `const FORCE_REFRESH_VALUE = "${SW_REFRESH}";`);
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V205", "NGE_BLOGGING_UPDATE_AVAILABLE_V206");
  source = insertAfterVersion(source, `const STUDIO_PRODUCTION_RELEASE_V206 = "${RELEASE}";`);
  source = insertAfterVersion(source, 'const STUDIO_PRODUCTION_COMPAT_VERSION_V205 = "ngeblogging-app-v205-theme-nara-auth-mobile-20260802";');
  source = insertAfterVersion(source, 'const STUDIO_PRODUCTION_COMPAT_CACHE_V205 = "theme-nara-auth-mobile-cache-v205";');
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v206 notifies old tabs only; auth callbacks, sessions and drafts are never force-navigated.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V206_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V206_SESSION_DESTRUCTIVE_ACTION_FOUND");
  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/Studio.jsx", 'import "./studio-production-v206.js";'],
    ["src/studio-production-v206.js", RELEASE],
    ["src/studio-production-v206.js", "directMembership"],
    ["src/studio-production-v206.js", "real-site-recovered"],
    ["src/studio-production-v206.css", 'grid-template-areas:\n    "orb brand voice close"\n    "sizes sizes sizes reset"'],
    ["src/studio-production-v206.css", 'content: "Edit Tata Letak"'],
    ["src/ThemeStudio.jsx", 'data-v206-theme-action="layout"'],
    ["src/ThemeStudio.jsx", 'data-v206-theme-action="code"'],
    ["src/NaraAssistant.jsx", "nara-close-stops-media-v206"],
    ["src/NaraAssistant.jsx", 'aria-modal={size === "full"}'],
    ["src/lib/supabase.js", "persistSession: true"],
    ["src/lib/supabase.js", "autoRefreshToken: true"],
    ["public/release-v206.json", RELEASE],
  ];
  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V206_VERIFY_FAILED:${path}:${marker}`);
  }

  const runtime = await read("src/studio-production-v206.js");
  if (/signOut\s*\(|localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/.test(runtime)) throw new Error("V206_RUNTIME_SESSION_DESTRUCTION_FOUND");
  if (/createUserSite|getOrCreatePrimarySite/.test(runtime)) throw new Error("V206_RECOVERY_MUST_NOT_FABRICATE_SITE");

  const theme = await read("src/ThemeStudio.jsx");
  const heroStart = theme.indexOf('<div className="tn-hero-actions">');
  const heroEnd = theme.indexOf('</div><div className="tn-trust">', heroStart);
  const hero = theme.slice(heroStart, heroEnd);
  if ((hero.match(/data-v206-theme-action="layout"/g) || []).length !== 1) throw new Error("V206_THEME_LAYOUT_ACTION_NOT_SINGLE");
  if ((hero.match(/data-v206-theme-action="code"/g) || []).length !== 1) throw new Error("V206_THEME_CODE_ACTION_NOT_SINGLE");
}

await patchStudioEntry();
await patchThemeStudio();
await patchNaraSource();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
