import { api, escapeHtml, health, resolveSiteId } from "./studio-operations-v41-shared.js";

function dnsRows(domain, cnameTarget) {
  const rows = [];
  if (cnameTarget) rows.push({ label:"1 · Arahkan trafik", type:"CNAME", name:domain.hostname, value:cnameTarget, note:"Gunakan @ bila panel DNS meminta nama host singkat untuk domain utama." });
  const ownership = domain.ownership_verification || {};
  if (ownership.name && ownership.value) rows.push({ label:"2 · Verifikasi kepemilikan", type:ownership.type || "TXT", name:ownership.name, value:ownership.value, note:"Catatan resmi untuk membuktikan kepemilikan domain." });
  for (const record of Array.isArray(domain.ssl_validation) ? domain.ssl_validation : []) {
    const name = record.txt_name || record.cname || record.name;
    const value = record.txt_value || record.cname_target || record.value;
    if (name && value) rows.push({ label:"Tambahan · Validasi HTTPS", type:record.type || (record.cname ? "CNAME" : "TXT"), name, value, note:"Hanya muncul bila sertifikat HTTPS memerlukan validasi tambahan." });
  }
  return rows;
}

function domainItems(domains, cnameTarget) {
  if (!domains.length) return `<div class="op41-state"><b>Belum ada custom domain</b><span>Masukkan domain.com, domain.id, domain.my.id, domain.web.id, atau TLD valid lainnya pada form di atas.</span></div>`;
  return domains.map((domain) => {
    const active = domain.status === "active" && domain.ssl_status === "active";
    const rows = dnsRows(domain, cnameTarget).map((row) => `<div><span><b>${escapeHtml(row.label)}</b><small>${escapeHtml(row.note)}</small></span><code>${escapeHtml(row.type)}</code><code>${escapeHtml(row.name)}</code><code>${escapeHtml(row.value)}</code><button type="button" class="op41-button" data-copy="${escapeHtml(row.value)}">Salin</button></div>`).join("") || "<p>Cloudflare sedang menyiapkan catatan DNS.</p>";
    return `<article class="op41-domain" data-domain-id="${escapeHtml(domain.id)}"><header><div><small class="op41-kicker">CUSTOM DOMAIN</small><h3>${escapeHtml(domain.hostname)}</h3></div><i class="op41-domain-status${active ? " active" : ""}">${active ? "Aktif" : "Perlu verifikasi"}</i></header><div class="op41-dns-wrap"><div class="op41-dns">${rows}</div></div><footer><a class="op41-button" href="https://${escapeHtml(domain.hostname)}" target="_blank" rel="noreferrer">Buka domain</a><button type="button" class="op41-button" data-domain-action="refresh">Periksa status</button><button type="button" class="op41-button" data-domain-action="remove">Hapus</button></footer></article>`;
  }).join("");
}

function hostFor(view) {
  let host = view.querySelector(":scope > .op41-host[data-surface='domains'], :scope > .sp37-domain-host");
  if (!host) {
    host = document.createElement("section");
    const launch = view.querySelector(":scope > .sn-launch");
    if (launch) launch.insertAdjacentElement("afterend", host);
    else view.append(host);
  }
  host.className = "op41-host";
  host.dataset.surface = "domains";
  return host;
}

function readinessMarkup(state) {
  const bindings = state.customDomainBindings || {};
  const rows = [
    ["CLOUDFLARE_API_TOKEN", bindings.apiToken],
    ["CLOUDFLARE_ZONE_ID", bindings.zoneId],
    ["CLOUDFLARE_CUSTOM_HOSTNAME_TARGET", bindings.cnameTarget],
    ["SUPABASE JWT + ROW LEVEL SECURITY", bindings.databaseAccess],
    ["CLOUDFLARE CUSTOM HOSTNAMES API", bindings.customHostnamesApi],
  ];
  return `<section class="op41-readiness"><div><small class="op41-kicker">CUSTOM DOMAIN</small><h2>Koneksi produksi sedang diverifikasi</h2><p>Form domain hanya dibuka setelah token, zone, target CNAME, database JWT/RLS, dan izin Cloudflare Custom Hostnames benar-benar lulus pemeriksaan produksi. Subdomain gratis tetap aktif. Service-role server tidak diperlukan pada alur ini.</p><button type="button" class="op41-button primary op41-domain-retry">Periksa ulang</button></div><ul>${rows.map(([name, ready]) => `<li data-ready="${ready === true}">${ready === true ? "✓" : "○"} ${name}</li>`).join("")}</ul></section>`;
}

