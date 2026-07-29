import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const results = [];
const check = (name, fn) => {
  try {
    fn();
    results.push({ name, status: "pass" });
  } catch (error) {
    results.push({ name, status: "fail", error: error?.message || String(error) });
  }
};
const containsAll = (source, markers, label) => {
  for (const marker of markers) {
    if (!source.includes(marker)) throw new Error(`${label} kehilangan marker: ${marker}`);
  }
};

const [pkgSource, productionSource, studioEntry, studioNext, deviceRuntime, interfaceCss, shellController, naraRuntime, serviceWorker, pwaRuntime, authCallback, authBootstrap, favicon] = await Promise.all([
  read("package.json"), read("wrangler.production.jsonc"), read("src/Studio.jsx"), read("src/StudioNext.jsx"),
  read("src/studio-device-mode-v140.js"), read("src/studio-interface-authority-v147.css"),
  read("src/studio-shell-controller-v147.js"), read("src/nara-size-authority-v144.js"), read("public/sw.js"),
  read("src/pwa-runtime.js"), read("src/auth-callback-authority-v107.js"), read("src/auth-studio-bootstrap-v106.js"),
  read("public/favicon.svg"),
]);

const pkg = JSON.parse(pkgSource);
const production = JSON.parse(productionSource);
check("package build gate", () => {
  if (!pkg.scripts.build.includes("npm run test:production")) throw new Error(pkg.scripts.build);
  if (!pkg.scripts.build.includes("vite build")) throw new Error("vite build hilang");
});
check("Cloudflare release", () => {
  if (production.vars.APP_RELEASE !== "2026.07.29-studio-interface-v147") throw new Error(`APP_RELEASE=${production.vars.APP_RELEASE}`);
  if (production.vars.UI_AUTHORITY_RELEASE !== "2026.07.29-studio-interface-v147") throw new Error(`UI=${production.vars.UI_AUTHORITY_RELEASE}`);
  if (production.assets.directory !== "./dist/") throw new Error(`directory=${production.assets.directory}`);
  if (production.assets.run_worker_first !== true) throw new Error(`run_worker_first=${production.assets.run_worker_first}`);
});
check("Studio entry", () => {
  containsAll(studioEntry, ["studio-device-mode-v140.js", "nara-size-authority-v144.js", "studio-shell-controller-v147.js", "studio-interface-authority-v147.css"], "Studio entry");
  if (!(studioEntry.lastIndexOf("studio-interface-authority-v147.css") > studioEntry.lastIndexOf("studio-layout-authority-v145.css"))) throw new Error("urutan CSS v147 bukan terakhir");
});
check("Menu Studio", () => containsAll(studioNext, ["Buat Post", "Ringkasan", "Posts", "Pages", "Tema", "Media", "Analitik", "Anggota", "Komentar", "Domain", "API Keys", "Pengaturan", "Keluar"], "Menu Studio"));
check("Mode perangkat", () => {
  containsAll(deviceRuntime, ["studio-device-mode-v147-20260729", "COMPACT_MAX = 760", "TABLET_MAX = 1180", "PHONE_MAX = 430", "HANDHELD_MAX = 600", "\"application\"", "\"phone\"", "\"mobile\"", "\"compact\"", "\"tablet\"", "\"desktop\"", "\"laptop\"", "\"computer\"", "interactive-widget=resizes-content"], "Mode perangkat");
  for (const forbidden of ["clearLegacyInlineLayout", "setForcedDrawer", "forcedBackdrop"]) if (deviceRuntime.includes(forbidden)) throw new Error(`marker terlarang: ${forbidden}`);
});
check("CSS interface", () => {
  containsAll(interfaceCss, ["--sn-v147-sidebar-open:268px", "--sn-v147-sidebar-closed:80px", "width:min(82vw,360px)!important", "sn-sidebar-edge-toggle-v147", "sn-profile-menu-v147", "grid-template-columns:380px 380px!important", ".nara-size-controls-v147", ".nara-speech-action-v147", "overflow-x:clip!important"], "CSS interface");
  const opens = (interfaceCss.match(/{/g) || []).length;
  const closes = (interfaceCss.match(/}/g) || []).length;
  if (opens !== closes) throw new Error(`kurung CSS ${opens}/${closes}`);
});
check("Controller Studio", () => containsAll(shellController, ["studio-shell-controller-v147-20260729", "sn-sidebar-edge-toggle-v147", "sn-profile-menu-v147", "Profil", "Pengaturan", "Keluar"], "Controller Studio"));
check("Nara", () => containsAll(naraRuntime, ["nara-interface-authority-v147-20260729", "Kecil", "Medium", "Penuh", "Instan", "Sedang", "Tinggi", "speechSynthesis", "nara-speech-action-v147"], "Nara"));
check("Service worker", () => containsAll(serviceWorker, ["ngeblogging-app-v147-studio-interface-20260729", "ngeblogging-app-v145-studio-mobile-cache-20260729", "single-react-interface-v147", "single-react-mobile-cache-v145", "studio-interface-v147", "service-worker-stale-shell-v147", "service-worker-activated-studio-interface-v147", "self.skipWaiting()", "self.clients.claim()"], "Service worker"));
check("PWA", () => containsAll(pwaRuntime, ["ngeblogging-pwa-v147-20260729", "ngeblogging-pwa-v145-20260729", "ngeblogging-pwa-controller-v147", "pwa-v147-studio-interface", "responsiveFamily", "dataset.deviceFamily", "navigator.serviceWorker.register"], "PWA"));
check("Login langsung", () => containsAll(authCallback, ["directPasswordGrant", "/auth/v1/token?grant_type=password", "supabase.auth.setSession"], "Login langsung"));
check("Handoff login", () => containsAll(authBootstrap, ["auth-route-handoff-v143-20260729", "path === \"/login\"", "path === \"/signup\"", "path === \"/signin\""], "Handoff login"));
check("Favicon", () => {
  if (!favicon.includes("Ikon huruf n untuk Ngeblogging")) throw new Error("deskripsi n hilang");
  if (favicon.includes("<circle")) throw new Error("favicon masih memakai circle");
});

const report = { generatedAt: new Date().toISOString(), failures: results.filter((item) => item.status === "fail").length, results };
await writeFile(new URL("../public/v147-validator-report.json", import.meta.url), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
