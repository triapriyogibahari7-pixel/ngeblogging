import { supabase } from "./lib/supabase.js";

const ACTIVE_SITE_KEY = "ngeblogging-active-site-id";
const mountedRoots = new WeakSet();
let quota = { count:0, limit:5, loaded:false };
let quotaPromise = null;

async function accessToken() {
  if (!supabase) return "";
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

async function api(path, options = {}) {
  const token = await accessToken();
  const response = await fetch(path, {
    ...options,
    cache: "no-store",
    headers: {
      ...(options.body ? { "content-type":"application/json" } : {}),
      ...(token ? { authorization:`Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Domain belum dapat diproses.");
  return payload;
}

function activeSiteId() {
  try { return localStorage.getItem(ACTIVE_SITE_KEY) || ""; }
  catch { return ""; }
}

function subdomainFromCard(card) {
  const value = card?.querySelector("h2")?.textContent?.trim() || "";
  return value.endsWith(".ngeblogging.com") ? value : "";
}

function escapeHtml(value) {
  return String(value || "").replace(/[<>&"']/g, (character) => ({
    "<":"&lt;", ">":"&gt;", "&":"&amp;", '"':"&quot;", "'":"&#39;",
  }[character]));
}

function statusLabel(status) {
  return ({ active:"Aktif", verifying:"Verifikasi", pending:"Menunggu", failed:"Gagal" })[status] || status || "Menunggu";
}

function dnsRows(domain) {
  const rows = [];
  if (domain.cnameTarget) rows.push({ type:"CNAME", name:domain.hostname, value:domain.cnameTarget });
  if (domain.ownership?.name && domain.ownership?.value) {
    rows.push({ type:String(domain.ownership.type || "TXT").toUpperCase(), name:domain.ownership.name, value:domain.ownership.value });
  }
  for (const record of domain.sslRecords || []) rows.push(record);
  return rows.filter((row) => row.name && row.value);
}

function domainHtml(domain) {
  const records = dnsRows(domain);
  return `<article class="sdm-domain" data-domain-id="${escapeHtml(domain.id)}">
    <div>
      <div class="sdm-domain-head"><b>${escapeHtml(domain.hostname)}</b><span class="sdm-badge ${escapeHtml(domain.status)}">${escapeHtml(statusLabel(domain.status))}</span></div>
      <small>Cloudflare: ${escapeHtml(domain.providerStatus)} · SSL: ${escapeHtml(domain.sslStatus)}</small>
    </div>
    <div class="sdm-actions"><button type="button" data-action="refresh">Periksa ulang</button><button type="button" class="danger" data-action="delete">Hapus</button></div>
    ${records.length ? `<div class="sdm-dns">${records.map((record) => `<div><strong>${escapeHtml(record.type)}</strong><code>${escapeHtml(record.name)} → ${escapeHtml(record.value)}</code></div>`).join("")}</div>` : ""}
    ${domain.errorMessage ? `<div class="sdm-message error">${escapeHtml(domain.errorMessage)}</div>` : ""}
  </article>`;
}

function render(root, state) {
  const publicUrl = state.subdomain ? `https://${state.subdomain}` : "";
  const quotaText = quota.loaded ? `${quota.count} dari ${quota.limit} situs akun digunakan` : "Memeriksa kuota situs…";
  root.innerHTML = `<div class="sdm-header">
      <div><small>DOMAIN SITUS</small><h2>Alamat publik yang nyata dan terverifikasi</h2><p>Setiap situs mendapat subdomain gratis Ngeblogging. Custom domain hanya muncul ketika integrasi Cloudflare for SaaS benar-benar aktif pada server.</p></div>
      <span class="sdm-state ${state.enabled ? "ready" : "warn"}">${state.enabled ? "Custom domain siap" : "Subdomain gratis aktif"}</span>
    </div>
    <div class="sdm-subdomain">
      <span>NB</span>
      <div><b>${escapeHtml(state.subdomain || "Subdomain belum tersedia")}</b><small>${escapeHtml(state.subdomain ? `${quotaText} · HTTPS dan SEO edge tersedia setelah situs diluncurkan` : "Pilih atau buat situs cloud agar subdomain tersedia")}</small></div>
      <div class="sdm-actions">${publicUrl ? `<a href="${escapeHtml(publicUrl)}" target="_blank" rel="noreferrer">Buka situs</a><button type="button" data-action="copy-subdomain">Salin URL</button>` : ""}</div>
    </div>
    ${state.message ? `<div class="sdm-message ${state.error ? "error" : ""}">${escapeHtml(state.message)}</div>` : ""}
    ${state.enabled ? `<div class="sdm-custom">
      <header><div><h3>Custom domain</h3><p>Masukkan domain milik Anda. Ngeblogging membuat custom hostname Cloudflare, lalu menampilkan DNS ownership dan validasi SSL yang benar. Maksimal ${escapeHtml(state.customLimit)} domain per situs.</p></div><span class="sdm-state ready">Cloudflare for SaaS</span></header>
      <form class="sdm-form"><label>Domain<input name="hostname" inputmode="url" autocomplete="off" placeholder="contoh.com atau blog.contoh.com" required></label><button class="primary" type="submit" ${state.busy ? "disabled" : ""}>${state.busy ? "Memproses…" : "Hubungkan domain"}</button></form>
      <div class="sdm-list">${state.loading ? `<div class="sdm-empty">Memuat domain…</div>` : state.domains.length ? state.domains.map(domainHtml).join("") : `<div class="sdm-empty">Belum ada custom domain untuk situs ini.</div>`}</div>
    </div>` : ""}`;
}

async function loadQuota(force = false) {
  if (quotaPromise && !force) return quotaPromise;
  quotaPromise = (async () => {
    try {
      if (!supabase) return quota;
      const { data:{ session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return quota;
      const [sitesResult, profileResult] = await Promise.all([
        supabase.from("sites").select("id", { count:"exact", head:true }).eq("owner_id", session.user.id),
        supabase.from("profiles").select("plan").eq("id", session.user.id).maybeSingle(),
      ]);
      const plan = profileResult.data?.plan || "free";
      quota = { count:sitesResult.count || 0, limit:plan === "pro" ? 25 : 5, loaded:true };
    } catch {
      quota = { ...quota, loaded:true };
    }
    return quota;
  })().finally(() => { quotaPromise = null; });
  return quotaPromise;
}

function applySiteManagerQuota() {
  document.querySelectorAll(".sn-site-manager").forEach((manager) => {
    const createArea = manager.querySelector(".sn-create-site");
    if (!createArea) return;
    let note = createArea.querySelector(".sn-site-limit-note");
    if (!note) {
      note = document.createElement("p");
      note.className = "sn-site-limit-note";
      createArea.querySelector("h3")?.insertAdjacentElement("afterend", note);
    }
    note.textContent = quota.loaded ? `${quota.count}/${quota.limit} situs akun digunakan. Setiap situs mendapat subdomain gratis *.ngeblogging.com.` : "Memeriksa kuota situs akun…";
    const createButton = createArea.querySelector(":scope > button");
    if (createButton && quota.loaded) {
      createButton.dataset.defaultLabel ||= createButton.textContent.trim();
      const blocked = quota.count >= quota.limit;
      createButton.disabled = blocked;
      createButton.dataset.quotaBlocked = String(blocked);
      createButton.textContent = blocked ? `Batas ${quota.limit} situs tercapai` : createButton.dataset.defaultLabel;
    }
  });
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const input = document.createElement("textarea");
  input.value = value;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.append(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}

async function mountDomainManager(card) {
  const launch = card.parentElement?.querySelector(".sn-launch");
  if (!launch || launch.parentElement?.querySelector(":scope > .sdm")) return;
  const root = document.createElement("section");
  root.className = "sdm";
  launch.insertAdjacentElement("afterend", root);
  if (mountedRoots.has(root)) return;
  mountedRoots.add(root);

  const state = {
    siteId:activeSiteId(),
    subdomain:subdomainFromCard(card),
    enabled:false,
    customLimit:5,
    domains:[],
    loading:true,
    busy:false,
    message:"",
    error:false,
  };

  const reload = async () => {
    state.siteId = activeSiteId();
    state.subdomain = subdomainFromCard(card);
    state.loading = true;
    state.message = "";
    state.error = false;
    render(root,state);
    await loadQuota();
    if (!state.siteId) {
      state.loading = false;
      state.message = "ID situs aktif belum tersedia. Pilih workspace cloud terlebih dahulu.";
      state.error = true;
      render(root,state);
      return;
    }
    try {
      const config = await api("/api/domains/config");
      state.enabled = Boolean(config.enabled);
      state.customLimit = Number(config.limit) || 5;
      if (!state.enabled) {
        state.domains = [];
        state.loading = false;
        render(root,state);
        return;
      }
      const payload = await api(`/api/domains?siteId=${encodeURIComponent(state.siteId)}`);
      state.domains = payload.domains || [];
    } catch (error) {
      state.enabled = false;
      state.domains = [];
      state.message = error.message;
      state.error = true;
    } finally {
      state.loading = false;
      render(root,state);
    }
  };

  root.addEventListener("submit", async (event) => {
    if (!event.target.matches(".sdm-form")) return;
    event.preventDefault();
    const hostname = new FormData(event.target).get("hostname");
    state.busy = true; state.message = ""; state.error = false; render(root,state);
    try {
      await api("/api/domains/register", { method:"POST", body:JSON.stringify({ siteId:state.siteId, hostname }) });
      await reload();
      state.message = "Domain didaftarkan. Terapkan record DNS yang ditampilkan lalu periksa ulang sampai status Aktif.";
      render(root,state);
    } catch (error) {
      state.message = error.message; state.error = true;
    } finally {
      state.busy = false; render(root,state);
    }
  });

  root.addEventListener("click", async (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!action) return;
    if (action === "copy-subdomain") {
      try {
        if (state.subdomain) await copyText(`https://${state.subdomain}`);
        state.message = "URL subdomain disalin."; state.error = false;
      } catch {
        state.message = "URL belum dapat disalin otomatis."; state.error = true;
      }
      render(root,state); return;
    }
    const article = event.target.closest("[data-domain-id]");
    const id = article?.dataset.domainId;
    if (!id) return;
    state.busy = true; render(root,state);
    try {
      if (action === "refresh") await api("/api/domains/refresh", { method:"POST", body:JSON.stringify({ id }) });
      if (action === "delete") {
        if (!window.confirm("Hapus custom domain ini dari situs?")) { state.busy = false; render(root,state); return; }
        await api(`/api/domains/${encodeURIComponent(id)}`, { method:"DELETE" });
      }
      await reload();
    } catch (error) {
      state.message = error.message; state.error = true;
    } finally {
      state.busy = false; render(root,state);
    }
  });

  await reload();
}

async function scan() {
  await loadQuota();
  applySiteManagerQuota();
  document.querySelectorAll(".sn-domain-card").forEach((card) => mountDomainManager(card));
}

const observer = new MutationObserver(() => { window.requestAnimationFrame(scan); });
observer.observe(document.documentElement, { childList:true, subtree:true });
scan();

// Refresh quota after a successful site creation changes the workspace list.
document.addEventListener("click", (event) => {
  if (!event.target.closest(".sn-create-site > button")) return;
  window.setTimeout(async () => { await loadQuota(true); applySiteManagerQuota(); }, 1800);
});