function reloadAfterMutation(view) {
  delete view.dataset.op41DomainsSite;
  window.setTimeout(() => loadDomains(view, true), 0);
}

export async function loadDomains(view, forceHealth = false) {
  if (!view || view.dataset.op41DomainsBusy === "true") return;
  view.dataset.sp37Domain = "true";
  view.dataset.op41DomainsBusy = "true";
  const host = hostFor(view);
  host.innerHTML = "<div class=\"op41-state\"><b>Memeriksa custom domain…</b></div>";
  try {
    const siteId = await resolveSiteId();
    if (!siteId) throw new Error("Situs aktif belum dipilih. Gunakan tombol Beralih situs terlebih dahulu.");
    const state = await health(forceHealth);
    if (state.customDomains !== true) {
      host.innerHTML = readinessMarkup(state);
      host.querySelector(".op41-domain-retry")?.addEventListener("click", () => loadDomains(view, true));
      view.dataset.op41DomainsSite = siteId;
      return;
    }
    const data = await api(`/api/domains/list?siteId=${encodeURIComponent(siteId)}`);
    host.innerHTML = `<section class="op41-panel"><div class="op41-toolbar"><div><small class="op41-kicker">DOMAIN MILIK PENGGUNA</small><h2>Hubungkan custom domain</h2><p>Sistem memberikan dua catatan DNS resmi dan validasi HTTPS tambahan hanya bila diperlukan.</p></div><span>Cloudflare aktif</span></div><form class="op41-form op41-domain-form"><label>Nama domain<input name="hostname" required inputmode="url" autocomplete="off" placeholder="domain.com atau berita.my.id"></label><label>Target CNAME resmi<input value="${escapeHtml(data.cnameTarget || "")}" readonly></label><button type="submit">Tambahkan domain</button></form><div class="op41-domain-list">${domainItems(data.domains || [], data.cnameTarget || "")}</div></section>`;
    const form = host.querySelector(".op41-domain-form");
    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = form.querySelector("button[type=submit]");
      button.disabled = true;
      button.textContent = "Menambahkan…";
      try {
        await api("/api/domains/register", { siteId, hostname:new FormData(form).get("hostname") });
        reloadAfterMutation(view);
      } catch (error) {
        button.disabled = false;
        button.textContent = "Tambahkan domain";
        window.alert(error.message);
      }
    });
    host.querySelectorAll("[data-copy]").forEach((button) => button.addEventListener("click", async () => {
      await navigator.clipboard.writeText(button.dataset.copy || "");
      const before = button.textContent;
      button.textContent = "Tersalin";
      window.setTimeout(() => { button.textContent = before; }, 1000);
    }));
    host.querySelectorAll("[data-domain-action]").forEach((button) => button.addEventListener("click", async () => {
      const domainId = button.closest("[data-domain-id]")?.dataset.domainId;
      if (!domainId) return;
      const action = button.dataset.domainAction;
      if (action === "remove" && !window.confirm("Hapus custom domain ini?")) return;
      button.disabled = true;
      try {
        await api(`/api/domains/${action === "remove" ? "remove" : "refresh"}`, { domainId });
        reloadAfterMutation(view);
      } catch (error) {
        button.disabled = false;
        window.alert(error.message);
      }
    }));
    view.dataset.op41DomainsSite = siteId;
  } catch (error) {
    host.innerHTML = `<div class="op41-state error"><b>Custom domain belum dapat dimuat</b><p>${escapeHtml(error.message || "Terjadi gangguan sementara.")}</p><button type="button" class="op41-button primary">Coba lagi</button></div>`;
    host.querySelector("button")?.addEventListener("click", () => loadDomains(view, true));
  } finally {
    delete view.dataset.op41DomainsBusy;
  }
}
