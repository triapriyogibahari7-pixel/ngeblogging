import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

export const RELEASE = "studio-native-bundle-activation-v255-20260804";
export const SIDEBAR_RESCUE_RELEASE = "studio-sidebar-rescue-v251-20260804";
export const SOURCE_STABILITY_RELEASE = "studio-source-stability-v252-20260804";
export const SHELL_NARA_RELEASE = "studio-shell-nara-v253-20260804";
export const FINAL_STABILITY_RELEASE = "studio-stability-v255-20260804";
const PRODUCTION_SUPABASE_URL = "https://polvmlrhqoiflumibfqs.supabase.co";
const PRODUCTION_SUPABASE_KEY = "sb_publishable_Jqz6qDzX4IKSunPoDT5zyQ_sk6EK4W-";
const PRODUCTION_PROJECT_REF = "polvmlrhqoiflumibfqs";

const RETIRED_RUNTIME_IMPORTS = [
  "studio-stable-shell-v244.js",
  "studio-shell-controller-v147.js",
  "studio-production-v235.js",
  "studio-visual-stability-v241.js",
  "studio-shell-rescue-v242.js",
  "studio-sidebar-brand-v246.js",
];
const RETIRED_CSS_IMPORTS = [
  "studio-stable-shell-v244-final.css",
  "studio-sidebar-brand-v246.css",
  "studio-screenshot-lock-v247.css",
  "studio-final-visual-v249.css",
  "studio-final-visual-v249-hotfix.css",
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function retireImport(source, path) {
  const live = new RegExp(`^\\s*import\\s+[\"']\\./${escapeRegExp(path)}[\"'];?\\s*$`, "gm");
  const marker = `// v250 bundle backup-only: import "./${path}";`;
  return source.replace(live, marker);
}

function ensureLastImport(source, path) {
  const live = new RegExp(`^\\s*import\\s+[\"']\\./${escapeRegExp(path)}[\"'];?\\s*$`, "gm");
  source = source.replace(live, "");
  const anchor = "export default StudioFastGate;";
  if (!source.includes(anchor)) throw new Error(`V250_BUNDLE_IMPORT_ANCHOR_MISSING:${path}`);
  return source.replace(anchor, `import "./${path}";\n\n${anchor}`);
}

async function activateNativeShell() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  for (const item of [...RETIRED_RUNTIME_IMPORTS, ...RETIRED_CSS_IMPORTS]) source = retireImport(source, item);
  source = ensureLastImport(source, "studio-native-authority-v250.js");
  source = ensureLastImport(source, "studio-native-authority-v250.css");
  source = ensureLastImport(source, "studio-sidebar-rescue-v251.js");
  source = ensureLastImport(source, "studio-sidebar-rescue-v251.css");
  source = ensureLastImport(source, "studio-source-stability-v252.js");
  source = ensureLastImport(source, "studio-source-stability-v252.css");
  source = ensureLastImport(source, "studio-shell-nara-v253.js");
  source = ensureLastImport(source, "studio-shell-nara-v253.css");
  source = ensureLastImport(source, "studio-stability-v255.js");
  source = ensureLastImport(source, "studio-stability-v255.css");
  source = source.replace(/\n{3,}/g, "\n\n");

  for (const item of [...RETIRED_RUNTIME_IMPORTS, ...RETIRED_CSS_IMPORTS]) {
    const live = new RegExp(`^\\s*import\\s+[\"']\\./${escapeRegExp(item)}[\"'];?\\s*$`, "m");
    if (live.test(source)) throw new Error(`V250_CONFLICTING_IMPORT_STILL_LIVE:${item}`);
  }
  for (const active of [
    "studio-native-authority-v250.js",
    "studio-native-authority-v250.css",
    "studio-sidebar-rescue-v251.js",
    "studio-sidebar-rescue-v251.css",
    "studio-source-stability-v252.js",
    "studio-source-stability-v252.css",
    "studio-shell-nara-v253.js",
    "studio-shell-nara-v253.css",
    "studio-stability-v255.js",
    "studio-stability-v255.css",
  ]) {
    const live = new RegExp(`^\\s*import\\s+[\"']\\./${escapeRegExp(active)}[\"'];?\\s*$`, "m");
    if (!live.test(source)) throw new Error(`V255_NATIVE_IMPORT_NOT_LIVE:${active}`);
  }
  if (!(source.indexOf('import "./studio-sidebar-rescue-v251.js";') > source.indexOf('import "./studio-native-authority-v250.css";'))) {
    throw new Error("V251_RESCUE_RUNTIME_ORDER_INVALID");
  }
  if (!(source.indexOf('import "./studio-sidebar-rescue-v251.css";') > source.indexOf('import "./studio-sidebar-rescue-v251.js";'))) {
    throw new Error("V251_RESCUE_CSS_ORDER_INVALID");
  }
  if (!(source.indexOf('import "./studio-source-stability-v252.js";') > source.indexOf('import "./studio-sidebar-rescue-v251.css";'))) {
    throw new Error("V252_SOURCE_RUNTIME_ORDER_INVALID");
  }
  if (!(source.indexOf('import "./studio-source-stability-v252.css";') > source.indexOf('import "./studio-source-stability-v252.js";'))) {
    throw new Error("V252_SOURCE_CSS_ORDER_INVALID");
  }
  if (!(source.indexOf('import "./studio-shell-nara-v253.js";') > source.indexOf('import "./studio-source-stability-v252.css";'))) {
    throw new Error("V253_SHELL_NARA_RUNTIME_ORDER_INVALID");
  }
  if (!(source.indexOf('import "./studio-shell-nara-v253.css";') > source.indexOf('import "./studio-shell-nara-v253.js";'))) {
    throw new Error("V253_SHELL_NARA_CSS_ORDER_INVALID");
  }
  if (!(source.indexOf('import "./studio-stability-v255.js";') > source.indexOf('import "./studio-shell-nara-v253.css";'))) {
    throw new Error("V255_STABILITY_RUNTIME_ORDER_INVALID");
  }
  if (!(source.indexOf('import "./studio-stability-v255.css";') > source.indexOf('import "./studio-stability-v255.js";'))) {
    throw new Error("V255_STABILITY_CSS_ORDER_INVALID");
  }
  await write(path, source);
}

