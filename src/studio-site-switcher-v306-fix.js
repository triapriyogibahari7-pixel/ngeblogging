import "./studio-site-switcher-v306-fix.css";
import { supabase, supabaseConfigured } from "./lib/supabase.js";
import { ACTIVE_SITE_STORAGE_KEY, setActiveSiteId } from "./lib/studio-data.js";
import { getVerifiedSession } from "./lib/auth-session-v76.js";
import { listUserSitesStartupV292 } from "./studio-startup-v292.js";

export const STUDIO_SITE_SWITCHER_FIX_RELEASE_V306 = "studio-site-switcher-layout-delete-v306-20260805";

const SNAPSHOT_KEYS = [
  "ngeblogging-active-site-snapshot-v292",
  "ngeblogging-active-site-snapshot-v209",
  "ngeblogging-active-site-snapshot-v208",
  "ngeblogging-active-site-snapshot-v205",
  "ngeblogging-active-site-snapshot-v198",
  "ngeblogging-active-site-snapshot-v195",
  "ngeblogging-active-site-snapshot-v192",
];
const deletedIds = new Set();
let frame = 0;
let legacyLoadToken = 0;

function activeSiteId() {
  const live = window.__ngebloggingActiveSite?.id;
  if (live) return String(live);
  const dataset = document.documentElement.dataset.activeSiteId;
  if (dataset) return String(dataset);
  try { return localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) || ""; }
  catch { return ""; }
}

function clearActiveSitePointers() {
  setActiveSiteId("");
  try { SNAPSHOT_KEYS.forEach((key) => localStorage.removeItem(key)); } catch { /* storage can be unavailable */ }
  window.__ngebloggingActiveSite = null;
  delete document.documentElement.dataset.activeSiteId;
  delete document.documentElement.dataset.activeSiteSlug;
}

async function currentUserId() {
  const handed = window.__ngebloggingVerifiedSession;
  if (handed?.user?.id) return handed.user.id;
  const verified = await getVerifiedSession();
  if (verified?.user?.id) return verified.user.id;
  throw Object.assign(new Error("Sesi akun belum siap. Coba lagi tanpa keluar dari akun."), {
    code: "SITE_DELETE_SESSION_NOT_READY",
  });
}

function switcherStatus(message, state = "idle") {
  const node = document.querySelector(".sn-site-switcher-v305 [data-site-switcher-status]");
  if (!node) return;
  node.textContent = message;
  node.dataset.state = state;
}

function legacyToast(message) {
  const existing = document.querySelector(".sn-toast");
  if (existing) {
    existing.textContent = message;
    return;
  }
  console.info(message);
}

