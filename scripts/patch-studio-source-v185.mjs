import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const RELEASE = "studio-source-recovery-v185-20260801";
const read = (file) => readFileSync(resolve(file), "utf8");
const write = (file, value) => writeFileSync(resolve(file), value, "utf8");

function patchOnboardingFallback() {
  const file = "src/StudioOnboardingGate.jsx";
  let source = read(file);
  if (!source.includes("cached-window-site-v185")) {
    const search = `      } catch (nextError) {
        if (isSessionReauthError(nextError)) requestReauthentication(nextError);
        if (!cancelled) {`;
    const replacement = `      } catch (nextError) {
        if (isSessionReauthError(nextError)) requestReauthentication(nextError);
        const cachedSite = window.__ngebloggingActiveSite?.id ? window.__ngebloggingActiveSite : null;
        if (!cancelled && cachedSite && isTransientStudioError(nextError)) {
          publishActiveSite(cachedSite);
          document.documentElement.dataset.studioStartupRecoveryV185 = "cached-window-site-v185";
          setPhase("ready");
          return;
        }
        if (!cancelled) {`;
    if (!source.includes(search)) throw new Error("PATCH_V185_ONBOARDING_FALLBACK_ANCHOR_MISSING");
    source = source.replace(search, replacement);
  }
  write(file, source);
}

function patchStudioEntry() {
  const file = "src/Studio.jsx";
  let source = read(file);
  const line = 'import "./studio-mobile-authority-v185.js";';
  if (!source.includes(line)) {
    const anchors = [
      'import "./studio-production-v183-controls.css";',
      'import "./studio-production-v183.js";',
    ];
    const anchor = anchors.find((candidate) => source.includes(candidate));
    if (!anchor) throw new Error("PATCH_V185_STUDIO_ENTRY_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n${line}`);
  }
  write(file, source);
}

function rotateServiceWorker() {
  const file = "public/sw.js";
  let source = read(file);
  source = source.replace(/^const VERSION = ".*";$/m, 'const VERSION = "ngeblogging-app-v185-mobile-authority-20260801";');
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, 'const CACHE_RELEASE = "mobile-authority-cache-v185";');
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "mobile-authority-v185";');
  if (!source.includes("MOBILE_AUTHORITY_RELEASE_V185")) {
    source = source.replace(
      /^(const VERSION = .*;\n)/m,
      '$1const MOBILE_AUTHORITY_RELEASE_V185 = "studio-mobile-authority-v185-20260801";\n',
    );
  }
  if (/await refreshStaleWindow\(client, url\);/.test(source)) {
    throw new Error("PATCH_V185_FORCED_NAVIGATION_MUST_REMAIN_DISABLED");
  }
  write(file, source);
}

function verifyExistingAuthorities() {
  const checks = [
    ["src/StudioNext.jsx", "studio-bootstrap-resilient-v183"],
    ["src/StudioNext.jsx", "Promise.allSettled"],
    ["src/DomainPanelV124.jsx", "Situs aktif belum tersedia"],
    ["src/CommentsPanelV124.jsx", "Koneksi komentar belum tersedia"],
    ["src/lib/supabase.js", "direct-fallback-v180"],
    ["src/lib/supabase.js", "direct-supabase-oauth"],
    ["src/NaraAssistant.jsx", 'aria-modal={size === "full"}'],
    ["src/Studio.jsx", "studio-mobile-authority-v185.js"],
    ["src/StudioOnboardingGate.jsx", "cached-window-site-v185"],
    ["public/sw.js", "ngeblogging-app-v185-mobile-authority-20260801"],
  ];
  const missing = checks.filter(([file, marker]) => !read(file).includes(marker));
  if (missing.length) {
    throw new Error(`PATCH_V185_INCOMPLETE:${missing.map(([file, marker]) => `${file}:${marker}`).join(",")}`);
  }
}

patchOnboardingFallback();
patchStudioEntry();
rotateServiceWorker();
verifyExistingAuthorities();
console.log(`[${RELEASE}] mobile authority and cached onboarding recovery verified`);
