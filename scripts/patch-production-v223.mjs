import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-production-v223-20260803";
const VERSION = "ngeblogging-app-v223-deterministic-theme-nara-20260803";
const CACHE = "deterministic-theme-nara-cache-v223";

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`V223_ANCHOR_MISSING:${label}`);
  return source.replace(search, replacement);
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  const line = 'import "./studio-production-v223.js";';
  if (!source.includes(line)) {
    const anchors = [
      'import "./studio-production-v222-code-tabs.js";',
      'import "./studio-production-v222.js";',
    ];
    const anchor = anchors.find((candidate) => source.includes(candidate));
    if (!anchor) throw new Error("V223_STUDIO_ENTRY_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n${line}`);
    await write(path, source);
  }
}

async function patchLegacyThemeActionConflict() {
  const path = "src/studio-production-v209.js";
  let source = await read(path);
  if (source.includes("expanded-html-css-javascript-v223")) return;

  source = replaceRequired(
    source,
    '  const canonical = new Set([customize, layout, code, site].filter(Boolean));',
    '  const explicitCode = buttons.filter((node) => node.matches?.("[data-v222-code-tab]"));\n  const canonical = new Set([customize, layout, code, site, ...explicitCode].filter(Boolean));',
    "v209-canonical-set",
  );

  source = replaceRequired(
    source,
    '  canonicalButton(code, "Edit Kode", "code");\n  canonicalButton(site, "Lihat situs", "site");\n  hero.dataset.v209Actions = "exactly-four";',
    '  if (explicitCode.length) {\n    explicitCode.forEach((button) => {\n      const kind = button.dataset.v222CodeTab || "code";\n      const label = kind === "html" ? "Edit HTML" : kind === "css" ? "Edit CSS" : kind === "javascript" ? "Edit JavaScript" : "Edit Kode";\n      canonicalButton(button, label, `code-${kind}`);\n      button.dataset.v222CodeTab = kind;\n      button.dataset.v223ExpandedCodeAction = "true";\n    });\n  } else {\n    canonicalButton(code, "Edit Kode", "code");\n  }\n  canonicalButton(site, "Lihat situs", "site");\n  hero.dataset.v209Actions = explicitCode.length ? "expanded-html-css-javascript-v223" : "exactly-four";',
    "v209-code-actions",
  );

  await write(path, source);
}

async function patchThemeMapCopy() {
  const path = "src/ThemeStudio.jsx";
  let source = await read(path);
  source = source.replace(
    '<header className="tn-layout-studio-header"><div><small>PETA TATA LETAK SITUS</small><h2>Header, area atas, empat widget kiri, konten utama, empat widget kanan, area bawah, dan footer.</h2><p>Tekan kotak untuk membuka pilihan widget langsung pada area itu. Struktur yang sama dipakai aplikasi, handphone, mobile, perangkat kecil, tablet, laptop, desktop, dan komputer.</p></div><button onClick={() => onOpenWidgets("sidebar-right-1")}><Blocks/> Atur widget</button></header>',
    '<header className="tn-layout-studio-header"><div><small>PETA TATA LETAK SITUS</small></div><button onClick={() => onOpenWidgets("sidebar-right-1")}><Blocks/> Atur widget</button></header>',
  );
  if (!source.includes("PETA TATA LETAK SITUS")) throw new Error("V223_THEME_MAP_MISSING");
  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, 'const FORCE_REFRESH_VALUE = "studio-v223";');
  if (!source.includes("STUDIO_PRODUCTION_RELEASE_V223")) {
    source = source.replace(/^(const VERSION = .*;\n)/m, `$1const STUDIO_PRODUCTION_RELEASE_V223 = "${RELEASE}";\n`);
  }
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V222", "NGE_BLOGGING_UPDATE_AVAILABLE_V223");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V223_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V223_SESSION_DESTRUCTIVE_ACTION_FOUND");
  await write(path, source);
}

async function verify() {
  const [entry, runtime, css, v209, themeStudio, widgets, themeSystem, nara, auth, sw, release] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/studio-production-v223.js"),
    read("src/studio-production-v223.css"),
    read("src/studio-production-v209.js"),
    read("src/ThemeStudio.jsx"),
    read("src/widget-system.js"),
    read("src/theme-system.js"),
    read("src/NaraAssistant.jsx"),
    read("src/lib/supabase.js"),
    read("public/sw.js"),
    read("public/release-v223.json"),
  ]);

  const checks = [
    [entry, "studio-production-v223.js", "Studio v223 entry"],
    [runtime, RELEASE, "runtime release"],
    [runtime, "syntheticDesktopOnPhone", "desktop-site phone lock"],
    [runtime, "green-reference-deterministic", "green layout"],
    [runtime, "camera-photo-file", "Nara plus menu"],
    [css, "compact-four-left-four-right", "small layout topology"],
    [css, "code-left-preview-right", "large code split"],
    [css, "preview-above-code", "small code stack"],
    [css, "tn-code-line-gutter-v223", "actual code gutter"],
    [css, "nara-composer-tools", "compact Nara tools"],
    [v209, "expanded-html-css-javascript-v223", "legacy Theme action conflict removed"],
    [themeStudio, 'data-v222-code-tab="html"', "HTML action"],
    [themeStudio, 'data-v222-code-tab="css"', "CSS action"],
    [themeStudio, 'data-v222-code-tab="javascript"', "JavaScript action"],
    [themeStudio, "preferredArea={widgetArea}", "layout click opens preferred widget area"],
    [themeStudio, "tn-widget-custom-code-v209", "custom HTML JavaScript widget"],
    [themeStudio, "Tema Custom", "custom theme"],
    [widgets, 'id: "sidebar-left-4"', "fourth left widget area"],
    [widgets, 'id: "sidebar-right-4"', "fourth right widget area"],
    [themeSystem, "THEME_COUNT", "theme count authority"],
    [nara, "Kamera", "Nara Camera"],
    [nara, "Foto", "Nara Photo"],
    [nara, "File teks", "Nara File"],
    [nara, "Nara Mini", "Nara models"],
    [nara, "Instan", "Nara intelligence"],
    [auth, "persistSession: true", "persist session"],
    [auth, "autoRefreshToken: true", "refresh session"],
    [sw, RELEASE, "service worker release"],
    [sw, VERSION, "service worker version"],
    [sw, CACHE, "service worker cache"],
    [release, RELEASE, "release artifact"],
  ];
  for (const [source, marker, label] of checks) {
    if (!source.includes(marker)) throw new Error(`V223_VERIFY_FAILED:${label}:${marker}`);
  }

  const countMatch = themeSystem.match(/export const THEME_COUNT\s*=\s*BUILT_IN_THEMES\.length/);
  if (!countMatch) throw new Error("V223_THEME_COUNT_NOT_DERIVED_FROM_REAL_THEMES");
  if (!themeSystem.includes("100")) throw new Error("V223_100_THEME_CONTRACT_MISSING");
  if (/900\s*(juta|miliar|million|billion)/i.test(release)) throw new Error("V223_UNSUPPORTED_CAPACITY_CLAIM");
}

await patchStudioEntry();
await patchLegacyThemeActionConflict();
await patchThemeMapCopy();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
