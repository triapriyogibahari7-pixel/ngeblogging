import { supabase, supabaseConfigured } from "./lib/supabase.js";
import {
  ACTIVE_SITE_STORAGE_KEY,
  listUserSites,
} from "./lib/studio-data.js";

const RELEASE = "domain-free-subdomain-recovery-v73-20260727";
const SITE_TIMEOUT_MS = 8_000;
const CACHE_MS = 30_000;
let frame = 0;
let cachedSite = null;
let cachedSiteId = "";
let cacheExpiresAt = 0;
let pendingSite = null;

function activeSiteId() {
  try {
    return localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function validSlug(value) {
  const slug = String(value || "").trim().toLowerCase();
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug) ? slug : "";
}

function validSite(value) {
  if (!value || typeof value !== "object") return null;
  const id = String(value.id || "").trim();
  const slug = validSlug(value.slug);
  if (!id || !slug) return null;
  return {
    ...value,
    id,
    slug,
    status: String(value.status || "draft"),
    is_public: value.is_public === true,
  };
}

function runtimeSite() {
  const site = validSite(window.__ngebloggingActiveSite);
  const preferredId = activeSiteId();
  if (!site) return null;
  return !preferredId || site.id === preferredId ? site : null;
}

function publishSite(site) {
  const safe = validSite(site);
  if (!safe) return null;
  cachedSite = safe;
  cachedSiteId = safe.id;
  cacheExpiresAt = Date.now() + CACHE_MS;
  window.__ngebloggingActiveSite = safe;
  document.documentElement.dataset.activeSiteId = safe.id;
  document.documentElement.dataset.activeSiteSlug = safe.slug;
  document.documentElement.dataset.freeSubdomainRecovery = RELEASE;
  window.dispatchEvent(new CustomEvent("ngeblogging:active-site-ready", { detail: safe }));
  return safe;
}

function timeout(promise, milliseconds, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error(message), { code: "SITE_CONTEXT_TIMEOUT" })), milliseconds);
    }),
  ]).finally(() => clearTimeout(timer));
}

async function resolveSite(force = false) {
  const preferredId = activeSiteId();
  const current = runtimeSite();
  if (current && !force) return publishSite(current);
  if (!force && cachedSite && (!preferredId || cachedSiteId === preferredId) && Date.now() < cacheExpiresAt) return cachedSite;
  if (pendingSite && !force) return pendingSite;
  if (!supabaseConfigured || !supabase) throw new Error("Penyimpanan cloud belum dikonfigurasi.");

  pendingSite = timeout((async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const userId = data.session?.user?.id;
    if (!userId) throw new Error("Silakan masuk kembali untuk memuat subdomain gratis.");
    const sites = await listUserSites(userId);
    const selected = sites.find((site) => site.id === preferredId) || sites[0] || null;
    if (!selected) throw new Error("Buat situs terlebih dahulu untuk memperoleh subdomain gratis.");
    return publishSite(selected);
  })(), SITE_TIMEOUT_MS, "Data situs terlalu lama dimuat. Subdomain akan dicoba kembali otomatis.")
    .finally(() => { pendingSite = null; });

  return pendingSite;
}

function freeHostname(site) {
  return `${site.slug}.ngeblogging.com`;
}

function setText(node, value) {
  if (node && node.textContent !== value) node.textContent = value;
}

function ensurePreviewLink(root, site) {
  const header = root.querySelector(":scope .dfz-title");
  if (!header) return;
  let link = header.querySelector(":scope > a[data-free-subdomain-preview]");
  if (!link) {
    link = document.createElement("a");
    link.dataset.freeSubdomainPreview = RELEASE;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "Preview situs";
    header.append(link);
  }
  const href = `https://${freeHostname(site)}?ngeblogging-free-preview=1`;
  if (link.href !== href) link.href = href;
}

function applySite(root, site) {
  const safe = validSite(site);
  if (!root?.isConnected || !safe) return false;
  const card = root.querySelector(":scope .dfz-free-card");
  if (!card) return false;
  const hostname = freeHostname(safe);
  const heading = card.querySelector("h2");
  const description = card.querySelector("p");
  const badge = card.querySelector(".dfz-free-actions > i");
  const published = safe.is_public && safe.status === "active";
  const descriptionText = published
    ? "Subdomain gratis aktif permanen dan tetap tersedia meskipun domain pribadi dipasang."
    : "Subdomain gratis sudah tersedia. Terbitkan situs agar dapat dibuka oleh pengunjung.";
  setText(heading, hostname);
  setText(description, descriptionText);
  if (badge) {
    setText(badge, published ? "Aktif" : "Draf");
    const className = published ? "active" : "draft";
    if (badge.className !== className) badge.className = className;
  }
  card.dataset.freeSubdomainPersistent = RELEASE;
  card.dataset.siteId = safe.id;
  card.dataset.siteSlug = safe.slug;
  ensurePreviewLink(root, safe);
  return true;
}

function showResolvingState(root) {
  const heading = root?.querySelector(":scope .dfz-free-card h2");
  if (heading && (!heading.textContent.trim() || heading.textContent.trim() === "Belum tersedia")) {
    heading.textContent = "Memuat subdomain gratis…";
  }
}

async function reconcile(force = false) {
  const root = document.querySelector(".dfz-root");
  if (!root?.isConnected) return;
  const current = runtimeSite() || cachedSite;
  if (current) applySite(root, current);
  else showResolvingState(root);
  try {
    const site = await resolveSite(force);
    applySite(root, site);
  } catch (error) {
    showResolvingState(root);
    root.dataset.freeSubdomainRecoveryError = String(error?.code || "SITE_CONTEXT_UNAVAILABLE");
  }
}

function schedule(force = false) {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => reconcile(force));
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule(false);
}).observe(document.documentElement, { childList: true, subtree: true });

window.addEventListener("pageshow", () => schedule(true));
window.addEventListener("ngeblogging:active-site-change", (event) => {
  const site = publishSite(event.detail);
  if (site) schedule(false);
});
window.addEventListener("storage", (event) => {
  if (event.key !== ACTIVE_SITE_STORAGE_KEY) return;
  cachedSite = null;
  cachedSiteId = "";
  cacheExpiresAt = 0;
  schedule(true);
});

document.addEventListener("click", (event) => {
  if (event.target.closest(".sn-workspace, .sn-sites-list button, [data-action='reload']")) {
    setTimeout(() => schedule(true), 0);
  }
}, true);

schedule(true);
