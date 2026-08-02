import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../src/studio-analytics-v41.js", import.meta.url);
let source = await readFile(file, "utf8");

function replaceBetween(value, startMarker, endMarker, replacement, label) {
  const start = value.indexOf(startMarker);
  const end = value.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`V212_ANALYTICS_RANGE_MISSING:${label}`);
  return `${value.slice(0, start)}${replacement}\n\n${value.slice(end)}`;
}

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
  return \`<svg class="op41-line op41-line-v212" viewBox="0 0 \${width} \${height}" role="img" aria-label="Grafik kunjungan \${series.length} hari"><defs><linearGradient id="op41AreaV212" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2d6edf" stop-opacity=".28"/><stop offset="100%" stop-color="#2d6edf" stop-opacity=".02"/></linearGradient></defs><g class="grid">\${grid}</g>\${areaPath ? \`<path class="area" d="\${areaPath}"/>\` : ""}\${linePath ? \`<path class="line" d="\${linePath}"/>\` : ""}\${markers}</svg>\`;
}`;
source = replaceBetween(source, "function lineSvg(series) {", "function donutBackground(items) {", smoothChart, "smooth-line-chart");

if (!source.includes("v212-analytics-details")) {
  const anchor = '    <article class="op41-card"><header><div><small class="op41-kicker">POSTS & PAGES</small><h2>Performa konten</h2></div></header>';
  if (!source.includes(anchor)) throw new Error("V212_ANALYTICS_ANCHOR_MISSING:performance-content");
  const details = '    <div class="op41-chart-grid equal v212-details" data-v212-analytics-details="real-fields-only"><article class="op41-card"><header><div><small class="op41-kicker">BROWSER</small><h2>Browser pengunjung</h2></div></header><div class="op41-bars">${bars(data.browsers || [])}</div></article><article class="op41-card"><header><div><small class="op41-kicker">BOT / CRAWLER</small><h2>Bot teridentifikasi</h2></div></header><div class="op41-bars">${bars(data.bots || [])}</div></article><article class="op41-card"><header><div><small class="op41-kicker">HALAMAN MASUK</small><h2>Landing teratas</h2></div></header><div class="op41-bars">${bars(data.entryPages || [])}</div></article></div>\n';
  source = source.replace(anchor, `${details}${anchor}`);
}

for (const marker of ["op41-line-v212", "data-v212-analytics-details", "Browser pengunjung", "Bot teridentifikasi", "Landing teratas", "get_site_analytics_dashboard"]) {
  if (!source.includes(marker)) throw new Error(`V212_ANALYTICS_VERIFY_FAILED:${marker}`);
}
await writeFile(file, source);
console.log("Applied v212 production analytics visualization authority");
