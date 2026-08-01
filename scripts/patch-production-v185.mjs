import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-production-source-v185-20260801";

function replaceOnce(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) throw new Error(`V185_${label}_ANCHOR_MISSING`);
  return source.replace(search, replacement);
}

function replaceEffectContaining(source, marker, replacement, label) {
  if (source.includes("studio-bootstrap-resilient-v185")) return source;
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error(`V185_${label}_MARKER_MISSING`);
  const start = source.lastIndexOf("  useEffect(() => {", markerIndex);
  const end = source.indexOf("\n\n  useEffect(() => {", markerIndex);
  if (start < 0 || end < 0) throw new Error(`V185_${label}_RANGE_MISSING`);
  return `${source.slice(0, start)}${replacement}${source.slice(end)}`;
}

async function patchStudioNext() {
  const path = "src/StudioNext.jsx";
  let source = await read(path);

  source = source.replace(
    "  createUserSite, getOrCreatePrimarySite, getUserProfile, listUserSites,",
    "  createUserSite, getUserProfile, listUserSites,",
  );

  if (!source.includes('const ACTIVE_SITE_SNAPSHOT_V185 = "ngeblogging-active-site-snapshot-v185";')) {
    const anchor = source.includes('const ACTIVE_SITE_SNAPSHOT_V183 = "ngeblogging-active-site-snapshot-v183";')
      ? 'const ACTIVE_SITE_SNAPSHOT_V183 = "ngeblogging-active-site-snapshot-v183";'
      : 'const LOCAL_STORE = "ngeblogging-studio-v3";';
    if (!source.includes(anchor)) throw new Error("V185_STUDIO_CONSTANT_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\nconst ACTIVE_SITE_SNAPSHOT_V185 = "ngeblogging-active-site-snapshot-v185";`);
  }

  const legacyLocalDocs = `function loadLocalDocs() {
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_STORE));
    return Array.isArray(stored) && stored.length ? stored : STARTER;
  } catch {
    return STARTER;
  }
}`;
  const safeLocalDocs = `function loadLocalDocs(allowStarter = true) {
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_STORE));
    if (Array.isArray(stored)) return stored;
    return allowStarter ? STARTER : [];
  } catch {
    return allowStarter ? STARTER : [];
  }
}

function readActiveSiteSnapshotV185() {
  try {
    for (const key of [ACTIVE_SITE_SNAPSHOT_V185, "ngeblogging-active-site-snapshot-v183"]) {
      const cached = JSON.parse(localStorage.getItem(key) || "null");
      if (cached?.id) return cached;
    }
    const id = localStorage.getItem("ngeblogging-active-site-id") || "";
    return id ? { id, name: "Situs aktif", slug: "", status: "draft", is_public: false, cached: true } : null;
  } catch {
    return null;
  }
}

function writeActiveSiteSnapshotV185(site) {
  if (!site?.id) return;
  try {
    const serialized = JSON.stringify(site);
    localStorage.setItem(ACTIVE_SITE_SNAPSHOT_V185, serialized);
    localStorage.setItem("ngeblogging-active-site-snapshot-v183", serialized);
  } catch {
    // Penyimpanan snapshot bersifat tambahan dan tidak boleh memblokir Studio.
  }
}`;
  if (!source.includes("function readActiveSiteSnapshotV185")) {
    if (source.includes(legacyLocalDocs)) source = source.replace(legacyLocalDocs, safeLocalDocs);
    else if (source.includes("function loadLocalDocs()")) throw new Error("V185_LOCAL_DOCS_SHAPE_CHANGED");
  }

  source = source.replace(
    "  const [docs, setDocs] = useState(loadLocalDocs);",
    "  const [docs, setDocs] = useState(() => loadLocalDocs(!user?.id));",
  );

  const bootstrap = `  useEffect(() => {
    if (!user?.id || !supabaseConfigured) { setDataMode("local"); return undefined; }
    let cancelled = false;
    let retryTimer = 0;
    let attempt = 0;
    let notified = false;
    document.documentElement.dataset.studioBootstrapV185 = "studio-bootstrap-resilient-v185";

    const publishSite = (primary, rows = [primary], mode = "cloud") => {
      if (!primary?.id || cancelled) return;
      setActiveSiteId(primary.id);
      setSite(primary);
      setSites(Array.isArray(rows) && rows.length ? rows : [primary]);
      setDataMode(mode);
      window.__ngebloggingActiveSite = primary;
      document.documentElement.dataset.activeSiteId = primary.id;
      if (primary.slug) document.documentElement.dataset.activeSiteSlug = primary.slug;
      else delete document.documentElement.dataset.activeSiteSlug;
      writeActiveSiteSnapshotV185(primary);
      window.dispatchEvent(new CustomEvent("ngeblogging:active-site-ready", { detail: primary }));
      window.dispatchEvent(new CustomEvent("ngeblogging:active-site-change", { detail: primary }));
    };

    const cachedAtStart = window.__ngebloggingActiveSite?.id
      ? window.__ngebloggingActiveSite
      : readActiveSiteSnapshotV185();
    if (cachedAtStart) publishSite(cachedAtStart, [cachedAtStart], "local");
    else setDataMode("connecting");

    const scheduleRetry = (bootstrap) => {
      if (cancelled || navigator.onLine === false || attempt >= 4) return;
      const delay = [900, 1800, 3600, 7200][attempt] || 7200;
      attempt += 1;
      window.clearTimeout(retryTimer);
      retryTimer = window.setTimeout(() => bootstrap(true), delay);
    };

    const bootstrap = async (quiet = false) => {
      if (cancelled) return;
      if (!quiet && !cachedAtStart) setDataMode("connecting");
      try {
        const rows = await withStudioDeadlineV183(
          listUserSites(user.id),
          12000,
          "Daftar Workspace",
        );
        if (cancelled) return;
        if (!rows.length) {
          setSite(null);
          setSites([]);
          setDataMode("local");
          window.dispatchEvent(new CustomEvent("ngeblogging:first-site-required", { detail: { userId: user.id } }));
          return;
        }
        let preferredId = "";
        try { preferredId = localStorage.getItem("ngeblogging-active-site-id") || ""; } catch { preferredId = ""; }
        const primary = rows.find((row) => row.id === preferredId)
          || rows.find((row) => row.id === cachedAtStart?.id)
          || rows[0];
        publishSite(primary, rows, "cloud");
        attempt = 0;
        notified = false;
      } catch (error) {
        console.error("Studio bootstrap v185 failed", error);
        const fallback = window.__ngebloggingActiveSite?.id
          ? window.__ngebloggingActiveSite
          : readActiveSiteSnapshotV185();
        if (fallback) publishSite(fallback, [fallback], "local");
        else if (!cancelled) setDataMode("local");
        if (!cancelled && !quiet && !notified) {
          notified = true;
          setToast("Koneksi cloud belum stabil; sesi login dan draf tetap dipertahankan");
        }
        scheduleRetry(bootstrap);
      }
    };

    getUserProfile(user.id).then((userProfile) => {
      if (!cancelled) setProfile(userProfile);
    }).catch((error) => console.warn("Profil tidak memblokir situs aktif", error));

    const reconnect = () => {
      attempt = 0;
      notified = false;
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

  source = replaceEffectContaining(source, "studio-bootstrap-resilient-v183", bootstrap, "STUDIO_BOOTSTRAP");

  const oldSelect = '  const selectSite = (next) => { setActiveSiteId(next.id); setSite(next); setSiteManager(false); setDocs([]); setView("home"); try { localStorage.setItem(ACTIVE_SITE_SNAPSHOT_V183, JSON.stringify(next)); } catch { /* optional */ } window.__ngebloggingActiveSite = next; document.documentElement.dataset.activeSiteId = next.id; setToast(`Workspace ${next.name} aktif`); };';
  const newSelect = '  const selectSite = (next) => { setActiveSiteId(next.id); setSite(next); setSiteManager(false); setDocs([]); setView("home"); writeActiveSiteSnapshotV185(next); window.__ngebloggingActiveSite = next; document.documentElement.dataset.activeSiteId = next.id; if (next.slug) document.documentElement.dataset.activeSiteSlug = next.slug; window.dispatchEvent(new CustomEvent("ngeblogging:active-site-change", { detail: next })); setToast(`Workspace ${next.name} aktif`); };';
  if (!source.includes(newSelect)) {
    if (!source.includes(oldSelect)) throw new Error("V185_SELECT_SITE_ANCHOR_MISSING");
    source = source.replace(oldSelect, newSelect);
  }

  await write(path, source);
}

async function patchOnboardingGate() {
  const path = "src/StudioOnboardingGate.jsx";
  let source = await read(path);

  if (!source.includes('const ACTIVE_SITE_SNAPSHOT_V185 = "ngeblogging-active-site-snapshot-v185";')) {
    source = replaceOnce(
      source,
      'const STARTUP_RELEASE = "first-site-onboarding-v169-20260730";',
      'const STARTUP_RELEASE = "first-site-onboarding-v169-20260730";\nconst ACTIVE_SITE_SNAPSHOT_V185 = "ngeblogging-active-site-snapshot-v185";',
      "ONBOARDING_CONSTANT",
    );
  }

  source = source.replace(
    "getVerifiedSession({ force: true })",
    "getVerifiedSession({ force: attempt > 0 })",
  );

  if (!source.includes("function cachedActiveSiteV185")) {
    const anchor = `function publishActiveSite(site) {
  if (!site?.id || !site?.slug) return;
  setActiveSiteId(site.id);
  window.__ngebloggingActiveSite = site;
  document.documentElement.dataset.activeSiteId = site.id;
  document.documentElement.dataset.activeSiteSlug = site.slug;
  window.dispatchEvent(new CustomEvent("ngeblogging:active-site-ready", { detail: site }));
  window.dispatchEvent(new CustomEvent("ngeblogging:active-site-change", { detail: site }));
}`;
    const replacement = `function cachedActiveSiteV185() {
  try {
    for (const key of [ACTIVE_SITE_SNAPSHOT_V185, "ngeblogging-active-site-snapshot-v183"]) {
      const cached = JSON.parse(localStorage.getItem(key) || "null");
      if (cached?.id) return cached;
    }
    const id = localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) || "";
    return id ? { id, name: "Situs aktif", slug: "", status: "draft", is_public: false, cached: true } : null;
  } catch {
    return null;
  }
}

function publishActiveSite(site) {
  if (!site?.id) return;
  setActiveSiteId(site.id);
  window.__ngebloggingActiveSite = site;
  document.documentElement.dataset.activeSiteId = site.id;
  if (site.slug) document.documentElement.dataset.activeSiteSlug = site.slug;
  else delete document.documentElement.dataset.activeSiteSlug;
  try {
    const serialized = JSON.stringify(site);
    localStorage.setItem(ACTIVE_SITE_SNAPSHOT_V185, serialized);
    localStorage.setItem("ngeblogging-active-site-snapshot-v183", serialized);
  } catch { /* snapshot opsional */ }
  window.dispatchEvent(new CustomEvent("ngeblogging:active-site-ready", { detail: site }));
  window.dispatchEvent(new CustomEvent("ngeblogging:active-site-change", { detail: site }));
}`;
    if (!source.includes(anchor)) throw new Error("V185_ONBOARDING_PUBLISH_ANCHOR_MISSING");
    source = source.replace(anchor, replacement);
  }

  const oldCatch = `      } catch (nextError) {
        if (isSessionReauthError(nextError)) requestReauthentication(nextError);
        if (!cancelled) {
          const nextMessage = isTransientStudioError(nextError)
            ? "Koneksi data Studio belum stabil. Sesi akun Anda tetap tersimpan. Tekan Coba lagi setelah jaringan tersambung."
            : nextError.message || "Daftar situs belum dapat dimuat.";
          setError(nextMessage);
          setPhase("error");
        }
      }`;
  const newCatch = `      } catch (nextError) {
        if (isSessionReauthError(nextError)) requestReauthentication(nextError);
        if (!cancelled) {
          const transient = isTransientStudioError(nextError);
          const cached = transient ? cachedActiveSiteV185() : null;
          if (cached?.id) {
            publishActiveSite(cached);
            document.documentElement.dataset.studioStartupV185 = "degraded-session-retained";
            setError("");
            setPhase("ready");
            return;
          }
          const nextMessage = transient
            ? "Koneksi data Studio belum stabil. Sesi akun Anda tetap tersimpan. Tekan Coba lagi setelah jaringan tersambung."
            : nextError.message || "Daftar situs belum dapat dimuat.";
          setError(nextMessage);
          setPhase("error");
        }
      }`;
  source = replaceOnce(source, oldCatch, newCatch, "ONBOARDING_TRANSIENT_FALLBACK");

  if (!source.includes("studio-online-retry-v185")) {
    const anchor = `  }, [props.user?.id, run]);

  if (phase === "ready")`;
    const replacement = `  }, [props.user?.id, run]);

  useEffect(() => {
    if (phase !== "error") return undefined;
    document.documentElement.dataset.studioOnlineRetryV185 = "studio-online-retry-v185";
    const retry = () => setRun((value) => value + 1);
    window.addEventListener("online", retry, { passive: true });
    return () => window.removeEventListener("online", retry);
  }, [phase]);

  if (phase === "ready")`;
    source = replaceOnce(source, anchor, replacement, "ONBOARDING_ONLINE_RETRY");
  }

  await write(path, source);
}

async function patchAuthTransport() {
  const path = "src/lib/supabase.js";
  let source = await read(path);

  if (!source.includes("direct-fallback-v185")) {
    const start = source.indexOf("async function authAwareFetch(input, init) {");
    const end = source.indexOf("\n}\n\nexport const supabase", start);
    if (start < 0 || end < 0) throw new Error("V185_AUTH_FETCH_RANGE_MISSING");
    const replacement = `async function authAwareFetch(input, init) {
  if (!nativeFetch) throw new Error("Fetch API tidak tersedia pada browser ini.");
  const proxy = proxiedAuthUrl(input);
  if (!proxy) return nativeFetch(input, init);

  const directInput = input instanceof Request ? input.clone() : input;
  const proxyRequest = input instanceof Request
    ? new Request(proxy.toString(), input)
    : proxy.toString();

  try {
    const response = await nativeFetch(proxyRequest, init);
    if (![404, 502, 503, 504].includes(response.status)) {
      if (typeof document !== "undefined") {
        document.documentElement.dataset.authTransportV185 = response.headers.get("x-ngeblogging-auth-gateway")
          ? "same-origin-gateway"
          : "same-origin-response";
      }
      return response;
    }
  } catch (error) {
    console.warn("Gateway autentikasi tidak terjangkau; memakai endpoint Supabase langsung.", error);
  }

  if (typeof document !== "undefined") document.documentElement.dataset.authTransportV185 = "direct-fallback-v185";
  return nativeFetch(directInput, init);
}`;
    source = `${source.slice(0, start)}${replacement}${source.slice(end + 2)}`;
  }

  const providerStart = source.indexOf("function providerDestination(value) {");
  const providerEnd = source.indexOf("\n}\n\nexport async function signInWithProvider", providerStart);
  if (providerStart < 0 || providerEnd < 0) throw new Error("V185_PROVIDER_RANGE_MISSING");
  const providerReplacement = `function providerDestination(value) {
  const direct = new URL(value);
  if (typeof document !== "undefined") document.documentElement.dataset.authProviderTransportV185 = "direct-supabase-oauth";
  return direct.toString();
}`;
  source = `${source.slice(0, providerStart)}${providerReplacement}${source.slice(providerEnd + 2)}`;

  await write(path, source);
}

async function patchOperationalPanels() {
  const domainPath = "src/DomainPanelV124.jsx";
  let domain = await read(domainPath);
  domain = domain.replace(
    "getVerifiedSession({ force: true })",
    "getVerifiedSession({ force: false })",
  );
  domain = domain.replace(
    '    if (!site?.id) return;\n    if (!quiet) setLoading(true);',
    '    if (!site?.id) { setLoading(false); setError("Situs aktif belum tersedia. Pilih Workspace atau muat ulang Studio."); return; }\n    if (!quiet) setLoading(true);',
  );
  domain = domain.replace(
    '      if (isSessionReauthError(nextError) || [401, 403].includes(nextError.status)) {',
    '      if (isSessionReauthError(nextError)) {',
  );
  await write(domainPath, domain);

  const commentsPath = "src/CommentsPanelV124.jsx";
  let comments = await read(commentsPath);
  comments = comments.replace(
    '    if (!site?.id || !supabase) return;\n    if (!quiet) setLoading(true);',
    '    if (!site?.id || !supabase) { setLoading(false); setError(!site?.id ? "Situs aktif belum tersedia. Pilih Workspace lalu coba lagi." : "Koneksi komentar belum tersedia."); return; }\n    if (!quiet) setLoading(true);',
  );
  await write(commentsPath, comments);
}

async function patchNaraSource() {
  const path = "src/NaraAssistant.jsx";
  let source = await read(path);
  source = source.replace(
    '<div className="nara-assistant-layer" role="dialog" aria-modal={size === "full"} aria-label="Nara AI Assistant">',
    '<div className="nara-assistant-layer" role="dialog" aria-modal={size === "full"} data-nara-mode={size === "full" ? "modal" : "nonmodal"} aria-label="Nara AI Assistant">',
  );
  source = source.replace(
    /<button className="nara-assistant-backdrop"[^>]*\/>/,
    '<button className="nara-assistant-backdrop" hidden={size !== "full"} aria-hidden={size !== "full"} tabIndex={size === "full" ? 0 : -1} onClick={closeNara} aria-label="Tutup Nara" />',
  );
  await write(path, source);
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  const line = 'import "./studio-production-v185.js";';
  if (!source.includes(line)) {
    const anchor = 'import "./studio-production-v183-controls.css";';
    if (!source.includes(anchor)) throw new Error("V185_ENTRY_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n${line}`);
  }
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, 'const VERSION = "ngeblogging-app-v185-production-source-20260801";');
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, 'const CACHE_RELEASE = "production-source-cache-v185";');
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "production-source-v185";');
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V183", "NGE_BLOGGING_UPDATE_AVAILABLE_V185");
  if (!source.includes("PRODUCTION_SOURCE_RELEASE_V185")) {
    source = source.replace(
      /^(const VERSION = .*;\n)/m,
      '$1const PRODUCTION_SOURCE_RELEASE_V185 = "studio-production-source-v185-20260801";\n',
    );
  }
  if (/await refreshStaleWindow\(client, url\);/.test(source)) {
    throw new Error("V185_FORCED_NAVIGATION_MUST_REMAIN_DISABLED");
  }
  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/StudioNext.jsx", "studio-bootstrap-resilient-v185"],
    ["src/StudioNext.jsx", "loadLocalDocs(!user?.id)"],
    ["src/StudioNext.jsx", "readActiveSiteSnapshotV185"],
    ["src/StudioNext.jsx", "writeActiveSiteSnapshotV185"],
    ["src/StudioOnboardingGate.jsx", "cachedActiveSiteV185"],
    ["src/StudioOnboardingGate.jsx", "degraded-session-retained"],
    ["src/StudioOnboardingGate.jsx", "force: attempt > 0"],
    ["src/lib/supabase.js", "direct-fallback-v185"],
    ["src/lib/supabase.js", "direct-supabase-oauth"],
    ["src/DomainPanelV124.jsx", "getVerifiedSession({ force: false })"],
    ["src/CommentsPanelV124.jsx", "Koneksi komentar belum tersedia"],
    ["src/NaraAssistant.jsx", 'data-nara-mode={size === "full" ? "modal" : "nonmodal"}'],
    ["src/NaraAssistant.jsx", 'hidden={size !== "full"}'],
    ["src/Studio.jsx", "studio-production-v185.js"],
    ["public/sw.js", "ngeblogging-app-v185-production-source-20260801"],
    ["public/sw.js", "production-source-cache-v185"],
  ];
  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V185_VERIFY_FAILED:${path}:${marker}`);
  }

  const studio = await read("src/StudioNext.jsx");
  if (studio.includes("Promise.all([getOrCreatePrimarySite")) throw new Error("V185_BLOCKING_BOOTSTRAP_REMAINS");
  const domain = await read("src/DomainPanelV124.jsx");
  if (domain.includes("isSessionReauthError(nextError) || [401, 403]")) throw new Error("V185_BROAD_SESSION_INVALIDATION_REMAINS");
}

await patchStudioNext();
await patchOnboardingGate();
await patchAuthTransport();
await patchOperationalPanels();
await patchNaraSource();
await patchStudioEntry();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
