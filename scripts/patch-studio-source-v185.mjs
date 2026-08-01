import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const RELEASE = "studio-source-recovery-v185-20260801";
const read = (file) => readFileSync(resolve(file), "utf8");
const write = (file, value) => writeFileSync(resolve(file), value, "utf8");

function replaceOnce(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) throw new Error(`PATCH_V185_${label}_ANCHOR_MISSING`);
  return source.replace(search, replacement);
}

function replaceEffectContaining(source, marker, replacement, label) {
  if (source.includes("studio-bootstrap-primary-first-v185")) return source;
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error(`PATCH_V185_${label}_MARKER_MISSING`);
  const start = source.lastIndexOf("  useEffect(() => {", markerIndex);
  const end = source.indexOf("\n\n  useEffect(() => {", markerIndex);
  if (start < 0 || end < 0) throw new Error(`PATCH_V185_${label}_RANGE_MISSING`);
  return `${source.slice(0, start)}${replacement}${source.slice(end)}`;
}

function patchStudioData() {
  const file = "src/lib/studio-data.js";
  let source = read(file);
  source = replaceOnce(
    source,
    'export const ACTIVE_SITE_STORAGE_KEY = "ngeblogging-active-site-id";',
    'export const ACTIVE_SITE_STORAGE_KEY = "ngeblogging-active-site-id";\nexport const ACTIVE_SITE_SNAPSHOT_KEY = "ngeblogging-active-site-snapshot-v185";',
    "SITE_SNAPSHOT_KEY",
  );

  if (!source.includes("export function getActiveSiteSnapshot")) {
    const marker = "\n}\n\nfunction membershipSite";
    const start = source.indexOf("export function setActiveSiteId(siteId) {");
    const end = source.indexOf(marker, start);
    if (start < 0 || end < 0) throw new Error("PATCH_V185_SITE_SNAPSHOT_FUNCTION_ANCHOR_MISSING");
    const helpers = `
}

export function getActiveSiteSnapshot() {
  if (typeof window !== "undefined" && window.__ngebloggingActiveSite?.id) return window.__ngebloggingActiveSite;
  try {
    if (typeof localStorage === "undefined") return null;
    const value = JSON.parse(localStorage.getItem(ACTIVE_SITE_SNAPSHOT_KEY) || "null");
    return value?.id ? value : null;
  } catch {
    return null;
  }
}

export function setActiveSiteSnapshot(site) {
  if (!site?.id) return null;
  const snapshot = {
    id: site.id,
    name: site.name || "Situs Ngeblogging",
    slug: site.slug || "",
    description: site.description || "",
    status: site.status || "draft",
    is_public: site.is_public === true,
    blueprint: site.blueprint || "blog",
    theme_key: site.theme_key || null,
    settings: site.settings || {},
    role: site.role || "owner",
    updated_at: site.updated_at || new Date().toISOString(),
  };
  setActiveSiteId(snapshot.id);
  if (typeof window !== "undefined") window.__ngebloggingActiveSite = snapshot;
  if (typeof document !== "undefined") {
    document.documentElement.dataset.activeSiteId = snapshot.id;
    document.documentElement.dataset.activeSiteSlug = snapshot.slug;
  }
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(ACTIVE_SITE_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // Snapshot hanya jalur pemulihan; storage tidak boleh memblokir Studio.
  }
  return snapshot;
}

function membershipSite`;
    source = `${source.slice(0, end)}${helpers}${source.slice(end + marker.length)}`;
  }

  source = source.replace(
    "    setActiveSiteId(selected.id);\n    return selected;",
    "    setActiveSiteSnapshot(selected);\n    return selected;",
  );
  source = source.replace(
    "  return created;\n}\n\nexport async function listContentPage",
    "  setActiveSiteSnapshot(created);\n  return created;\n}\n\nexport async function listContentPage",
  );
  write(file, source);
}