async function fetchOwnedSite(siteId) {
  if (!supabaseConfigured || !supabase) throw new Error("Koneksi data situs belum tersedia.");
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("sites")
    .select("id,name,slug,owner_id,status,is_public")
    .eq("id", siteId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error("Situs tidak ditemukan atau sudah dihapus.");
  if (String(data.owner_id || "") !== String(userId)) {
    throw new Error("Hanya pemilik situs yang dapat menghapus situs ini.");
  }
  return { site: data, userId };
}

async function deleteOwnedSite(siteId, button) {
  if (!siteId || button?.disabled) return null;
  button.disabled = true;
  const original = button.textContent;
  button.textContent = "Menghapus…";
  try {
    const { site, userId } = await fetchOwnedSite(siteId);
    const confirmed = window.confirm(
      `Hapus situs “${site.name || site.slug || "tanpa nama"}”?\n\nSemua konten dan data yang mengikuti situs ini dapat ikut terhapus. Tindakan ini tidak dapat dibatalkan.`,
    );
    if (!confirmed) return null;

    const { data, error } = await supabase
      .from("sites")
      .delete()
      .eq("id", site.id)
      .eq("owner_id", userId)
      .select("id");
    if (error) throw error;
    const deleted = Array.isArray(data) && data.some((row) => String(row?.id) === String(site.id));
    if (!deleted) throw new Error("Situs tidak terhapus. Pastikan akun ini adalah pemilik situs.");

    deletedIds.add(String(site.id));
    const wasActive = String(activeSiteId()) === String(site.id);
    if (wasActive) clearActiveSitePointers();
    window.dispatchEvent(new CustomEvent("ngeblogging:site-deleted-v306", {
      detail: { siteId: site.id, siteName: site.name, wasActive, release: STUDIO_SITE_SWITCHER_FIX_RELEASE_V306 },
    }));
    return { site, wasActive };
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

function requireFirstSite() {
  clearActiveSitePointers();
  document.querySelector(".sn-site-switcher-v305 [data-site-switcher-close]")?.click();
  document.querySelector(".sn-site-manager>header>button")?.click();
  window.dispatchEvent(new CustomEvent("ngeblogging:first-site-required-v305", {
    detail: { release: STUDIO_SITE_SWITCHER_FIX_RELEASE_V306 },
  }));
}

async function deleteFromV305(row, button) {
  const siteId = String(row?.dataset?.siteId || "").trim();
  if (!siteId) return;
  try {
    switcherStatus("Menghapus situs…", "loading");
    const result = await deleteOwnedSite(siteId, button);
    if (!result) {
      switcherStatus("Penghapusan dibatalkan.", "ready");
      return;
    }

    const alternatives = [...document.querySelectorAll(".sn-site-switcher-v305-row")]
      .filter((candidate) => candidate !== row && !deletedIds.has(String(candidate.dataset.siteId || "")));
    row.remove();

    if (result.wasActive) {
      const next = alternatives[0]?.querySelector(".site-actions button.primary,.site-actions button.current");
      if (next) {
        switcherStatus(`Situs “${result.site.name}” dihapus. Membuka situs berikutnya…`, "ready");
        next.click();
        return;
      }
      requireFirstSite();
      return;
    }

    switcherStatus(`Situs “${result.site.name}” berhasil dihapus.`, "ready");
    window.setTimeout(() => document.querySelector(".sn-site-switcher-v305 [data-site-switcher-refresh]")?.click(), 0);
  } catch (error) {
    console.error("Delete site v306 failed", error);
    switcherStatus(error?.message || "Situs belum dapat dihapus.", "error");
  }
}

function decorateV305() {
  const rows = document.querySelectorAll(".sn-site-switcher-v305-row");
  rows.forEach((row) => {
    const siteId = String(row.dataset.siteId || "");
    if (!siteId || deletedIds.has(siteId)) {
      if (deletedIds.has(siteId)) row.remove();
      return;
    }
    const meta = row.querySelector(".site-copy p")?.textContent || "";
    const owner = /(^|·|\s)Pemilik($|·|\s)/i.test(meta);
    const actions = row.querySelector(".site-actions");
    if (!owner || !actions || actions.querySelector(".site-delete-v306,[data-site-delete-v306]")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "site-delete-v306";
    button.textContent = "Hapus situs";
    button.setAttribute("aria-label", `Hapus ${row.querySelector(".site-heading-line b")?.textContent || "situs"}`);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      deleteFromV305(row, button);
    });
    actions.append(button);
  });
}

function legacySlug(row) {
  const text = row?.querySelector("small")?.textContent || "";
  const match = text.match(/([a-z0-9-]+)\.ngeblogging\.com/i);
  return match?.[1]?.toLowerCase() || "";
}

async function decorateLegacy() {
  const manager = document.querySelector(".sn-modal-layer .sn-site-manager");
  if (!manager) return;
  manager.dataset.siteSwitcherFixV306 = STUDIO_SITE_SWITCHER_FIX_RELEASE_V306;
  const token = ++legacyLoadToken;
  try {
    const userId = await currentUserId();
    const rows = await listUserSitesStartupV292(userId);
    if (token !== legacyLoadToken || !manager.isConnected) return;
    const bySlug = new Map((rows || []).filter(Boolean).map((site) => [String(site.slug || "").toLowerCase(), site]));
    manager.querySelectorAll(".sn-sites-list article").forEach((row) => {
      const site = bySlug.get(legacySlug(row));
      if (!site?.id) return;
      row.dataset.siteId = String(site.id);
      if (deletedIds.has(String(site.id))) {
        row.remove();
        return;
      }
      if (String(site.role || "").toLowerCase() !== "owner" || row.querySelector(".site-delete-v306,[data-site-delete-v306]")) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "site-delete-v306";
      button.textContent = "Hapus situs";
      button.setAttribute("aria-label", `Hapus ${site.name || "situs"}`);
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        try {
          const result = await deleteOwnedSite(String(site.id), button);
          if (!result) return;
          const alternatives = [...manager.querySelectorAll(".sn-sites-list article")]
            .filter((candidate) => candidate !== row && !deletedIds.has(String(candidate.dataset.siteId || "")));
          row.remove();
          legacyToast(`Situs “${result.site.name}” berhasil dihapus.`);
          if (result.wasActive) {
            const nextManage = alternatives[0]?.querySelector("button:not(.site-delete-v306):not([data-site-delete-v306])");
            if (nextManage) nextManage.click();
            else requireFirstSite();
          }
        } catch (error) {
          console.error("Legacy delete site v306 failed", error);
          legacyToast(error?.message || "Situs belum dapat dihapus.");
        }
      });
      row.append(button);
    });
  } catch (error) {
    console.warn("Legacy site manager v306 could not be decorated", error);
  }
}

function decorateAll() {
  frame = 0;
  document.documentElement.dataset.studioSiteSwitcherFixV306 = STUDIO_SITE_SWITCHER_FIX_RELEASE_V306;
  decorateV305();
  decorateLegacy();
}

function scheduleDecorate() {
  if (frame) return;
  frame = requestAnimationFrame(decorateAll);
}

function relevantInteraction(target) {
  return target?.closest?.([
    ".sn-workspace",
    ".sn-profile-menu-v298 button[data-profile-action='switch-site']",
    ".sn-profile-menu-v295 button[data-profile-action='switch-site']",
    ".sn-site-switcher-v305",
    ".sn-site-manager",
  ].join(","));
}

function onClick(event) {
  if (!relevantInteraction(event.target)) return;
  scheduleDecorate();
  window.setTimeout(scheduleDecorate, 50);
}

function onInput(event) {
  if (!event.target?.closest?.(".sn-site-switcher-v305,.sn-site-manager")) return;
  scheduleDecorate();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.documentElement.dataset.studioSiteSwitcherFixV306 = STUDIO_SITE_SWITCHER_FIX_RELEASE_V306;
  window.addEventListener("click", onClick, false);
  window.addEventListener("input", onInput, false);
  window.addEventListener("pageshow", scheduleDecorate, { passive: true });
  window.addEventListener("ngeblogging:open-site-switcher", () => window.setTimeout(scheduleDecorate, 0));
  window.addEventListener("ngeblogging:site-created-v303", () => window.setTimeout(scheduleDecorate, 0));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scheduleDecorate, { once: true });
  else scheduleDecorate();
}
