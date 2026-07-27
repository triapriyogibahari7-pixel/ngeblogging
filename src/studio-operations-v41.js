import { loadAnalytics } from "./studio-analytics-v41.js";
import { loadMembers } from "./studio-members-v41.js";
import {
  clearHealthCache,
  currentSiteId,
  escapeHtml,
  openSiteManager,
  pageView,
  RELEASE,
  resolveSiteId,
  supabase,
} from "./studio-operations-v41-shared.js";

const DOMAIN_OWNER = "domain-manager-v78-20260727";
let scanFrame = 0;
let lastSiteId = currentSiteId();

async function enhanceSiteIdentity() {
  const welcome = document.querySelector(".sn-main > .sn-view-pad > .sn-welcome");
  if (!welcome || welcome.dataset.op41IdentityBusy === "true" || welcome.parentElement?.querySelector(":scope > .sp52-site-switcher")) return;
  welcome.dataset.op41IdentityBusy = "true";
  try {
    const siteId = await resolveSiteId();
    if (!siteId || !supabase) return;
    const { data: site, error } = await supabase
      .from("sites")
      .select("id,name,slug,status,is_public,blueprint,description,custom_domain")
      .eq("id", siteId)
      .maybeSingle();
    if (error) throw error;
    if (!site || !welcome.isConnected) return;
    let card = welcome.parentElement?.querySelector(":scope > .sp37-active-site");
    if (!card) {
      card = document.createElement("section");
      welcome.insertAdjacentElement("afterend", card);
    }
    const publicAddress = site.custom_domain || `${site.slug}.ngeblogging.com`;
    card.className = "sp37-active-site op41-active-site";
    card.dataset.op41Site = siteId;
    card.innerHTML = `<div><small>SITUS YANG SEDANG DIKELOLA</small><h2>${escapeHtml(site.name)}</h2><p>${escapeHtml(publicAddress)}</p></div><dl><div><dt>Jenis</dt><dd>${escapeHtml(site.blueprint || "website")}</dd></div><div><dt>Status</dt><dd>${site.status === "active" && site.is_public ? "Publik" : "Draf"}</dd></div><div><dt>Alamat</dt><dd>${escapeHtml(publicAddress)}</dd></div></dl><div class="sp39-site-actions op41-site-actions"><button type="button" data-site-switch>Beralih situs</button><button type="button" class="primary" data-site-create>Tambah situs</button></div>`;
    card.querySelector("[data-site-switch]")?.addEventListener("click", () => openSiteManager("switch"));
    card.querySelector("[data-site-create]")?.addEventListener("click", () => openSiteManager("create"));
  } catch (error) {
    console.error("Studio v41 site identity failed", error);
  } finally {
    delete welcome.dataset.op41IdentityBusy;
  }
}

function updateDescriptions() {
  const analytics = pageView("Analitik")?.querySelector(".sn-page-title p");
  if (analytics) analytics.textContent = "Kunjungan manusia, bot, perangkat, sumber trafik, negara, serta performa Posts dan Pages berdasarkan event produksi nyata.";
  const members = pageView("Anggota & tim")?.querySelector(".sn-page-title p");
  if (members) members.textContent = "Peran, akses, undangan email, kuota, dan jejak kerja untuk situs aktif.";
}

async function scan() {
  document.documentElement.dataset.studioOperationsV41 = RELEASE;
  document.documentElement.dataset.domainOperationsOwner = DOMAIN_OWNER;
  updateDescriptions();
  enhanceSiteIdentity();
  const siteId = currentSiteId();
  const analytics = pageView("Analitik");
  if (analytics && analytics.dataset.op41AnalyticsSite !== siteId && analytics.dataset.op41AnalyticsBusy !== "true") loadAnalytics(analytics, 30, false);
  const members = pageView("Anggota & tim");
  if (members && members.dataset.op41MembersSite !== siteId && members.dataset.op41MembersBusy !== "true") loadMembers(members);
  // Domain sengaja tidak disentuh. Domain Manager v78 adalah satu-satunya pemilik DOM halaman Domain.
}

function schedule() {
  cancelAnimationFrame(scanFrame);
  scanFrame = requestAnimationFrame(scan);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length || mutation.type === "characterData")) schedule();
}).observe(document.documentElement, { childList: true, subtree: true, characterData: true });

window.setInterval(() => {
  const siteId = currentSiteId();
  if (siteId === lastSiteId) return;
  lastSiteId = siteId;
  document.querySelectorAll("[data-op41-analytics-site],[data-op41-members-site]").forEach((view) => {
    delete view.dataset.op41AnalyticsSite;
    delete view.dataset.op41MembersSite;
  });
  clearHealthCache();
  schedule();
}, 800);

if (supabase) supabase.auth.onAuthStateChange(() => schedule());
scan();
