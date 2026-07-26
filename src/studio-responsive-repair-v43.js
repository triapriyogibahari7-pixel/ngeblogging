const RELEASE = "studio-responsive-repair-v43-20260726";
let frame = 0;
let domainProbe = null;
const repairedAnalytics = new WeakSet();
const repairedDomains = new WeakSet();

function pageView(title) {
  return [...document.querySelectorAll(".sn-main > .sn-view-pad")]
    .find((view) => view.querySelector(":scope > .sn-page-title h1")?.textContent?.trim() === title) || null;
}

function pulse(view) {
  const marker = document.createElement("span");
  marker.hidden = true;
  marker.dataset.sp43Pulse = "true";
  view.append(marker);
  marker.remove();
}

function improveSiteIdentity() {
  document.querySelectorAll(".sp37-active-site button, .sp39-site-actions button").forEach((button) => {
    const text = button.textContent?.trim() || "";
    if (/^(ganti situs aktif|beralih situs)$/i.test(text)) button.textContent = "Kelola & ganti situs";
    if (/^tambah situs$/i.test(text)) button.setAttribute("aria-label", "Tambahkan situs baru ke akun");
  });

  document.querySelectorAll(".sn-workspace").forEach((workspace) => {
    workspace.setAttribute("aria-label", "Buka pemilih situs aktif");
    workspace.setAttribute("title", "Kelola dan ganti situs aktif");
  });

  document.querySelectorAll(".sn-site-manager").forEach((manager) => {
    manager.setAttribute("role", manager.getAttribute("role") || "dialog");
    manager.setAttribute("aria-label", manager.getAttribute("aria-label") || "Kelola situs Ngeblogging");
  });
}

function normalizeLayoutBuilder() {
  document.querySelectorAll(".lb39-layer").forEach((layer) => {
    layer.dataset.sp43Responsive = "true";
    const host = layer.querySelector(".lb39-canvas-host");
    if (host) {
      host.setAttribute("aria-live", "polite");
      host.setAttribute("aria-label", "Pratinjau susunan tata letak berdasarkan perangkat");
    }

    const mode = layer.dataset.lb40Preview || "desktop";
    layer.querySelectorAll("[data-lb40-mode]").forEach((button) => {
      const selected = button.dataset.lb40Mode === mode;
      button.setAttribute("aria-current", selected ? "true" : "false");
      button.title = button.dataset.lb40Mode === "desktop"
        ? "Pratinjau komputer dan laptop"
        : button.dataset.lb40Mode === "tablet"
          ? "Pratinjau tablet dan layar sedang"
          : "Pratinjau handphone, PWA, dan aplikasi";
    });
  });
}

function emptyAnalyticsMarkup() {
  return `<section class="sp43-real-empty" aria-label="Analitik produksi belum memiliki event">
    <header><div><small>DATA PRODUKSI</small><h2>Collector aktif, belum ada kunjungan yang tercatat</h2><p>Grafik ini memakai nilai nol, bukan data simulasi. Saat situs publik menerima kunjungan, data manusia, bot, perangkat, sumber trafik, negara, Posts, dan Pages akan terisi otomatis.</p></div></header>
    <div class="sp43-empty-metrics">
      <article><small>Total kunjungan</small><b>0</b><span>Belum ada event</span></article>
      <article><small>Pengunjung manusia unik</small><b>0</b><span>Produksi nyata</span></article>
      <article><small>Trafik bot</small><b>0</b><span>Belum terdeteksi</span></article>
      <article><small>Kunjungan hari ini</small><b>0</b><span>Zona waktu server</span></article>
    </div>
    <div class="sp43-empty-chart" role="img" aria-label="Grafik kunjungan produksi kosong">
      <svg viewBox="0 0 760 240" aria-hidden="true">
        <g fill="none" stroke="#dce5ef" stroke-width="1">
          <path d="M45 28H735M45 76H735M45 124H735M45 172H735M45 220H735"/>
          <path d="M45 28V220M183 28V220M321 28V220M459 28V220M597 28V220M735 28V220"/>
        </g>
        <path d="M45 220H735" fill="none" stroke="#2d6edf" stroke-width="3" stroke-linecap="round"/>
        <g fill="#728198" font-family="DM Sans, sans-serif" font-size="12">
          <text x="10" y="224">0</text><text x="45" y="238">Belum ada event produksi</text>
        </g>
      </svg>
    </div>
  </section>`;
}

function repairAnalytics() {
  const view = pageView("Analitik");
  if (!view) return;
  const error = view.querySelector(".sp37-analytics-host .sp37-error");
  if (!error || repairedAnalytics.has(error)) return;
  const message = error.textContent || "";
  if (!/data analitik belum tersedia|belum ada data|no rows|null/i.test(message)) return;

  repairedAnalytics.add(error);
  error.classList.add("sp43-analytics-zero-state");
  const retry = error.querySelector("button");
  const empty = document.createElement("div");
  empty.innerHTML = emptyAnalyticsMarkup();
  const panel = empty.firstElementChild;
  if (retry) {
    retry.textContent = "Periksa data lagi";
    panel.querySelector("header")?.append(retry);
  }
  error.replaceWith(panel);
}

async function health() {
  if (!domainProbe) {
    domainProbe = fetch(`/api/health?sp43=${Date.now()}`, {
      cache: "no-store",
      headers: { accept: "application/json", "cache-control": "no-cache" },
    }).then((response) => response.ok ? response.json() : {}).catch(() => ({}));
  }
  return domainProbe;
}

async function repairDomainReadiness() {
  const view = pageView("Domain & publikasi");
  if (!view || repairedDomains.has(view)) return;
  const readiness = view.querySelector(".sp37-domain-readiness");
  if (!readiness) return;
  repairedDomains.add(view);

  const state = await health();
  if (state.customDomains !== true) return;
  readiness.remove();
  delete view.dataset.sp37Domain;
  delete view.dataset.sp39DomainReadiness;
  pulse(view);
}

function repairMembers() {
  const view = pageView("Anggota & tim");
  if (!view) return;
  const panel = view.querySelector(".sp37-members-panel");
  if (!panel) return;
  panel.dataset.sp43Responsive = "true";
  const readiness = panel.querySelector(".sp37-member-readiness");
  if (readiness) readiness.setAttribute("role", "status");
}

function repairSettings() {
  document.querySelectorAll(".sn-settings-grid").forEach((grid) => {
    grid.dataset.sp43Responsive = "true";
    [...grid.children].forEach((child) => child.style.removeProperty("width"));
  });
}

function scan() {
  document.documentElement.dataset.studioResponsiveRepairV43 = RELEASE;
  improveSiteIdentity();
  normalizeLayoutBuilder();
  repairAnalytics();
  repairMembers();
  repairSettings();
  repairDomainReadiness();
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(scan);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length || mutation.type === "characterData")) schedule();
}).observe(document.documentElement, { childList: true, subtree: true, characterData: true });

window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });
window.addEventListener("ngeblogging:device-mode", schedule);
scan();
