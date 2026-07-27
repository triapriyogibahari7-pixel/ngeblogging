import { ACTIVE_SITE_STORAGE_KEY, listUserSites, setActiveSiteId, setSitePublication } from "./lib/studio-data.js";
import { getVerifiedSession, isSessionReauthError } from "./lib/auth-session-v76.js";

const RELEASE = "domain-manager-v78-20260727";
const COMPATIBILITY_RELEASE = "domain-authority-v75-20260727";
const DEADLINE_MS = 10_000;
const PUBLIC_PROBE_MS = 8_000;
const MAX_ACCOUNT_SITES = 12;
let controller = null;
let scanFrame = 0;

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

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
    new Promise((_, reject) => {
      timer = window.setTimeout(() => reject(Object.assign(new Error(message), { code: "DOMAIN_DEADLINE" })), milliseconds);
    }),
  ]).finally(() => window.clearTimeout(timer));
}

function storedSiteId() {
  try { return localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) || ""; } catch { return ""; }
}

function validSite(value) {
  return value?.id && value?.slug ? value : null;
}

async function accountState() {
  const verified = await withDeadline(getVerifiedSession({ force: true }), 8_000, "Sesi pengguna terlalu lama diverifikasi.");
  if (!verified?.session?.access_token || !verified?.user?.id) throw new Error("Silakan masuk kembali untuk mengelola domain.");
  const sites = await withDeadline(listUserSites(verified.user.id), 8_000, "Daftar situs terlalu lama dimuat.");
  const preferred = storedSiteId();
  const active = validSite(window.__ngebloggingActiveSite);
  const site = sites.find((item) => item.id === preferred) || sites.find((item) => item.id === active?.id) || sites[0] || null;
  if (!site) throw new Error("Buat situs terlebih dahulu untuk memperoleh subdomain gratis.");
  return { token: verified.session.access_token, user: verified.user, site, sites: sites.slice(0, MAX_ACCOUNT_SITES) };
}

