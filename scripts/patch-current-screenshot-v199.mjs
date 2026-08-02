import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-current-screenshot-v199-20260802";
const VERSION = "ngeblogging-app-v199-mobile-ui-20260802";
const CACHE = "mobile-ui-cache-v199";

function replaceOnce(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) throw new Error(`V199_${label}_ANCHOR_MISSING`);
  return source.replace(search, replacement);
}

async function verifyAuthContinuityWithoutMutation() {
  const supabase = await read("src/lib/supabase.js");
  const main = await read("src/main.jsx");
  const authModal = await read("src/AuthModal.jsx");

  for (const marker of [
    "persistSession: true",
    "autoRefreshToken: true",
    "signInWithPassword",
    "signInWithProvider",
    "signInWithMagicLink",
    "AUTH_RELEASE",
  ]) {
    if (!supabase.includes(marker)) throw new Error(`V199_AUTH_CONTINUITY_MISSING:${marker}`);
  }
  if (!main.includes("supabase.auth.onAuthStateChange")) throw new Error("V199_AUTH_STATE_LISTENER_MISSING");
  if (!main.includes("supabase.auth.getSession()")) throw new Error("V199_AUTH_SESSION_RESTORE_MISSING");
  for (const marker of ["Google", "LinkedIn", "Masuk dengan email", "Masuk tanpa password melalui email"]) {
    if (!authModal.includes(marker)) throw new Error(`V199_AUTH_UI_MISSING:${marker}`);
  }
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/.test(supabase + main)) {
    throw new Error("V199_AUTH_DESTRUCTIVE_STORAGE_CLEAR_FOUND");
  }
}

async function patchNaraComposer() {
  const path = "src/NaraAssistant.jsx";
  let source = await read(path);
  if (!source.includes("nara-mobile-direct-tools-v199")) {
    const anchor = `              <div className="nara-composer-tools">
                <div className="nara-attachment-menu-wrap">`;
    const replacement = `              <div className="nara-composer-tools">
                <div className="nara-mobile-direct-tools-v199" role="group" aria-label="Lampiran cepat Nara">
                  <button type="button" disabled={busy} onClick={() => cameraInput.current?.click()} title="Kamera" aria-label="Buka kamera"><Camera /></button>
                  <button type="button" disabled={busy} onClick={() => imageInput.current?.click()} title="Foto" aria-label="Pilih foto"><ImageIcon /></button>
                  <button type="button" disabled={busy} onClick={() => fileInput.current?.click()} title="File" aria-label="Pilih file"><File /></button>
                </div>
                <div className="nara-attachment-menu-wrap">`;
    source = replaceOnce(source, anchor, replacement, "NARA_DIRECT_TOOLS");
  }
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "mobile-ui-v199";');
  if (!source.includes("CURRENT_SCREENSHOT_RELEASE_V199")) {
    source = source.replace(/^(const VERSION = .*;\n)/m, `$1const CURRENT_SCREENSHOT_RELEASE_V199 = "${RELEASE}";\n`);
  }
  source = source
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V198", "NGE_BLOGGING_UPDATE_AVAILABLE_V199")
    .replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V194", "NGE_BLOGGING_UPDATE_AVAILABLE_V199");
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v199 announces the new shell without forced navigation or session destruction.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V199_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) {
    throw new Error("V199_SESSION_DESTRUCTIVE_ACTION_FOUND");
  }
  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/Studio.jsx", "studio-current-screenshot-v199.js"],
    ["src/studio-current-screenshot-v199.js", RELEASE],
    ["src/studio-current-screenshot-v199.js", "normalizeThemeActions"],
    ["src/studio-current-screenshot-v199.js", "normalizeAccountSurface"],
    ["src/studio-current-screenshot-v199.css", "nara-mobile-direct-tools-v199"],
    ["src/studio-current-screenshot-v199.css", 'grid-template-areas: "title sizes voice close"'],
    ["src/studio-current-screenshot-v199.css", '"top-left-1 top-right-1"'],
    ["src/NaraAssistant.jsx", "nara-mobile-direct-tools-v199"],
    ["src/NaraAssistant.jsx", "recognition.current = null;"],
    ["public/release-v199.json", RELEASE],
    ["public/sw.js", VERSION],
    ["public/sw.js", CACHE],
    ["public/sw.js", RELEASE],
  ];

  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V199_VERIFY_FAILED:${path}:${marker}`);
  }

  const worker = await read("public/sw.js");
  if (/await refreshStaleWindow\(client, url\);/.test(worker)) throw new Error("V199_FORCED_NAVIGATION_REINTRODUCED");
}

await verifyAuthContinuityWithoutMutation();
await patchNaraComposer();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
