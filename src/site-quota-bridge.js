import { supabase, supabaseConfigured } from "./lib/supabase.js";

const attached = new WeakSet();

function quotaText(quota) {
  const current = Number(quota?.current_count || 0);
  const allowed = Number(quota?.allowed_limit || 12);
  const free = Number(quota?.free_limit || 12);
  const maximum = Number(quota?.maximum_limit || 12);
  return `${current} dari ${allowed} situs digunakan · ${free} situs tersedia untuk setiap akun · maksimum ${maximum} situs per akun`;
}

async function loadQuota() {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_site_creation_quota");
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

function apply(manager, quota) {
  const createSection = manager.querySelector(".sn-create-site");
  if (!createSection) return;
  let banner = createSection.querySelector(":scope > .sq-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.className = "sq-banner";
    createSection.prepend(banner);
  }
  const remaining = Number(quota?.remaining || 0);
  const allowed = Number(quota?.allowed_limit || 12);
  banner.innerHTML = `<div><small>KUOTA SITUS AKUN</small><b>${quotaText(quota)}</b><span>Setiap situs memperoleh alamat gratis <code>nama-situs.ngeblogging.com</code>, favicon, tema, tata letak, Posts, Pages, media, dan pengaturannya sendiri.</span></div><i class="${remaining > 0 ? "ready" : "full"}">${remaining > 0 ? `${remaining} tersisa` : "Kuota penuh"}</i>`;
  const createButton = createSection.querySelector(":scope > button.sn-primary");
  if (createButton) {
    createButton.disabled = remaining <= 0;
    createButton.title = remaining <= 0 ? `Batas ${allowed} situs untuk akun ini sudah tercapai.` : `Buat situs baru; ${remaining} slot tersisa.`;
  }
}

async function attach(manager) {
  if (attached.has(manager)) return;
  attached.add(manager);
  try {
    const quota = await loadQuota();
    if (quota) apply(manager, quota);
  } catch (error) {
    console.warn("Site quota unavailable", error);
  }
}

function scan() {
  if (!supabaseConfigured) return;
  document.querySelectorAll(".sn-site-manager").forEach(attach);
}

new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
scan();
