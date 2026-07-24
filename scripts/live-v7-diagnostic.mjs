const site = "https://ngeblogging.com";
const stamp = Date.now();
async function text(path) {
  const response = await fetch(`${site}${path}${path.includes("?") ? "&" : "?"}diagnostic=${stamp}`, { headers: { "cache-control": "no-cache", accept: "*/*" } });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.text();
}

const [healthText, sw, index] = await Promise.all([text("/api/health"), text("/sw.js"), text("/")]);
const health = JSON.parse(healthText);
const assetUrls = [...index.matchAll(/(?:src|href)="([^"]+\.(?:js|css)(?:\?[^"]*)?)"/g)].map((match) => new URL(match[1], site).href);
const assets = (await Promise.all(assetUrls.map(async (url) => {
  const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}diagnostic=${stamp}`, { headers: { "cache-control": "no-cache" } });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}))).join("\n");

const errors = [];
if (health.status !== "ok" || health.service !== "ngeblogging-cloudflare") errors.push("health");
if (health.release !== "2026.07.24-mobile-final-v7") errors.push(`release:${health.release}`);
if (!health.nara) errors.push(`nara:${health.nara}`);
if (!health.naraProviders || (!health.naraProviders.qwen && !health.naraProviders.workersAi)) errors.push(`providers:${JSON.stringify(health.naraProviders)}`);
if (!health.managedSubdomains) errors.push("managedSubdomains");
if (health.siteLimits?.free !== 5 || health.siteLimits?.maximum !== 12) errors.push(`limits:${JSON.stringify(health.siteLimits)}`);
if (!sw.includes("ngeblogging-app-v7-20260724")) errors.push("PWA-v7");
const markerGroups = [
  ["productionGuard", ["studio-production-guard-v7-20260724"]],
  ["singleToggle", ["sidebarAuthority"]],
  ["settingsExtras", ["ngeblogging-settings-extras"]],
  ["contentTools", ["sn-content-tools"]],
  ["bottomNavRemoved", ["sn-mobile-nav", "display:none!important"]],
  ["phonePanel", ["--sn-phone-panel"]],
  ["themeShells", ["ng-shell-poster", "ng-shell-rail", "ng-shell-cards"]],
  ["tenantWidgets", ["ng-widget-recent-posts", "ng-widget-popular-posts"]],
  ["publicMenu", ["ng-header nav.open"]],
  ["deviceModes", ["Mobile", "Tablet", "Laptop", "Komputer"]],
];
for (const [name, markers] of markerGroups) if (markers.some((marker) => !assets.includes(marker))) errors.push(`${name}:${markers.filter((marker) => !assets.includes(marker)).join(",")}`);
if (assets.includes("uji produksi belum dinyatakan lulus")) errors.push("obsoleteNaraGate");

console.log(JSON.stringify({ health, assetUrls, errors }, null, 2));
if (errors.length) process.exit(1);
console.log("LIVE_RELEASE_V7_ASSETS_CONFIRMED");
