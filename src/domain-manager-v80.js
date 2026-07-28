import { ACTIVE_SITE_STORAGE_KEY, listUserSites, setSitePublication } from "./lib/studio-data.js";
import { getVerifiedSession, isSessionReauthError } from "./lib/auth-session-v76.js";
import { DOMAIN_MANAGER_V80_CSS } from "./domain-manager-v80.css.js";
import { MAX_ACCOUNT_SITES, canonicalDomainsForSite, selectActiveSite } from "./lib/domain-scope-v112.js";

const RELEASE = "domain-manager-v112-20260728";
// Compatibility marker: domain-manager-v80-20260727 · MAX_ACCOUNT_SITES = 12
const DEADLINE_MS = 10_000;
const PUBLIC_PROBE_MS = 8_000;
let controller = null;
let frame = 0;

const escapeHtml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");

function icon(name) {
  const paths = {
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/>',
    copy: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M18 10a7 7 0 0 0-12-3L4 9M6 14a7 7 0 0 0 12 3l2-2"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    external: '<path d="M14 5h5v5M19 5l-9 9"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1 2-2V8a2 2 0 0 1 2-2h5"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
    check: '<path d="M5 12l4 4L19 6"/>',
    sites: '<rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/>',
    pulse: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.globe}</svg>`;
}

function withDeadline(promise, milliseconds, message) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = window.setTimeout(() => reject(Object.assign(new Error(message), { code: "DOMAIN_DEADLINE" })), milliseconds); }),
  ]).finally(() => window.clearTimeout(timer));
}

function activeSiteId() {
  try { return localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) || ""; } catch { return ""; }
}

function validSite(value) { return value?.id && value?.slug ? value : null; }

async function accountState() {
  const verified = await withDeadline(getVerifiedSession({ force: true }), 8_000, "Sesi pengguna terlalu lama diverifikasi.");
  if (!verified?.session?.access_token || !verified?.user?.id) throw new Error("Silakan masuk kembali untuk mengelola domain.");
  const sites = await withDeadline(listUserSites(verified.user.id), 8_000, "Daftar situs terlalu lama dimuat.");
  const preferred = activeSiteId();
  const published = validSite(window.__ngebloggingActiveSite);
  const site = selectActiveSite(sites, preferred, published);
  if (!site) throw new Error("Buat situs terlebih dahulu untuk memperoleh subdomain gratis.");
  return { token: verified.session.access_token, user: verified.user, site, sites: sites.slice(0, MAX_ACCOUNT_SITES) };
}

async function api(path, token, body = null) {
  const response = await withDeadline(fetch(path, {
    method: body ? "POST" : "GET",
    cache: "no-store",
    headers: { accept: "application/json", "cache-control": "no-cache", authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }), DEADLINE_MS, "Layanan domain melewati batas waktu. Subdomain gratis tetap aktif.");
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = Object.assign(new Error(payload.error || "Permintaan domain belum berhasil."), { code: payload.code || "DOMAIN_REQUEST_FAILED", status: response.status, payload });
    if ([401, 403].includes(response.status)) window.dispatchEvent(new CustomEvent("ngeblogging:session-invalid", { detail: payload }));
    throw error;
  }
  return payload;
}

function domainView() {
  const direct = document.querySelector(".sn-main > .sn-view-pad[data-domain-manager-host-v112='true']");
  if (direct?.isConnected) return direct;
  const views = [...document.querySelectorAll(".sn-main > .sn-view-pad")].filter((view) => {
    const title = view.querySelector(":scope > .sn-page-title h1")?.textContent?.trim();
    return title === "Domain & publikasi" || view.dataset.domainManagerV80 || view.dataset.domainManagerV79 || view.dataset.domainFullZoneAuthority;
  });
  return views.find((view) => view.isConnected && !view.hidden && getComputedStyle(view).display !== "none") || views.at(-1) || null;
}

function addresses(domain) {
  const values = domain?.ownership_verification?.additional_hostnames;
  return Array.isArray(values) ? values.filter((item) => item?.hostname).map((item) => ({ host: String(item.host || ""), hostname: String(item.hostname || ""), enabled: item.enabled !== false })) : [];
}
function nameservers(domain) {
  const values = domain?.ownership_verification?.required_name_servers;
  return Array.isArray(values) ? values.map((value) => String(value || "").trim()).filter(Boolean) : [];
}
function activeDomain(domain) { return domain?.status === "active" && domain?.provider_status === "active" && domain?.ssl_status === "active"; }
function sortedDomains(list) { return [...list].sort((a, b) => Number(activeDomain(b)) - Number(activeDomain(a)) || a.hostname.localeCompare(b.hostname)); }
function status(domain) {
  if (activeDomain(domain)) return ["Aktif", "active"];
  if (domain?.status === "failed") return ["Perlu perhatian", "danger"];
  if (domain?.status === "pending_deletion") return ["Menunggu pelepasan", "pending"];
  return ["Verifikasi nameserver", "pending"];
}

function workspace(state) {
  return `<section class="card workspace"><div><small class="eyebrow">Situs aktif</small><h2>${escapeHtml(state.site?.name || "Situs belum dipilih")}</h2><p>${state.site?.slug ? `${escapeHtml(state.site.slug)}.ngeblogging.com` : "Belum ada alamat situs"}</p></div><aside><b>${state.sites.length}/${MAX_ACCOUNT_SITES} situs dalam akun</b><p>Gunakan tombol Ganti situs pada Workspace untuk berpindah. Seluruh menu mengikuti situs aktif yang sama.</p></aside></section>`;
}

function metrics(state) {
  const domains = sortedDomains(state.domains);
  const active = domains.filter(activeDomain);
  const routed = active.reduce((total, domain) => total + 1 + addresses(domain).filter((item) => item.enabled).length, 0);
  const data = [
    ["sites", "Kapasitas akun", `${state.sites.length}/${MAX_ACCOUNT_SITES}`],
    ["link", "Domain situs aktif", domains.length],
    ["check", "Alamat dapat dirutekan", routed],
    ["shield", "Perlu perhatian", domains.filter((domain) => domain.status === "failed" || domain.error_message).length],
  ];
  return `<section class="metrics">${data.map(([name, label, value]) => `<article class="metric">${icon(name)}<span>${label}</span><b>${value}</b></article>`).join("")}</section>`;
}

function freeCard(state) {
  const site = state.site;
  const published = site?.status === "active" && site?.is_public;
  return `<section class="card free"><span class="iconbox">${icon("globe")}</span><div><small class="eyebrow">Subdomain gratis · tetap ada</small><h2>${site?.slug ? `${escapeHtml(site.slug)}.ngeblogging.com` : "Menunggu situs"}</h2><p>${published ? "Alamat gratis aktif permanen. Domain pribadi tidak menghapus URL ini." : "Alamat gratis sudah dicadangkan. Terbitkan ketika situs siap."}</p></div><aside><i class="badge ${published ? "active" : ""}">${published ? "Aktif" : "Draf"}</i>${site?.slug ? `<a class="link" href="https://${escapeHtml(site.slug)}.ngeblogging.com?ngeblogging-free-preview=1" target="_blank" rel="noreferrer">${icon("external")}Buka</a>` : ""}<button class="btn primary" data-d80-action="publication" ${state.busy ? "disabled" : ""}>${published ? "Jadikan draf" : "Terbitkan"}</button></aside></section>`;
}

function registerPanel(state) {
  const hasDomain = state.domains.some((domain) => domain.status !== "pending_deletion");
  const ready = state.config?.enabled === true && state.token && state.site?.id && !hasDomain;
  return `<section class="card"><header class="section-head"><span class="iconbox">${icon("plus")}</span><div><small class="eyebrow">Domain utama situs</small><h2>${hasDomain ? "Domain pribadi sudah terhubung" : "Hubungkan domain pribadi"}</h2><p>${hasDomain ? "Domain akar dikelola pada kartu di bawah. Ganti situs melalui Workspace untuk mengelola domain situs lain." : "Masukkan domain milik situs aktif. Sistem menyiapkan zone, dua nameserver, HTTPS, dan routing untuk situs ini."}</p></div></header>${hasDomain ? "" : `<form class="register-form" data-d80-form="domain"><label class="field"><span>Nama domain</span><input class="input" name="hostname" placeholder="domainanda.com" inputmode="url" autocomplete="off" ${ready ? "" : "disabled"}/><small>Tanpa https://, tanpa www, dan tanpa path.</small></label><button class="btn primary" ${ready && state.busy !== "register" ? "" : "disabled"}>${state.busy === "register" ? "Menghubungkan…" : `${icon("plus")}Hubungkan domain`}</button></form>`}<div class="provider-note">${icon("shield")}Menggunakan Full Zone gratis dan dua nameserver Cloudflare. Tidak memakai Cloudflare for SaaS.</div></section>`;
}

function addressRow(domain, item, state, fixed = false, removable = true) {
  return `<article class="address"><div><b>${escapeHtml(item.hostname)}</b><small>${fixed ? "Alamat utama tanpa www · dilindungi" : item.enabled ? "Routing aktif" : "Routing nonaktif"}</small></div>${fixed ? `<i class="locked">Wajib aktif</i>` : `<button class="switch ${item.enabled ? "on" : ""}" data-d80-action="toggle-address" data-domain-id="${escapeHtml(domain.id)}" data-host="${escapeHtml(item.host)}" data-enabled="${item.enabled}" ${state.busy ? "disabled" : ""}><span></span>${item.enabled ? "Aktif" : "Nonaktif"}</button>`}${!fixed && removable ? `<button class="icon-btn" data-d80-action="remove-address" data-domain-id="${escapeHtml(domain.id)}" data-host="${escapeHtml(item.host)}" data-hostname="${escapeHtml(item.hostname)}" ${state.busy ? "disabled" : ""}>${icon("trash")}</button>` : ""}</article>`;
}

function domainCard(domain, state) {
  const [label, tone] = status(domain);
  const ns = nameservers(domain);
  const items = addresses(domain);
  const www = items.find((item) => item.host === "www") || { host: "www", hostname: `www.${domain.hostname}`, enabled: false };
  const extras = items.filter((item) => item.host !== "www");
  const active = activeDomain(domain);
  return `<article class="domain"><header><div class="domain-name"><span class="iconbox">${icon("globe")}</span><div><small class="eyebrow">Domain utama situs</small><h3>${escapeHtml(domain.hostname)}</h3><p>${active ? "Zone, HTTPS, dan routing aktif." : "Ganti nameserver di registrar, lalu periksa koneksi."}</p></div></div><div class="domain-badges"><i class="badge ${tone}">${label}</i></div></header>${!active && ns.length ? `<section class="ns"><header><div><small class="eyebrow">Dua nameserver resmi</small><b>Salin ke registrar domain</b></div><button class="btn secondary" data-d80-action="copy-all" data-values="${escapeHtml(ns.join("\n"))}">${icon("copy")}Salin semua</button></header>${ns.map((value, index) => `<div class="ns-row"><span>Nameserver ${index + 1}</span><code>${escapeHtml(value)}</code><button class="icon-btn" data-d80-action="copy" data-value="${escapeHtml(value)}">${icon("copy")}</button></div>`).join("")}</section>` : ""}${domain.error_message ? `<p class="domain-error">${escapeHtml(domain.error_message)}</p>` : ""}<section class="actions">${active ? `<a class="link" href="https://${escapeHtml(domain.hostname)}" target="_blank" rel="noreferrer">${icon("external")}Buka di browser</a>` : ""}<button class="btn secondary" data-d80-action="refresh" data-domain-id="${escapeHtml(domain.id)}" ${state.busy ? "disabled" : ""}>${icon("refresh")}Periksa DNS & HTTPS</button><button class="btn danger" data-d80-action="remove" data-domain-id="${escapeHtml(domain.id)}" data-hostname="${escapeHtml(domain.hostname)}" ${state.busy ? "disabled" : ""}>${icon("trash")}Lepaskan</button></section>${active ? `<section class="routing"><header><small class="eyebrow">Pengaturan alamat</small><h4>Alamat utama, www, dan alamat tambahan</h4><p>Alamat utama tanpa www dilindungi agar zone tidak terputus. www dan alamat tambahan dapat diaktifkan atau dinonaktifkan.</p></header>${addressRow(domain, { host: "@", hostname: domain.hostname, enabled: true }, state, true, false)}${addressRow(domain, www, state, false, false)}${extras.map((item) => addressRow(domain, item, state)).join("")}<form class="address-form" data-d80-form="address" data-domain-id="${escapeHtml(domain.id)}"><label class="field"><span>Alamat tambahan</span><div class="compound"><input class="input" name="host" placeholder="nama atau bagian.bertingkat" autocomplete="off"/><strong>.${escapeHtml(domain.hostname)}</strong></div><small>Mendukung satu atau beberapa tingkat subdomain dengan validasi DNS.</small></label><button class="btn primary" ${state.busy ? "disabled" : ""}>${icon("plus")}Tambahkan</button></form></section>` : ""}</article>`;
}

function domainPanel(state) {
  const list = sortedDomains(state.domains);
  return `<section class="card"><header class="domain-list-head"><div><small class="eyebrow">Status domain situs aktif</small><h2>${list.length ? "Konfigurasi domain" : "Belum ada domain pribadi"}</h2><p>DNS, HTTPS, www, dan alamat tambahan diperiksa hanya untuk situs yang sedang aktif.</p></div></header>${list.length ? list.map((domain) => domainCard(domain, state)).join("") : `<div class="empty">${icon("link")}<h3>Hubungkan domain pertama</h3><p>Kolom penambahan domain tersedia tepat di atas bagian ini.</p></div>`}</section>`;
}

function auditPanel(state) {
  const summary = state.auditSummary?.total
    ? `<div class="audit-summary ${state.auditSummary.allReachable ? "ok" : ""}"><b>${state.auditSummary.passed}/${state.auditSummary.total} alamat lolos audit HTTPS</b><span>${state.auditSummary.allReachable ? "Semua alamat situs aktif dapat dibuka." : "Buka rincian di bawah dan periksa DNS/HTTPS yang belum lolos."}</span></div>`
    : "";
  return `<section class="card"><header class="audit-head"><div><small class="eyebrow">Audit publik server-side</small><h2>Periksa alamat situs aktif</h2><p>Menyegarkan status Cloudflare lalu menguji HTTPS, status HTTP, HTML publik, redirect, dan waktu respons dari jaringan Worker.</p></div><button class="btn secondary" data-d80-action="audit" ${state.busy ? "disabled" : ""}>${state.busy === "audit" ? "Memeriksa…" : `${icon("pulse")}Audit alamat`}</button></header>${summary}${state.auditResults.length ? `<div class="audit-results">${state.auditResults.map((item) => `<article class="audit-row"><span class="${item.reachable ? "ok" : ""}">${item.reachable ? icon("check") : icon("shield")}</span><div><b>${escapeHtml(item.label)}</b><small>${escapeHtml(item.address)} · ${item.httpStatus ? `HTTP ${item.httpStatus}` : "tanpa respons"} · ${Number(item.latencyMs || 0)} ms</small><small>${escapeHtml(item.check || "")}</small></div><i>${item.reachable ? "Lolos" : "Perlu diperiksa"}</i></article>`).join("")}</div>` : ""}</section>`;
}

function render(state) {
  if (!state.root?.isConnected) return;
  state.root.innerHTML = `<main class="app" data-release="${RELEASE}"><header class="hero"><div><small class="eyebrow">Ngeblogging Studio</small><h1>Domain & publikasi</h1><p>Kelola domain situs aktif, subdomain gratis, www, alamat bertingkat, DNS, HTTPS, dan pemeriksaan publik dari satu tempat.</p></div><button class="btn secondary" data-d80-action="reload">${icon("refresh")}Muat ulang</button></header>${state.error ? `<section class="card notice"><div><b>Panel domain belum selesai dimuat.</b><p>${escapeHtml(state.error)}</p></div><button class="btn secondary" data-d80-action="reload">Coba lagi</button></section>` : ""}${workspace(state)}${metrics(state)}${freeCard(state)}${registerPanel(state)}${domainPanel(state)}${auditPanel(state)}${state.toast ? `<div class="toast ${state.toastDanger ? "danger" : ""}">${escapeHtml(state.toast)}</div>` : ""}</main>`;
}

function showToast(state, message, danger = false) {
  state.toast = message;
  state.toastDanger = danger;
  render(state);
  clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => { state.toast = ""; render(state); }, 3800);
}

async function load(state) {
  const run = ++state.run;
  state.error = "";
  state.config = null;
  state.domains = [];
  const announced = validSite(window.__ngebloggingActiveSite);
  if (announced?.id && announced.id !== state.site?.id) state.site = announced;
  render(state);
  try {
    const account = await accountState();
    if (run !== state.run) return;
    state.token = account.token;
    state.user = account.user;
    state.site = account.site;
    state.sites = account.sites;
    window.__ngebloggingActiveSite = account.site;
    render(state);
    const payload = await api(`/api/domains/list?siteId=${encodeURIComponent(account.site.id)}`, account.token);
    if (run !== state.run) return;
    state.config = payload;
    state.domains = canonicalDomainsForSite(payload.domains, account.site.id);
  } catch (error) {
    if (run !== state.run) return;
    state.error = error.message || "Data domain belum dapat dimuat.";
    if (isSessionReauthError(error)) window.dispatchEvent(new CustomEvent("ngeblogging:session-invalid", { detail: { message: state.error } }));
  } finally {
    if (run === state.run) render(state);
  }
}

async function mutate(state, key, operation, success) {
  if (state.busy) return;
  state.busy = key;
  state.error = "";
  render(state);
  try {
    await operation();
    if (success) showToast(state, success);
    const payload = await api(`/api/domains/list?siteId=${encodeURIComponent(state.site.id)}`, state.token);
    state.config = payload;
    state.domains = canonicalDomainsForSite(payload.domains, state.site.id);
  } catch (error) {
    state.error = error.message || "Perubahan belum berhasil.";
    showToast(state, state.error, true);
  } finally {
    state.busy = "";
    render(state);
  }
}

async function copy(state, value) {
  try { await navigator.clipboard.writeText(value); showToast(state, "Nilai DNS disalin."); }
  catch { showToast(state, "Nilai belum dapat disalin pada perangkat ini.", true); }
}

async function audit(state) {
  if (state.busy || !state.site?.id) return;
  state.busy = "audit";
  state.auditResults = [];
  state.auditSummary = null;
  render(state);
  try {
    const domain = state.domains[0];
    if (domain?.id) {
      try { await api("/api/domains/refresh", state.token, { domainId: domain.id }); }
      catch { /* Audit tetap berjalan dan akan menjelaskan alamat yang belum lolos. */ }
      const refreshed = await api(`/api/domains/list?siteId=${encodeURIComponent(state.site.id)}`, state.token);
      state.config = refreshed;
      state.domains = canonicalDomainsForSite(refreshed.domains, state.site.id);
    }
    const payload = await api("/api/domains/audit", state.token, { siteId: state.site.id });
    state.auditResults = Array.isArray(payload.results) ? payload.results : [];
    state.auditSummary = { passed:Number(payload.passed || 0), total:Number(payload.total || 0), allReachable:payload.allReachable === true, checkedAt:payload.checkedAt || "" };
  } catch (error) {
    state.error = error.message || "Audit alamat belum dapat dijalankan.";
    showToast(state, state.error, true);
  } finally { state.busy = ""; render(state); }
}

async function submit(state, event) {
  const form = event.target.closest("form[data-d80-form]");
  if (!form || !state.root.contains(form)) return;
  event.preventDefault();
  const data = new FormData(form);
  if (form.dataset.d80Form === "domain") {
    const hostname = String(data.get("hostname") || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/[/?#].*$/, "");
    if (!hostname) return showToast(state, "Masukkan nama domain.", true);
    return mutate(state, "register", () => api("/api/domains/register", state.token, { siteId: state.site.id, hostname }), "Domain ditambahkan. Salin dua nameserver ke registrar.");
  }
  const domainId = form.dataset.domainId || "";
  const host = String(data.get("host") || "").trim().toLowerCase();
  if (!domainId || !host) return showToast(state, "Masukkan nama alamat tambahan.", true);
  return mutate(state, `address-${domainId}`, () => api("/api/domains/address", state.token, { domainId, host, enabled: true }), "Alamat tambahan diaktifkan.");
}

async function click(state, event) {
  const button = event.target.closest("[data-d80-action]");
  if (!button || !state.root.contains(button)) return;
  const action = button.dataset.d80Action;
  if (action === "reload") return load(state);
  if (action === "copy") return copy(state, button.dataset.value || "");
  if (action === "copy-all") return copy(state, button.dataset.values || "");
  if (action === "audit") return audit(state);
  if (action === "publication") {
    const published = state.site?.status === "active" && state.site?.is_public;
    return mutate(state, "publication", async () => {
      const updated = await setSitePublication(state.site.id, !published);
      state.site = { ...state.site, ...updated };
      state.sites = state.sites.map((site) => site.id === state.site.id ? state.site : site);
      window.__ngebloggingActiveSite = state.site;
    }, published ? "Situs kembali menjadi draf." : "Subdomain gratis sudah aktif.");
  }
  const domainId = button.dataset.domainId || "";
  const domain = state.domains.find((item) => item.id === domainId);
  if (!domain) return;
  if (action === "refresh") return mutate(state, `refresh-${domainId}`, () => api("/api/domains/refresh", state.token, { domainId }), "Pemeriksaan DNS dan HTTPS selesai.");
  if (action === "remove") {
    if (!confirm(`Lepaskan ${button.dataset.hostname || domain.hostname} dari situs ini? Subdomain gratis tetap ada.`)) return;
    return mutate(state, `remove-${domainId}`, () => api("/api/domains/remove", state.token, { domainId }), "Tahap pelepasan domain dimulai.");
  }
  if (action === "toggle-address") {
    const host = button.dataset.host || "";
    const enabled = button.dataset.enabled === "true";
    return mutate(state, `toggle-${domainId}-${host}`, () => api("/api/domains/address", state.token, { domainId, host, enabled: !enabled }), enabled ? "Alamat dinonaktifkan." : "Alamat diaktifkan.");
  }
  if (action === "remove-address") {
    const host = button.dataset.host || "";
    if (!confirm(`Hapus ${button.dataset.hostname || host}?`)) return;
    return mutate(state, `remove-${domainId}-${host}`, () => api("/api/domains/address", state.token, { domainId, host, remove: true }), "Alamat tambahan dihapus.");
  }
}

function mount(view) {
  document.querySelectorAll(".d80-host").forEach((node) => { if (!view.contains(node)) node.remove(); });
  let host = view.querySelector(":scope > .d80-host");
  if (!host) {
    host = document.createElement("div");
    host.className = "d80-host";
    host.dataset.release = RELEASE;
    view.append(host);
  }
  const shadow = host.shadowRoot || host.attachShadow({ mode: "open" });
  if (!shadow.querySelector("style[data-d80-style]")) {
    const style = document.createElement("style");
    style.dataset.d80Style = RELEASE;
    style.textContent = DOMAIN_MANAGER_V80_CSS;
    shadow.append(style);
  }
  let root = shadow.querySelector("#domain-manager-v80");
  if (!root) { root = document.createElement("div"); root.id = "domain-manager-v80"; shadow.append(root); }
  [...view.children].forEach((child) => {
    if (child !== host) {
      child.hidden = true;
      child.setAttribute("aria-hidden", "true");
      child.style.setProperty("display", "none", "important");
      child.dataset.domainAuthoritySuperseded = RELEASE;
    }
  });
  host.hidden = false;
  host.style.cssText = "display:block!important;position:relative!important;width:100%!important;min-width:0!important;max-width:100%!important;overflow:visible!important;isolation:isolate!important;";
  view.dataset.domainManagerV80 = RELEASE;
  view.dataset.domainManagerHostV112 = "true";
  view.dataset.domainAuthority = RELEASE;
  view.style.setProperty("display", "block", "important");
  view.style.setProperty("position", "relative", "important");
  view.style.setProperty("padding", "0", "important");
  view.style.setProperty("overflow", "visible", "important");
  if (controller?.view === view && controller.host === host) { controller.root = root; return controller; }
  controller = { view, host, shadow, root, token: "", user: null, site: validSite(window.__ngebloggingActiveSite), sites: [], config: null, domains: [], error: "", busy: "", run: 0, auditResults: [], auditSummary: null, toast: "", toastDanger: false, toastTimer: 0 };
  shadow.addEventListener("submit", (event) => submit(controller, event));
  shadow.addEventListener("click", (event) => click(controller, event));
  load(controller);
  return controller;
}

function scan() {
  document.documentElement.dataset.domainManagerV80 = RELEASE;
  const view = domainView();
  if (!view) return;
  const state = mount(view);
  const selected = activeSiteId();
  if (state?.site?.id && selected && selected !== state.site.id) load(state);
}

function schedule() { cancelAnimationFrame(frame); frame = requestAnimationFrame(scan); }
new MutationObserver((mutations) => { if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length || mutation.type === "attributes")) schedule(); })
  .observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden"] });
window.addEventListener("pageshow", schedule);
function handleActiveSite(event) {
  if (!controller) return;
  const next = validSite(event?.detail);
  if (next) {
    controller.site = next;
    controller.config = null;
    controller.domains = [];
    controller.error = "";
    render(controller);
  }
  load(controller);
}
window.addEventListener("ngeblogging:active-site-change", handleActiveSite);
window.addEventListener("ngeblogging:active-site-ready", handleActiveSite);
scan();
