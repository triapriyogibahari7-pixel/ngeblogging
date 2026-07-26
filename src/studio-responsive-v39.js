import { supabase, supabaseConfigured } from "./lib/supabase.js";
import { ACTIVE_SITE_STORAGE_KEY } from "./lib/studio-data.js";

const RELEASE = "studio-responsive-v39-20260726";
const RETRY_EVENT = "ngeblogging:production-retry-v39";
let frame = 0;
let healthPromise = null;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function activeSiteId() {
  try { return localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) || ""; }
  catch { return ""; }
}

function viewByTitle(title) {
  return [...document.querySelectorAll(".sn-main > .sn-view-pad")]
    .find((view) => view.querySelector(":scope > .sn-page-title h1")?.textContent?.trim() === title) || null;
}

function viewportName() {
  const width = window.innerWidth || document.documentElement.clientWidth || 1280;
  if (width <= 640) return "mobile";
  if (width <= 1024) return "tablet";
  return "desktop";
}

function health(force = false) {
  if (force) healthPromise = null;
  if (!healthPromise) {
    healthPromise = fetch("/api/health", {
      cache: "no-store",
      headers: { accept: "application/json", "cache-control": "no-cache" },
    }).then((response) => response.ok ? response.json() : Promise.reject(new Error(`Health ${response.status}`)))
      .catch(() => ({}));
  }
  return healthPromise;
}

function buttonLabel(button) {
  return button?.querySelector("span")?.textContent?.trim()
    || button?.textContent?.replace(/\s+/g, " ").trim()
    || "";
}

function clickFirstButton(patterns, root = document) {
  const buttons = [...root.querySelectorAll("button:not([disabled]), [role=button]:not([aria-disabled=true])")];
  const target = buttons.find((button) => patterns.some((pattern) => pattern.test(buttonLabel(button))));
  if (!target) return false;
  target.click();
  return true;
}

function openWorkspacePicker() {
  const workspace = document.querySelector(".sn-workspace");
  if (workspace instanceof HTMLElement) {
    workspace.click();
    return true;
  }
  return clickFirstButton([/ganti situs/i, /situs aktif/i, /workspace/i]);
}

function openSiteCreator() {
  openWorkspacePicker();
  window.setTimeout(() => {
    if (clickFirstButton([/tambah situs/i, /buat situs/i, /situs baru/i, /tambahkan situs/i])) return;
    window.dispatchEvent(new CustomEvent("ngeblogging:open-site-creator", { detail: { source: RELEASE } }));
  }, 120);
}

function enhanceActiveSiteCard() {
  const card = document.querySelector(".sp37-active-site");
  if (!card || card.dataset.sp39Actions === "true") return;
  card.dataset.sp39Actions = "true";

  const oldButton = card.querySelector(":scope > button");
  oldButton?.remove();
  const actions = document.createElement("div");
  actions.className = "sp39-site-actions";
  actions.innerHTML = `<button type="button" data-action="switch">Ganti situs</button><button type="button" class="primary" data-action="add">Tambahkan situs</button>`;
  card.append(actions);
  actions.querySelector('[data-action="switch"]')?.addEventListener("click", openWorkspacePicker);
  actions.querySelector('[data-action="add"]')?.addEventListener("click", openSiteCreator);
}

function stateCard(title, message, actions = []) {
  const buttons = actions.map((action) => `<button type="button"${action.primary ? ' class="primary"' : ""} data-sp39-action="${escapeHtml(action.id)}">${escapeHtml(action.label)}</button>`).join("");
  return `<section class="sp39-state-card"><small>NGEblogging Studio</small><h2>${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p>${buttons ? `<div class="sp39-state-actions">${buttons}</div>` : ""}</section>`;
}

function pulseView(view, datasetKey) {
  if (!view) return;
  delete view.dataset[datasetKey];
  const pulse = document.createElement("span");
  pulse.hidden = true;
  pulse.dataset.sp39Pulse = "true";
  view.append(pulse);
  pulse.remove();
}

function bindStateActions(host, handlers) {
  Object.entries(handlers).forEach(([id, handler]) => {
    host.querySelector(`[data-sp39-action="${id}"]`)?.addEventListener("click", handler);
  });
}