function patchStudioNext() {
  const file = "src/StudioNext.jsx";
  let source = read(file);
  source = replaceOnce(
    source,
    "  createUserSite, getOrCreatePrimarySite, getUserProfile, listUserSites,\n  setActiveSiteId, updateUserProfile,",
    "  createUserSite, getActiveSiteSnapshot, getOrCreatePrimarySite, getUserProfile, listUserSites,\n  setActiveSiteId, setActiveSiteSnapshot, updateUserProfile,",
    "STUDIO_IMPORT",
  );
  source = replaceOnce(
    source,
    "  const [sites, setSites] = useState([]);\n  const [site, setSite] = useState(null);",
    "  const [sites, setSites] = useState(() => { const cached = getActiveSiteSnapshot(); return cached ? [cached] : []; });\n  const [site, setSite] = useState(getActiveSiteSnapshot);",
    "STUDIO_INITIAL_SITE",
  );

  const bootstrap = `  useEffect(() => {
    if (!user?.id || !supabaseConfigured) { setDataMode("local"); return undefined; }
    let cancelled = false;
    let retryTimer = 0;
    let attempt = 0;
    const cached = getActiveSiteSnapshot();

    const publishSite = (next, rows = [next], mode = "cloud") => {
      if (!next?.id || cancelled) return;
      const snapshot = setActiveSiteSnapshot(next) || next;
      setSite(snapshot);
      setSites(Array.isArray(rows) && rows.length
        ? rows.map((item) => item.id === snapshot.id ? { ...item, ...snapshot } : item)
        : [snapshot]);
      setDataMode(mode);
    };

    const bootstrap = async (quiet = false) => {
      if (cancelled) return;
      if (cached) publishSite(cached, [cached], "cloud");
      else if (!quiet) setDataMode("connecting");
      document.documentElement.dataset.studioBootstrapV185 = "studio-bootstrap-primary-first-v185";

      let primary = cached;
      try {
        primary = await getOrCreatePrimarySite(user);
        publishSite(primary, [primary], "cloud");
        attempt = 0;
      } catch (error) {
        console.error("Studio primary site bootstrap failed", error);
        if (!cached && !cancelled) setDataMode("local");
        if (!quiet && !cancelled) setToast(cached
          ? "Koneksi terbatas: situs aktif dipulihkan dari perangkat dan sesi tetap tersimpan"
          : "Cloud belum dapat dijangkau; draf perangkat tetap tersedia");
      }

      const results = await Promise.allSettled([
        listUserSites(user.id),
        getUserProfile(user.id),
      ]);
      if (cancelled) return;
      const siteRows = results[0].status === "fulfilled" ? results[0].value : [];
      const userProfile = results[1].status === "fulfilled" ? results[1].value : null;
      if (siteRows.length) {
        const selected = siteRows.find((item) => item.id === (primary?.id || cached?.id)) || siteRows[0];
        publishSite(selected, siteRows, "cloud");
      }
      if (userProfile) setProfile(userProfile);
      if (results[0].status === "rejected") console.warn("Daftar situs belum lengkap", results[0].reason);
      if (results[1].status === "rejected") console.warn("Profil belum dapat dimuat tanpa memblokir Studio", results[1].reason);

      if (!siteRows.length && !primary?.id && navigator.onLine !== false && attempt < 4) {
        const delay = [900, 1800, 3600, 7200][attempt] || 7200;
        attempt += 1;
        window.clearTimeout(retryTimer);
        retryTimer = window.setTimeout(() => bootstrap(true), delay);
      }
    };

    const reconnect = () => {
      attempt = 0;
      bootstrap(true);
    };
    window.addEventListener("online", reconnect, { passive: true });
    bootstrap(false);
    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
      window.removeEventListener("online", reconnect);
    };
  }, [user?.id]);`;

  const bootstrapMarker = source.includes("studio-bootstrap-resilient-v183")
    ? "studio-bootstrap-resilient-v183"
    : source.includes("production-recovery-bootstrap-v180")
      ? "production-recovery-bootstrap-v180"
      : "Promise.all([getOrCreatePrimarySite(user), listUserSites(user.id), getUserProfile(user.id)])";
  source = replaceEffectContaining(source, bootstrapMarker, bootstrap, "STUDIO_BOOTSTRAP");

  if (!source.includes("studio-site-events-v185")) {
    const marker = '\n\n  useEffect(() => {\n    if (dataMode !== "cloud"';
    const index = source.indexOf(marker);
    if (index < 0) throw new Error("PATCH_V185_STUDIO_SITE_EVENT_ANCHOR_MISSING");
    const effect = `

  useEffect(() => {
    document.documentElement.dataset.studioSiteEventsV185 = "studio-site-events-v185";
    const sync = (event) => {
      const next = event?.detail?.id ? event.detail : getActiveSiteSnapshot();
      if (!next?.id) return;
      const snapshot = setActiveSiteSnapshot(next) || next;
      setSite(snapshot);
      setSites((current) => current.some((item) => item.id === snapshot.id)
        ? current.map((item) => item.id === snapshot.id ? { ...item, ...snapshot } : item)
        : [snapshot, ...current]);
      setDataMode("cloud");
    };
    window.addEventListener("ngeblogging:active-site-ready", sync);
    window.addEventListener("ngeblogging:active-site-change", sync);
    return () => {
      window.removeEventListener("ngeblogging:active-site-ready", sync);
      window.removeEventListener("ngeblogging:active-site-change", sync);
    };
  }, []);`;
    source = `${source.slice(0, index)}${effect}${source.slice(index)}`;
  }

  const desiredSelect = '  const selectSite = (next) => { const snapshot = setActiveSiteSnapshot(next) || next; setActiveSiteId(snapshot.id); setSite(snapshot); setSiteManager(false); setDocs([]); setView("home"); setToast(`Workspace ${snapshot.name} aktif`); window.dispatchEvent(new CustomEvent("ngeblogging:active-site-change", { detail: snapshot })); };';
  if (!source.includes(desiredSelect)) {
    const candidates = [
      '  const selectSite = (next) => { setActiveSiteId(next.id); setSite(next); setSiteManager(false); setDocs([]); setView("home"); setToast(`Workspace ${next.name} aktif`); };',
      '  const selectSite = (next) => { setActiveSiteId(next.id); setSite(next); setSiteManager(false); setDocs([]); setView("home"); try { localStorage.setItem(ACTIVE_SITE_SNAPSHOT_V183, JSON.stringify(next)); } catch { /* optional */ } window.__ngebloggingActiveSite = next; document.documentElement.dataset.activeSiteId = next.id; setToast(`Workspace ${next.name} aktif`); };',
    ];
    const anchor = candidates.find((candidate) => source.includes(candidate));
    if (!anchor) throw new Error("PATCH_V185_STUDIO_SELECT_SITE_ANCHOR_MISSING");
    source = source.replace(anchor, desiredSelect);
  }
  write(file, source);
}

