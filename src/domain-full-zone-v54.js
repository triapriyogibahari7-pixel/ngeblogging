import { supabase, supabaseConfigured } from "./lib/supabase.js";
import {
  ACTIVE_SITE_STORAGE_KEY,
  listUserSites,
  setSitePublication,
} from "./lib/studio-data.js";

const RELEASE = "domain-full-zone-v54-20260726";
const mountedViews = new WeakMap();
let scanFrame = 0;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function domainView() {
  return [...document.querySelectorAll(".sn-main > .sn-view-pad")].find((view) => (
    view.querySelector(":scope > .sn-page-title h1")?.textContent?.trim() === "Domain & publikasi"
  )) || null;
}

function activeSiteId() {
  try {
    return localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

async function sessionState() {
  if (!supabaseConfigured || !supabase) {
    throw new Error("Penyimpanan cloud belum dikonfigurasi.");
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const session = data.session;
  if (!session?.access_token || !session.user?.id) {
    throw new Error("Silakan masuk kembali untuk mengelola domain.");
  }

  const sites = await listUserSites(session.user.id);
  const preferredId = activeSiteId();
  const site = sites.find((row) => row.id === preferredId) || sites[0] || null;

  if (!site) {
    throw new Error("Buat atau pilih situs terlebih dahulu.");
  }

  return {
    token: session.access_token,
    user: session.user,
    site,
    sites,
  };
}

async function api(path, token, body = null) {
  const response = await fetch(path, {
    method: body ? "POST" : "GET",
    cache: "no-store",
    headers: {
      accept: "application/json",
      "cache-control": "no-cache",
      authorization: `Bearer ${token}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || "Permintaan domain belum berhasil.");
    error.status = response.status;
    error.code = payload.code || "DOMAIN_REQUEST_FAILED";
    error.payload = payload;
    throw error;
  }

  return payload;
}

function additionalAddresses(domain) {
  const records = domain?.ownership_verification?.additional_hostnames;
  if (!Array.isArray(records)) return [];

  return records
    .filter((record) => record && typeof record.hostname === "string")
    .map((record) => ({
      host: String(record.host || ""),
      hostname: String(record.hostname || ""),
      enabled: record.enabled !== false,
    }))
    .sort((left, right) => {
      if (left.host === "www") return -1;
      if (right.host === "www") return 1;
      return left.hostname.localeCompare(right.hostname);
    });
}

function requiredNameServers(domain) {
  const records = domain?.ownership_verification?.required_name_servers;
  return Array.isArray(records)
    ? records.map((value) => String(value || "").trim()).filter(Boolean)
    : [];
}

function rootDomain(domains) {
  return domains.find((domain) => domain.provider === "cloudflare-full-zone")
    || domains[0]
    || null;
}

function statusMeta(domain) {
  if (!domain) return { label: "Belum terhubung", tone: "idle" };
  if (domain.status === "pending_deletion") return { label: "Menunggu pelepasan", tone: "warning" };
  if (domain.status === "active" && domain.ssl_status === "active") return { label: "Aktif", tone: "active" };
  if (domain.status === "failed") return { label: "Perlu perhatian", tone: "danger" };
  return { label: "Verifikasi nameserver", tone: "pending" };
}

function isRootActive(domain) {
  return Boolean(
    domain?.status === "active"
    && domain?.provider_status === "active"
    && domain?.ssl_status === "active",
  );
}

function icon(name) {
  const icons = {
    globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M18 10a7 7 0 0 0-12-3L4 9M6 14a7 7 0 0 0 12 3l2-2"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    external: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-9 9"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/></svg>',
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l4 4L19 6"/></svg>',
  };
  return icons[name] || "";
}

function setBusy(controller, key, busy = true) {
  controller.busy = busy ? key : "";
  render(controller);
}

function toast(message) {
  const existing = document.querySelector(".dfz-toast");
  existing?.remove();
  const node = document.createElement("div");
  node.className = "dfz-toast";
  node.innerHTML = `${icon("check")}<span>${escapeHtml(message)}</span>`;
  document.body.append(node);
  setTimeout(() => node.remove(), 3400);
}

async function copyText(value, label) {
  try {
    await navigator.clipboard.writeText(value);
    toast(`${label} disalin.`);
  } catch {
    toast("Teks belum dapat disalin pada perangkat ini.");
  }
}

function rootPanel(controller, domain) {
  const meta = statusMeta(domain);
  const active = isRootActive(domain);
  const nameservers = requiredNameServers(domain);
  const configured = controller.config?.enabled === true;

  if (controller.loading) {
    return '<div class="dfz-loading"><span class="dfz-spinner"></span>Memuat domain situs…</div>';
  }

  if (!domain) {
    return `
      <form class="dfz-root-form" data-action="register-root">
        <label>
          <span>Domain utama</span>
          <input name="hostname" inputmode="url" autocomplete="off" spellcheck="false" placeholder="domainanda.com" ${configured ? "" : "disabled"}/>
        </label>
        <button class="dfz-primary" type="submit" ${configured || controller.busy === "register" ? "" : "disabled"}>
          ${controller.busy === "register" ? '<span class="dfz-spinner"></span>Menghubungkan…' : `${icon("plus")}Hubungkan domain`}
        </button>
      </form>
      ${configured ? "" : `<div class="dfz-inline-warning">${icon("shield")}<span>Sistem produksi belum lengkap: ${escapeHtml(controller.config?.missing?.join(", ") || "konfigurasi provider domain")}.</span></div>`}
    `;
  }

  const nameserverMarkup = !active && nameservers.length && domain.status !== "pending_deletion"
    ? `
      <section class="dfz-nameservers">
        <header>
          <div><small>VERIFIKASI NAMESERVER</small><h3>Ganti nameserver di registrar domain</h3></div>
          <button type="button" data-action="copy-all-ns">${icon("copy")}Salin semua</button>
        </header>
        ${nameservers.map((value, index) => `
          <div>
            <span>Nameserver ${index + 1}</span>
            <code>${escapeHtml(value)}</code>
            <button type="button" data-action="copy-ns" data-value="${escapeHtml(value)}" aria-label="Salin nameserver ${index + 1}">${icon("copy")}</button>
          </div>
        `).join("")}
      </section>
    `
    : "";

  return `
    <div class="dfz-root-state">
      <div class="dfz-hostname-row">
        <span class="dfz-host-icon">${icon("globe")}</span>
        <div>
          <small>DOMAIN TERHUBUNG</small>
          <strong>${escapeHtml(domain.hostname)}</strong>
          <span>${active ? "Domain dan HTTPS sudah aktif." : domain.status === "pending_deletion" ? "Domain menunggu proses pelepasan final." : "Selesaikan verifikasi nameserver."}</span>
        </div>
        <i class="dfz-status ${meta.tone}">${escapeHtml(meta.label)}</i>
      </div>
      ${nameserverMarkup}
      ${domain.error_message ? `<p class="dfz-error">${escapeHtml(domain.error_message)}</p>` : ""}
      <div class="dfz-actions">
        ${active ? `<a href="https://${escapeHtml(domain.hostname)}" target="_blank" rel="noreferrer">${icon("external")}Buka domain</a>` : ""}
        <button type="button" data-action="refresh-root" ${controller.busy ? "disabled" : ""}>${controller.busy === "refresh" ? '<span class="dfz-spinner"></span>' : icon("refresh")}Periksa koneksi</button>
        <button type="button" class="danger" data-action="remove-root" ${controller.busy ? "disabled" : ""}>${icon("trash")}${domain.status === "pending_deletion" ? "Selesaikan pelepasan" : "Lepaskan domain"}</button>
      </div>
    </div>
  `;
}

function addressesPanel(controller, domain) {
  const active = isRootActive(domain);
  const addresses = additionalAddresses(domain);

  if (!domain) {
    return `<div class="dfz-locked">${icon("shield")}<b>Hubungkan domain utama dahulu</b><p>Setelah domain utama tersedia, Anda dapat membuat www dan subdomain lain.</p></div>`;
  }

  if (!active) {
    return `<div class="dfz-locked">${icon("shield")}<b>Verifikasi domain utama</b><p>Alamat tambahan dapat digunakan setelah nameserver dan HTTPS aktif.</p></div>`;
  }

  return `
    <form class="dfz-address-form" data-action="add-address">
      <label>
        <span>Nama host</span>
        <div><input name="host" autocomplete="off" spellcheck="false" placeholder="www, blog, toko, app, atau docs.tim"/><em>.${escapeHtml(domain.hostname)}</em></div>
      </label>
      <p>Gunakan satu atau beberapa tingkat, misalnya www, blog, toko, app, atau docs.tim.</p>
      <button class="dfz-primary" type="submit" ${controller.busy ? "disabled" : ""}>${controller.busy === "address-add" ? '<span class="dfz-spinner"></span>Menambahkan…' : `${icon("plus")}Tambahkan alamat`}</button>
    </form>
    <div class="dfz-address-list">
      ${addresses.length ? addresses.map((address) => `
        <article>
          <div class="dfz-address-name">
            <span class="${address.enabled ? "active" : "inactive"}">${address.enabled ? icon("check") : icon("globe")}</span>
            <div><strong>${escapeHtml(address.hostname)}</strong><small>${address.enabled ? "Aktif dan terhubung" : "Nonaktif"}</small></div>
          </div>
          <div class="dfz-address-controls">
            <button type="button" class="dfz-switch ${address.enabled ? "active" : ""}" data-action="toggle-address" data-host="${escapeHtml(address.host)}" data-enabled="${address.enabled}" aria-pressed="${address.enabled}" aria-label="${address.enabled ? "Nonaktifkan" : "Aktifkan"} ${escapeHtml(address.hostname)}" ${controller.busy ? "disabled" : ""}><span></span></button>
            <button type="button" class="dfz-remove-address" data-action="remove-address" data-host="${escapeHtml(address.host)}" data-hostname="${escapeHtml(address.hostname)}" aria-label="Hapus ${escapeHtml(address.hostname)}" ${controller.busy ? "disabled" : ""}>${icon("trash")}</button>
          </div>
        </article>
      `).join("") : `<div class="dfz-empty">${icon("globe")}<b>Belum ada alamat tambahan</b><p>Tambahkan www atau nama subdomain pertama Anda.</p></div>`}
    </div>
  `;
}

function render(controller) {
  const { root } = controller;
  if (!root?.isConnected) return;

  const domain = rootDomain(controller.domains);
  const site = controller.site;
  const published = Boolean(site?.status === "active" && site?.is_public);

  root.innerHTML = `
    <div class="dfz-shell" data-release="${RELEASE}">
      <header class="dfz-title">
        <div><small>NGEBLOGGING STUDIO</small><h1>Domain & publikasi</h1><p>Hubungkan domain milik Anda, verifikasi nameserver, lalu kelola www dan subdomain lain dari satu tempat.</p></div>
        ${site?.slug ? `<a href="https://${escapeHtml(site.slug)}.ngeblogging.com" target="_blank" rel="noreferrer">${icon("external")}Preview situs</a>` : ""}
      </header>

      <section class="dfz-free-card">
        <span class="dfz-free-icon">${icon("globe")}</span>
        <div><small>SUBDOMAIN GRATIS</small><h2>${site?.slug ? `${escapeHtml(site.slug)}.ngeblogging.com` : "Belum tersedia"}</h2><p>${published ? "Situs aktif dan dapat dibuka oleh pengunjung." : "Situs masih draf sampai Anda menerbitkannya."}</p></div>
        <div class="dfz-free-actions"><i class="${published ? "active" : "draft"}">${published ? "Aktif" : "Draf"}</i><button type="button" class="dfz-primary" data-action="toggle-publication" ${controller.busy ? "disabled" : ""}>${controller.busy === "publication" ? '<span class="dfz-spinner"></span>Memproses…' : `${icon("external")}${published ? "Tarik menjadi draf" : "Launch situs"}`}</button></div>
      </section>

      ${controller.error ? `<section class="dfz-notice danger"><div><b>Domain belum dapat dimuat.</b><p>${escapeHtml(controller.error)}</p></div><button type="button" data-action="reload">Coba lagi</button></section>` : ""}

      <section class="dfz-grid">
        <article class="dfz-panel">
          <header><div><small>DOMAIN UTAMA</small><h2>Hubungkan domain utama</h2><p>Masukkan domain yang Anda miliki. Ngeblogging akan menyiapkan nameserver, HTTPS, dan koneksi situs.</p></div></header>
          ${rootPanel(controller, domain)}
        </article>
        <article class="dfz-panel ${isRootActive(domain) ? "" : "disabled"}">
          <header><div><small>ALAMAT TAMBAHAN</small><h2>Tambahkan www atau subdomain</h2><p>Buat alamat tambahan untuk blog, toko, aplikasi, dokumentasi, atau bagian lain dari situs Anda.</p></div>${isRootActive(domain) ? '<i class="dfz-status active">Siap</i>' : ""}</header>
          ${addressesPanel(controller, domain)}
        </article>
      </section>
    </div>
  `;
}

async function load(controller) {
  controller.loading = true;
  controller.error = "";
  render(controller);

  try {
    const account = await sessionState();
    controller.token = account.token;
    controller.site = account.site;
    controller.sites = account.sites;

    const payload = await api(
      `/api/domains/list?siteId=${encodeURIComponent(account.site.id)}`,
      account.token,
    );

    controller.config = payload;
    controller.domains = Array.isArray(payload.domains) ? payload.domains : [];
  } catch (error) {
    controller.error = error.message || "Data domain belum dapat dimuat.";
    controller.config = error.payload || null;
    controller.domains = [];
  } finally {
    controller.loading = false;
    render(controller);
  }
}

async function run(controller, key, operation, successMessage) {
  if (controller.busy) return null;
  setBusy(controller, key, true);
  try {
    const result = await operation();
    if (successMessage) toast(successMessage);
    await load(controller);
    return result;
  } catch (error) {
    toast(error.message || "Perubahan domain belum berhasil.");
    return null;
  } finally {
    setBusy(controller, key, false);
  }
}

async function handleSubmit(controller, event) {
  const form = event.target.closest("form[data-action]");
  if (!form || !controller.root.contains(form)) return;
  event.preventDefault();

  const domain = rootDomain(controller.domains);
  const data = new FormData(form);

  if (form.dataset.action === "register-root") {
    const hostname = String(data.get("hostname") || "").trim().toLowerCase();
    if (!hostname) return toast("Masukkan domain utama.");
    await run(controller, "register", () => api("/api/domains/register", controller.token, { siteId: controller.site.id, hostname }), "Domain ditambahkan. Lanjutkan verifikasi nameserver.");
    return;
  }

  if (form.dataset.action === "add-address") {
    const host = String(data.get("host") || "").trim().toLowerCase();
    if (!host) return toast("Masukkan www atau nama subdomain.");
    await run(controller, "address-add", () => api("/api/domains/address", controller.token, { domainId: domain.id, host, enabled: true }), "Alamat tambahan berhasil diaktifkan.");
  }
}

async function handleClick(controller, event) {
  const button = event.target.closest("[data-action]");
  if (!button || !controller.root.contains(button)) return;

  const action = button.dataset.action;
  const domain = rootDomain(controller.domains);

  if (action === "reload") return load(controller);
  if (action === "copy-all-ns") return copyText(requiredNameServers(domain).join("\n"), "Semua nameserver");
  if (action === "copy-ns") return copyText(button.dataset.value || "", "Nameserver");

  if (action === "toggle-publication") {
    const published = Boolean(controller.site?.status === "active" && controller.site?.is_public);
    if (!confirm(published ? "Tarik situs dari publik?" : "Terbitkan situs ke subdomain publik?")) return;
    return run(controller, "publication", async () => {
      controller.site = { ...controller.site, ...(await setSitePublication(controller.site.id, !published)) };
    }, published ? "Situs kembali menjadi draf." : "Situs publik aktif.");
  }

  if (!domain) return;

  if (action === "refresh-root") {
    return run(controller, "refresh", () => api("/api/domains/refresh", controller.token, { domainId: domain.id }), "Pemeriksaan koneksi selesai.");
  }

  if (action === "remove-root") {
    if (domain.status === "pending_deletion") {
      const confirmation = prompt(`Ketik ${domain.hostname} untuk menyelesaikan pelepasan domain.`);
      if (confirmation?.trim().toLowerCase() !== domain.hostname.toLowerCase()) return;
      return run(controller, "remove-final", () => api("/api/domains/remove", controller.token, { domainId: domain.id, confirmFinal: true, confirmation }), "Domain berhasil dilepaskan.");
    }

    if (!confirm(`Lepaskan ${domain.hostname} dari situs ini?`)) return;
    return run(controller, "remove", () => api("/api/domains/remove", controller.token, { domainId: domain.id }), "Domain dilepaskan dari situs. Ganti nameserver sebelum konfirmasi final.");
  }

  if (action === "toggle-address") {
    const enabled = button.dataset.enabled === "true";
    const host = button.dataset.host || "";
    return run(controller, `toggle-${host}`, () => api("/api/domains/address", controller.token, { domainId: domain.id, host, enabled: !enabled }), enabled ? "Alamat dinonaktifkan." : "Alamat diaktifkan.");
  }

  if (action === "remove-address") {
    const host = button.dataset.host || "";
    const hostname = button.dataset.hostname || host;
    if (!confirm(`Hapus ${hostname} dari daftar alamat tambahan?`)) return;
    return run(controller, `remove-${host}`, () => api("/api/domains/address", controller.token, { domainId: domain.id, host, remove: true }), "Alamat tambahan dihapus.");
  }
}

function mount(view) {
  if (mountedViews.has(view)) return mountedViews.get(view);

  const originalChildren = [...view.children];
  originalChildren.forEach((node) => {
    node.hidden = true;
    node.dataset.domainFullZoneHidden = "true";
  });

  const root = document.createElement("div");
  root.className = "dfz-root";
  view.append(root);
  view.dataset.domainFullZoneAuthority = RELEASE;

  const controller = {
    view,
    root,
    originalChildren,
    token: "",
    site: null,
    sites: [],
    config: null,
    domains: [],
    loading: true,
    error: "",
    busy: "",
  };

  root.addEventListener("submit", (event) => handleSubmit(controller, event));
  root.addEventListener("click", (event) => handleClick(controller, event));
  mountedViews.set(view, controller);
  load(controller);
  return controller;
}

function scan() {
  document.documentElement.dataset.domainFullZoneV54 = RELEASE;
  const view = domainView();
  if (view) mount(view);
}

function schedule() {
  cancelAnimationFrame(scanFrame);
  scanFrame = requestAnimationFrame(scan);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule();
}).observe(document.documentElement, { childList: true, subtree: true });

scan();
