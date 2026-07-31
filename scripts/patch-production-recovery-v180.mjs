import { readFile, writeFile } from "node:fs/promises";

const RELEASE = "production-recovery-v180-20260731";
const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

function replaceSection(source, startNeedle, endNeedle, replacement, label) {
  if (source.includes(replacement)) return source;
  const anchor = source.indexOf(startNeedle);
  if (anchor < 0) throw new Error(`V180_${label}_START_MISSING`);
  const start = source.lastIndexOf("  useEffect(() => {", anchor);
  const end = source.indexOf(endNeedle, anchor);
  if (start < 0 || end < 0) throw new Error(`V180_${label}_RANGE_MISSING`);
  return `${source.slice(0, start)}${replacement}${source.slice(end)}`;
}

async function patchStudioBootstrap() {
  const path = "src/StudioNext.jsx";
  let source = await read(path);

  if (!source.includes("production-recovery-bootstrap-v180")) {
    const bootstrap = `  useEffect(() => {
    if (!user?.id || !supabaseConfigured) { setDataMode("local"); return undefined; }
    let cancelled = false;
    setDataMode("connecting");
    document.documentElement.dataset.studioBootstrapV180 = "production-recovery-bootstrap-v180";

    (async () => {
      try {
        const primary = await getOrCreatePrimarySite(user);
        if (cancelled) return;
        setActiveSiteId(primary.id);
        setSite(primary);
        setSites([primary]);
        setDataMode("cloud");

        listUserSites(user.id).then((rows) => {
          if (!cancelled) setSites(rows.length ? rows : [primary]);
        }).catch((error) => console.warn("Daftar workspace belum lengkap", error));
      } catch (error) {
        console.error("Studio site bootstrap failed", error);
        if (!cancelled) {
          setDataMode("local");
          setToast("Situs aktif belum tersambung; sesi dan draf perangkat tetap dipertahankan");
        }
      }

      getUserProfile(user.id).then((userProfile) => {
        if (!cancelled) setProfile(userProfile);
      }).catch((error) => console.warn("Profil belum dapat dimuat tanpa memblokir situs", error));
    })();

    return () => { cancelled = true; };
  }, [user?.id]);`;

    source = replaceSection(
      source,
      "Promise.all([getOrCreatePrimarySite(user), listUserSites(user.id), getUserProfile(user.id)])",
      "\n\n  useEffect(() => {\n    if (dataMode !== \"cloud\"",
      bootstrap,
      "STUDIO_BOOTSTRAP",
    );
  }

  const oldChoose = '  const chooseView = (next) => { setView(next); setMobileSidebar(false); if (["posts", "pages"].includes(next)) setQuery(""); };';
  const newChoose = '  const chooseView = (next) => { setView(next); setMobileSidebar(false); if (["posts", "pages"].includes(next)) setQuery(""); requestAnimationFrame(() => { const main = document.querySelector(".sn-main"); main?.scrollTo?.({ top: 0, left: 0, behavior: "auto" }); window.scrollTo?.({ top: 0, left: 0, behavior: "auto" }); }); };';
  if (!source.includes(newChoose)) {
    if (!source.includes(oldChoose)) throw new Error("V180_CHOOSE_VIEW_ANCHOR_MISSING");
    source = source.replace(oldChoose, newChoose);
  }

  await write(path, source);
}

async function patchOperationalLoading() {
  const domainPath = "src/DomainPanelV124.jsx";
  let domain = await read(domainPath);
  const oldDomain = "    if (!site?.id) return;\n    if (!quiet) setLoading(true);";
  const newDomain = '    if (!site?.id) { setLoading(false); setError("Situs aktif belum tersedia. Pilih Workspace atau muat ulang Studio."); return; }\n    if (!quiet) setLoading(true);';
  if (!domain.includes(newDomain)) {
    if (!domain.includes(oldDomain)) throw new Error("V180_DOMAIN_LOADING_ANCHOR_MISSING");
    domain = domain.replace(oldDomain, newDomain);
  }
  await write(domainPath, domain);

  const commentsPath = "src/CommentsPanelV124.jsx";
  let comments = await read(commentsPath);
  const oldComments = "    if (!site?.id || !supabase) return;\n    if (!quiet) setLoading(true);";
  const newComments = '    if (!site?.id || !supabase) { setLoading(false); setError(!site?.id ? "Situs aktif belum tersedia. Pilih Workspace lalu coba lagi." : "Koneksi komentar belum tersedia."); return; }\n    if (!quiet) setLoading(true);';
  if (!comments.includes(newComments)) {
    if (!comments.includes(oldComments)) throw new Error("V180_COMMENTS_LOADING_ANCHOR_MISSING");
    comments = comments.replace(oldComments, newComments);
  }
  await write(commentsPath, comments);
}