function replaceDirectMembershipFallback(source) {
  if (!source.includes("async function listUserSitesDirectV192")) {
    throw new Error("V250_GENERATED_DIRECT_MEMBERSHIP_MISSING");
  }

  const urlEmpty = 'const base = String(env.VITE_SUPABASE_URL || "").trim().replace(/\\/$/, "");';
  const urlReady = `const base = String(env.VITE_SUPABASE_URL || "${PRODUCTION_SUPABASE_URL}").trim().replace(/\\/$/, "");`;
  const keyEmpty = 'const key = String(env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || "").trim();';
  const keyReady = `const key = String(env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || "${PRODUCTION_SUPABASE_KEY}").trim();`;

  if (!source.includes(urlReady)) {
    if (!source.includes(urlEmpty)) throw new Error("V250_DIRECT_MEMBERSHIP_URL_ANCHOR_MISSING");
    source = source.replace(urlEmpty, urlReady);
  }
  if (!source.includes(keyReady)) {
    if (!source.includes(keyEmpty)) throw new Error("V250_DIRECT_MEMBERSHIP_KEY_ANCHOR_MISSING");
    source = source.replace(keyEmpty, keyReady);
  }
  return source;
}

function replacePersistedProjectRef(source) {
  if (!source.includes("function supabaseProjectRefV198")) return source;
  return source.replace(
    /function supabaseProjectRefV198\(\) \{[\s\S]*?\n\}/,
    `function supabaseProjectRefV198() {\n  try {\n    const configured = String(import.meta.env?.VITE_SUPABASE_URL || "${PRODUCTION_SUPABASE_URL}").trim();\n    return configured ? new URL(configured).hostname.split(".")[0] || "${PRODUCTION_PROJECT_REF}" : "${PRODUCTION_PROJECT_REF}";\n  } catch {\n    return "${PRODUCTION_PROJECT_REF}";\n  }\n}`,
  );
}

async function activateAuthFallback() {
  const path = "src/StudioOnboardingGate.jsx";
  let source = await read(path);
  source = replaceDirectMembershipFallback(source);
  source = replacePersistedProjectRef(source);

  if (!source.includes("studioNativeBundleV250")) {
    const component = "export default function StudioOnboardingGate(props) {";
    if (!source.includes(component)) throw new Error("V250_GENERATED_GATE_COMPONENT_MISSING");
    source = source.replace(
      component,
      `${component}\n  document.documentElement.dataset.studioNativeBundleV250 = "${RELEASE}";`,
    );
  }

  for (const marker of [
    PRODUCTION_SUPABASE_URL,
    PRODUCTION_SUPABASE_KEY,
    "Authorization: `Bearer ${accessToken}`",
    "direct-supabase-rls",
    "client-gateway-fallback",
    "readPersistedSupabaseSessionV198",
    "persisted-storage-first",
  ]) {
    if (!source.includes(marker)) throw new Error(`V250_GENERATED_AUTH_MARKER_MISSING:${marker}`);
  }
  if (/service_role|SUPABASE_SERVICE_ROLE|sb_secret_/i.test(source)) throw new Error("V250_PRIVILEGED_BROWSER_KEY_FOUND");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|supabase\.auth\.signOut\s*\(/.test(source)) {
    throw new Error("V250_DESTRUCTIVE_AUTH_ACTION_FOUND");
  }
  await write(path, source);
}

export async function activateStudioNativeV250() {
  await activateNativeShell();
  await activateAuthFallback();
  return {
    release: RELEASE,
    sidebarRescueRelease: SIDEBAR_RESCUE_RELEASE,
    sourceStabilityRelease: SOURCE_STABILITY_RELEASE,
    shellNaraRelease: SHELL_NARA_RELEASE,
    finalStabilityRelease: FINAL_STABILITY_RELEASE,
  };
}
