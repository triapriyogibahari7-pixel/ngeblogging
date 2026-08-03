import { readFile, writeFile } from "node:fs/promises";
import { BUILT_IN_THEMES, THEME_COUNT } from "../src/theme-catalog.js";
import { BUILT_IN_WIDGETS, WIDGET_COUNT } from "../src/widget-system.js";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);
const RELEASE = "studio-production-v224-20260803";
const VERSION = "ngeblogging-app-v224-visible-actions-cutover-20260803";
const CACHE = "visible-actions-cutover-cache-v224";
const FORCE = "studio-v224";

function replaceRequired(source, pattern, replacement, label) {
  const next = source.replace(pattern, replacement);
  if (next === source) throw new Error(`V224_ANCHOR_MISSING:${label}`);
  return next;
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  const line = 'import "./studio-production-v224.js";';
  if (!source.includes(line)) {
    const anchor = 'import "./studio-production-v223.js";';
    if (!source.includes(anchor)) throw new Error("V224_STUDIO_ENTRY_ANCHOR_MISSING");
    source = source.replace(anchor, `${anchor}\n${line}`);
    await write(path, source);
  }
}

async function patchLegacyV209ActionAuthority() {
  const path = "src/studio-production-v209.js";
  let source = await read(path);
  if (source.includes("expanded-html-css-javascript-v224")) return;

  source = replaceRequired(
    source,
    /const canonical = new Set\(\[customize, layout, code, site\]\.filter\(Boolean\)\);/,
    'const explicitCode = buttons.filter((node) => node.matches?.("[data-v222-code-tab]"));\n  const canonical = new Set([customize, layout, code, site, ...explicitCode].filter(Boolean));',
    "v209-canonical",
  );

  source = replaceRequired(
    source,
    /canonicalButton\(code, "Edit Kode", "code"\);\n\s*canonicalButton\(site, "Lihat situs", "site"\);\n\s*hero\.dataset\.v209Actions = "exactly-four";/,
    `if (explicitCode.length) {
    explicitCode.forEach((button) => {
      const kind = button.dataset.v222CodeTab || "html";
      const label = kind === "html" ? "Edit HTML" : kind === "css" ? "Edit CSS" : kind === "javascript" ? "Edit JavaScript" : "Edit Kode";
      canonicalButton(button, label, \`code-\${kind}\`);
      button.dataset.v222CodeTab = kind;
      button.dataset.v224ExpandedCodeAction = "true";
    });
  } else {
    canonicalButton(code, "Edit Kode", "code");
  }
  canonicalButton(site, "Lihat situs", "site");
  hero.dataset.v209Actions = explicitCode.length ? "expanded-html-css-javascript-v224" : "exactly-four";`,
    "v209-code-actions",
  );

  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, `const FORCE_REFRESH_VALUE = "${FORCE}";`);
  if (!source.includes("STUDIO_PRODUCTION_RELEASE_V224")) {
    source = source.replace(/^(const VERSION = .*;\n)/m, `$1const STUDIO_PRODUCTION_RELEASE_V224 = "${RELEASE}";\n`);
  }
  for (const eventName of ["NGE_BLOGGING_UPDATE_AVAILABLE_V223", "NGE_BLOGGING_UPDATE_AVAILABLE_V222", "NGE_BLOGGING_UPDATE_AVAILABLE_V221"]) {
    source = source.replaceAll(eventName, "NGE_BLOGGING_UPDATE_AVAILABLE_V224");
  }
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v224 announces the update without navigating authenticated tabs.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V224_FORCED_NAVIGATION_REMAINS");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V224_DESTRUCTIVE_SESSION_ACTION_IN_SW");
  await write(path, source);
}

async function verify() {
  const [entry, runtime, css, v209, worker, release, auth, themeStudio, nara] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/studio-production-v224.js"),
    read("src/studio-production-v224.css"),
    read("src/studio-production-v209.js"),
    read("public/sw.js"),
    read("public/release-v224.json"),
    read("src/lib/supabase.js"),
    read("src/ThemeStudio.jsx"),
    read("src/NaraAssistant.jsx"),
  ]);

  const checks = [
    [entry, "studio-production-v224.js", "entry"],
    [runtime, RELEASE, "runtime release"],
    [runtime, "html-css-javascript-visible", "runtime code actions"],
    [runtime, "compact-green-map", "compact green map"],
    [runtime, "1-to-10000-actual", "line gutter"],
    [runtime, "camera-photo-file", "Nara plus"],
    [css, 'data-v224-layout-canvas="compact-green-map"', "physical small map"],
    [css, 'data-v224-workspace="preview-above-code"', "small code workspace"],
    [css, 'data-v224-workspace="code-left-preview-right"', "large code workspace"],
    [css, 'data-v224-nara-mode="nonmodal"', "Nara nonmodal"],
    [v209, "expanded-html-css-javascript-v224", "v209 action conflict"],
    [worker, VERSION, "service worker version"],
    [worker, CACHE, "service worker cache"],
    [worker, RELEASE, "service worker release"],
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
  ];
  for (const [source, marker, label] of checks) {
    if (!source.includes(marker)) throw new Error(`V224_VERIFY_FAILED:${label}:${marker}`);
  }

  if (THEME_COUNT !== 100 || BUILT_IN_THEMES.length !== 100 || new Set(BUILT_IN_THEMES.map((theme) => theme.id)).size !== 100) throw new Error("V224_THEME_COUNT_REGRESSION");
  if (WIDGET_COUNT !== 26 || !BUILT_IN_WIDGETS.some((widget) => widget.id === "custom-html")) throw new Error("V224_WIDGET_COUNT_REGRESSION");
  if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(runtime)) throw new Error("V224_DESTRUCTIVE_SESSION_ACTION");
  if (/900\s*(juta|miliar|million|billion)/i.test(release)) throw new Error("V224_UNSUPPORTED_CAPACITY_CLAIM");
}

await patchStudioEntry();
await patchLegacyV209ActionAuthority();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
