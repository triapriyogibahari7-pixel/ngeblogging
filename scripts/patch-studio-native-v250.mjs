import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

export const RELEASE = "studio-native-auth-postpatch-v250-20260804";
const PRODUCTION_SUPABASE_URL = "https://polvmlrhqoiflumibfqs.supabase.co";
const PRODUCTION_SUPABASE_KEY = "sb_publishable_Jqz6qDzX4IKSunPoDT5zyQ_sk6EK4W-";
const PRODUCTION_PROJECT_REF = "polvmlrhqoiflumibfqs";

const RETIRED_IMPORTS = [
  "studio-stable-shell-v244.js",
  "studio-shell-controller-v147.js",
  "studio-production-v235.js",
  "studio-visual-stability-v241.js",
  "studio-shell-rescue-v242.js",
  "studio-sidebar-brand-v246.js",
  "studio-stable-shell-v244-final.css",
  "studio-sidebar-brand-v246.css",
  "studio-screenshot-lock-v247.css",
  "studio-final-visual-v249.css",
  "studio-final-visual-v249-hotfix.css",
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function retireLiveImport(source, path) {
  const importLine = `import "./${path}";`;
  const live = new RegExp(`^\\s*${escapeRegExp(importLine)}\\s*$`, "gm");
  const marker = `// v250 backup-only; jangan dieksekusi bersamaan dengan native authority: ${importLine}`;
  const withoutLive = source.replace(live, marker);
  return withoutLive.includes(importLine) ? withoutLive : `${marker}\n${withoutLive}`;
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  for (const retired of RETIRED_IMPORTS) source = retireLiveImport(source, retired);

  const jsImport = 'import "./studio-native-authority-v250.js";';
  const cssImport = 'import "./studio-native-authority-v250.css";';
  source = source.replace(new RegExp(`^\\s*${escapeRegExp(jsImport)}\\s*$`, "gm"), "");
  source = source.replace(new RegExp(`^\\s*${escapeRegExp(cssImport)}\\s*$`, "gm"), "");
  const exportAnchor = "export default StudioFastGate;";
  if (!source.includes(exportAnchor)) throw new Error("V250_STUDIO_EXPORT_ANCHOR_MISSING");
  source = source.replace(exportAnchor, `${jsImport}\n${cssImport}\n\n${exportAnchor}`);
  source = source.replace(/\n{3,}/g, "\n\n");
  await write(path, source);
}

function patchDirectRlsFallback(source) {
  if (!source.includes("async function listUserSitesDirectV192")) return source;

  source = source.replace(
    /const base = String\(env\.VITE_SUPABASE_URL \|\| "[^"]*"\)\.trim\(\)\.replace\(\/\\\/\$\/, ""\);/,
    `const base = String(env.VITE_SUPABASE_URL || "${PRODUCTION_SUPABASE_URL}").trim().replace(/\\/$/, "");`,
  );
  source = source.replace(
    /const key = String\(env\.VITE_SUPABASE_PUBLISHABLE_KEY \|\| env\.VITE_SUPABASE_ANON_KEY \|\| "[^"]*"\)\.trim\(\);/,
    `const key = String(env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || "${PRODUCTION_SUPABASE_KEY}").trim();`,
  );

  // If a compatibility patch reformatted the helper, place public fallbacks
  // beside its env declaration and switch empty fallback literals only inside
  // the helper range. This keeps the user bearer/RLS architecture unchanged.
  if (!source.includes(PRODUCTION_SUPABASE_URL) || !source.includes(PRODUCTION_SUPABASE_KEY)) {
    const start = source.indexOf("async function listUserSitesDirectV192");
    const end = source.indexOf("\n}\n", start);
    if (start >= 0 && end > start) {
      let block = source.slice(start, end + 3);
      block = block
        .replace('env.VITE_SUPABASE_URL || ""', `env.VITE_SUPABASE_URL || "${PRODUCTION_SUPABASE_URL}"`)
        .replace('env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || ""', `env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || "${PRODUCTION_SUPABASE_KEY}"`);
      source = `${source.slice(0, start)}${block}${source.slice(end + 3)}`;
    }
  }
  return source;
}

function patchPersistedProjectRef(source) {
  if (!source.includes("function supabaseProjectRefV198")) return source;
  const replacement = `function supabaseProjectRefV198() {
  try {
    const configured = String(import.meta.env?.VITE_SUPABASE_URL || "${PRODUCTION_SUPABASE_URL}").trim();
    return configured ? new URL(configured).hostname.split(".")[0] || "${PRODUCTION_PROJECT_REF}" : "${PRODUCTION_PROJECT_REF}";
  } catch {
    return "${PRODUCTION_PROJECT_REF}";
  }
}`;
  const next = source.replace(/function supabaseProjectRefV198\(\) \{[\s\S]*?\n\}/, replacement);
  return next;
}

async function patchGeneratedAuthGate() {
  const path = "src/StudioOnboardingGate.jsx";
  let source = await read(path);
  source = patchDirectRlsFallback(source);
  source = patchPersistedProjectRef(source);

  if (!source.includes("studioNativeAuthPostpatchV250")) {
    const markerAnchor = 'const RELEASE = "first-site-onboarding-v76-20260727";';
    if (!source.includes(markerAnchor)) throw new Error("V250_AUTH_RELEASE_ANCHOR_MISSING");
    source = source.replace(markerAnchor, `${markerAnchor}\nconst STUDIO_NATIVE_AUTH_POSTPATCH_V250 = "${RELEASE}";`);
    const componentAnchor = "export default function StudioOnboardingGate(props) {";
    if (!source.includes(componentAnchor)) throw new Error("V250_AUTH_COMPONENT_ANCHOR_MISSING");
    source = source.replace(
      componentAnchor,
      `${componentAnchor}\n  document.documentElement.dataset.studioNativeAuthPostpatchV250 = STUDIO_NATIVE_AUTH_POSTPATCH_V250;`,
    );
  }

  source = source
    .replace("<h1>Koneksi data belum selesai.</h1>", "<h1>Data Studio belum terhubung.</h1>")
    .replace(
      "Koneksi Workspace belum merespons dalam batas waktu. Sesi login tetap disimpan dan tidak ada logout otomatis.",
      "Data Workspace belum merespons. Sesi login tetap disimpan; sistem tidak melakukan logout otomatis. Coba lagi setelah koneksi tersedia.",
    );

  // These markers are guaranteed by the production v192/v195/v198 regression
  // suite and must survive v250. Optional later compatibility wrappers are not
  // required for this postpatch to execute successfully.
  for (const marker of [
    "listUserSitesDirectV192",
    "readLocalStudioSessionV195",
    "readPersistedSupabaseSessionV198",
    "rememberActiveSiteV195",
    "studio-bootstrap-online-retry-v192",
    "Authorization: `Bearer ${accessToken}`",
    "direct-supabase-rls",
    "client-gateway-fallback",
  ]) {
    if (!source.includes(marker)) throw new Error(`V250_AUTH_COMPAT_MARKER_MISSING:${marker}`);
  }
  if (!source.includes(PRODUCTION_SUPABASE_URL) || !source.includes(PRODUCTION_SUPABASE_KEY) || !source.includes(PRODUCTION_PROJECT_REF)) {
    throw new Error("V250_PRODUCTION_PUBLIC_FALLBACK_NOT_INSTALLED");
  }
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|supabase\.auth\.signOut\s*\(/.test(source)) {
    throw new Error("V250_AUTH_DESTRUCTIVE_SESSION_ACTION");
  }
  await write(path, source);
}

async function verify() {
  const entry = await read("src/Studio.jsx");
  for (const path of RETIRED_IMPORTS) {
    const live = new RegExp(`^\\s*import\\s+[\"']\\./${escapeRegExp(path)}[\"'];?\\s*$`, "m");
    if (live.test(entry)) throw new Error(`V250_RETIRED_IMPORT_REACTIVATED:${path}`);
    if (!entry.includes(`import "./${path}";`)) throw new Error(`V250_BACKUP_MARKER_MISSING:${path}`);
  }
  if (!/^\s*import "\.\/studio-native-authority-v250\.js";\s*$/m.test(entry)) throw new Error("V250_RUNTIME_NOT_ACTIVE");
  if (!/^\s*import "\.\/studio-native-authority-v250\.css";\s*$/m.test(entry)) throw new Error("V250_CSS_NOT_ACTIVE");

  const gate = await read("src/StudioOnboardingGate.jsx");
  for (const marker of [
    "studioNativeAuthPostpatchV250",
    PRODUCTION_SUPABASE_URL,
    PRODUCTION_SUPABASE_KEY,
    PRODUCTION_PROJECT_REF,
    "persisted-storage-first",
    "direct-supabase-rls",
  ]) if (!gate.includes(marker)) throw new Error(`V250_AUTH_POSTPATCH_VERIFY_FAILED:${marker}`);
}

await patchStudioEntry();
await patchGeneratedAuthGate();
await verify();
console.log(`Applied ${RELEASE}`);
