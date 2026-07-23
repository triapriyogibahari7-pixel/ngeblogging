import { supabase, supabaseConfigured } from "./lib/supabase.js";
import { ACTIVE_SITE_STORAGE_KEY } from "./lib/studio-data.js";

const attached = new WeakSet();

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function activeSiteId() {
  try { return localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) || ""; }
  catch { return ""; }
}

async function token() {
  if (!supabase) return "";
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

async function request(path, body = null) {
  const accessToken = await token();
  const response = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || "Permintaan domain belum berhasil."), { code: data.code, status: response.status, data });
  return data;
}

function statusLabel(domain) {
  if (domain.status === "active" && domain.ssl_status === "active") return "Aktif";
  if (domain.status === "failed") return "Gagal";
  if (domain.ssl_status === "active") return "Menunggu hostname";
  return "Verifikasi";
}

function dnsRows(domain, cnameTarget) {
  const rows = [];
  if (cnameTarget) rows.push({ type: "CNAME", name: domain.hostname, value: cnameTarget, purpose: "Arahkan trafik" });
  const ownership = domain.ownership_verification || {};
  if (ownership.name && ownership.value) rows.push({ type: ownership.type || "TXT", name: ownership.name, value: ownership.value, purpose: "Verifikasi kepemilikan" });
  for (const record of Array.isArray(domain.ssl_validation) ? domain.ssl_validation : []) {
    const type = record.type || (record.cname ? "CNAME" : "TXT");
    const name = record.txt_name || record.cname || record.name;
    const value = record.txt_value || record.cname_target || record.value;
    if (name && value && !rows.some((item) => item.type === type && item.name === name && item.value === value)) rows.push({ type, name, value, purpose: "Validasi sertifikat HTTPS" });
  }
  return rows;
}

function renderDomain(domain, cnameTarget) {
  const rows = dnsRows(domain, cnameTarget);
  const ready = domain.status === "active" && domain.ssl_status === "active";
  return `<article class="dm-domain ${ready ? "active" : "pending"}" data-domain-id="${escapeHtml(domain.id)}">
    <header><div><small>CUSTOM DOMAIN</small><h3>${escapeHtml(domain.hostname)}</h3></div><i>${escapeHtml(statusLabel(domain))}</i></header>
    <p>${ready ? "Domain dan sertifikat HTTPS sudah aktif." : "Tambahkan catatan DNS berikut, lalu tekan Periksa status."}</p>
    ${rows.length ? `<div class="dm-dns-table">${rows.map((row) => `<div><b>${escapeHtml(row.type)}</b><span><small>${escapeHtml(row.purpose)}</small><code>${escapeHtml(row.name)}</code><code>${escapeHtml(row.value)}</code></span><button type="button" data-copy="${escapeHtml(row.value)}">Salin nilai</button></div>`).join("")}</div>` : ""}
    ${domain.error_message ? `<p class="dm-error">${escapeHtml(domain.error_message)}</p>` : ""}
    <footer><a href="https://${escapeHtml(domain.hostname)}" target="_blank" rel="noreferrer">Buka domain</a><button type="button" data-action="refresh">Periksa status</button><button type="button" class="danger" data-action="remove">Hapus</button></footer>
  </article>`;
}

function render(container, state) {
  const { loading, error, config, domains, siteId } = state;
  if (loading) {
    container.innerHTML = `<section class="dm-panel"><div class="dm-loading">Memeriksa domain produksi…</div></section>`;
    return;
  }
  if (error) {
    container.innerHTML = `<section class="dm-panel"><header><div><small>DOMAIN CUSTOM</small><h2>Pengelolaan domain belum dapat dimuat</h2></div></header><p class="dm-error">${escapeHtml(error)}</p><button type="button" class="dm-retry">Coba lagi</button></section>`;
    return;
  }
  if (!config?.enabled) {
    container.innerHTML = `<section class="dm-panel dm-disabled"><header><div><small>DOMAIN CUSTOM</small><h2>Belum dibuka untuk produksi</h2></div><i>Aman</i></header><p>Form domain, tombol aktivasi, dan instruksi DNS disembunyikan sampai Cloudflare for SaaS, target CNAME, token server, dan penyimpanan domain benar-benar siap. Subdomain gratis tetap tersedia.</p></section>`;
    return;
  }
  container.innerHTML = `<section class="dm-panel"><header><div><small>DOMAIN CUSTOM</small><h2>Hubungkan domain milik Anda</h2><p>Masukkan hostname seperti <b>blog.contoh.com</b>. Jangan masukkan protokol atau path.</p></div><i>Cloudflare siap</i></header>
    <form class="dm-form"><label>Nama domain<input name="hostname" required inputmode="url" autocomplete="off" spellcheck="false" placeholder="blog.contoh.com"/></label><button type="submit">Tambahkan domain</button></form>
    <div class="dm-target"><span>Target CNAME Ngeblogging</span><code>${escapeHtml(config.cnameTarget || "")}</code><button type="button" data-copy="${escapeHtml(config.cnameTarget || "")}">Salin</button></div>
    <div class="dm-list">${domains.length ? domains.map((domain) => renderDomain(domain, config.cnameTarget)).join("") : `<div class="dm-empty"><h3>Belum ada custom domain</h3><p>Subdomain gratis tetap aktif. Tambahkan domain hanya ketika DNS-nya dapat Anda kelola.</p></div>`}</div>
    <input type="hidden" value="${escapeHtml(siteId)}"/>
  </section>`;
}

