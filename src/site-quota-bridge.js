import { supabase, supabaseConfigured } from "./lib/supabase.js";

const attached = new WeakSet();

function capacityText(quota) {
  const current = Math.max(0, Number(quota?.current_count || 0));
  return current === 0
    ? "Workspace siap untuk situs pertama"
    : `${current.toLocaleString("id-ID")} situs sedang dikelola`;
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
  const remaining = Math.max(0, Number(quota?.remaining || 0));
  const canCreate = remaining > 0;
  banner.dataset.capacityMode = "dynamic";
  banner.innerHTML = `<div><small>KAPASITAS SITUS DINAMIS</small><b>${capacityText(quota)}</b><span>Setiap situs mempunyai subdomain gratis <code>nama-situs.ngeblogging.com</code>, favicon, tema, tata letak, Posts, Pages, media, analitik, anggota, domain, dan pengaturan terpisah. Kapasitas dikelola oleh server dan dapat diperluas sesuai kebutuhan akun.</span></div><i class="${canCreate ? "ready" : "full"}">${canCreate ? "Siap ditambah" : "Perlu perluasan"}</i>`;
  const createButton = createSection.querySelector(":scope > button.sn-primary");
  if (createButton) {
    createButton.disabled = !canCreate;
    createButton.title = canCreate
      ? "Buat situs baru dengan workspace dan subdomain terpisah."
      : "Kapasitas akun saat ini telah terpakai dan perlu diperluas.";
  }
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

new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
scan();
