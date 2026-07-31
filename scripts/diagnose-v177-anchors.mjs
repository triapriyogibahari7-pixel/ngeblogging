import fs from "node:fs";

const section = process.argv[2] || "all";
const read = (file) => fs.readFileSync(file, "utf8");
const groups = {
  nara: [
    ["src/NaraAssistant.jsx", '<button className="nara-floating-button" onClick={() => setOpen(true)} aria-label="Buka Nara AI Assistant">'],
    ["src/NaraAssistant.jsx", '<div className="nara-assistant-layer" role="dialog" aria-modal="true" aria-label="Nara AI Assistant">'],
    ["src/NaraAssistant.jsx", '<button className="nara-assistant-backdrop" onClick={closeNara} aria-label="Tutup Nara" />'],
    ["src/NaraAssistant.jsx", '<button onClick={resetChat} title="Percakapan baru"><RotateCcw /></button>\n              <button onClick={closeNara} title="Tutup"><X /></button>'],
  ],
  sw: [
    ["public/sw.js", 'const VERSION = "ngeblogging-app-v176-mobile-stability-20260731";'],
    ["public/sw.js", 'const CACHE_RELEASE = "mobile-stability-cache-v176";'],
    ["public/sw.js", 'const FORCE_REFRESH_VALUE = "mobile-stability-v176";'],
    ["public/sw.js", '    mobileStabilityRelease: "mobile-stability-v176-20260731",'],
  ],
  worker: [
    ["cloudflare/worker-v69.mjs", 'export const MOBILE_STABILITY_RELEASE = "2026.07.31-mobile-stability-v176";'],
    ["cloudflare/worker-v69.mjs", '  "/release-v176.json",\n]);'],
    ["cloudflare/worker-v69.mjs", '    mobileStabilityRelease: MOBILE_STABILITY_RELEASE,'],
    ["cloudflare/worker-v69.mjs", '      "x-ngeblogging-mobile-stability": MOBILE_STABILITY_RELEASE,'],
    ["cloudflare/worker-v69.mjs", '    && html.includes("ngeblogging-mobile-stability-v176")'],
    ["cloudflare/worker-v69.mjs", '    `<meta name="ngeblogging-mobile-stability-v176" content="${MOBILE_STABILITY_RELEASE}"/>`,'],
  ],
  netlify: [
    ["scripts/write-netlify-redirects.mjs", 'const MOBILE_STABILITY_RELEASE = "2026.07.31-mobile-stability-v176";'],
    ["scripts/write-netlify-redirects.mjs", '  X-Ngeblogging-Mobile-Stability: ${MOBILE_STABILITY_RELEASE}'],
    ["scripts/write-netlify-redirects.mjs", '/release-v176.json\n  Cache-Control: no-store, max-age=0\n`,'],
    ["scripts/write-netlify-redirects.mjs", '    mobileStabilityRelease: MOBILE_STABILITY_RELEASE,'],
    ["scripts/write-netlify-redirects.mjs", '    || !html.includes(\'name="ngeblogging-mobile-stability-v176"\')'],
    ["scripts/write-netlify-redirects.mjs", '      `<meta name="ngeblogging-mobile-stability-v176" content="${MOBILE_STABILITY_RELEASE}">`,'],
  ],
};
const selected = section === "all" ? Object.entries(groups) : [[section, groups[section]]];
if (!selected[0][1]) throw new Error(`UNKNOWN_SECTION:${section}`);
const missing = [];
for (const [name, checks] of selected) {
  for (const [file, marker] of checks) {
    if (!read(file).includes(marker)) missing.push(`${name}:${file}:${marker}`);
  }
}
if (missing.length) throw new Error(`V177_ANCHOR_MISSING\n${missing.join("\n")}`);
console.log(`V177 anchors ready: ${selected.map(([name]) => name).join(",")}`);