async function load(state, container) {
  const siteId = activeSiteId();
  state.loading = true;
  state.error = "";
  state.siteId = siteId;
  render(container, state);
  if (!siteId) {
    state.loading = false;
    state.error = "Pilih situs aktif terlebih dahulu.";
    render(container, state);
    return;
  }
  try {
    const data = await request(`/api/domains/list?siteId=${encodeURIComponent(siteId)}`);
    state.config = { enabled: data.enabled, cnameTarget: data.cnameTarget, missing: data.missing || [] };
    state.domains = data.domains || [];
  } catch (error) {
    if (error.status === 503 && error.data) {
      state.config = { enabled: false, cnameTarget: error.data.cnameTarget || "", missing: error.data.missing || [] };
      state.domains = [];
    } else {
      state.error = error.message;
    }
  } finally {
    state.loading = false;
    render(container, state);
  }
}

function announce(message) {
  const toast = document.querySelector(".sn-toast");
  if (toast) toast.lastChild.textContent = message;
}

function attach(card) {
  if (attached.has(card)) return;
  attached.add(card);
  const page = card.closest(".sn-view-pad");
  if (!page) return;
  card.dataset.domainEnhanced = "true";
  const container = document.createElement("div");
  container.className = "dm-root";
  card.insertAdjacentElement("afterend", container);
  const state = { loading: true, error: "", config: null, domains: [], siteId: "" };

  container.addEventListener("click", async (event) => {
    const retry = event.target.closest(".dm-retry");
    if (retry) { await load(state, container); return; }
    const copy = event.target.closest("[data-copy]");
    if (copy) {
      try { await navigator.clipboard.writeText(copy.dataset.copy || ""); copy.textContent = "Tersalin"; setTimeout(() => { copy.textContent = "Salin"; }, 1200); }
      catch { announce("Nilai belum dapat disalin"); }
      return;
    }
    const action = event.target.closest("[data-action]");
    if (!action) return;
    const article = action.closest("[data-domain-id]");
    const domainId = article?.dataset.domainId;
    if (!domainId) return;
    action.disabled = true;
    try {
      if (action.dataset.action === "remove") {
        if (!window.confirm("Hapus custom domain ini dari Ngeblogging dan Cloudflare?")) return;
        await request("/api/domains/remove", { domainId });
      } else {
        await request("/api/domains/refresh", { domainId });
      }
      await load(state, container);
    } catch (error) {
      announce(error.message);
      action.disabled = false;
    }
  });

  container.addEventListener("submit", async (event) => {
    const form = event.target.closest(".dm-form");
    if (!form) return;
    event.preventDefault();
    const button = form.querySelector("button[type=submit]");
    const hostname = new FormData(form).get("hostname");
    button.disabled = true;
    button.textContent = "Menambahkan…";
    try {
      await request("/api/domains/register", { siteId: state.siteId, hostname });
      form.reset();
      await load(state, container);
    } catch (error) {
      announce(error.message);
      button.disabled = false;
      button.textContent = "Tambahkan domain";
    }
  });

  load(state, container);
}

function scan() {
  if (!supabaseConfigured) return;
  document.querySelectorAll(".sn-domain-card:not([data-domain-enhanced])").forEach(attach);
}

new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
scan();
