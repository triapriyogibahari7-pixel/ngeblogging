import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-production-v214-20260802";
const VERSION = "ngeblogging-app-v214-screenshot-final-20260802";
const CACHE = "studio-screenshot-final-cache-v214";
const FORCE = "studio-v214";

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`V214_ANCHOR_MISSING:${label}`);
  return source.replace(search, replacement);
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  if (!source.includes('import "./studio-production-v214.js";')) {
    source = replaceRequired(
      source,
      'import "./studio-production-v213.js";',
      'import "./studio-production-v213.js";\nimport "./studio-production-v214.js";',
      "Studio v213 import",
    );
    await write(path, source);
  }
}

async function patchRetainedSessionGate() {
  const path = "src/StudioOnboardingGate.jsx";
  let source = await read(path);

  // v195-v198 already make local/persisted Supabase session the authority before
  // remote verification. v214 broadens only the scoped active-site cache so a
  // healthy retained session does not get trapped on "Koneksi data belum selesai"
  // when membership transport is temporarily slow.
  if (!source.includes('const ACTIVE_SITE_SNAPSHOT_V214 = "ngeblogging-active-site-snapshot-v214";')) {
    const anchor = 'const ACTIVE_SITE_SNAPSHOT_V195 = "ngeblogging-active-site-snapshot-v195";';
    source = replaceRequired(
      source,
      anchor,
      `${anchor}\nconst ACTIVE_SITE_SNAPSHOT_V214 = "ngeblogging-active-site-snapshot-v214";`,
      "v195 snapshot constant",
    );
  }

  if (!source.includes("function cachedActiveSiteV214(userId)")) {
    const anchor = "function cachedActiveSiteV195(userId) {";
    const helper = `function cachedActiveSiteV214(userId) {
  if (!userId) return null;
  try {
    const memory = window.__ngebloggingActiveSite;
    if (memory?.id && memory?.slug && (!memory.__userId || memory.__userId === userId)) return memory;
    for (const key of [
      ACTIVE_SITE_SNAPSHOT_V214,
      "ngeblogging-active-site-snapshot-v209",
      "ngeblogging-active-site-snapshot-v208",
      "ngeblogging-active-site-snapshot-v205",
      "ngeblogging-active-site-snapshot-v198",
      ACTIVE_SITE_SNAPSHOT_V195,
      ACTIVE_SITE_SNAPSHOT_V192,
    ]) {
      const cached = JSON.parse(localStorage.getItem(key) || "null");
      if (!cached?.id || !cached?.slug) continue;
      if (cached.__userId && cached.__userId !== userId) continue;
      return cached;
    }
  } catch {
    // Cache is an availability accelerator only; RLS remains authoritative.
  }
  return cachedActiveSiteV195(userId);
}

function rememberActiveSiteV214(site, userId) {
  if (!site?.id || !site?.slug || !userId) return;
  try {
    localStorage.setItem(ACTIVE_SITE_SNAPSHOT_V214, JSON.stringify({
      ...site,
      __userId: userId,
      __release: "${RELEASE}",
      __savedAt: Date.now(),
    }));
  } catch {
    // Private/hardened storage must never block the Studio.
  }
}

`;
    source = replaceRequired(source, anchor, `${helper}${anchor}`, "v195 cached site helper");
  }

  if (!source.includes("rememberActiveSiteV214(site, userId);")) {
    source = replaceRequired(
      source,
      "  rememberActiveSiteV195(site, userId);",
      "  rememberActiveSiteV195(site, userId);\n  rememberActiveSiteV214(site, userId);",
      "publish v195 cache",
    );
  }

  if (source.includes("const cached = cachedActiveSiteV195(props.user.id);")) {
    source = source.replace(
      "const cached = cachedActiveSiteV195(props.user.id);",
      "const cached = cachedActiveSiteV214(props.user.id);",
    );
  }

  if (!source.includes("studioMembershipTransportV214")) {
    const terminal = `  throw Object.assign(new Error(
    "Koneksi Workspace belum merespons dalam batas waktu. Sesi login tetap disimpan dan tidak ada logout otomatis.",
  ), { name: "DataTransportError", code: "DATA_NETWORK_UNAVAILABLE", cause: lastError });`;
    const replacement = `  const cached = cachedActiveSiteV214(userId);
  if (cached?.id && cached?.slug && localSession?.session?.access_token) {
    document.documentElement.dataset.studioMembershipTransportV214 = "retained-session-scoped-cache";
    return { verified: localSession, sites: [cached], degraded: true };
  }

${terminal}`;
    source = replaceRequired(source, terminal, replacement, "v195 membership terminal");
  }

  await write(path, source);
}

