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
  if (!domains.length) return `<div class="op41-state"><b>Belum ada custom domain</b><span>Tambahkan domain utama, WWW, atau subdomain bertingkat seperti blog.domain.com dan cloud.console.domain.com melalui dua form di atas.</span></div>`;
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

function normalizeHostname(value) {
  let hostname = String(value || "").trim().toLocaleLowerCase("en-US");
  hostname = hostname.replace(/^https?:\/\//, "").split(/[/?#]/, 1)[0].replace(/\.$/, "");
  if (!hostname || hostname.length > 253 || !hostname.includes(".")) throw new Error("Masukkan domain lengkap seperti domain.com atau domain.my.id.");
  const labels = hostname.split(".");
  if (labels.some((label) => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label))) throw new Error("Nama domain mengandung label yang tidak valid.");
  if (!/^[a-z0-9-]{2,63}$/i.test(labels.at(-1))) throw new Error("Ekstensi domain belum valid.");
  return hostname;
}

function normalizePrefix(value) {
  const prefix = String(value || "").trim().toLocaleLowerCase("en-US").replace(/^\.+|\.+$/g, "");
  if (!prefix) throw new Error("Masukkan WWW atau nama subdomain, misalnya blog atau cloud.console.");
  const labels = prefix.split(".");
  if (labels.some((label) => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label))) throw new Error("Nama WWW/subdomain belum valid.");
  return prefix;
}

function composeHostname(prefix, rootDomain) {
  return normalizeHostname(`${normalizePrefix(prefix)}.${normalizeHostname(rootDomain)}`);
}

function domainControlsMarkup({ ready, cnameTarget = "" }) {
  const disabled = ready ? "" : " disabled aria-disabled=\"true\"";
  const pending = ready ? "" : `<p class="op50-domain-pending">Kolom sudah tersedia, tetapi tombol penambahan tetap dikunci sampai Cloudflare Custom Hostnames API benar-benar memberi izin. Ini mencegah domain tersimpan setengah jadi.</p>`;
  const target = cnameTarget ? `<div class="op50-domain-target"><b>Target CNAME resmi</b><code>${escapeHtml(cnameTarget)}</code></div>` : "";
  return `<div class="op50-domain-controls" data-domain-ready="${ready}">
    <section class="op50-domain-card">
      <header><small class="op41-kicker">DOMAIN UTAMA</small><h3>Tambahkan domain Anda</h3><p>Masukkan domain akar tanpa protokol dan tanpa path, misalnya domain.com, domain.id, my.id, atau web.id.</p></header>
      <form class="op41-form op41-domain-form op50-domain-form op50-domain-root-form">
        <label>Domain utama<input name="hostname" required inputmode="url" autocomplete="off" spellcheck="false" placeholder="domain.com"></label>
        <button type="submit"${disabled}>Tambahkan domain</button>
        ${target}${pending}
      </form>
    </section>
    <section class="op50-domain-card">
      <header><small class="op41-kicker">WWW & SUBDOMAIN</small><h3>Tambahkan alamat tambahan</h3><p>Gunakan www, blog, berita, toko, atau subdomain bertingkat seperti cloud.console.</p></header>
      <form class="op50-domain-form op50-domain-host-form">
        <label>WWW / nama host<input name="prefix" required autocomplete="off" spellcheck="false" placeholder="www atau cloud.console"></label>
        <label>Domain utama<input name="rootDomain" required inputmode="url" autocomplete="off" spellcheck="false" placeholder="domain.com"></label>
        <button type="submit"${disabled}>Tambahkan alamat</button>
        <output class="op50-host-preview">Hasil: <b data-host-preview>www.domain.com</b></output>
        ${target}${pending}
      </form>
    </section>
  </div>`;
}

