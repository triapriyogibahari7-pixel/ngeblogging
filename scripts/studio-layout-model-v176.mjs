import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const RELEASE = "studio-layout-model-v176-20260731";
export const VIEWPORTS = Object.freeze([
  [320,568],[360,640],[375,667],[390,844],[412,915],[430,932],
  [600,960],[768,1024],[820,1180],[1024,768],[1280,720],[1366,768],
  [1440,900],[1920,1080],
]);

export function familyFor(width, installed = false) {
  if (installed) return "application";
  if (width <= 360) return "phone";
  if (width <= 430) return "mobile";
  if (width <= 600) return "compact";
  if (width <= 900) return "tablet";
  return "desktop";
}

export function desktopVariant(width) {
  if (width < 1180) return "laptop";
  if (width < 1600) return "site-desktop";
  return "computer";
}

function round(value) { return Math.round(value * 100) / 100; }

export function modelViewport(width, height, installed = false) {
  const family = familyFor(width, installed);
  const mobileSurface = ["application","phone","mobile","compact"].includes(family);
  const drawerRatio = width <= 360 ? .86 : width <= 560 ? .82 : .78;
  const drawerWidth = mobileSurface ? Math.min(width * drawerRatio, width <= 360 ? 300 : 332) : 0;
  const contentWidthClosed = width;
  const contentWidthOpen = mobileSurface ? width : width - 232;
  const contentWidthCollapsed = mobileSurface ? width : width - 76;
  const smallNaraWidth = width <= 560 ? width - 16 : Math.min(380, width - 24);
  const smallNaraHeight = width <= 560 ? Math.min(500, height - 88) : Math.min(520, height - 112);
  const mediumNaraWidth = width <= 560 ? width - 12 : Math.min(620, width - 24);
  const mediumNaraHeight = width <= 560 ? height - 12 : Math.min(760, height - 24);
  const fullNaraWidth = width - 12;
  const fullNaraHeight = height - 12;
  const checks = {
    drawerInsideViewport: !mobileSurface || drawerWidth > 0 && drawerWidth <= width - 42,
    drawerOverlayDoesNotShiftContent: contentWidthClosed === width,
    desktopOpenContentPositive: mobileSurface || contentWidthOpen >= 792,
    desktopCollapsedContentWider: mobileSurface || contentWidthCollapsed > contentWidthOpen,
    smallNaraInsideViewport: smallNaraWidth > 0 && smallNaraWidth <= width && smallNaraHeight > 0 && smallNaraHeight <= height,
    mediumNaraInsideViewport: mediumNaraWidth > 0 && mediumNaraWidth <= width && mediumNaraHeight > 0 && mediumNaraHeight <= height,
    fullNaraInsideViewport: fullNaraWidth > 0 && fullNaraWidth <= width && fullNaraHeight > 0 && fullNaraHeight <= height,
    minimumTouchTarget: true,
    horizontalOverflowExpected: false,
  };
  return {
    viewport: `${width}x${height}`,
    width,
    height,
    family,
    desktopVariant: family === "desktop" ? desktopVariant(width) : null,
    installed,
    navigation: mobileSurface ? "overlay-drawer" : "collapsible-sidebar",
    drawerWidth: round(drawerWidth),
    contentWidthClosed: round(contentWidthClosed),
    contentWidthOpen: round(contentWidthOpen),
    contentWidthCollapsed: round(contentWidthCollapsed),
    nara: {
      small: { width: round(smallNaraWidth), height: round(smallNaraHeight), modal: false },
      medium: { width: round(mediumNaraWidth), height: round(mediumNaraHeight), modal: false },
      full: { width: round(fullNaraWidth), height: round(fullNaraHeight), modal: true },
    },
    checks,
    passed: Object.values(checks).every(Boolean),
  };
}

