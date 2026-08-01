import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "production-data-source-v186-20260801";

function replaceOnce(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) throw new Error(`V186_${label}_ANCHOR_MISSING`);
  return source.replace(search, replacement);
}

function replaceFunction(source, signature, nextSignature, replacement, label) {
  if (source.includes(nextSignature)) return source;
  const start = source.indexOf(signature);
  const end = source.indexOf("\n}\n", start);
  if (start < 0 || end < 0) throw new Error(`V186_${label}_RANGE_MISSING`);
  return `${source.slice(0, start)}${replacement}${source.slice(end + 3)}`;
}

async function patchStudioNext() {
  const path = "src/StudioNext.jsx";
  let source = await read(path);

  source = source.replace(
    "  createUserSite, getOrCreatePrimarySite, getUserProfile, listUserSites,",
    "  createUserSite, getUserProfile, listUserSites,",
  );

  if (!source.includes('const ACTIVE_SITE_SNAPSHOT_V186 = "ngeblogging-active-site-snapshot-v186";')) {
    const anchor = source.includes('const ACTIVE_SITE_SNAPSHOT_V183 = "ngeblogging-active-site-snapshot-v183";')
      ? 'const ACTIVE_SITE_SNAPSHOT_V183 = "ngeblogging-active-site-snapshot-v183";'
      : 'const LOCAL_STORE = "ngeblogging-studio-v3";';
    if (!source.includes(anchor)) throw new Error("V186_STUDIO_CONSTANT_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\nconst ACTIVE_SITE_SNAPSHOT_V186 = "ngeblogging-active-site-snapshot-v186";`);
  }

  if (!source.includes("function readActiveSiteSnapshotV186")) {
    const start = source.indexOf("function loadLocalDocs() {");
    const end = source.indexOf("\n}\n", start);
    if (start < 0 || end < 0) throw new Error("V186_LOCAL_DOCS_RANGE_MISSING");
    const replacement = `function loadLocalDocs(allowStarter = true) {
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_STORE));
    if (Array.isArray(stored)) return stored;
    return allowStarter ? STARTER : [];
  } catch {
    return allowStarter ? STARTER : [];
  }
}

function readActiveSiteSnapshotV186() {
  try {
    for (const key of [ACTIVE_SITE_SNAPSHOT_V186, "ngeblogging-active-site-snapshot-v185", "ngeblogging-active-site-snapshot-v183"]) {
      const cached = JSON.parse(localStorage.getItem(key) || "null");
      if (cached?.id) return cached;
    }
    const id = localStorage.getItem("ngeblogging-active-site-id") || "";
    return id ? { id, name: "Situs aktif", slug: "", status: "draft", is_public: false, cached: true } : null;
  } catch {
    return null;
  }
}

function publishActiveSiteV186(primary, rows, setSite, setSites, setDataMode, mode = "cloud") {
  if (!primary?.id) return;
  setActiveSiteId(primary.id);
  setSite(primary);
  setSites(Array.isArray(rows) && rows.length ? rows : [primary]);
  setDataMode(mode);
  window.__ngebloggingActiveSite = primary;
  document.documentElement.dataset.activeSiteId = primary.id;
  if (primary.slug) document.documentElement.dataset.activeSiteSlug = primary.slug;
  else delete document.documentElement.dataset.activeSiteSlug;
  try {
    const serialized = JSON.stringify(primary);
    localStorage.setItem(ACTIVE_SITE_SNAPSHOT_V186, serialized);
    localStorage.setItem("ngeblogging-active-site-snapshot-v185", serialized);
    localStorage.setItem("ngeblogging-active-site-snapshot-v183", serialized);
  } catch { /* snapshot opsional */ }
  window.dispatchEvent(new CustomEvent("ngeblogging:active-site-ready", { detail: primary }));
  window.dispatchEvent(new CustomEvent("ngeblogging:active-site-change", { detail: primary }));
}`;
    source = `${source.slice(0, start)}${replacement}${source.slice(end + 3)}`;
  }

  source = source.replace(
    "  const [docs, setDocs] = useState(loadLocalDocs);",
    "  const [docs, setDocs] = useState(() => loadLocalDocs(!user?.id));",
  );

  if (!source.includes("studio-bootstrap-resilient-v186")) {
    const marker = source.indexOf("Promise.all([getOrCreatePrimarySite");
    const start = source.lastIndexOf("  useEffect(() => {", marker);
    const end = source.indexOf("\n\n  useEffect(() => {", marker);
    if (marker < 0 || start < 0 || end < 0) throw new Error("V186_STUDIO_BOOTSTRAP_RANGE_MISSING");
    const replacement = `  useEffect(() => {
    if (!user?.id || !supabaseConfigured) { setDataMode("local"); return undefined; }
    let cancelled = false;
    let retryTimer = 0;
    let attempt = 0;
    let warned = false;
    document.documentElement.dataset.studioBootstrapV186 = "studio-bootstrap-resilient-v186";

    const cachedAtStart = window.__ngebloggingActiveSite?.id
      ? window.__ngebloggingActiveSite
      : readActiveSiteSnapshotV186();
    if (cachedAtStart) publishActiveSiteV186(cachedAtStart, [cachedAtStart], setSite, setSites, setDataMode, "local");
    else setDataMode("connecting");

    const bootstrap = async (quiet = false) => {
      if (cancelled) return;
      try {
        const rows = await Promise.race([
          listUserSites(user.id),
          new Promise((_, reject) => window.setTimeout(() => reject(Object.assign(new Error("Daftar Workspace melewati batas waktu."), { code: "STUDIO_BOOTSTRAP_TIMEOUT" })), 12000)),
        ]);
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
        const primary = rows.find((item) => item.id === preferredId)
          || rows.find((item) => item.id === cachedAtStart?.id)
          || rows[0];
        publishActiveSiteV186(primary, rows, setSite, setSites, setDataMode, "cloud");
        attempt = 0;
        warned = false;
      } catch (error) {
        console.error("Studio bootstrap v186 failed", error);
        const fallback = window.__ngebloggingActiveSite?.id
          ? window.__ngebloggingActiveSite
          : readActiveSiteSnapshotV186();
        if (fallback) publishActiveSiteV186(fallback, [fallback], setSite, setSites, setDataMode, "local");
        else if (!cancelled) setDataMode("local");
        if (!cancelled && !quiet && !warned) {
          warned = true;
          setToast("Koneksi cloud belum stabil; sesi login dan draf tetap dipertahankan");
        }
        if (!cancelled && navigator.onLine !== false && attempt < 4) {
          const delay = [900, 1800, 3600, 7200][attempt++] || 7200;
          window.clearTimeout(retryTimer);
          retryTimer = window.setTimeout(() => bootstrap(true), delay);
        }
      }
    };

    getUserProfile(user.id).then((userProfile) => {
      if (!cancelled) setProfile(userProfile);
    }).catch((error) => console.warn("Profil tidak memblokir situs aktif", error));

    const reconnect = () => { attempt = 0; warned = false; bootstrap(true); };
    window.addEventListener("online", reconnect, { passive: true });
    bootstrap(false);
    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
      window.removeEventListener("online", reconnect);
    };
  }, [user?.id]);`;
    source = `${source.slice(0, start)}${replacement}${source.slice(end)}`;
  }

  if (source.includes("getOrCreatePrimarySite")) throw new Error("V186_BLOCKING_PRIMARY_SITE_IMPORT_REMAINS");
  await write(path, source);
}

async function patchOnboardingGate() {
  const path = "src/StudioOnboardingGate.jsx";
  let source = await read(path);
  if (!source.includes('const ACTIVE_SITE_SNAPSHOT_V186 = "ngeblogging-active-site-snapshot-v186";')) {
    const anchor = 'const STARTUP_RELEASE = "first-site-onboarding-v169-20260730";';
    source = replaceOnce(source, anchor, `${anchor}\nconst ACTIVE_SITE_SNAPSHOT_V186 = "ngeblogging-active-site-snapshot-v186";`, "ONBOARDING_CONSTANT");
  }
  source = source.replace("getVerifiedSession({ force: true })", "getVerifiedSession({ force: attempt > 0 })");

  if (!source.includes("function cachedActiveSiteV186")) {
    const anchor = "function publishActiveSite(site) {";
    const index = source.indexOf(anchor);
    if (index < 0) throw new Error("V186_ONBOARDING_PUBLISH_ANCHOR_MISSING");
    source = `${source.slice(0, index)}function cachedActiveSiteV186() {
  try {
    for (const key of [ACTIVE_SITE_SNAPSHOT_V186, "ngeblogging-active-site-snapshot-v185", "ngeblogging-active-site-snapshot-v183"]) {
      const cached = JSON.parse(localStorage.getItem(key) || "null");
      if (cached?.id) return cached;
    }
  } catch { /* noop */ }
  return null;
}

${source.slice(index)}`;
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
          const cached = transient ? cachedActiveSiteV186() : null;
          if (cached?.id) {
            publishActiveSite(cached);
            document.documentElement.dataset.studioStartupV186 = "degraded-session-retained";
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
  if (!source.includes("degraded-session-retained")) source = replaceOnce(source, oldCatch, newCatch, "ONBOARDING_FALLBACK");
  await write(path, source);
}

async function patchAuthTransport() {
  const path = "src/lib/supabase.js";
  let source = await read(path);
  if (!source.includes("direct-fallback-v186")) {
    const start = source.indexOf("async function authAwareFetch(input, init) {");
    const end = source.indexOf("\n}\n\nexport const supabase", start);
    if (start < 0 || end < 0) throw new Error("V186_AUTH_FETCH_RANGE_MISSING");
    const replacement = `async function authAwareFetch(input, init) {
  if (!nativeFetch) throw new Error("Fetch API tidak tersedia pada browser ini.");
  const proxy = proxiedAuthUrl(input);
  if (!proxy) return nativeFetch(input, init);
  const directInput = input instanceof Request ? input.clone() : input;
  const proxyRequest = input instanceof Request ? new Request(proxy.toString(), input) : proxy.toString();
  try {
    const response = await nativeFetch(proxyRequest, init);
    if (![404, 502, 503, 504].includes(response.status)) {
      if (typeof document !== "undefined") document.documentElement.dataset.authTransportV186 = "same-origin-gateway";
      return response;
    }
  } catch (error) {
    console.warn("Gateway autentikasi tidak terjangkau; memakai endpoint Supabase langsung.", error);
  }
  if (typeof document !== "undefined") document.documentElement.dataset.authTransportV186 = "direct-fallback-v186";
  return nativeFetch(directInput, init);
}`;
    source = `${source.slice(0, start)}${replacement}${source.slice(end + 2)}`;
  }
  if (!source.includes("direct-supabase-oauth-v186")) {
    const start = source.indexOf("function providerDestination(value) {");
    const end = source.indexOf("\n}\n\nexport async function signInWithProvider", start);
    if (start < 0 || end < 0) throw new Error("V186_PROVIDER_RANGE_MISSING");
    const replacement = `function providerDestination(value) {
  const direct = new URL(value);
  if (typeof document !== "undefined") document.documentElement.dataset.authProviderTransportV186 = "direct-supabase-oauth-v186";
  return direct.toString();
}`;
    source = `${source.slice(0, start)}${replacement}${source.slice(end + 2)}`;
  }
  await write(path, source);
}

async function patchPanels() {
  const domainPath = "src/DomainPanelV124.jsx";
  let domain = await read(domainPath);
  domain = domain.replace("getVerifiedSession({ force: true })", "getVerifiedSession({ force: false })");
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
  const mode = 'data-nara-mode={size === "full" ? "modal" : "nonmodal"}';
  if (!source.includes(mode)) {
    source = source.replace(
      '<div className="nara-assistant-layer" role="dialog" aria-modal="true" aria-label="Nara AI Assistant">',
      `<div className="nara-assistant-layer" role="dialog" aria-modal={size === "full"} ${mode} aria-label="Nara AI Assistant">`,
    );
  }
  if (!source.includes('tabIndex={size === "full" ? 0 : -1}')) {
    source = source.replace(
      /<button className="nara-assistant-backdrop"[^>]*\/>/,
      '<button className="nara-assistant-backdrop" hidden={size !== "full"} aria-hidden={size !== "full"} tabIndex={size === "full" ? 0 : -1} onClick={closeNara} aria-label="Tutup Nara" />',
    );
  }
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, 'const VERSION = "ngeblogging-app-v186-production-data-20260801";');
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, 'const CACHE_RELEASE = "production-data-cache-v186";');
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "production-data-v186";');
  if (!source.includes("PRODUCTION_DATA_RELEASE_V186")) {
    source = source.replace(/^(const VERSION = .*;\n)/m, '$1const PRODUCTION_DATA_RELEASE_V186 = "production-data-source-v186-20260801";\n');
  }
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V186_FORCED_NAVIGATION_REMAINS");
  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/StudioNext.jsx", "studio-bootstrap-resilient-v186"],
    ["src/StudioNext.jsx", "loadLocalDocs(!user?.id)"],
    ["src/StudioNext.jsx", "readActiveSiteSnapshotV186"],
    ["src/StudioOnboardingGate.jsx", "degraded-session-retained"],
    ["src/StudioOnboardingGate.jsx", "force: attempt > 0"],
    ["src/lib/supabase.js", "direct-fallback-v186"],
    ["src/lib/supabase.js", "direct-supabase-oauth-v186"],
    ["src/DomainPanelV124.jsx", "getVerifiedSession({ force: false })"],
    ["src/CommentsPanelV124.jsx", "Koneksi komentar belum tersedia"],
    ["src/NaraAssistant.jsx", 'data-nara-mode={size === "full" ? "modal" : "nonmodal"}'],
    ["src/NaraAssistant.jsx", 'hidden={size !== "full"}'],
    ["public/sw.js", "ngeblogging-app-v186-production-data-20260801"],
  ];
  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V186_VERIFY_FAILED:${path}:${marker}`);
  }
  const studio = await read("src/StudioNext.jsx");
  if (studio.includes("Promise.all([getOrCreatePrimarySite")) throw new Error("V186_BLOCKING_BOOTSTRAP_REMAINS");
  const domain = await read("src/DomainPanelV124.jsx");
  if (domain.includes("isSessionReauthError(nextError) || [401, 403]")) throw new Error("V186_BROAD_INVALIDATION_REMAINS");
}

await patchStudioNext();
await patchOnboardingGate();
await patchAuthTransport();
await patchPanels();
await patchNaraSource();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
