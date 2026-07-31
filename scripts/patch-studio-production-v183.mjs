import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-production-v183-20260801";

function replaceEffectContaining(source, marker, replacement, label) {
  if (source.includes("studio-bootstrap-resilient-v183")) return source;
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error(`V183_${label}_MARKER_MISSING`);
  const start = source.lastIndexOf("  useEffect(() => {", markerIndex);
  const end = source.indexOf("\n\n  useEffect(() => {", markerIndex);
  if (start < 0 || end < 0) throw new Error(`V183_${label}_RANGE_MISSING`);
  return `${source.slice(0, start)}${replacement}${source.slice(end)}`;
}

async function patchStudioBootstrap() {
  const path = "src/StudioNext.jsx";
  let source = await read(path);

  if (!source.includes('const ACTIVE_SITE_SNAPSHOT_V183 = "ngeblogging-active-site-snapshot-v183";')) {
    const anchor = source.includes("const MAX_SITES_PER_ACCOUNT = 25;")
      ? "const MAX_SITES_PER_ACCOUNT = 25;"
      : 'const LOCAL_STORE = "ngeblogging-studio-v3";';
    if (!source.includes(anchor)) throw new Error("V183_STUDIO_CONSTANT_ANCHOR_MISSING");
    source = source.replace(
      anchor,
      `${anchor}\nconst ACTIVE_SITE_SNAPSHOT_V183 = "ngeblogging-active-site-snapshot-v183";`,
    );
  }

  if (!source.includes("function withStudioDeadlineV183")) {
    const anchor = "function relativeTime(value) {";
    if (!source.includes(anchor)) throw new Error("V183_STUDIO_HELPER_ANCHOR_MISSING");
    source = source.replace(
      anchor,
      `function withStudioDeadlineV183(promise, milliseconds = 12000, label = "Permintaan Studio") {
  let timer = 0;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = window.setTimeout(
        () => reject(Object.assign(new Error(\`\${label} melewati batas waktu.\`), { code: "STUDIO_TIMEOUT_V183" })),
        milliseconds,
      );
    }),
  ]).finally(() => window.clearTimeout(timer));
}

${anchor}`,
    );
  }

  const bootstrap = `  useEffect(() => {
    if (!user?.id || !supabaseConfigured) { setDataMode("local"); return undefined; }
    let cancelled = false;
    let retryTimer = 0;
    let attempt = 0;
    let notified = false;
    document.documentElement.dataset.studioBootstrapV183 = "studio-bootstrap-resilient-v183";

    const readSnapshot = () => {
      try {
        const cached = JSON.parse(localStorage.getItem(ACTIVE_SITE_SNAPSHOT_V183) || "null");
        return cached?.id ? cached : null;
      } catch {
        return null;
      }
    };

    const publishSite = (primary, rows = [primary], mode = "cloud") => {
      if (!primary?.id || cancelled) return;
      setActiveSiteId(primary.id);
      setSite(primary);
      setSites(Array.isArray(rows) && rows.length ? rows : [primary]);
      setDataMode(mode);
      window.__ngebloggingActiveSite = primary;
      document.documentElement.dataset.activeSiteId = primary.id;
      if (primary.slug) document.documentElement.dataset.activeSiteSlug = primary.slug;
      try { localStorage.setItem(ACTIVE_SITE_SNAPSHOT_V183, JSON.stringify(primary)); } catch { /* optional */ }
      window.dispatchEvent(new CustomEvent("ngeblogging:active-site-ready", { detail: primary }));
    };

    const scheduleRetry = (bootstrap) => {
      if (cancelled || navigator.onLine === false || attempt >= 4) return;
      const delay = [900, 1800, 3600, 7200][attempt] || 7200;
      attempt += 1;
      window.clearTimeout(retryTimer);
      retryTimer = window.setTimeout(() => bootstrap(true), delay);
    };

    const bootstrap = async (quiet = false) => {
      if (cancelled) return;
      const cached = readSnapshot();
      if (cached) publishSite(cached, [cached], "local");
      else if (!quiet) setDataMode("connecting");

      try {
        const primary = await withStudioDeadlineV183(
          getOrCreatePrimarySite(user),
          12000,
          "Pemilihan situs aktif",
        );
        if (cancelled) return;
        publishSite(primary, [primary], "cloud");
        attempt = 0;

        Promise.allSettled([
          withStudioDeadlineV183(listUserSites(user.id), 12000, "Daftar Workspace"),
          withStudioDeadlineV183(getUserProfile(user.id), 10000, "Profil"),
        ]).then(([siteResult, profileResult]) => {
          if (cancelled) return;
          if (siteResult.status === "fulfilled") {
            const rows = siteResult.value;
            const selected = rows.find((row) => row.id === primary.id) || primary;
            publishSite(selected, rows.length ? rows : [selected], "cloud");
          }
          if (profileResult.status === "fulfilled") setProfile(profileResult.value);
        });
      } catch (error) {
        console.error("Studio bootstrap v183 failed", error);
        if (!cached && !cancelled) setDataMode("local");
        if (!cancelled && !quiet && !notified) {
          notified = true;
          setToast("Koneksi cloud belum stabil; sesi login dan draf tetap dipertahankan");
        }
        scheduleRetry(bootstrap);
      }
    };

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

  source = replaceEffectContaining(
    source,
    "production-recovery-bootstrap-v180",
    bootstrap,
    "BOOTSTRAP",
  );

  const oldSelect = '  const selectSite = (next) => { setActiveSiteId(next.id); setSite(next); setSiteManager(false); setDocs([]); setView("home"); setToast(`Workspace ${next.name} aktif`); };';
  const newSelect = '  const selectSite = (next) => { setActiveSiteId(next.id); setSite(next); setSiteManager(false); setDocs([]); setView("home"); try { localStorage.setItem(ACTIVE_SITE_SNAPSHOT_V183, JSON.stringify(next)); } catch { /* optional */ } window.__ngebloggingActiveSite = next; document.documentElement.dataset.activeSiteId = next.id; setToast(`Workspace ${next.name} aktif`); };';
  if (!source.includes(newSelect)) {
    if (!source.includes(oldSelect)) throw new Error("V183_SELECT_SITE_ANCHOR_MISSING");
    source = source.replace(oldSelect, newSelect);
  }

  await write(path, source);
}

async function patchNaraNonModal() {
  const path = "src/NaraAssistant.jsx";
  let source = await read(path);

  if (!source.includes('aria-modal={size === "full"}')) {
    const oldLayer = '<div className="nara-assistant-layer" role="dialog" aria-modal="true" aria-label="Nara AI Assistant">';
    const newLayer = '<div className="nara-assistant-layer" role="dialog" aria-modal={size === "full"} aria-label="Nara AI Assistant">';
    if (!source.includes(oldLayer)) throw new Error("V183_NARA_LAYER_ANCHOR_MISSING");
    source = source.replace(oldLayer, newLayer);
  }

  if (!source.includes('tabIndex={size === "full" ? 0 : -1}')) {
    const candidates = [
      '<button className="nara-assistant-backdrop" hidden={size !== "full"} aria-hidden={size !== "full"} onClick={closeNara} aria-label="Tutup Nara" />',
      '<button className="nara-assistant-backdrop" hidden={size !== "full"} onClick={closeNara} aria-label="Tutup Nara" />',
      '<button className="nara-assistant-backdrop" onClick={closeNara} aria-label="Tutup Nara" />',
    ];
    const anchor = candidates.find((candidate) => source.includes(candidate));
    if (!anchor) throw new Error("V183_NARA_BACKDROP_ANCHOR_MISSING");
    const replacement = anchor.replace(
      'className="nara-assistant-backdrop"',
      'className="nara-assistant-backdrop" tabIndex={size === "full" ? 0 : -1}',
    );
    source = source.replace(anchor, replacement);
  }

  await write(path, source);
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  const line = 'import "./studio-production-v183.js";';
  if (!source.includes(line)) {
    const anchor = 'import "./studio-mobile-hardening-v181.js";';
    if (!source.includes(anchor)) throw new Error("V183_ENTRY_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n${line}`);
  }
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, 'const VERSION = "ngeblogging-app-v183-production-ui-20260801";');
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, 'const CACHE_RELEASE = "production-ui-cache-v183";');
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "production-ui-v183";');
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V181", "NGE_BLOGGING_UPDATE_AVAILABLE_V183");

  if (!source.includes("PRODUCTION_UI_RELEASE_V183")) {
    source = source.replace(
      /^(const VERSION = .*;\n)/m,
      '$1const PRODUCTION_UI_RELEASE_V183 = "studio-production-v183-20260801";\n',
    );
  }

  if (/await refreshStaleWindow\(client, url\);/.test(source)) {
    throw new Error("V183_FORCED_NAVIGATION_MUST_REMAIN_DISABLED");
  }

  await write(path, source);
}

async function verify() {
  const checks = [
    ["src/StudioNext.jsx", "studio-bootstrap-resilient-v183"],
    ["src/StudioNext.jsx", "ACTIVE_SITE_SNAPSHOT_V183"],
    ["src/StudioNext.jsx", "withStudioDeadlineV183"],
    ["src/StudioNext.jsx", "ngeblogging:active-site-ready"],
    ["src/NaraAssistant.jsx", 'aria-modal={size === "full"}'],
    ["src/NaraAssistant.jsx", 'hidden={size !== "full"}'],
    ["src/Studio.jsx", "studio-production-v183.js"],
    ["src/DomainPanelV124.jsx", "Situs aktif belum tersedia"],
    ["src/CommentsPanelV124.jsx", "Koneksi komentar belum tersedia"],
    ["public/sw.js", "ngeblogging-app-v183-production-ui-20260801"],
    ["public/sw.js", "production-ui-cache-v183"],
  ];

  for (const [path, marker] of checks) {
    const source = await read(path);
    if (!source.includes(marker)) throw new Error(`V183_VERIFY_FAILED:${path}:${marker}`);
  }
}

await patchStudioBootstrap();
await patchNaraNonModal();
await patchStudioEntry();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