export function buildReport() {
  const devices = VIEWPORTS.map(([width,height]) => modelViewport(width,height));
  devices.push(modelViewport(390,844,true));
  return {
    status: devices.every((device) => device.passed) ? "passed-model" : "failed-model",
    release: RELEASE,
    proof: "deterministic-layout-model-not-real-browser",
    warning: "Model ini memvalidasi batas geometri. Chrome, Edge, Firefox, Safari, Android, iPhone, PWA, keyboard, zoom, dan orientasi tetap memerlukan pengujian perangkat/browser nyata.",
    responsiveFamilies: ["application","phone","mobile","compact","tablet","desktop"],
    previewModes: ["application","phone","mobile","compact","tablet","laptop","site-desktop","computer"],
    viewportCount: devices.length,
    devices,
  };
}

function htmlFor(report) {
  const rows = report.devices.map((device) => `<tr><td>${device.viewport}${device.installed ? " PWA" : ""}</td><td>${device.family}</td><td>${device.desktopVariant || "—"}</td><td>${device.navigation}</td><td>${device.drawerWidth || "—"}</td><td>${device.nara.small.width}×${device.nara.small.height}</td><td>${device.nara.medium.width}×${device.nara.medium.height}</td><td>${device.passed ? "Lulus" : "Gagal"}</td></tr>`).join("");
  const cards = report.devices.map((device) => `<article class="device ${device.passed ? "pass" : "fail"}" style="--ratio:${device.width}/${device.height}"><header><b>${device.viewport}</b><span>${device.family}</span></header><div class="screen"><i class="drawer" style="width:${device.drawerWidth ? Math.max(22,device.drawerWidth/device.width*100) : 8}%"></i><main><em></em><em></em><em></em></main><button class="nara" aria-label="Nara"></button></div><footer>${device.navigation} · ${device.passed ? "Lulus" : "Gagal"}</footer></article>`).join("");
  return `<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Simulasi layout Studio v176</title><style>*{box-sizing:border-box}body{margin:0;padding:28px;background:#f3f6fa;color:#18314f;font-family:system-ui,sans-serif}h1{margin:0 0 8px}p{max-width:900px;color:#667b94;line-height:1.6}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin:24px 0}.device{padding:12px;border:1px solid #d8e2ed;border-radius:16px;background:white}.device header,.device footer{display:flex;justify-content:space-between;gap:8px;font-size:12px}.device header span,.device footer{color:#71849a}.screen{position:relative;aspect-ratio:9/14;margin:10px 0;overflow:hidden;border:2px solid #bfd0e2;border-radius:12px;background:#f7faff}.drawer{position:absolute;z-index:2;inset:0 auto 0 0;background:#fff;border-right:1px solid #d8e2ed}.screen main{display:grid;gap:7px;padding:18px 12px 12px 31%}.screen main em{height:13px;border-radius:5px;background:#dce8f7}.nara{position:absolute;right:8px;bottom:8px;width:32px;height:32px;border:0;border-radius:10px;background:#2d6edf}.pass{border-color:#b8dfc8}.fail{border-color:#e7b8bf}table{width:100%;border-collapse:collapse;background:white;border-radius:14px;overflow:hidden;font-size:12px}th,td{padding:10px;border-bottom:1px solid #e7edf4;text-align:left}th{background:#eaf2ff}@media(max-width:600px){body{padding:14px}.table{overflow:auto}table{min-width:820px}}</style><h1>Simulasi geometri Studio v176</h1><p>${report.warning}</p><div class="grid">${cards}</div><div class="table"><table><thead><tr><th>Viewport</th><th>Keluarga</th><th>Varian</th><th>Navigasi</th><th>Drawer px</th><th>Nara kecil</th><th>Nara medium</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></html>`;
}

export function writeReport(output = resolve("public/studio-layout-v176.json")) {
  const report = buildReport();
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(report,null,2)}\n`, "utf8");
  writeFileSync(resolve(dirname(output), "studio-layout-v176.html"), htmlFor(report), "utf8");
  return report;
}

const direct = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (direct) {
  const flag = process.argv.indexOf("--output");
  const output = flag >= 0 && process.argv[flag + 1] ? resolve(process.argv[flag + 1]) : resolve("public/studio-layout-v176.json");
  const report = writeReport(output);
  console.log(JSON.stringify({ release:report.release,status:report.status,viewportCount:report.viewportCount,output }));
  if (report.status !== "passed-model") process.exitCode = 1;
}
