import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-production-v224-20260803";
const ACTION_RELEASE = "studio-production-v224-action-isolation-20260803";

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  const runtime = 'import "./studio-production-v224.js";';
  const isolation = 'import "./studio-production-v224-action-isolation.js";';
  if (!source.includes(runtime)) {
    const anchor = 'import "./studio-production-v223.js";';
    if (!source.includes(anchor)) throw new Error("V224_STUDIO_ENTRY_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n${runtime}`);
  }
  if (!source.includes(isolation)) source = source.replace(runtime, `${runtime}\n${isolation}`);
  await write(path, source);
}

async function patchServiceWorkerHotfixMarker() {
  const path = "public/sw.js";
  let source = await read(path);
  const marker = `const STUDIO_UI_HOTFIX_V224 = "${RELEASE}";`;
  if (!source.includes(marker)) {
    source = source.replace(/^(const VERSION = .*;\n)/m, `$1${marker}\n`);
  }
  if (!source.includes(marker)) throw new Error("V224_SW_HOTFIX_MARKER_MISSING");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V224_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V224_DESTRUCTIVE_SESSION_ACTION_IN_SW");
  await write(path, source);
}

async function verify() {
  const [entry, runtime, isolation, isolationCss, css, worker, release, auth, themeStudio, nara, v222] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/studio-production-v224.js"),
    read("src/studio-production-v224-action-isolation.js"),
    read("src/studio-production-v224-action-isolation.css"),
    read("src/studio-production-v224.css"),
    read("public/sw.js"),
    read("public/release-v224.json"),
    read("src/lib/supabase.js"),
    read("src/ThemeStudio.jsx"),
    read("src/NaraAssistant.jsx"),
    read("src/studio-production-v222.js"),
  ]);
  const checks = [
    [entry, "studio-production-v224.js", "entry runtime"],
    [entry, "studio-production-v224-action-isolation.js", "entry isolation"],
    [runtime, RELEASE, "runtime release"],
    [runtime, "compact-green-map", "compact green map"],
    [runtime, "1-to-10000-actual", "line gutter"],
    [runtime, "camera-photo-file", "Nara plus"],
    [isolation, ACTION_RELEASE, "action isolation release"],
    [isolation, "outside-v209-direct-button-sweep", "v209 isolation"],
    [isolationCss, ".v224-theme-code-actions", "isolated action CSS"],
    [css, 'data-v224-layout-canvas="compact-green-map"', "physical small map"],
    [css, 'data-v224-workspace="preview-above-code"', "small code workspace"],
    [css, 'data-v224-workspace="code-left-preview-right"', "large code workspace"],
    [css, 'data-v224-nara-mode="nonmodal"', "Nara nonmodal"],
    [worker, "STUDIO_UI_HOTFIX_V224", "service worker hotfix marker"],
    [worker, RELEASE, "service worker v224 UI marker"],
    [release, RELEASE, "release metadata"],
    [auth, "persistSession: true", "persist session"],
    [auth, "autoRefreshToken: true", "refresh token"],
    [themeStudio, 'data-v222-code-tab="html"', "HTML action"],
    [themeStudio, 'data-v222-code-tab="css"', "CSS action"],
    [themeStudio, 'data-v222-code-tab="javascript"', "JavaScript action"],
    [themeStudio, "preferredArea={widgetArea}", "area-aware widget studio"],
    [themeStudio, "tn-widget-custom-code-v209", "custom HTML JavaScript widget"],
    [themeStudio, "Tema Custom", "custom theme"],
    [nara, "Kamera", "Nara Camera"],
    [nara, "Foto", "Nara Photo"],
    [nara, "File teks", "Nara File"],
    [nara, "Nara Mini", "Nara model"],
    [nara, "Instan", "Nara intelligence"],
    [v222, "MAX_CODE_LINES = 10000", "v222 actual line limit"],
    [v222, "v222-format-code", "v222 formatter"],
  ];
  for (const [source, marker, label] of checks) {
    if (!source.includes(marker)) throw new Error(`V224_VERIFY_FAILED:${label}:${marker}`);
  }
  for (const source of [runtime, isolation]) {
    if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V224_DESTRUCTIVE_SESSION_ACTION");
  }
  if (/900\s*(juta|miliar|million|billion)/i.test(release)) throw new Error("V224_UNSUPPORTED_CAPACITY_CLAIM");
}

await patchStudioEntry();
await patchServiceWorkerHotfixMarker();
await verify();
console.log(`Applied ${RELEASE} while retaining the validated v223 cache authority.`);