async function patchFastGate() {
  const path = "src/StudioFastGate.jsx";
  let source = await read(path);
  if (!source.includes('"ngeblogging-active-site-snapshot-v214"')) {
    source = replaceRequired(
      source,
      "const SNAPSHOT_KEYS = [",
      'const SNAPSHOT_KEYS = [\n  "ngeblogging-active-site-snapshot-v214",',
      "FastGate snapshot array",
    );
  }
  source = source.replace(
    /const RELEASE = "studio-fast-entry-v\d+-\d+";/,
    'const RELEASE = "studio-fast-entry-v214-20260802";',
  );
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, `const FORCE_REFRESH_VALUE = "${FORCE}";`);
  if (!source.includes("STUDIO_PRODUCTION_RELEASE_V214")) {
    source = source.replace(
      /^(const VERSION = .*;\n)/m,
      `$1const STUDIO_PRODUCTION_RELEASE_V214 = "${RELEASE}";\nconst STUDIO_PRODUCTION_COMPAT_VERSION_V213 = "ngeblogging-app-v213-analytics-layout-20260802";\nconst STUDIO_PRODUCTION_COMPAT_CACHE_V213 = "analytics-layout-cache-v213";\n`,
    );
  }
  for (const eventName of [
    "NGE_BLOGGING_UPDATE_AVAILABLE_V213",
    "NGE_BLOGGING_UPDATE_AVAILABLE_V212",
    "NGE_BLOGGING_UPDATE_AVAILABLE_V211",
  ]) source = source.replaceAll(eventName, "NGE_BLOGGING_UPDATE_AVAILABLE_V214");
  source = source.replace(
    /\n\s*await refreshStaleWindow\(client, url\);/g,
    "\n      // v214 announces update availability without forced navigation or session destruction.",
  );
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V214_FORCED_NAVIGATION_REMAINS");
  await write(path, source);
}

async function verify() {
  const [entry, runtime, css, gate, fastGate, nara, themeStudio, widgets, analytics, publicSite, auth, sw, release] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/studio-production-v214.js"),
    read("src/studio-production-v214.css"),
    read("src/StudioOnboardingGate.jsx"),
    read("src/StudioFastGate.jsx"),
    read("src/NaraAssistant.jsx"),
    read("src/ThemeStudio.jsx"),
    read("src/widget-system.js"),
    read("src/studio-analytics-v41.js"),
    read("src/PublicSiteNext.jsx"),
    read("src/lib/supabase.js"),
    read("public/sw.js"),
    read("public/release-v214.json"),
  ]);

  const checks = [
    [entry, "studio-production-v214.js", "Studio v214 import"],
    [runtime, RELEASE, "v214 runtime"],
    [runtime, "small-paired-four-plus-four", "small layout map"],
    [runtime, "camera-photo-file", "Nara attachments"],
    [runtime, "large-smooth-real-series", "analytics chart"],
    [css, 'data-v214-workspace="split-50-50"', "large code split"],
    [css, 'data-v214-workspace="preview-above-code"', "small preview/code order"],
    [css, 'data-v214-layout-canvas="small"', "small map geometry"],
    [css, 'data-v214-attachment-menu="camera-photo-file"', "Nara attachment menu CSS"],
    [css, 'data-v214-domain-action="horizontal"', "Domain action CSS"],
    [gate, "cachedActiveSiteV214", "retained scoped site cache"],
    [gate, "studioMembershipTransportV214", "membership degraded path"],
    [fastGate, "ngeblogging-active-site-snapshot-v214", "FastGate v214 snapshot"],
    [nara, 'aria-controls="nara-attachment-menu-v211"', "Nara accessible + trigger retained"],
    [nara, "Kamera", "Nara camera"],
    [nara, "Foto", "Nara photo"],
    [nara, "File teks", "Nara file"],
    [themeStudio, "PREVIEW LANGSUNG", "Theme live preview"],
    [themeStudio, "JavaScript", "Theme JavaScript tab"],
    [widgets, 'id: "custom-html"', "custom HTML JavaScript widget"],
    [analytics, "get_site_analytics_dashboard", "real analytics RPC"],
    [analytics, "op41-line-v213", "smooth factual series retained"],
    [publicSite, "PUBLIC_SITE_SINGLE_RENDER_V209", "public one-render authority"],
    [auth, "persistSession: true", "persistent session"],
    [auth, "autoRefreshToken: true", "refresh token"],
    [sw, VERSION, "v214 service worker"],
    [sw, CACHE, "v214 cache"],
    [sw, "ngeblogging-app-v213-analytics-layout-20260802", "v213 compatibility"],
    [release, RELEASE, "release metadata"],
  ];
  for (const [source, marker, label] of checks) {
    if (!source.includes(marker)) throw new Error(`V214_VERIFY_FAILED:${label}:${marker}`);
  }

  for (const source of [runtime, gate, fastGate]) {
    if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) {
      throw new Error("V214_DESTRUCTIVE_SESSION_ACTION");
    }
  }
  if (/await refreshStaleWindow\(client, url\);/.test(sw)) throw new Error("V214_FORCED_NAVIGATION_REINTRODUCED");
}

await patchStudioEntry();
await patchRetainedSessionGate();
await patchFastGate();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
