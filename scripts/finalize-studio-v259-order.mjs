import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const studioUrl = new URL("src/Studio.jsx", root);

export const RELEASE = "studio-v260-post-build-order-20260804-r2";
export const LEGACY_RELEASE = "studio-v259-post-build-order-20260804";
const RUNTIME = "studio-six-mode-authority-v259.js";
const STYLES = "studio-six-mode-authority-v259.css";
const HOTFIX = "studio-six-mode-authority-v259-hotfix.css";
const V260_RUNTIME = "studio-stability-v260.js";
const V260_STYLES = "studio-stability-v260.css";
const V260_HOTFIX = "studio-stability-v260-hotfix.css";
const V257_RUNTIME = "studio-visual-native-v257.js";
const V257_STYLES = "studio-visual-native-v257.css";

function requireMarkers(source, markers, code) {
  for (const marker of markers) {
    if (!source.includes(marker)) throw new Error(`V260_${code}_MISSING:${marker}`);
  }
}

function importCount(source, path) {
  const needle = `import "./${path}";`;
  return source.split(needle).length - 1;
}

async function validateV260Contracts() {
  const [runtime, css, hotfix, device, provider, auth, studioNext, nara, account, publicSw] = await Promise.all([
    readFile(new URL(`src/${V260_RUNTIME}`, root), "utf8"),
    readFile(new URL(`src/${V260_STYLES}`, root), "utf8"),
    readFile(new URL(`src/${V260_HOTFIX}`, root), "utf8"),
    readFile(new URL("src/studio-device-mode-v140.js", root), "utf8"),
    readFile(new URL("src/auth-provider-gateway-v250.js", root), "utf8"),
    readFile(new URL("src/lib/supabase.js", root), "utf8"),
    readFile(new URL("src/StudioNext.jsx", root), "utf8"),
    readFile(new URL("src/NaraAssistant.jsx", root), "utf8"),
    readFile(new URL("src/studio-production-mobile-v189-account.js", root), "utf8"),
    readFile(new URL("public/sw.js", root), "utf8"),
  ]);

  requireMarkers(runtime, [
    "studio-stability-v260-20260804-r2",
    "function deviceMetrics()",
    "function responsiveMode(view = deviceMetrics())",
    'setData(root, "studioV253Family", current)',
    'setData(root, "studioV259Family", current)',
    'setData(root, "studioResponsiveMode", mode)',
    'setData(root, "studioDesktopSitePhone", String(view.desktopSitePhone))',
    "v260SingleN",
    "sn-profile-menu-v260",
    'actionButton("profile"',
    'actionButton("avatar"',
    'actionButton("settings"',
    'actionButton("add-site"',
    'actionButton("view-site"',
    'actionButton("nara"',
    'actionButton("logout"',
    "focusAvatarField",
    'v260Interaction = full ? "modal" : "nonmodal"',
    "Tambah kamera, foto, atau file",
    "openNaraFromProfile",
  ], "RUNTIME_CONTRACT");

  requireMarkers(css, [
    "--v260-side-open:248px",
    "--v260-side-rail:70px",
    'data-studio-v260-family="large"',
    'data-studio-v260-family="small"',
    ".sn-main{margin-left:0!important",
    ".sn-profile-menu-v260",
    ".nara-floating-button:not([hidden])",
    'data-v260-interaction="nonmodal"',
    ".nara-attachment-menu",
    ".tn-code-workspace",
    ".op41-chart-grid",
    "writing-mode:horizontal-tb!important",
  ], "CSS_CONTRACT");

  requireMarkers(hotfix, [
    ".sn-top-actions",
    ".sn-logo-mark",
    ".sn-mobile-menu-mark",
    "-webkit-text-fill-color:#fff!important",
    "background:transparent!important",
    ".sn-site-manager",
    'data-account-surface-v189="profile"',
    'data-account-surface-v189="settings"',
    ".nara-floating-button:not([hidden])",
    "@media (min-width:360px) and (max-width:760px)",
    ':has(.nara-assistant-shell[data-nara-size="full"])',
  ], "HOTFIX_CONTRACT");

  requireMarkers(account, [
    "studio-production-mobile-v189-account-20260804-r2",
    'title, "Profil"',
    'title, "Pengaturan"',
    "profileSection.hidden = false",
    "settingsSection.hidden = true",
    "profileSection.hidden = true",
    "settingsSection.hidden = false",
  ], "ACCOUNT_CONTRACT");

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

  requireMarkers(publicSw, [
    "ngeblogging-app-v260-stability-r2-20260804",
    "studio-stability-cache-v260-r2",
    "studio-stability-v260-20260804-r2",
    "NGE_BLOGGING_UPDATE_AVAILABLE_V260",
    "service-worker-activated-stability-v260-r2",
    "reloadRequired: false",
    "ACTIVE_VERSION_V260",
    "ACTIVE_CACHE_RELEASE_V260",
  ], "SERVICE_WORKER_CONTRACT");
  if (publicSw.includes("await refreshStaleWindow(client, url)")) {
    throw new Error("V260_SERVICE_WORKER_DOUBLE_RELOAD_REGRESSION");
  }
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(publicSw)) {
    throw new Error("V260_SERVICE_WORKER_SESSION_DESTRUCTIVE_ACTION");
  }

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
  // Historical function name retained because vite.config.js and older regression
  // suites import it. Since v260 this is intentionally READ ONLY: build hooks must
  // never rewrite source files in Netlify/CI. The committed source order is checked
  // and a regression fails the build without mutating the working tree.
  await validateV260Contracts();
  const source = await readFile(studioUrl, "utf8");
  const required = [V257_RUNTIME, V257_STYLES, RUNTIME, STYLES, HOTFIX, V260_RUNTIME, V260_STYLES, V260_HOTFIX];
  for (const path of required) {
    if (!source.includes(`import "./${path}";`)) throw new Error(`V260_SOURCE_AUTHORITY_MISSING:${path}`);
    if (importCount(source, path) !== 1) throw new Error(`V260_IMPORT_DUPLICATE:${path}`);
  }

  const v257Runtime = source.lastIndexOf(`import "./${V257_RUNTIME}";`);
  const v257Styles = source.lastIndexOf(`import "./${V257_STYLES}";`);
  const runtime = source.lastIndexOf(`import "./${RUNTIME}";`);
  const styles = source.lastIndexOf(`import "./${STYLES}";`);
  const hotfix = source.lastIndexOf(`import "./${HOTFIX}";`);
  const v260Runtime = source.lastIndexOf(`import "./${V260_RUNTIME}";`);
  const v260Styles = source.lastIndexOf(`import "./${V260_STYLES}";`);
  const v260Hotfix = source.lastIndexOf(`import "./${V260_HOTFIX}";`);

  if (!(v257Runtime >= 0 && v257Styles > v257Runtime && runtime > v257Styles && styles > runtime && hotfix > styles && v260Runtime > hotfix && v260Styles > v260Runtime && v260Hotfix > v260Styles)) {
    // Compatibility marker used by older regression suites: V259_FINAL_ORDER_INVALID.
    throw new Error("V260_FINAL_ORDER_INVALID");
  }

  return {
    release: RELEASE,
    legacyRelease: LEGACY_RELEASE,
    path: "src/Studio.jsx",
    mode: "read-only-validation",
  };
}

export { validateV260Contracts };