async function patchAuthentication() {
  const path = "src/lib/supabase.js";
  let source = await read(path);
  source = source.replace('const AUTH_RELEASE = "auth-production-v153-20260730";', 'const AUTH_RELEASE = "auth-production-recovery-v180-20260731";');
  source = source.replace('"x-client-info": "ngeblogging-web-v153"', '"x-client-info": "ngeblogging-web-v180"');

  if (!source.includes("direct-fallback-v180")) {
    const start = source.indexOf("async function authAwareFetch(input, init) {");
    const end = source.indexOf("\n}\n\nexport const supabase", start);
    if (start < 0 || end < 0) throw new Error("V180_AUTH_FETCH_RANGE_MISSING");
    const replacement = `async function authAwareFetch(input, init) {
  if (!nativeFetch) throw new Error("Fetch API tidak tersedia pada browser ini.");
  const proxy = proxiedAuthUrl(input);
  if (!proxy) return nativeFetch(input, init);

  const directInput = input instanceof Request ? input.clone() : input;
  const proxyInput = input instanceof Request
    ? new Request(proxy.toString(), input.clone())
    : proxy.toString();

  try {
    const response = await nativeFetch(proxyInput, init);
    if (![404, 502, 503, 504].includes(response.status)) {
      if (typeof document !== "undefined") {
        document.documentElement.dataset.authTransportV180 = response.headers.get("x-ngeblogging-auth-gateway")
          ? "same-origin-gateway"
          : "same-origin-response";
      }
      return response;
    }
  } catch (error) {
    console.warn("Gateway auth tidak terjangkau; memakai endpoint Supabase langsung", error);
  }

  if (typeof document !== "undefined") document.documentElement.dataset.authTransportV180 = "direct-fallback-v180";
  return nativeFetch(directInput, init);
}`;
    source = `${source.slice(0, start)}${replacement}${source.slice(end + 2)}`;
  }

  const providerStart = source.indexOf("function providerDestination(value) {");
  const providerEnd = source.indexOf("\n}\n\nexport async function signInWithProvider", providerStart);
  if (providerStart < 0 || providerEnd < 0) throw new Error("V180_PROVIDER_RANGE_MISSING");
  const providerReplacement = `function providerDestination(value) {
  const direct = new URL(value);
  if (typeof document !== "undefined") document.documentElement.dataset.authProviderTransportV180 = "direct-supabase-oauth";
  return direct.toString();
}`;
  source = `${source.slice(0, providerStart)}${providerReplacement}${source.slice(providerEnd + 2)}`;

  await write(path, source);
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  const importLine = 'import "./studio-production-recovery-v180.js";';
  if (!source.includes(importLine)) {
    const anchor = 'import "./studio-mobile-runtime-v179.js";';
    if (!source.includes(anchor)) throw new Error("V180_STUDIO_ENTRY_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n${importLine}`);
  }
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, 'const VERSION = "ngeblogging-app-v180-production-recovery-20260731";');
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, 'const CACHE_RELEASE = "production-recovery-cache-v180";');
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "production-recovery-v180";');
  if (!source.includes("PRODUCTION_RECOVERY_RELEASE_V180")) {
    source = source.replace(
      /^(const VERSION = .*;\n)/m,
      '$1const PRODUCTION_RECOVERY_RELEASE_V180 = "production-recovery-v180-20260731";\n',
    );
  }
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V180_FORCED_NAVIGATION_STILL_ACTIVE");
  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/StudioNext.jsx", "production-recovery-bootstrap-v180"],
    ["src/StudioNext.jsx", "setActiveSiteId(primary.id)"],
    ["src/StudioNext.jsx", 'scrollTo?.({ top: 0, left: 0, behavior: "auto" })'],
    ["src/DomainPanelV124.jsx", "Situs aktif belum tersedia"],
    ["src/CommentsPanelV124.jsx", "Koneksi komentar belum tersedia"],
    ["src/lib/supabase.js", "direct-fallback-v180"],
    ["src/lib/supabase.js", "direct-supabase-oauth"],
    ["src/Studio.jsx", "studio-production-recovery-v180.js"],
    ["public/sw.js", "ngeblogging-app-v180-production-recovery-20260731"],
    ["public/sw.js", "production-recovery-cache-v180"],
  ];
  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V180_VERIFY_FAILED:${path}:${marker}`);
  }
}

await patchStudioBootstrap();
await patchOperationalLoading();
await patchAuthentication();
await patchStudioEntry();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