async function request(path, token, body = null) {
  const response = await withDeadline(fetch(path, {
    method: body ? "POST" : "GET",
    cache: "no-store",
    headers: {
      accept: "application/json",
      "cache-control": "no-cache",
      authorization: `Bearer ${token}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }), DEADLINE_MS, "Layanan domain melewati batas waktu. Subdomain gratis tetap aktif.");
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = Object.assign(new Error(payload.error || "Permintaan domain belum berhasil."), {
      code: payload.code || "DOMAIN_REQUEST_FAILED",
      status: response.status,
      payload,
    });
    if ([401, 403].includes(response.status)) window.dispatchEvent(new CustomEvent("ngeblogging:session-invalid", { detail: payload }));
    throw error;
  }
  return payload;
}

function domainView() {
  const candidates = [...document.querySelectorAll(".sn-main > .sn-view-pad")].filter((view) => {
    const directTitle = view.querySelector(":scope > .sn-page-title h1")?.textContent?.trim();
    return directTitle === "Domain & publikasi" || view.dataset.domainManagerV78 || view.dataset.domainFullZoneAuthority;
  });
  return candidates.find((view) => view.isConnected && !view.hidden && getComputedStyle(view).display !== "none") || candidates.at(-1) || null;
}

function currentSite(state) {
  return state.sites.find((site) => site.id === state.selectedSiteId) || state.site || state.sites[0] || null;
}

function currentDomains(state) {
  return state.domainsBySite.get(currentSite(state)?.id) || [];
}

function addresses(domain) {
  const values = domain?.ownership_verification?.additional_hostnames;
  return Array.isArray(values) ? values.filter((item) => item?.hostname).map((item) => ({
    host: String(item.host || ""), hostname: String(item.hostname || ""), enabled: item.enabled !== false,
  })) : [];
}

function nameservers(domain) {
  const values = domain?.ownership_verification?.required_name_servers;
  return Array.isArray(values) ? values.map((value) => String(value || "").trim()).filter(Boolean) : [];
}

function activeDomain(domain) {
  return Boolean(domain?.status === "active" && domain?.provider_status === "active" && domain?.ssl_status === "active");
}

function statusMeta(domain) {
  if (activeDomain(domain)) return ["Aktif", "active"];
  if (domain?.status === "failed") return ["Perlu perhatian", "danger"];
  if (domain?.status === "pending_deletion") return ["Menunggu pelepasan", "warning"];
  return ["Verifikasi nameserver", "pending"];
}

function sortedDomains(list) {
  return [...list].sort((left, right) => Number(Boolean(right.is_primary)) - Number(Boolean(left.is_primary)) || Number(activeDomain(right)) - Number(activeDomain(left)) || left.hostname.localeCompare(right.hostname));
}

function metrics(state) {
  const all = [...state.domainsBySite.values()].flat();
  return {
    sites: state.sites.length,
    domains: all.length,
    active: all.filter(activeDomain).length,
    issues: all.filter((domain) => domain.status === "failed" || domain.error_message).length,
  };
}

function siteSelector(state) {
  const site = currentSite(state);
  return `<section class="d78-workspace"><div><small>SITUS YANG DIKELOLA</small><h2>${escapeHtml(site?.name || "Pilih situs")}</h2><p>${site?.slug ? `${escapeHtml(site.slug)}.ngeblogging.com` : "Belum ada situs aktif"}</p></div><label><span>Pilih dari maksimal ${MAX_ACCOUNT_SITES} situs</span><select data-d78-site-select>${state.sites.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === site?.id ? "selected" : ""}>${escapeHtml(item.name)} — ${escapeHtml(item.slug)}.ngeblogging.com</option>`).join("")}</select></label></section>`;
}

function freeCard(state) {
  const site = currentSite(state);
  const published = site?.status === "active" && site?.is_public;
  return `<section class="d78-free-card"><span>${icon("globe")}</span><div><small>SUBDOMAIN GRATIS · TETAP ADA</small><h2>${site?.slug ? `${escapeHtml(site.slug)}.ngeblogging.com` : "Menunggu situs"}</h2><p>${published ? "Alamat gratis aktif permanen. Domain pribadi dapat dijadikan alamat utama tanpa menghapus URL lama." : "Alamat gratis sudah dicadangkan untuk situs ini. Terbitkan ketika konten siap."}</p></div><aside><i class="${published ? "active" : "draft"}">${published ? "Aktif" : "Draf"}</i>${site?.slug ? `<a href="https://${escapeHtml(site.slug)}.ngeblogging.com?ngeblogging-free-preview=1" target="_blank" rel="noreferrer">${icon("external")}Buka</a>` : ""}<button data-d78-action="publication" ${state.busy ? "disabled" : ""}>${published ? "Jadikan draf" : "Terbitkan"}</button></aside></section>`;
}

function registerPanel(state) {
  const ready = state.config?.enabled === true && state.token && currentSite(state)?.id;
  return `<section class="d78-register"><header><span>${icon("plus")}</span><div><small>DOMAIN BARU</small><h2>Hubungkan domain pribadi</h2><p>Tambahkan lebih dari satu domain pada situs yang dipilih. Setiap domain memperoleh zone, HTTPS, dan pemeriksaan tersendiri.</p></div></header><form data-d78-form="domain"><label><span>Nama domain</span><input name="hostname" placeholder="domainanda.com" inputmode="url" autocomplete="off" ${ready ? "" : "disabled"}/><small>Masukkan domain yang sudah dimiliki, tanpa https:// dan tanpa path.</small></label><button ${ready && state.busy !== "register" ? "" : "disabled"}>${state.busy === "register" ? "Menghubungkan…" : `${icon("plus")}Tambahkan domain`}</button></form><div class="d78-provider-note">${icon("shield")}Tidak memakai Cloudflare for SaaS. Setiap domain menggunakan Full Zone gratis dan dua nameserver dari Cloudflare.</div></section>`;
}

function addressRow(domain, item, state) {
  return `<article class="d78-address-row"><div><b>${escapeHtml(item.hostname)}</b><small>${item.enabled ? "Routing aktif" : "Routing nonaktif"}</small></div><button class="switch ${item.enabled ? "on" : ""}" data-d78-action="toggle-address" data-domain-id="${escapeHtml(domain.id)}" data-host="${escapeHtml(item.host)}" data-enabled="${item.enabled}" ${state.busy ? "disabled" : ""}><span></span>${item.enabled ? "Aktif" : "Nonaktif"}</button>${item.host === "www" ? "" : `<button class="icon danger" data-d78-action="remove-address" data-domain-id="${escapeHtml(domain.id)}" data-host="${escapeHtml(item.host)}" data-hostname="${escapeHtml(item.hostname)}" ${state.busy ? "disabled" : ""}>${icon("trash")}</button>`}</article>`;
}

function domainCard(domain, state) {
  const [label, tone] = statusMeta(domain);
  const ns = nameservers(domain);
  const items = addresses(domain);
  const www = items.find((item) => item.host === "www") || { host: "www", hostname: `www.${domain.hostname}`, enabled: false };
  const extra = items.filter((item) => item.host !== "www");
  const active = activeDomain(domain);
  return `<article class="d78-domain-card" data-domain-id="${escapeHtml(domain.id)}"><header><div class="d78-domain-name"><span>${icon("globe")}</span><div><small>${domain.is_primary ? "ALAMAT UTAMA" : "DOMAIN TERHUBUNG"}</small><h3>${escapeHtml(domain.hostname)}</h3><p>${active ? "Zone, HTTPS, dan routing Cloudflare aktif." : "Ganti nameserver di registrar lalu periksa koneksi."}</p></div></div><div class="d78-domain-badges">${domain.is_primary ? '<i class="primary">Utama</i>' : ""}<i class="${tone}">${label}</i></div></header>${!active && ns.length ? `<section class="d78-ns"><div><small>DUA NAMESERVER RESMI</small><b>Salin ke registrar domain</b><button data-d78-action="copy-all" data-values="${escapeHtml(ns.join("\n"))}">${icon("copy")}Salin semua</button></div>${ns.map((value, index) => `<p><span>Nameserver ${index + 1}</span><code>${escapeHtml(value)}</code><button data-d78-action="copy" data-value="${escapeHtml(value)}">${icon("copy")}</button></p>`).join("")}</section>` : ""}${domain.error_message ? `<p class="d78-domain-error">${escapeHtml(domain.error_message)}</p>` : ""}<section class="d78-domain-actions">${active ? `<a href="https://${escapeHtml(domain.hostname)}" target="_blank" rel="noreferrer">${icon("external")}Buka di browser</a>` : ""}<button data-d78-action="refresh" data-domain-id="${escapeHtml(domain.id)}" ${state.busy ? "disabled" : ""}>${icon("refresh")}Periksa DNS & HTTPS</button>${active && !domain.is_primary ? `<button data-d78-action="primary" data-domain-id="${escapeHtml(domain.id)}" ${state.busy ? "disabled" : ""}>${icon("check")}Jadikan alamat utama</button>` : ""}<button class="danger" data-d78-action="remove" data-domain-id="${escapeHtml(domain.id)}" data-hostname="${escapeHtml(domain.hostname)}" ${state.busy ? "disabled" : ""}>${icon("trash")}Lepaskan</button></section>${active ? `<section class="d78-routing"><header><div><small>PENGATURAN ALAMAT</small><h4>www dan subdomain</h4><p>Aktifkan alamat tambahan atau gunakan subdomain bertingkat. Setiap alamat diarahkan ke situs yang sama.</p></div></header>${addressRow(domain, www, state)}${extra.map((item) => addressRow(domain, item, state)).join("")}<form data-d78-form="address" data-domain-id="${escapeHtml(domain.id)}"><label><span>Alamat tambahan</span><div><input name="host" placeholder="nama atau bagian.bertingkat" autocomplete="off"/><strong>.${escapeHtml(domain.hostname)}</strong></div><small>Gunakan label DNS yang valid. Sistem mendukung beberapa tingkat subdomain.</small></label><button ${state.busy ? "disabled" : ""}>${icon("plus")}Tambahkan</button></form></section>` : ""}</article>`;
}

function domainsPanel(state) {
  const list = sortedDomains(currentDomains(state));
  return `<section class="d78-domain-list"><header><div><small>PORTOFOLIO DOMAIN</small><h2>${list.length ? `${list.length} domain pada situs ini` : "Belum ada domain pribadi"}</h2><p>Setiap domain memiliki status DNS, HTTPS, alamat utama, www, dan subdomain yang dikelola secara terpisah.</p></div></header>${list.length ? list.map((domain) => domainCard(domain, state)).join("") : `<div class="d78-empty">${icon("link")}<h3>Hubungkan domain pertama</h3><p>Subdomain gratis tetap dapat digunakan sebelum dan sesudah domain pribadi aktif.</p></div>`}</section>`;
}

function auditPanel(state) {
  const results = state.auditResults || [];
  return `<section class="d78-audit"><header><div><small>PEMERIKSAAN AKUN</small><h2>Periksa seluruh situs satu per satu</h2><p>Memeriksa daftar domain dan keterjangkauan alamat publik tanpa mengubah domain utama.</p></div><button data-d78-action="audit" ${state.busy ? "disabled" : ""}>${state.busy === "audit" ? `Memeriksa ${state.auditProgress || 0}/${state.sites.length}…` : `${icon("pulse")}Periksa semua situs`}</button></header>${results.length ? `<div class="d78-audit-results">${results.map((item) => `<article><span class="${item.reachable ? "ok" : "warn"}">${item.reachable ? icon("check") : icon("shield")}</span><div><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.address)}</small></div><i>${item.reachable ? "Dapat dijangkau" : "Belum terjangkau"}</i></article>`).join("")}</div>` : ""}</section>`;
}

function render(state) {
  if (!state.root?.isConnected) return;
  const site = currentSite(state);
  const counts = metrics(state);
  state.root.hidden = false;
  state.root.innerHTML = `<div class="d78-shell" data-release="${RELEASE}" data-compatibility="${COMPATIBILITY_RELEASE}"><header class="d78-title"><div><small>NGEBLOGGING STUDIO</small><h1>Domain & publikasi</h1><p>Kelola subdomain gratis, beberapa domain pribadi, alamat utama, www, subdomain bertingkat, HTTPS, dan pemeriksaan publik dari satu tempat.</p></div><button data-d78-action="reload">${icon("refresh")}Muat ulang</button></header>${state.error ? `<section class="d78-notice"><div><b>Panel domain berhenti menunggu.</b><p>${escapeHtml(state.error)}</p></div><button data-d78-action="reload">Coba lagi</button></section>` : ""}${siteSelector(state)}<section class="d78-metrics"><article>${icon("sites")}<span>Situs akun</span><b>${counts.sites}/${MAX_ACCOUNT_SITES}</b></article><article>${icon("link")}<span>Domain tersimpan</span><b>${counts.domains}</b></article><article>${icon("check")}<span>Domain aktif</span><b>${counts.active}</b></article><article>${icon("shield")}<span>Perlu perhatian</span><b>${counts.issues}</b></article></section>${freeCard(state)}${registerPanel(state)}${domainsPanel(state)}${auditPanel(state)}</div>`;
}

async function loadSiteDomains(state, siteId, { silent = false } = {}) {
  if (!siteId || state.loadingSites.has(siteId)) return;
  state.loadingSites.add(siteId);
  if (!silent) { state.phase = "checking"; state.error = ""; render(state); }
  try {
    const payload = await request(`/api/domains/list?siteId=${encodeURIComponent(siteId)}`, state.token);
    state.config = payload;
    state.domainsBySite.set(siteId, Array.isArray(payload.domains) ? payload.domains : []);
  } finally {
    state.loadingSites.delete(siteId);
    if (!silent) { state.phase = "ready"; render(state); }
  }
}

async function loadAllSummaries(state) {
  const queue = [...state.sites];
  const workers = Array.from({ length: Math.min(3, queue.length) }, async () => {
    while (queue.length) {
      const site = queue.shift();
      if (!site || state.domainsBySite.has(site.id)) continue;
      try { await loadSiteDomains(state, site.id, { silent: true }); } catch { state.domainsBySite.set(site.id, []); }
      render(state);
    }
  });
  await Promise.all(workers);
}

async function load(state) {
  const run = ++state.run;
  state.error = "";
  state.phase = "checking";
  render(state);
  try {
    const account = await accountState();
    if (run !== state.run) return;
    state.token = account.token;
    state.user = account.user;
    state.site = account.site;
    state.sites = account.sites;
    if (!state.selectedSiteId || !state.sites.some((site) => site.id === state.selectedSiteId)) state.selectedSiteId = account.site.id;
    state.phase = "ready";
    render(state);
    await loadSiteDomains(state, state.selectedSiteId);
    loadAllSummaries(state).catch(() => null);
  } catch (error) {
    if (run !== state.run) return;
    state.phase = "error";
    state.error = error.message || "Data domain belum dapat dimuat.";
    if (isSessionReauthError(error)) window.dispatchEvent(new CustomEvent("ngeblogging:session-invalid", { detail: { message: state.error } }));
    render(state);
  }
}

function toast(message, danger = false) {
  document.querySelector(".d78-toast")?.remove();
  const node = document.createElement("div");
  node.className = `d78-toast ${danger ? "danger" : ""}`;
  node.textContent = message;
  document.body.append(node);
  window.setTimeout(() => node.remove(), 3800);
}

async function mutate(state, key, operation, message) {
  if (state.busy) return;
  state.busy = key;
  state.error = "";
  render(state);
  try {
    await operation();
    if (message) toast(message);
    await loadSiteDomains(state, state.selectedSiteId);
  } catch (error) {
    state.error = error.message || "Perubahan belum berhasil.";
    toast(state.error, true);
  } finally {
    state.busy = "";
    render(state);
  }
}

async function copy(value) {
  try { await navigator.clipboard.writeText(value); toast("Nilai DNS disalin."); }
  catch { toast("Nilai belum dapat disalin pada perangkat ini.", true); }
}

async function probePublic(url) {
  try {
    await withDeadline(fetch(url, { method: "HEAD", mode: "no-cors", cache: "no-store" }), PUBLIC_PROBE_MS, "Probe publik melewati batas waktu.");
    return true;
  } catch { return false; }
}

async function auditAll(state) {
  if (state.busy) return;
  state.busy = "audit";
  state.auditProgress = 0;
  state.auditResults = [];
  render(state);
  try {
    for (const site of state.sites) {
      try { await loadSiteDomains(state, site.id, { silent: true }); } catch { state.domainsBySite.set(site.id, []); }
      const urls = [`https://${site.slug}.ngeblogging.com?ngeblogging-free-preview=1`, ...sortedDomains(state.domainsBySite.get(site.id) || []).filter(activeDomain).map((domain) => `https://${domain.hostname}`)];
      for (const url of urls) {
        state.auditResults.push({ name: site.name, address: url.replace(/^https:\/\//, ""), reachable: await probePublic(url) });
      }
      state.auditProgress += 1;
      render(state);
    }
  } finally {
    state.busy = "";
    render(state);
  }
}

async function submit(state, event) {
  const form = event.target.closest("form[data-d78-form]");
  if (!form || !state.root.contains(form)) return;
  event.preventDefault();
  const data = new FormData(form);
  if (form.dataset.d78Form === "domain") {
    const hostname = String(data.get("hostname") || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/[/?#].*$/, "");
    if (!hostname) return toast("Masukkan nama domain.", true);
    return mutate(state, "register", () => request("/api/domains/register", state.token, { siteId: currentSite(state).id, hostname }), "Domain ditambahkan. Salin dua nameserver ke registrar.");
  }
  const domainId = form.dataset.domainId || "";
  const host = String(data.get("host") || "").trim().toLowerCase();
  if (!domainId || !host) return toast("Masukkan nama alamat tambahan.", true);
  return mutate(state, `address-${domainId}`, () => request("/api/domains/address", state.token, { domainId, host, enabled: true }), "Alamat tambahan diaktifkan.");
}

async function click(state, event) {
  const button = event.target.closest("[data-d78-action]");
  if (!button || !state.root.contains(button)) return;
  const action = button.dataset.d78Action;
  if (action === "reload") return load(state);
  if (action === "copy") return copy(button.dataset.value || "");
  if (action === "copy-all") return copy(button.dataset.values || "");
  if (action === "audit") return auditAll(state);
  if (action === "publication") {
    const site = currentSite(state);
    const published = site?.status === "active" && site?.is_public;
    return mutate(state, "publication", async () => {
      const updated = await setSitePublication(site.id, !published);
      state.sites = state.sites.map((item) => item.id === site.id ? { ...item, ...updated } : item);
      state.site = { ...site, ...updated };
      window.__ngebloggingActiveSite = state.site;
    }, published ? "Situs kembali menjadi draf." : "Subdomain gratis sudah aktif.");
  }
  const domainId = button.dataset.domainId || "";
  const domain = currentDomains(state).find((item) => item.id === domainId);
  if (!domain) return;
  if (action === "refresh" || action === "primary") return mutate(state, `${action}-${domainId}`, () => request("/api/domains/refresh", state.token, { domainId }), action === "primary" ? "Domain dijadikan alamat utama setelah pemeriksaan selesai." : "Pemeriksaan DNS dan HTTPS selesai.");
  if (action === "remove") {
    if (!confirm(`Lepaskan ${button.dataset.hostname || domain.hostname} dari situs ini? Subdomain gratis tetap ada.`)) return;
    return mutate(state, `remove-${domainId}`, () => request("/api/domains/remove", state.token, { domainId }), "Tahap pelepasan domain dimulai.");
  }
  if (action === "toggle-address") {
    const host = button.dataset.host || "";
    const enabled = button.dataset.enabled === "true";
    return mutate(state, `toggle-${domainId}-${host}`, () => request("/api/domains/address", state.token, { domainId, host, enabled: !enabled }), enabled ? "Alamat dinonaktifkan." : "Alamat diaktifkan.");
  }
  if (action === "remove-address") {
    const host = button.dataset.host || "";
    if (!confirm(`Hapus ${button.dataset.hostname || host}?`)) return;
    return mutate(state, `remove-${domainId}-${host}`, () => request("/api/domains/address", state.token, { domainId, host, remove: true }), "Alamat tambahan dihapus.");
  }
}

async function change(state, event) {
  const select = event.target.closest("[data-d78-site-select]");
  if (!select || !state.root.contains(select)) return;
  const site = state.sites.find((item) => item.id === select.value);
  if (!site) return;
  state.selectedSiteId = site.id;
  state.site = site;
  setActiveSiteId(site.id);
  window.__ngebloggingActiveSite = site;
  window.dispatchEvent(new CustomEvent("ngeblogging:active-site-change", { detail: { site } }));
  render(state);
  try { await loadSiteDomains(state, site.id); } catch (error) { state.error = error.message || "Domain situs belum dapat dimuat."; render(state); }
}

function mount(view) {
  document.querySelectorAll(".d78-root,.d75-root").forEach((node) => {
    if (!view.contains(node)) node.remove();
  });
  let root = view.querySelector(":scope > .d78-root, :scope > .d75-root");
  if (!root) {
    root = document.createElement("div");
    root.className = "d75-root d78-root";
    view.append(root);
  } else root.className = "d75-root d78-root";
  view.classList.remove("sn-domain-view-v35", "dfz-root", "domain-full-zone-view");
  [...view.children].forEach((child) => {
    if (child !== root) {
      child.hidden = true;
      child.setAttribute("aria-hidden", "true");
      child.style.setProperty("display", "none", "important");
      child.dataset.domainAuthoritySuperseded = RELEASE;
    }
  });
  root.hidden = false;
  view.dataset.domainManagerV78 = RELEASE;
  view.dataset.domainAuthority = RELEASE;
  if (controller?.view === view) {
    controller.root = root;
    controller.root.hidden = false;
    return controller;
  }
  controller = {
    view, root, token: "", user: null, site: validSite(window.__ngebloggingActiveSite), sites: [], selectedSiteId: storedSiteId(),
    domainsBySite: new Map(), loadingSites: new Set(), config: null, phase: "checking", error: "", busy: "", run: 0,
    auditResults: [], auditProgress: 0,
  };
  root.addEventListener("submit", (event) => submit(controller, event));
  root.addEventListener("click", (event) => click(controller, event));
  root.addEventListener("change", (event) => change(controller, event));
  load(controller);
  return controller;
}

function scan() {
  document.documentElement.dataset.domainAuthorityV75 = COMPATIBILITY_RELEASE;
  document.documentElement.dataset.domainManagerV78 = RELEASE;
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
window.addEventListener("pageshow", schedule);
window.addEventListener("ngeblogging:active-site-change", () => controller && load(controller));
scan();