function readinessMarkup(state) {
  const bindings = state.customDomainBindings || {};
  const rows = [
    ["CLOUDFLARE_API_TOKEN", bindings.apiToken],
    ["CLOUDFLARE_ZONE_ID", bindings.zoneId],
    ["CLOUDFLARE_CUSTOM_HOSTNAME_TARGET", bindings.cnameTarget],
    ["SUPABASE JWT + ROW LEVEL SECURITY", bindings.databaseAccess],
    ["CLOUDFLARE CUSTOM HOSTNAMES API", bindings.providerApi],
  ];
  const permissionMissing = bindings.apiToken === true && bindings.zoneId === true && bindings.providerApi !== true;
  const detail = permissionMissing
    ? "Token Cloudflare terbaca, tetapi belum lolos izin SSL and Certificates Read/Write pada zone ngeblogging.com. Form tetap ditampilkan agar fiturnya tidak hilang, namun tombol dikunci sampai izin resmi tersebut aktif."
    : "Form domain ditampilkan sekarang dan akan aktif otomatis setelah Cloudflare serta akses database berbasis sesi pengguna terbaca oleh Worker. Subdomain gratis tetap aktif; Service-role server tidak diperlukan.";
  return `<section class="op41-panel"><div class="op41-toolbar"><div><small class="op41-kicker">CUSTOM DOMAIN</small><h2>Domain utama, WWW, dan subdomain</h2><p>Semua TLD valid didukung. Alamat bertingkat seperti cloud.console.domain.com juga dapat digunakan.</p></div><span>Menunggu verifikasi produksi</span></div>${domainControlsMarkup({ ready:false, cnameTarget:bindings.cnameTargetValue || "" })}<section class="op41-readiness"><div><small class="op41-kicker">STATUS KONEKSI</small><h2>Koneksi produksi sedang diverifikasi</h2><p>${escapeHtml(detail)}</p><button type="button" class="op41-button primary op41-domain-retry">Periksa ulang</button></div><ul>${rows.map(([name, ready]) => `<li data-ready="${ready === true}">${ready === true ? "✓" : "○"} ${escapeHtml(name)}</li>`).join("")}</ul></section></section>`;
}

function reloadAfterMutation(view) {
  delete view.dataset.op41DomainsSite;
  window.setTimeout(() => loadDomains(view, true), 0);
}

function attachDomainControls(host, view, siteId, ready) {
  const hostForm = host.querySelector(".op50-domain-host-form");
  const prefixInput = hostForm?.elements?.prefix;
  const rootInput = hostForm?.elements?.rootDomain;
  const preview = hostForm?.querySelector("[data-host-preview]");
  const updatePreview = () => {
    if (!preview) return;
    const prefix = String(prefixInput?.value || "www").trim().replace(/^\.+|\.+$/g, "") || "www";
    const root = String(rootInput?.value || "domain.com").trim().replace(/^https?:\/\//, "").split(/[/?#]/, 1)[0] || "domain.com";
    preview.textContent = `${prefix}.${root}`;
  };
  prefixInput?.addEventListener("input", updatePreview);
  rootInput?.addEventListener("input", updatePreview);
  updatePreview();
  if (!ready) return;

  const register = async (form, hostnameFactory, idleLabel) => {
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    button.textContent = "Menambahkan…";
    try {
      const hostname = hostnameFactory(new FormData(form));
      await api("/api/domains/register", { siteId, hostname });
      reloadAfterMutation(view);
    } catch (error) {
      button.disabled = false;
      button.textContent = idleLabel;
      window.alert(error.message);
    }
  };

  const rootForm = host.querySelector(".op50-domain-root-form");
  rootForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    register(rootForm, (formData) => normalizeHostname(formData.get("hostname")), "Tambahkan domain");
  });

  hostForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    register(hostForm, (formData) => composeHostname(formData.get("prefix"), formData.get("rootDomain")), "Tambahkan alamat");
  });
}

function attachDomainItems(host, view) {
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
      attachDomainControls(host, view, siteId, false);
      host.querySelector(".op41-domain-retry")?.addEventListener("click", () => loadDomains(view, true));
      view.dataset.op41DomainsSite = siteId;
      return;
    }
    const data = await api(`/api/domains/list?siteId=${encodeURIComponent(siteId)}`);
    host.innerHTML = `<section class="op41-panel"><div class="op41-toolbar"><div><small class="op41-kicker">DOMAIN MILIK PENGGUNA</small><h2>Hubungkan custom domain</h2><p>Tambahkan domain utama, WWW, atau subdomain bertingkat. Sistem memberikan dua catatan DNS resmi dan validasi HTTPS tambahan hanya bila diperlukan.</p></div><span>Cloudflare aktif</span></div>${domainControlsMarkup({ ready:true, cnameTarget:data.cnameTarget || "" })}<div class="op41-domain-list">${domainItems(data.domains || [], data.cnameTarget || "")}</div></section>`;
    attachDomainControls(host, view, siteId, true);
    attachDomainItems(host, view);
    view.dataset.op41DomainsSite = siteId;
  } catch (error) {
    host.innerHTML = `<div class="op41-state error"><b>Custom domain belum dapat dimuat</b><p>${escapeHtml(error.message || "Terjadi gangguan sementara.")}</p><button type="button" class="op41-button primary">Coba lagi</button></div>`;
    host.querySelector("button")?.addEventListener("click", () => loadDomains(view, true));
  } finally {
    delete view.dataset.op41DomainsBusy;
  }
}