function patchOnboarding() {
  const file = "src/StudioOnboardingGate.jsx";
  let source = read(file);
  source = replaceOnce(
    source,
    'import { ACTIVE_SITE_STORAGE_KEY, listUserSites, setActiveSiteId } from "./lib/studio-data.js";',
    'import { ACTIVE_SITE_STORAGE_KEY, getActiveSiteSnapshot, listUserSites, setActiveSiteSnapshot } from "./lib/studio-data.js";',
    "ONBOARDING_IMPORT",
  );
  source = source.replace("  setActiveSiteId(site.id);", "  setActiveSiteSnapshot(site);");

  if (!source.includes("cached-site-recovery-v185")) {
    const search = `      } catch (nextError) {
        if (isSessionReauthError(nextError)) requestReauthentication(nextError);
        if (!cancelled) {`;
    const replacement = `      } catch (nextError) {
        if (isSessionReauthError(nextError)) requestReauthentication(nextError);
        const cached = getActiveSiteSnapshot();
        if (!cancelled && cached?.id && isTransientStudioError(nextError)) {
          publishActiveSite(cached);
          document.documentElement.dataset.studioStartupRecoveryV185 = "cached-site-recovery-v185";
          setPhase("ready");
          return;
        }
        if (!cancelled) {`;
    source = replaceOnce(source, search, replacement, "ONBOARDING_CACHED_RECOVERY");
  }
  write(file, source);
}

function patchOperationalPages() {
  const domainFile = "src/DomainPanelV124.jsx";
  let domain = read(domainFile);
  if (domain.includes("    if (!site?.id) return;\n    if (!quiet) setLoading(true);")) {
    domain = domain.replace(
      "    if (!site?.id) return;\n    if (!quiet) setLoading(true);",
      '    if (!site?.id) { setLoading(false); setError("Situs aktif belum tersedia. Pilih Workspace atau muat ulang Studio."); return; }\n    if (!quiet) setLoading(true);',
    );
  }
  if (!domain.includes("Situs aktif belum tersedia")) throw new Error("PATCH_V185_DOMAIN_LOADING_END_MISSING");
  write(domainFile, domain);

  const commentsFile = "src/CommentsPanelV124.jsx";
  let comments = read(commentsFile);
  if (comments.includes("    if (!site?.id || !supabase) return;\n    if (!quiet) setLoading(true);")) {
    comments = comments.replace(
      "    if (!site?.id || !supabase) return;\n    if (!quiet) setLoading(true);",
      '    if (!site?.id || !supabase) { setLoading(false); setError(!site?.id ? "Situs aktif belum tersedia. Pilih Workspace lalu coba lagi." : "Koneksi komentar belum tersedia."); return; }\n    if (!quiet) setLoading(true);',
    );
  }
  if (!comments.includes("Koneksi komentar belum tersedia") && !comments.includes("Situs aktif belum tersedia")) {
    throw new Error("PATCH_V185_COMMENTS_LOADING_END_MISSING");
  }
  write(commentsFile, comments);
}

