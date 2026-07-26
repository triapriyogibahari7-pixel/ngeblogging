import { supabase, supabaseConfigured } from "./lib/supabase.js";

const MAX_SITES_PER_ACCOUNT = 12;
const attached = new WeakSet();

function quotaNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
}

function capacityText(quota) {
  const current = quotaNumber(quota?.current_count);
  const maximum = quotaNumber(
    quota?.maximum_limit ?? quota?.allowed_limit,
    MAX_SITES_PER_ACCOUNT,
  ) || MAX_SITES_PER_ACCOUNT;

  return `${current.toLocaleString("id-ID")} dari ${maximum.toLocaleString("id-ID")} situs digunakan`;
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

  const current = quotaNumber(quota?.current_count);
  const maximum = quotaNumber(
    quota?.maximum_limit ?? quota?.allowed_limit,
    MAX_SITES_PER_ACCOUNT,
  ) || MAX_SITES_PER_ACCOUNT;
  const remaining = Math.max(0, Math.min(maximum - current, quotaNumber(quota?.remaining, maximum - current)));
  const canCreate = remaining > 0;

  banner.dataset.capacityMode = "twelve-sites";
  banner.innerHTML = `<div><small>KAPASITAS 12 SITUS PER AKUN</small><b>${capacityText({ ...quota, maximum_limit: maximum })}</b><span>Setiap situs mempunyai workspace, subdomain gratis, tema, konten, media, anggota, dan pengelolaan custom domain yang terpisah. Anda masih dapat membuat <strong>${remaining.toLocaleString("id-ID")}</strong> situs.</span></div><i class="${canCreate ? "ready" : "full"}">${canCreate ? `${remaining.toLocaleString("id-ID")} slot tersedia` : "Batas 12 situs tercapai"}</i>`;

  const createButton = createSection.querySelector(":scope > button.sn-primary");
  if (createButton) {
    createButton.disabled = !canCreate;
    createButton.title = canCreate
      ? `Buat situs baru. ${remaining.toLocaleString("id-ID")} dari ${maximum.toLocaleString("id-ID")} slot masih tersedia.`
      : "Akun ini telah mencapai batas 12 situs.";
  }

  createSection.querySelectorAll("input, select, textarea").forEach((field) => {
    field.disabled = !canCreate;
  });
}

async function attach(manager) {
  if (attached.has(manager)) return;
  attached.add(manager);

  try {
    const quota = await loadQuota();
    if (quota) apply(manager, quota);
  } catch (error) {
    console.warn("Site capacity unavailable", error);
  }
}

function scan() {
  if (!supabaseConfigured) return;
  document.querySelectorAll(".sn-site-manager").forEach(attach);
}

new MutationObserver(scan).observe(document.documentElement, {
  childList: true,
  subtree: true,
});

scan();
