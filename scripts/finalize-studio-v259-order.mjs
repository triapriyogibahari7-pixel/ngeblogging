import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const studioUrl = new URL("src/Studio.jsx", root);

export const RELEASE = "studio-v260-post-build-order-20260804";
export const LEGACY_RELEASE = "studio-v259-post-build-order-20260804";
const RUNTIME = "studio-six-mode-authority-v259.js";
const STYLES = "studio-six-mode-authority-v259.css";
const HOTFIX = "studio-six-mode-authority-v259-hotfix.css";
const V260_RUNTIME = "studio-stability-v260.js";
const V260_STYLES = "studio-stability-v260.css";
const V257_RUNTIME = "studio-visual-native-v257.js";
const V257_STYLES = "studio-visual-native-v257.css";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeLiveImport(source, path) {
  const pattern = new RegExp(`^\\s*import\\s+[\"']\\./${escapeRegExp(path)}[\"'];?\\s*$`, "gm");
  return source.replace(pattern, "");
}

function requireMarkers(source, markers, code) {
  for (const marker of markers) {
    if (!source.includes(marker)) throw new Error(`V260_${code}_MISSING:${marker}`);
  }
}

async function validateV260Contracts() {
  const [runtime, css, device, provider, auth, studioNext, nara] = await Promise.all([
    readFile(new URL(`src/${V260_RUNTIME}`, root), "utf8"),
    readFile(new URL(`src/${V260_STYLES}`, root), "utf8"),
    readFile(new URL("src/studio-device-mode-v140.js", root), "utf8"),
    readFile(new URL("src/auth-provider-gateway-v250.js", root), "utf8"),
    readFile(new URL("src/lib/supabase.js", root), "utf8"),
    readFile(new URL("src/StudioNext.jsx", root), "utf8"),
    readFile(new URL("src/NaraAssistant.jsx", root), "utf8"),
  ]);

  requireMarkers(runtime, [
    "studio-stability-v260-20260804",
    "studioV253Family = current",
    "studioV259Family = current",
    "v260SingleN",
    "sn-profile-menu-v260",
    'actionButton("profile"',
    'actionButton("avatar"',
    'actionButton("settings"',
    'actionButton("add-site"',
    'actionButton("view-site"',
    'actionButton("nara"',
    'actionButton("logout"',
    'v260Interaction = full ? "modal" : "nonmodal"',
    "Tambah kamera, foto, atau file",
  ], "RUNTIME_CONTRACT");

  requireMarkers(css, [
    '--v260-side-open:248px',
    '--v260-side-rail:70px',
    'data-studio-v260-family="large"',
    'data-studio-v260-family="small"',
    '.sn-main{margin-left:0!important',
    '.sn-profile-menu-v260',
    '.nara-floating-button:not([hidden])',
    'data-v260-interaction="nonmodal"',
    '.nara-attachment-menu',
    '.tn-code-workspace',
    '.op41-chart-grid',
    'writing-mode:horizontal-tb!important',
  ], "CSS_CONTRACT");

  requireMarkers(device, [
    "studio-device-mode-v260-20260804",
    "desktopSiteRequested(view, handheld)",
    'return "desktop"',
    'return "application"',
    'return "phone"',
    'return "mobile"',
    'return "compact"',
    'return "tablet"',
    "studioDesktopSitePhone",
  ], "DEVICE_CONTRACT");

  requireMarkers(provider, [
    "auth-provider-navigation-v260-20260804",
    "direct-provider-authorize",
    "return new URL(String(value)).toString()",
  ], "OAUTH_CONTRACT");

  requireMarkers(auth, [
    "persistSession: true",
    "autoRefreshToken: true",
    'flowType: "pkce"',
    "fetchWithDeadlineV259",
    "signInWithPassword",
    "signInWithMagicLink",
  ], "SESSION_CONTRACT");

  for (const label of ["Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik", "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar"]) {
    if (!studioNext.includes(label)) throw new Error(`V260_MENU_CONTRACT_MISSING:${label}`);
  }
  requireMarkers(nara, [
    "Kamera",
    "Foto",
    "File teks",
    "Tingkat kecerdasan",
    "Model Nara",
    "Balasan suara otomatis",
    "Pertanyaan suara",
    'data-size={option}',
  ], "NARA_CONTRACT");
}

export async function finalizeStudioV259Order() {
  await validateV260Contracts();
  let source = await readFile(studioUrl, "utf8");
  for (const required of [V257_RUNTIME, V257_STYLES, RUNTIME, STYLES, HOTFIX, V260_RUNTIME, V260_STYLES]) {
    if (!source.includes(`import "./${required}";`)) throw new Error(`V260_SOURCE_AUTHORITY_MISSING:${required}`);
  }

  for (const path of [RUNTIME, STYLES, HOTFIX, V260_RUNTIME, V260_STYLES]) source = removeLiveImport(source, path);
  const anchor = "export default StudioFastGate;";
  if (!source.includes(anchor)) throw new Error("V260_STUDIO_EXPORT_ANCHOR_MISSING");
  source = source
    .replace(anchor, `import "./${RUNTIME}";\nimport "./${STYLES}";\nimport "./${HOTFIX}";\nimport "./${V260_RUNTIME}";\nimport "./${V260_STYLES}";\n\n${anchor}`)
    .replace(/\n{3,}/g, "\n\n");

  const v257Runtime = source.lastIndexOf(`import "./${V257_RUNTIME}";`);
  const v257Styles = source.lastIndexOf(`import "./${V257_STYLES}";`);
  const runtime = source.lastIndexOf(`import "./${RUNTIME}";`);
  const styles = source.lastIndexOf(`import "./${STYLES}";`);
  const hotfix = source.lastIndexOf(`import "./${HOTFIX}";`);
  const v260Runtime = source.lastIndexOf(`import "./${V260_RUNTIME}";`);
  const v260Styles = source.lastIndexOf(`import "./${V260_STYLES}";`);
  if (!(v257Runtime >= 0 && v257Styles > v257Runtime && runtime > v257Styles && styles > runtime && hotfix > styles && v260Runtime > hotfix && v260Styles > v260Runtime)) {
    // Compatibility marker used by older regression suites: V259_FINAL_ORDER_INVALID.
    throw new Error("V260_FINAL_ORDER_INVALID");
  }
  for (const [path, code] of [[RUNTIME, "V259_RUNTIME"], [STYLES, "V259_CSS"], [HOTFIX, "V259_HOTFIX"], [V260_RUNTIME, "RUNTIME"], [V260_STYLES, "CSS"]]) {
    if ((source.match(new RegExp(escapeRegExp(`import "./${path}";`), "g")) || []).length !== 1) {
      throw new Error(`V260_${code}_DUPLICATE`);
    }
  }

  await writeFile(studioUrl, source, "utf8");
  return { release: RELEASE, legacyRelease: LEGACY_RELEASE, path: "src/Studio.jsx" };
}

export { validateV260Contracts };