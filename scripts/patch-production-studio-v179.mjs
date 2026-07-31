import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const RELEASE = "studio-production-stability-v179-20260731";
const read = (file) => readFileSync(resolve(file), "utf8");
const write = (file, value) => writeFileSync(resolve(file), value, "utf8");

function replaceOnce(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) throw new Error(`PATCH_V179_${label}_ANCHOR_MISSING`);
  return source.replace(search, replacement);
}

function patchStudio() {
  const file = "src/StudioNext.jsx";
  let source = read(file);
  if (!source.includes("bootstrap-partial-cloud-v179")) {
    const startMarker = '  useEffect(() => {\n    if (!user?.id || !supabaseConfigured) { setDataMode("local"); return; }';
    const nextMarker = '\n\n  useEffect(() => {\n    if (dataMode !== "cloud"';
    const start = source.indexOf(startMarker);
    const end = source.indexOf(nextMarker, start);
    if (start < 0 || end < 0) throw new Error("PATCH_V179_STUDIO_BOOTSTRAP_ANCHOR_MISSING");
    const replacement = `  useEffect(() => {
    if (!user?.id || !supabaseConfigured) { setDataMode("local"); return; }
    let cancelled = false;
    setDataMode("connecting");
    document.documentElement.dataset.studioBootstrapV179 = "bootstrap-partial-cloud-v179";
    (async () => {
      let primary = null;
      try {
        primary = await getOrCreatePrimarySite(user);
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
  };`;
    source = `${source.slice(0, start)}${replacement}${source.slice(end)}`;
  }

  source = replaceOnce(
    source,
    '  const chooseView = (next) => { setView(next); setMobileSidebar(false); if (["posts", "pages"].includes(next)) setQuery(""); };',
    '  const chooseView = (next) => { setView(next); setMobileSidebar(false); if (["posts", "pages"].includes(next)) setQuery(""); requestAnimationFrame(() => { document.querySelector(".sn-main")?.scrollTo?.({ top: 0, left: 0, behavior: "auto" }); window.scrollTo?.({ top: 0, left: 0, behavior: "auto" }); }); };',
    "VIEW_SCROLL_RESET",
  );
  write(file, source);
}

function patchOperationalLoading() {
  const domainFile = "src/DomainPanelV124.jsx";
  let domain = read(domainFile);
  domain = replaceOnce(
    domain,
    '    if (!site?.id) return;\n    if (!quiet) setLoading(true);',
    '    if (!site?.id) { setLoading(false); setError("Situs aktif belum tersedia. Muat ulang Studio atau pilih Workspace."); return; }\n    if (!quiet) setLoading(true);',
    "DOMAIN_NO_SITE",
  );
  write(domainFile, domain);

  const commentsFile = "src/CommentsPanelV124.jsx";
  let comments = read(commentsFile);
  comments = replaceOnce(
    comments,
    '    if (!site?.id || !supabase) return;\n    if (!quiet) setLoading(true);',
    '    if (!site?.id || !supabase) { setLoading(false); setError(!site?.id ? "Situs aktif belum tersedia. Pilih Workspace lalu coba lagi." : "Koneksi komentar belum tersedia."); return; }\n    if (!quiet) setLoading(true);',
    "COMMENTS_NO_SITE",
  );
  write(commentsFile, comments);
}

