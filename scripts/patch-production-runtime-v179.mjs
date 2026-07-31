import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const RELEASE = "studio-runtime-authority-v179-20260731";
const read = (file) => readFileSync(resolve(file), "utf8");
const write = (file, source) => writeFileSync(resolve(file), source, "utf8");

function replaceOnce(source, search, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(search)) throw new Error(`PATCH_RUNTIME_V179_${label}_ANCHOR_MISSING`);
  return source.replace(search, replacement);
}

function patchStudioNext() {
  const file = "src/StudioNext.jsx";
  let source = read(file);

  source = replaceOnce(
    source,
    'const LOCAL_STORE = "ngeblogging-studio-v3";',
    'const LOCAL_STORE = "ngeblogging-studio-v3";\nconst ACTIVE_SITE_SNAPSHOT_V179 = "ngeblogging-active-site-snapshot-v179";',
    "SNAPSHOT_KEY",
  );

  const oldLocal = `function loadLocalDocs() {
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_STORE));
    return Array.isArray(stored) && stored.length ? stored : STARTER;
  } catch {
    return STARTER;
  }
}`;
  const newLocal = `function loadLocalDocs(allowStarter = true) {
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_STORE));
    if (Array.isArray(stored)) return stored;
    return allowStarter ? STARTER : [];
  } catch {
    return allowStarter ? STARTER : [];
  }
}`;
  source = replaceOnce(source, oldLocal, newLocal, "LOCAL_DOCS");
  source = replaceOnce(
    source,
    '  const [docs, setDocs] = useState(loadLocalDocs);',
    '  const [docs, setDocs] = useState(() => loadLocalDocs(!user?.id));',
    "AUTHENTICATED_DOCS",
  );

  if (!source.includes("studio-bootstrap-resilient-v179")) {
    const start = source.indexOf('  useEffect(() => {\n    if (!user?.id || !supabaseConfigured)');
    const end = source.indexOf('\n\n  useEffect(() => {\n    if (dataMode !== "cloud"', start);
    if (start < 0 || end < 0) throw new Error("PATCH_RUNTIME_V179_BOOTSTRAP_ANCHOR_MISSING");
    const replacement = `  useEffect(() => {
    if (!user?.id || !supabaseConfigured) { setDataMode("local"); return undefined; }
    let cancelled = false;
    let retryTimer = 0;
    let attempt = 0;
    document.documentElement.dataset.studioBootstrapV179 = "studio-bootstrap-resilient-v179";

    const readSnapshot = () => {
      try {
        const cached = JSON.parse(localStorage.getItem(ACTIVE_SITE_SNAPSHOT_V179) || "null");
        return cached?.id ? cached : null;
      } catch { return null; }
    };
    const publishSite = (primary, rows = [primary], mode = "cloud") => {
      if (!primary?.id || cancelled) return;
      setActiveSiteId(primary.id);
      setSite(primary);
      setSites(rows.length ? rows : [primary]);
      setDataMode(mode);
      window.__ngebloggingActiveSite = primary;
      document.documentElement.dataset.activeSiteId = primary.id;
      if (primary.slug) document.documentElement.dataset.activeSiteSlug = primary.slug;
      try { localStorage.setItem(ACTIVE_SITE_SNAPSHOT_V179, JSON.stringify(primary)); } catch { /* optional */ }
      window.dispatchEvent(new CustomEvent("ngeblogging:active-site-ready", { detail: primary }));
    };
    const scheduleRetry = () => {
      if (cancelled || attempt >= 4 || navigator.onLine === false) return;
      const delay = [900, 1800, 3600, 7200][attempt] || 7200;
      attempt += 1;
      window.clearTimeout(retryTimer);
      retryTimer = window.setTimeout(() => bootstrap(true), delay);
    };
    const bootstrap = async (quiet = false) => {
      if (cancelled) return;
      if (!quiet) setDataMode("connecting");
      try {
        const rows = await listUserSites(user.id);
        if (cancelled) return;
        if (!rows.length) {
          setDataMode("local");
          document.documentElement.dataset.studioBootstrapV179 = "first-site-required-v179";
          window.dispatchEvent(new CustomEvent("ngeblogging:first-site-required", { detail: { userId: user.id } }));
          return;
        }
        let preferredId = "";
        try { preferredId = localStorage.getItem("ngeblogging-active-site-id") || ""; } catch { preferredId = ""; }
        const primary = rows.find((row) => row.id === preferredId) || rows[0];
        publishSite(primary, rows, "cloud");
        attempt = 0;
        getUserProfile(user.id).then((userProfile) => {
          if (!cancelled) setProfile(userProfile);
        }).catch((error) => console.warn("Profil tidak memblokir Studio", error));
      } catch (error) {
        console.error("Studio bootstrap v179 failed", error);
        const cached = readSnapshot();
        if (cached) publishSite(cached, [cached], "local");
        else if (!cancelled) setDataMode("local");
        if (!cancelled && !quiet) setToast("Koneksi cloud belum stabil; sesi dan draf tetap dipertahankan");
        scheduleRetry();
      }
    };
    const reconnect = () => { attempt = 0; bootstrap(true); };
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

  source = replaceOnce(
    source,
    '  const selectSite = (next) => { setActiveSiteId(next.id); setSite(next); setSiteManager(false); setDocs([]); setView("home"); setToast(`Workspace ${next.name} aktif`); };',
    '  const selectSite = (next) => { setActiveSiteId(next.id); setSite(next); setSiteManager(false); setDocs([]); setView("home"); try { localStorage.setItem(ACTIVE_SITE_SNAPSHOT_V179, JSON.stringify(next)); } catch { /* optional */ } window.__ngebloggingActiveSite = next; document.documentElement.dataset.activeSiteId = next.id; setToast(`Workspace ${next.name} aktif`); };',
    "SELECT_SITE_SNAPSHOT",
  );

  write(file, source);
}

function patchOnboardingGate() {
  const file = "src/StudioOnboardingGate.jsx";
  let source = read(file);
  source = source.replace('getVerifiedSession({ force: true })', 'getVerifiedSession({ force: attempt > 0 })');

  const oldCatch = `          setError(nextMessage);
          setPhase("error");`;
  const newCatch = `          setError(nextMessage);
          if (isTransientStudioError(nextError)) {
            document.documentElement.dataset.studioStartupV179 = "degraded-session-retained";
            setPhase("degraded");
          } else {
            setPhase("error");
          }`;
  source = replaceOnce(source, oldCatch, newCatch, "DEGRADED_PHASE");

  const renderAnchor = '  if (phase === "ready") return <StudioSecure {...props}/>;';
  const renderReplacement = '  if (phase === "ready" || phase === "degraded") return <StudioSecure {...props}/>;';
  source = replaceOnce(source, renderAnchor, renderReplacement, "DEGRADED_RENDER");

  if (!source.includes("first-site-retry-v179")) {
    const anchor = '  }, [props.user?.id, run]);\n\n  if (phase === "ready" || phase === "degraded")';
    const replacement = `  }, [props.user?.id, run]);

  useEffect(() => {
    if (phase !== "degraded") return undefined;
    document.documentElement.dataset.studioStartupRetryV179 = "first-site-retry-v179";
    const retry = () => setRun((value) => value + 1);
    window.addEventListener("online", retry, { passive: true });
    window.addEventListener("ngeblogging:first-site-required", retry);
    return () => {
      window.removeEventListener("online", retry);
      window.removeEventListener("ngeblogging:first-site-required", retry);
    };
  }, [phase]);

  if (phase === "ready" || phase === "degraded")`;
    source = replaceOnce(source, anchor, replacement, "DEGRADED_RETRY");
  }
  write(file, source);
}

function patchOperationalPanels() {
  const domainFile = "src/DomainPanelV124.jsx";
  let domain = read(domainFile);
  domain = domain.replace(
    '    if (!site?.id) return;\n    if (!quiet) setLoading(true);',
    '    if (!site?.id) { setLoading(false); setError("Situs aktif belum tersedia. Pilih Workspace lalu coba lagi."); return; }\n    if (!quiet) setLoading(true);',
  );
  write(domainFile, domain);

  const commentsFile = "src/CommentsPanelV124.jsx";
  let comments = read(commentsFile);
  comments = comments.replace(
    '    if (!site?.id || !supabase) return;\n    if (!quiet) setLoading(true);',
    '    if (!site?.id || !supabase) { setLoading(false); setError(!site?.id ? "Situs aktif belum tersedia. Pilih Workspace lalu coba lagi." : "Koneksi komentar belum tersedia."); return; }\n    if (!quiet) setLoading(true);',
  );
  write(commentsFile, comments);
}

function patchNara() {
  const file = "src/NaraAssistant.jsx";
  let source = read(file);
  source = replaceOnce(
    source,
    '<div className="nara-assistant-layer" role="dialog" aria-modal="true" aria-label="Nara AI Assistant">',
    '<div className="nara-assistant-layer" role="dialog" aria-modal={size === "full"} aria-label="Nara AI Assistant">',
    "NARA_ARIA_MODAL",
  );
  source = replaceOnce(
    source,
    '<button className="nara-assistant-backdrop" onClick={closeNara} aria-label="Tutup Nara" />',
    '<button className="nara-assistant-backdrop" hidden={size !== "full"} tabIndex={size === "full" ? 0 : -1} onClick={closeNara} aria-label="Tutup Nara" />',
    "NARA_BACKDROP",
  );
  write(file, source);
}

function patchServiceWorker() {
  const file = "public/sw.js";
  let source = read(file);
  source = source
    .replace('ngeblogging-app-v179-production-stability-20260731', 'ngeblogging-app-v179-runtime-authority-20260731')
    .replace('production-stability-cache-v179', 'runtime-authority-cache-v179')
    .replace('production-stability-v179', 'runtime-authority-v179')
    .replaceAll('service-worker-stale-shell-v179', 'service-worker-stale-runtime-v179')
    .replaceAll('service-worker-activated-production-stability-v179', 'service-worker-activated-runtime-authority-v179');
  write(file, source);
}

function verify() {
  const checks = [
    ["src/Studio.jsx", "studio-runtime-authority-v179.js"],
    ["src/StudioNext.jsx", "studio-bootstrap-resilient-v179"],
    ["src/StudioNext.jsx", "ACTIVE_SITE_SNAPSHOT_V179"],
    ["src/StudioNext.jsx", "loadLocalDocs(!user?.id)"],
    ["src/StudioOnboardingGate.jsx", 'phase === "ready" || phase === "degraded"'],
    ["src/StudioOnboardingGate.jsx", "first-site-retry-v179"],
    ["src/NaraAssistant.jsx", 'aria-modal={size === "full"}'],
    ["src/NaraAssistant.jsx", 'hidden={size !== "full"}'],
    ["public/sw.js", "ngeblogging-app-v179-runtime-authority-20260731"],
  ];
  const missing = checks.filter(([file, marker]) => !read(file).includes(marker));
  if (missing.length) throw new Error(`PATCH_RUNTIME_V179_INCOMPLETE:${missing.map(([file, marker]) => `${file}:${marker}`).join(",")}`);
}

patchStudioNext();
patchOnboardingGate();
patchOperationalPanels();
patchNara();
patchServiceWorker();
verify();
console.log(`[${RELEASE}] resilient bootstrap, degraded startup, Nara, and cache authority verified`);