function patchAuthTransport() {
  const file = "src/lib/supabase.js";
  let source = read(file);
  if (!source.includes("auth-direct-fallback-v185")) {
    const start = source.indexOf("async function authAwareFetch(input, init) {");
    const end = source.indexOf("\n}\n\nexport const supabase", start);
    if (start < 0 || end < 0) throw new Error("PATCH_V185_AUTH_FETCH_ANCHOR_MISSING");
    const replacement = `async function authAwareFetch(input, init) {
  if (!nativeFetch) throw new Error("Fetch API tidak tersedia pada browser ini.");
  const proxy = proxiedAuthUrl(input);
  if (!proxy) return nativeFetch(input, init);
  const directInput = input instanceof Request ? input.clone() : input;
  const request = input instanceof Request ? new Request(proxy.toString(), input) : proxy.toString();
  try {
    const response = await nativeFetch(request, init);
    if (![404, 502, 503, 504].includes(response.status)) {
      if (typeof document !== "undefined") document.documentElement.dataset.authTransportV185 = "same-origin-gateway";
      return response;
    }
  } catch (error) {
    console.warn("Gateway autentikasi tidak terjangkau; mencoba endpoint Supabase langsung", error);
  }
  if (typeof document !== "undefined") document.documentElement.dataset.authTransportV185 = "auth-direct-fallback-v185";
  return nativeFetch(directInput, init);
}`;
    source = `${source.slice(0, start)}${replacement}${source.slice(end + 2)}`;
  }

  const providerStart = source.indexOf("function providerDestination(value) {");
  const providerEnd = source.indexOf("\n}\n\nexport async function signInWithProvider", providerStart);
  if (providerStart < 0 || providerEnd < 0) throw new Error("PATCH_V185_PROVIDER_ANCHOR_MISSING");
  const providerReplacement = `function providerDestination(value) {
  const direct = new URL(value);
  if (typeof document !== "undefined") document.documentElement.dataset.authProviderTransportV185 = "direct-oauth-v185";
  return direct.toString();
}`;
  source = `${source.slice(0, providerStart)}${providerReplacement}${source.slice(providerEnd + 2)}`;
  write(file, source);
}

function patchEntryAndCache() {
  const studioFile = "src/Studio.jsx";
  let studio = read(studioFile);
  studio = replaceOnce(
    studio,
    'import "./studio-production-v183-controls.css";',
    'import "./studio-production-v183-controls.css";\nimport "./studio-mobile-authority-v185.js";',
    "STUDIO_ENTRY",
  );
  write(studioFile, studio);

  const swFile = "public/sw.js";
  let sw = read(swFile);
  sw = sw.replace(/^const VERSION = ".*";$/m, 'const VERSION = "ngeblogging-app-v185-source-recovery-20260801";');
  sw = sw.replace(/^const CACHE_RELEASE = ".*";$/m, 'const CACHE_RELEASE = "source-recovery-cache-v185";');
  sw = sw.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "source-recovery-v185";');
  write(swFile, sw);
}

function verify() {
  const checks = [
    ["src/lib/studio-data.js", "ACTIVE_SITE_SNAPSHOT_KEY"],
    ["src/lib/studio-data.js", "setActiveSiteSnapshot"],
    ["src/StudioNext.jsx", "studio-bootstrap-primary-first-v185"],
    ["src/StudioNext.jsx", "studio-site-events-v185"],
    ["src/StudioNext.jsx", "Promise.allSettled"],
    ["src/StudioOnboardingGate.jsx", "cached-site-recovery-v185"],
    ["src/DomainPanelV124.jsx", "Situs aktif belum tersedia"],
    ["src/lib/supabase.js", "auth-direct-fallback-v185"],
    ["src/lib/supabase.js", "direct-oauth-v185"],
    ["src/Studio.jsx", "studio-mobile-authority-v185.js"],
    ["public/sw.js", "ngeblogging-app-v185-source-recovery-20260801"],
  ];
  const missing = checks.filter(([file, marker]) => !read(file).includes(marker));
  if (missing.length) throw new Error(`PATCH_V185_INCOMPLETE:${missing.map(([file, marker]) => `${file}:${marker}`).join(",")}`);
}

patchStudioData();
patchStudioNext();
patchOnboarding();
patchOperationalPages();
patchAuthTransport();
patchEntryAndCache();
verify();
console.log(`[${RELEASE}] source recovery, active-site cache, auth fallback, and mobile authority verified`);
