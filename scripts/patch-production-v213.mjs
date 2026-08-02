import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fileUrl = (path) => new URL(path, root);
const read = (path) => readFile(fileUrl(path), "utf8");
const write = (path, value) => writeFile(fileUrl(path), value);

const RELEASE = "studio-production-v213-20260802";
const VERSION = "ngeblogging-app-v213-analytics-layout-20260802";
const CACHE = "analytics-layout-cache-v213";
const FORCE = "studio-v213";

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`V213_ANCHOR_MISSING:${label}`);
  return source.replace(search, replacement);
}

function replaceBetween(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`V213_RANGE_MISSING:${label}`);
  return `${source.slice(0, start)}${replacement}\n\n${source.slice(end)}`;
}

async function patchStudioEntry() {
  const path = "src/Studio.jsx";
  let source = await read(path);
  if (!source.includes('import "./studio-production-v213.js";')) {
    source = replaceRequired(
      source,
      'import "./studio-production-v212.js";',
      'import "./studio-production-v212.js";\nimport "./studio-production-v213.js";',
      "Studio v212 import",
    );
    await write(path, source);
  }
}

async function patchAnalytics() {
  const path = "src/studio-analytics-v41.js";
  let source = await read(path);

  if (!source.includes("op41-line-v213")) {
    const smoothChart = `function lineSvg(series) {
  const width = 900, height = 330, left = 48, top = 20, right = 20, bottom = 34;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maximum = Math.max(1, ...series.map((item) => Number(item.views || 0)));
  const points = series.map((item, index) => ({
    x:left + (series.length <= 1 ? chartWidth / 2 : index / (series.length - 1) * chartWidth),
    y:top + chartHeight - Number(item.views || 0) / maximum * chartHeight,
    value:Number(item.views || 0),
    day:item.day || "",
  }));
  const pathFor = (items) => {
    if (!items.length) return "";
    if (items.length === 1) return \`M \${items[0].x} \${items[0].y}\`;
    let path = \`M \${items[0].x.toFixed(1)} \${items[0].y.toFixed(1)}\`;
    for (let index = 0; index < items.length - 1; index += 1) {
      const current = items[index], next = items[index + 1];
      const previous = items[index - 1] || current;
      const after = items[index + 2] || next;
      const cp1x = current.x + (next.x - previous.x) / 6;
      const cp1y = current.y + (next.y - previous.y) / 6;
      const cp2x = next.x - (after.x - current.x) / 6;
      const cp2y = next.y - (after.y - current.y) / 6;
      path += \` C \${cp1x.toFixed(1)} \${cp1y.toFixed(1)}, \${cp2x.toFixed(1)} \${cp2y.toFixed(1)}, \${next.x.toFixed(1)} \${next.y.toFixed(1)}\`;
    }
    return path;
  };
  const linePath = pathFor(points);
  const baseY = top + chartHeight;
  const areaPath = points.length ? \`\${linePath} L \${points.at(-1).x.toFixed(1)} \${baseY} L \${points[0].x.toFixed(1)} \${baseY} Z\` : "";
  const grid = [0,.25,.5,.75,1].map((ratio) => {
    const y = top + chartHeight * ratio;
    const value = Math.round(maximum * (1-ratio));
    return \`<line x1="\${left}" y1="\${y}" x2="\${left+chartWidth}" y2="\${y}"/><text x="\${left-9}" y="\${y+4}" text-anchor="end">\${formatNumber(value)}</text>\`;
  }).join("");
  const markerEvery = Math.max(1, Math.floor(series.length / 10));
  const markers = points.filter((_, index) => series.length <= 14 || index % markerEvery === 0 || index === points.length - 1).map((point) => \`<circle class="point" cx="\${point.x.toFixed(1)}" cy="\${point.y.toFixed(1)}" r="4"><title>\${escapeHtml(point.day)} · \${formatNumber(point.value)} kunjungan</title></circle>\`).join("");
  return \`<svg class="op41-line op41-line-v213" viewBox="0 0 \${width} \${height}" role="img" aria-label="Grafik kunjungan \${series.length} hari"><defs><linearGradient id="op41AreaV213" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2d6edf" stop-opacity=".28"/><stop offset="100%" stop-color="#2d6edf" stop-opacity=".02"/></linearGradient></defs><g class="grid">\${grid}</g>\${areaPath ? \`<path class="area" d="\${areaPath}"/>\` : ""}\${linePath ? \`<path class="line" d="\${linePath}"/>\` : ""}\${markers}</svg>\`;
}`;
    source = replaceBetween(source, "function lineSvg(series) {", "function donutBackground(items) {", smoothChart, "smooth analytics chart");
  }

  if (!source.includes("browsers:[]")) {
    source = source.replace(
      "series:zeroSeries(days), traffic:[], devices:[], referrers:[], countries:[], topContent:[],",
      "series:zeroSeries(days), traffic:[], devices:[], browsers:[], bots:[], referrers:[], countries:[], entryPages:[], topContent:[],",
    );
  }

  if (!source.includes("browsers:Array.isArray")) {
    source = source.replace(
      "devices:Array.isArray(source.devices) ? source.devices : [],\n    referrers:Array.isArray(source.referrers) ? source.referrers : [],",
      "devices:Array.isArray(source.devices) ? source.devices : [],\n    browsers:Array.isArray(source.browsers) ? source.browsers : [],\n    bots:Array.isArray(source.bots) ? source.bots : [],\n    referrers:Array.isArray(source.referrers) ? source.referrers : [],",
    );
    source = source.replace(
      "countries:Array.isArray(source.countries) ? source.countries : [],\n    topContent:Array.isArray(source.topContent) ? source.topContent : [],",
      "countries:Array.isArray(source.countries) ? source.countries : [],\n    entryPages:Array.isArray(source.entryPages) ? source.entryPages : [],\n    topContent:Array.isArray(source.topContent) ? source.topContent : [],",
    );
  }

  if (!source.includes('data-v213-analytics-details="real-fields-only"')) {
    const anchor = '    <article class="op41-card"><header><div><small class="op41-kicker">POSTS & PAGES</small><h2>Performa konten</h2></div></header>';
    const details = '    <div class="op41-chart-grid equal v213-details" data-v213-analytics-details="real-fields-only"><article class="op41-card"><header><div><small class="op41-kicker">BROWSER</small><h2>Browser pengunjung</h2></div></header><div class="op41-bars">${bars(data.browsers || [])}</div></article><article class="op41-card"><header><div><small class="op41-kicker">BOT / CRAWLER</small><h2>Bot teridentifikasi</h2></div></header><div class="op41-bars">${bars(data.bots || [])}</div></article><article class="op41-card"><header><div><small class="op41-kicker">HALAMAN MASUK</small><h2>Landing teratas</h2></div></header><div class="op41-bars">${bars(data.entryPages || [])}</div></article></div>\n';
    source = replaceRequired(source, anchor, `${details}${anchor}`, "analytics detail cards");
  }

  await write(path, source);
}