function patchAuthFallback() {
  const file = "src/lib/supabase.js";
  let source = read(file);
  if (!source.includes("direct-fallback-v179")) {
    const start = source.indexOf("async function authAwareFetch(input, init) {");
    const end = source.indexOf("\n}\n\nexport const supabase", start);
    if (start < 0 || end < 0) throw new Error("PATCH_V179_AUTH_FETCH_ANCHOR_MISSING");
    const replacement = `async function authAwareFetch(input, init) {
  if (!nativeFetch) throw new Error("Fetch API tidak tersedia pada browser ini.");
  const proxy = proxiedAuthUrl(input);
  if (!proxy) return nativeFetch(input, init);
  const fallbackInput = input instanceof Request ? input.clone() : input;
  const request = input instanceof Request ? new Request(proxy.toString(), input) : proxy.toString();
  try {
    const response = await nativeFetch(request, init);
    if (![404, 502, 503, 504].includes(response.status)) {
      if (typeof document !== "undefined") document.documentElement.dataset.authTransportV153 = "same-origin-gateway";
      return response;
    }
  } catch (error) {
    console.warn("Gateway auth tidak terjangkau; memakai endpoint Supabase langsung", error);
  }
  if (typeof document !== "undefined") document.documentElement.dataset.authTransportV153 = "direct-fallback-v179";
  return nativeFetch(fallbackInput, init);
}`;
    source = `${source.slice(0, start)}${replacement}${source.slice(end + 2)}`;
  }
  const providerStart = source.indexOf("function providerDestination(value) {");
  const providerEnd = source.indexOf("\n}\n\nexport async function signInWithProvider", providerStart);
  if (providerStart < 0 || providerEnd < 0) throw new Error("PATCH_V179_PROVIDER_ANCHOR_MISSING");
  const providerReplacement = `function providerDestination(value) {
  const direct = new URL(value);
  if (typeof document !== "undefined") document.documentElement.dataset.authProviderTransportV179 = "direct-supabase-oauth";
  return direct.toString();
}`;
  source = `${source.slice(0, providerStart)}${providerReplacement}${source.slice(providerEnd + 2)}`;
  write(file, source);
}

function patchEntryAndCache() {
  const entryFile = "src/Studio.jsx";
  let entry = read(entryFile);
  entry = replaceOnce(
    entry,
    'import "./studio-finalization-v178.js";',
    'import "./studio-finalization-v178.js";\nimport "./studio-production-stability-v179.js";',
    "ENTRY",
  );
  write(entryFile, entry);

  const swFile = "public/sw.js";
  let sw = read(swFile);
  sw = sw.replace('const VERSION = "ngeblogging-app-v177-screenshot-stability-20260731";', 'const VERSION = "ngeblogging-app-v179-production-stability-20260731";');
  sw = sw.replace('const CACHE_RELEASE = "screenshot-stability-cache-v177";', 'const CACHE_RELEASE = "production-stability-cache-v179";');
  sw = sw.replace('const FORCE_REFRESH_VALUE = "screenshot-stability-v177";', 'const FORCE_REFRESH_VALUE = "production-stability-v179";');
  sw = sw.replaceAll("NGE_BLOGGING_FORCE_RELOAD_V177", "NGE_BLOGGING_FORCE_RELOAD_V179");
  sw = sw.replaceAll("service-worker-stale-shell-v177", "service-worker-stale-shell-v179");
  sw = sw.replaceAll("service-worker-activated-screenshot-stability-v177", "service-worker-activated-production-stability-v179");
  write(swFile, sw);
}

function verify() {
  const checks = [
    ["src/Studio.jsx", "studio-production-stability-v179.js"],
    ["src/StudioNext.jsx", "bootstrap-partial-cloud-v179"],
    ["src/StudioNext.jsx", "scrollTo?.({ top: 0"],
    ["src/DomainPanelV124.jsx", "Situs aktif belum tersedia"],
    ["src/CommentsPanelV124.jsx", "Koneksi komentar belum tersedia"],
    ["src/lib/supabase.js", "direct-fallback-v179"],
    ["src/lib/supabase.js", "direct-supabase-oauth"],
    ["public/sw.js", "ngeblogging-app-v179-production-stability-20260731"],
  ];
  const missing = checks.filter(([file, marker]) => !read(file).includes(marker));
  if (missing.length) throw new Error(`PATCH_V179_INCOMPLETE:${missing.map(([file, marker]) => `${file}:${marker}`).join(",")}`);
}

patchStudio();
patchOperationalLoading();
patchAuthFallback();
patchEntryAndCache();
verify();
console.log(`[${RELEASE}] source, auth, loading, scroll, and cache patches verified`);