function repairMembers() {
  const view = viewByTitle("Anggota & tim");
  if (!view) return;
  const legacyHost = view.querySelector(".sn-members");
  const enhancedHost = view.querySelector(".sp37-members-host");
  const host = enhancedHost || legacyHost;
  if (!host) return;

  if (enhancedHost && enhancedHost.children.length) return;
  if (host.dataset.sp39MembersRepair === "running") return;
  host.dataset.sp39MembersRepair = "running";
  host.innerHTML = stateCard("Memuat anggota situs aktif…", "Daftar anggota dan undangan sedang disinkronkan dari workspace yang sedang dipilih.");
  pulseView(view, "sp37Members");

  window.setTimeout(async () => {
    if (!host.isConnected || host.classList.contains("sp37-members-host") && host.querySelector(".sp37-members-panel")) return;
    const state = await health();
    const siteId = activeSiteId();
    const message = !siteId
      ? "Belum ada situs aktif. Pilih situs terlebih dahulu agar anggota dan perannya dapat dimuat."
      : !supabaseConfigured || !supabase
        ? "Koneksi data anggota belum tersedia pada aplikasi ini."
        : state.memberInvites === true
          ? "Data anggota belum berhasil dimuat. Coba ulangi sinkronisasi tanpa menghapus data tim."
          : "Daftar anggota tetap dapat dibaca. Form undangan email akan muncul hanya setelah layanan email produksi dan uji pengiriman dinyatakan aktif.";
    host.innerHTML = stateCard("Anggota belum selesai dimuat", message, [
      { id: "retry", label: "Coba lagi", primary: true },
      { id: "switch", label: "Ganti situs" },
    ]);
    bindStateActions(host, {
      retry: () => { host.dataset.sp39MembersRepair = ""; pulseView(view, "sp37Members"); scan(); },
      switch: openWorkspacePicker,
    });
  }, 2400);
}

function analyticsHost(view) {
  return view?.querySelector(".sp37-analytics-host") || view?.querySelector(".sn-info-grid") || null;
}

function repairAnalytics() {
  const view = viewByTitle("Analitik");
  if (!view) return;
  const host = analyticsHost(view);
  if (!host) return;
  if (host.querySelector(".sp37-analytics")) return;

  const existingError = host.querySelector(".sp37-error");
  const blank = !host.textContent?.trim() || host.children.length === 0;
  if (!existingError && !blank) return;
  if (host.dataset.sp39AnalyticsRepair === "true") return;
  host.dataset.sp39AnalyticsRepair = "true";

  const errorText = existingError?.querySelector("p")?.textContent?.trim();
  const message = errorText || "Dashboard produksi belum mengembalikan data untuk situs aktif. Data simulasi akan selalu diberi label dan tidak pernah dicampur dengan data produksi.";
  host.innerHTML = stateCard("Analitik belum selesai dimuat", message, [
    { id: "retry", label: "Muat ulang data nyata", primary: true },
    { id: "simulate", label: "Lihat simulasi tampilan" },
    { id: "switch", label: "Ganti situs" },
  ]);
  bindStateActions(host, {
    retry: () => {
      host.dataset.sp39AnalyticsRepair = "";
      pulseView(view, "sp37Analytics");
      window.dispatchEvent(new CustomEvent(RETRY_EVENT, { detail: { target: "analytics" } }));
      scan();
    },
    simulate: () => {
      host.dataset.sp39AnalyticsRepair = "";
      pulseView(view, "sp37Analytics");
      window.setTimeout(() => {
        const simulation = view.querySelector(".sp37-simulation");
        if (simulation) simulation.click();
        else window.dispatchEvent(new CustomEvent("ngeblogging:analytics-simulation-v39"));
      }, 120);
    },
    switch: openWorkspacePicker,
  });
}

function domainMissingText(state) {
  const missing = Array.isArray(state.customDomainMissing) ? state.customDomainMissing : [];
  if (!missing.length) return "Koneksi domain sedang diverifikasi oleh server produksi.";
  return `Binding server yang belum terpasang: ${missing.join(", ")}. Nilai rahasia tidak pernah ditampilkan di browser.`;
}

async function repairDomainReadiness() {
  const view = viewByTitle("Domain & publikasi");
  if (!view || view.dataset.sp39DomainCheck === "running") return;
  const readiness = view.querySelector(".sp37-domain-readiness");
  const host = view.querySelector(".sp37-domain-host");
  if (!readiness && (!host || host.textContent?.trim())) return;
  view.dataset.sp39DomainCheck = "running";
  const state = await health();
  view.dataset.sp39DomainCheck = "done";

  if (state.customDomains === true) {
    pulseView(view, "sp37Domain");
    return;
  }
  const target = view.querySelector(".sp37-domain-readiness") || host;
  if (!target) return;
  target.innerHTML = stateCard(
    "Custom domain menunggu binding produksi",
    domainMissingText(state),
    [
      { id: "retry", label: "Periksa ulang", primary: true },
      { id: "switch", label: "Ganti situs" },
    ],
  );
  bindStateActions(target, {
    retry: async () => {
      view.dataset.sp39DomainCheck = "";
      await health(true);
      pulseView(view, "sp37Domain");
      scan();
    },
    switch: openWorkspacePicker,
  });
}

function tagLayoutBuilder() {
  document.querySelectorAll(".lb36-layer").forEach((layer) => {
    layer.dataset.layoutVersion = "v39";
  });
}

function scan() {
  document.documentElement.dataset.studioResponsiveV39 = RELEASE;
  document.documentElement.dataset.studioViewportV39 = viewportName();
  tagLayoutBuilder();
  enhanceActiveSiteCard();
  repairMembers();
  repairAnalytics();
  repairDomainReadiness();
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(scan);
}

window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });
window.addEventListener(RETRY_EVENT, schedule);
new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule();
}).observe(document.documentElement, { childList: true, subtree: true });

scan();