async function patchServiceWorker() {
  const path = "public/sw.js";
  let source = await read(path);
  source = source.replace(/^const VERSION = ".*";$/m, `const VERSION = "${VERSION}";`);
  source = source.replace(/^const CACHE_RELEASE = ".*";$/m, `const CACHE_RELEASE = "${CACHE}";`);
  source = source.replace(/^const FORCE_REFRESH_VALUE = ".*";$/m, `const FORCE_REFRESH_VALUE = "${FORCE}";`);
  if (!source.includes("STUDIO_PRODUCTION_RELEASE_V213")) {
    source = source.replace(
      /^(const VERSION = .*;\n)/m,
      `$1const STUDIO_PRODUCTION_RELEASE_V213 = "${RELEASE}";\nconst STUDIO_PRODUCTION_COMPAT_VERSION_V212 = "ngeblogging-app-v212-large-mode-layout-nara-domain-20260802";\nconst STUDIO_PRODUCTION_COMPAT_CACHE_V212 = "large-mode-layout-nara-domain-cache-v212";\n`,
    );
  }
  source = source.replaceAll("NGE_BLOGGING_UPDATE_AVAILABLE_V212", "NGE_BLOGGING_UPDATE_AVAILABLE_V213");
  source = source.replace(/\n\s*await refreshStaleWindow\(client, url\);/g, "\n      // v213 announces update availability without forced navigation or session destruction.");
  if (/await refreshStaleWindow\(client, url\);/.test(source)) throw new Error("V213_FORCED_NAVIGATION_REMAINS");
  await write(path, source);
}

async function verify() {
  const [entry, runtime, css, analytics, handler, migration, sw, release, publicSite, auth] = await Promise.all([
    read("src/Studio.jsx"),
    read("src/studio-production-v213.js"),
    read("src/studio-production-v213.css"),
    read("src/studio-analytics-v41.js"),
    read("server/analytics-handler.mjs"),
    read("supabase/migrations/20260802104500_analytics_dashboard_v213_details.sql"),
    read("public/sw.js"),
    read("public/release-v213.json"),
    read("src/PublicSiteNext.jsx"),
    read("src/lib/supabase.js"),
  ]);
  const checks = [
    [entry, "studio-production-v213.js", "Studio v213 import"],
    [runtime, RELEASE, "v213 runtime"],
    [runtime, "v213LockedContent", "locked central content"],
    [css, 'data-v212-layout-map="compact-three-column"', "readable small map"],
    [css, "content-main content-main", "full-width small content"],
    [analytics, "op41-line-v213", "smooth real time-series"],
    [analytics, 'data-v213-analytics-details="real-fields-only"', "real analytics detail surface"],
    [handler, "function browserFamily", "browser collector"],
    [handler, 'release: "analytics-v213"', "analytics collector release"],
    [migration, "'browsers'", "browser dashboard field"],
    [migration, "'bots'", "bot dashboard field"],
    [migration, "'entryPages'", "entry-page dashboard field"],
    [sw, VERSION, "v213 service worker version"],
    [sw, CACHE, "v213 cache"],
    [sw, RELEASE, "v213 service worker marker"],
    [sw, "ngeblogging-app-v212-large-mode-layout-nara-domain-20260802", "v212 compatibility marker"],
    [publicSite, "PUBLIC_SITE_SINGLE_RENDER_V209", "single initial public-site render"],
    [auth, "persistSession: true", "persistent session"],
    [auth, "autoRefreshToken: true", "automatic refresh token"],
    [release, RELEASE, "v213 release metadata"],
  ];
  for (const [source, marker, label] of checks) {
    if (!source.includes(marker)) throw new Error(`V213_VERIFY_FAILED:${label}:${marker}`);
  }
  for (const source of [runtime, handler]) {
    if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(|signOut\s*\(/.test(source)) throw new Error("V213_DESTRUCTIVE_SESSION_ACTION");
  }
}

await patchStudioEntry();
await patchAnalytics();
await patchServiceWorker();
await verify();
console.log(`Applied ${RELEASE}`);
