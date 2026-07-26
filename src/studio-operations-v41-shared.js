import { supabase, supabaseConfigured } from "./lib/supabase.js";
import { ACTIVE_SITE_STORAGE_KEY } from "./lib/studio-data.js";

export { supabase, supabaseConfigured };
export const RELEASE = "studio-operations-v41-20260726";
export const ROLE_LABEL = { owner:"Pemilik", admin:"Admin", editor:"Editor", author:"Penulis", contributor:"Kontributor", viewer:"Pengamat" };

let healthCache = { at:0, value:null };

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[character]));
}

export function formatNumber(value) {
  return Number(value || 0).toLocaleString("id-ID");
}

export function formatDate(value, includeTime = false) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", includeTime ? { dateStyle:"medium", timeStyle:"short" } : { dateStyle:"medium" }).format(date);
}

export function currentSiteId() {
  try { return localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) || ""; }
  catch { return ""; }
}

export function saveSiteId(siteId) {
  if (!siteId) return;
  try { localStorage.setItem(ACTIVE_SITE_STORAGE_KEY, siteId); } catch {}
}

export async function session() {
  if (!supabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session || null;
}

export async function resolveSiteId() {
  const existing = currentSiteId();
  if (existing) return existing;
  const activeSession = await session();
  if (!activeSession?.user?.id) return "";
  const { data, error } = await supabase
    .from("site_members")
    .select("site_id,joined_at")
    .eq("user_id", activeSession.user.id)
    .order("joined_at", { ascending:true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data?.site_id) saveSiteId(data.site_id);
  return data?.site_id || "";
}

export async function api(path, body = null) {
  const activeSession = await session();
  const token = activeSession?.access_token || "";
  const response = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: {
      accept:"application/json",
      ...(body ? { "content-type":"application/json" } : {}),
      ...(token ? { authorization:`Bearer ${token}` } : {}),
    },
    ...(body ? { body:JSON.stringify(body) } : {}),
    cache:"no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || `Permintaan gagal (${response.status}).`);
  return data;
}

export async function health(force = false) {
  if (!force && healthCache.value && Date.now() - healthCache.at < 15_000) return healthCache.value;
  const response = await fetch(`/api/health?release=${Date.now()}`, {
    cache:"no-store",
    headers:{ accept:"application/json", "cache-control":"no-cache" },
  });
  const value = response.ok ? await response.json() : {};
  healthCache = { at:Date.now(), value };
  return value;
}

export function clearHealthCache() {
  healthCache = { at:0, value:null };
}

export function pageView(title) {
  return [...document.querySelectorAll(".sn-main > .sn-view-pad")]
    .find((view) => view.querySelector(":scope > .sn-page-title h1")?.textContent?.trim() === title) || null;
}

export function openSiteManager(mode = "switch") {
  document.querySelector(".sn-workspace")?.click();
  if (mode !== "create") return;
  let attempts = 0;
  const focus = () => {
    const input = document.querySelector(".sn-site-manager .sn-create-site input");
    if (input) {
      input.focus();
      input.scrollIntoView({ behavior:"smooth", block:"center" });
      return;
    }
    if (attempts++ < 24) window.setTimeout(focus, 80);
  };
  focus();
}
