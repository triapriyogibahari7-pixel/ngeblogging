import { supabase, supabaseConfigured } from "./lib/supabase.js";
import { ACTIVE_SITE_STORAGE_KEY, listUserSites, setSitePublication } from "./lib/studio-data.js";

const RELEASE = "domain-authority-v75-20260727";
const DEADLINE_MS = 10_000;
const controllers = new WeakMap();
let frame = 0;

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
    external: '<path d="M14 5h5v5M19 5l-9 9"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
    check: '<path d="M5 12l4 4L19 6"/>',
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

function activeSiteId() {
  try { return localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) || ""; } catch { return ""; }
}

function validSite(value) {
  return value?.id && value?.slug ? value : null;
}

async function accountState() {
  if (!supabaseConfigured || !supabase) throw new Error("Penyimpanan cloud belum dikonfigurasi.");
  const { data, error } = await withDeadline(supabase.auth.getSession(), 6_000, "Sesi pengguna terlalu lama dimuat.");
  if (error) throw error;
  const session = data.session;
  if (!session?.access_token || !session.user?.id) throw new Error("Silakan masuk kembali untuk mengelola domain.");
  const preferredId = activeSiteId();
  let site = validSite(window.__ngebloggingActiveSite);
  if (site && preferredId && site.id !== preferredId) site = null;
  let sites = site ? [site] : await withDeadline(listUserSites(session.user.id), 7_000, "Daftar situs terlalu lama dimuat.");
  site ||= sites.find((item) => item.id === preferredId) || sites[0] || null;
  if (!site) throw new Error("Buat situs terlebih dahulu untuk memperoleh subdomain gratis.");
  return { token: session.access_token, user: session.user, site, sites };
}

async function request(path, token, body = null) {
  const response = await withDeadline(fetch(path, {
    method: body ? "POST" : "GET",
    cache: "no-store",
    headers: {
      accept: "application/json", "cache-control": "no-cache", authorization: `Bearer ${token}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }), DEADLINE_MS, "Layanan domain melewati batas waktu. Subdomain gratis tetap aktif.");
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || "Permintaan domain belum berhasil.");
    error.code = payload.code || "DOMAIN_REQUEST_FAILED";
    error.payload = payload;
    throw error;
  }
  return payload;
}

function domainView() {
  return [...document.querySelectorAll(".sn-main > .sn-view-pad")].find((view) => (
    view.querySelector(":scope > .sn-page-title h1")?.textContent?.trim() === "Domain & publikasi"
    || view.querySelector(":scope .dfz-title h1")?.textContent?.trim() === "Domain & publikasi"
    || view.dataset.domainFullZoneAuthority
  )) || null;
}

function rootDomain(domains) {
  return domains.find((domain) => domain.provider === "cloudflare-full-zone") || domains[0] || null;
}

function nameservers(domain) {
  const values = domain?.ownership_verification?.required_name_servers;
  return Array.isArray(values) ? values.map((value) => String(value || "").trim()).filter(Boolean) : [];
}

function addresses(domain) {
  const values = domain?.ownership_verification?.additional_hostnames;
  return Array.isArray(values) ? values.filter((item) => item?.hostname).map((item) => ({
    host: String(item.host || ""), hostname: String(item.hostname), enabled: item.enabled !== false,
  })) : [];
}

function activeDomain(domain) {
  return Boolean(domain?.status === "active" && domain?.provider_status === "active" && domain?.ssl_status === "active");
}

function status(domain) {
  if (!domain) return ["Belum terhubung", "idle"];
  if (activeDomain(domain)) return ["Aktif", "active"];
  if (domain.status === "failed") return ["Perlu perhatian", "danger"];
  if (domain.status === "pending_deletion") return ["Menunggu pelepasan", "warning"];
  return ["Verifikasi nameserver", "pending"];
}

function freeCard(controller) {
  const site = controller.site;
  const published = site?.status === "active" && site?.is_public;
  return `<section class="d75-free-card">
    <span>${icon("globe")}</span><div><small>SUBDOMAIN GRATIS · TETAP ADA</small><h2>${site?.slug ? `${escapeHtml(site.slug)}.ngeblogging.com` : "Menunggu situs"}</h2><p>${published ? "Aktif permanen. Setelah domain pribadi aktif, URL lama mengalihkan path yang sama ke domain utama." : "Alamat gratis sudah menjadi milik situs ini. Terbitkan saat konten siap."}</p></div>
    <aside><i class="${published ? "active" : "draft"}">${published ? "Aktif" : "Draf"}</i>${site?.slug ? `<a href="https://${escapeHtml(site.slug)}.ngeblogging.com?ngeblogging-free-preview=1" target="_blank" rel="noreferrer">${icon("external")}Preview</a>` : ""}<button data-d75-action="publication" ${controller.busy ? "disabled" : ""}>${published ? "Jadikan draf" : "Terbitkan"}</button></aside>
  </section>`;
}

function primaryPanel(controller, domain) {
  if (controller.phase === "checking") return `<div class="d75-static-state">${icon("shield")}<div><b>Menyiapkan pengelolaan domain</b><p>Subdomain gratis sudah ditampilkan. Pemeriksaan domain pribadi dibatasi maksimal ${DEADLINE_MS / 1000} detik dan tidak memakai spinner tanpa akhir.</p></div></div>`;
  if (!domain) {
    const ready = controller.config?.enabled === true && controller.token && controller.site?.id;
    return `<form class="d75-domain-form" data-d75-form="domain"><label><span>Domain pribadi</span><input name="hostname" placeholder="contoh: budi.com" inputmode="url" autocomplete="off" ${ready ? "" : "disabled"}/><small>Gunakan domain yang sudah Anda beli. Sistem Full Zone gratis akan memberikan dua nameserver.</small></label><button ${ready || controller.busy === "register" ? "" : "disabled"}>${controller.busy === "register" ? "Menghubungkan…" : `${icon("plus")}Hubungkan domain`}</button></form>
      ${ready ? `<div class="d75-free-note">${icon("check")}Tidak memakai Cloudflare for SaaS. Pengguna mengganti dua nameserver di registrar.</div>` : `<div class="d75-error-inline">${icon("shield")}Layanan domain belum siap digunakan pada sesi ini. Tekan Coba lagi.</div>`}`;
  }
  const [label, tone] = status(domain);
  const ns = nameservers(domain);
  return `<div class="d75-domain-state"><div class="d75-host"><span>${icon("globe")}</span><div><small>DOMAIN PRIBADI</small><h3>${escapeHtml(domain.hostname)}</h3><p>${activeDomain(domain) ? "Domain dan HTTPS aktif. Subdomain gratis tetap tersimpan sebagai alamat lama." : "Ganti nameserver di registrar, lalu tekan Periksa koneksi."}</p></div><i class="${tone}">${label}</i></div>
    ${!activeDomain(domain) && ns.length ? `<div class="d75-ns"><header><div><small>DUA NAMESERVER RESMI</small><b>Salin ke registrar domain</b></div><button data-d75-action="copy-all">${icon("copy")}Salin semua</button></header>${ns.map((value, index) => `<div><span>Nameserver ${index + 1}</span><code>${escapeHtml(value)}</code><button data-d75-action="copy" data-value="${escapeHtml(value)}">${icon("copy")}</button></div>`).join("")}</div>` : ""}
    ${domain.error_message ? `<p class="d75-domain-error">${escapeHtml(domain.error_message)}</p>` : ""}
    <div class="d75-actions">${activeDomain(domain) ? `<a href="https://${escapeHtml(domain.hostname)}" target="_blank" rel="noreferrer">${icon("external")}Buka domain</a>` : ""}<button data-d75-action="refresh" ${controller.busy ? "disabled" : ""}>${icon("refresh")}Periksa koneksi</button><button class="danger" data-d75-action="remove" ${controller.busy ? "disabled" : ""}>${icon("trash")}Lepaskan</button></div></div>`;
}

function addressPanel(controller, domain) {
  if (!activeDomain(domain)) return `<div class="d75-locked">${icon("shield")}<div><b>Alamat tambahan belum dibuka</b><p>Aktifkan domain utama terlebih dahulu. Bagian www dan subdomain lain bersifat opsional.</p></div></div>`;
  const items = addresses(domain);
  return `<form class="d75-address-form" data-d75-form="address"><label><span>Nama alamat</span><div><input name="host" placeholder="www, blog, toko, atau docs.tim"/><strong>.${escapeHtml(domain.hostname)}</strong></div></label><button ${controller.busy ? "disabled" : ""}>${icon("plus")}Tambahkan</button></form><div class="d75-addresses">${items.length ? items.map((item) => `<article><div><b>${escapeHtml(item.hostname)}</b><small>${item.enabled ? "Aktif" : "Nonaktif"}</small></div><button data-d75-action="toggle-address" data-host="${escapeHtml(item.host)}" data-enabled="${item.enabled}">${item.enabled ? "Nonaktifkan" : "Aktifkan"}</button><button class="danger" data-d75-action="remove-address" data-host="${escapeHtml(item.host)}" data-hostname="${escapeHtml(item.hostname)}">${icon("trash")}</button></article>`).join("") : `<p class="d75-empty">Belum ada alamat tambahan.</p>`}</div>`;
}

function render(controller) {
  if (!controller.root?.isConnected) return;
  const domain = rootDomain(controller.domains);
  controller.root.hidden = false;
  controller.root.innerHTML = `<div class="d75-shell" data-release="${RELEASE}"><header class="d75-title"><div><small>NGEBLOGGING STUDIO</small><h1>Domain & publikasi</h1><p>Subdomain gratis tetap menjadi identitas situs. Domain pribadi adalah alamat utama tambahan melalui Full Zone gratis.</p></div><button data-d75-action="reload">${icon("refresh")}Coba lagi</button></header>${freeCard(controller)}${controller.error ? `<section class="d75-notice"><div><b>Panel domain berhenti menunggu.</b><p>${escapeHtml(controller.error)}</p></div><button data-d75-action="reload">Coba lagi</button></section>` : ""}<section class="d75-grid"><article class="d75-panel"><header><span>${icon("link")}</span><div><small>MANAJEMEN DOMAIN</small><h2>Hubungkan domain pribadi</h2><p>Masukkan domain, terima dua nameserver, lalu verifikasi otomatis.</p></div></header>${primaryPanel(controller, domain)}</article><article class="d75-panel ${activeDomain(domain) ? "" : "disabled"}"><header><span>${icon("globe")}</span><div><small>ALAMAT LANJUTAN</small><h2>www dan subdomain lain</h2><p>Tambahkan alamat tambahan setelah domain utama aktif.</p></div></header>${addressPanel(controller, domain)}</article></section></div>`;
}

async function load(controller) {
  const run = ++controller.run;
  controller.phase = "checking"; controller.error = ""; controller.config = null; controller.domains = [];
  const current = validSite(window.__ngebloggingActiveSite);
  if (current) controller.site = current;
  render(controller);
  try {
    const account = await accountState();
    if (run !== controller.run) return;
    controller.token = account.token; controller.site = account.site; controller.sites = account.sites;
    controller.phase = "ready"; render(controller);
    const payload = await request(`/api/domains/list?siteId=${encodeURIComponent(account.site.id)}`, account.token);
    if (run !== controller.run) return;
    controller.config = payload; controller.domains = Array.isArray(payload.domains) ? payload.domains : [];
  } catch (error) {
    if (run !== controller.run) return;
    controller.phase = "error"; controller.error = error.message || "Data domain belum dapat dimuat.";
    controller.config = error.payload || null; controller.domains = [];
  } finally { if (run === controller.run) render(controller); }
}

async function mutate(controller, key, operation, message) {
  if (controller.busy) return;
  controller.busy = key; render(controller);
  try { await operation(); if (message) toast(message); await load(controller); }
  catch (error) { controller.error = error.message || "Perubahan belum berhasil."; toast(controller.error, true); }
  finally { controller.busy = ""; render(controller); }
}

function toast(message, danger = false) {
  document.querySelector(".d75-toast")?.remove();
  const node = document.createElement("div"); node.className = `d75-toast ${danger ? "danger" : ""}`; node.textContent = message;
  document.body.append(node); window.setTimeout(() => node.remove(), 3600);
}

async function copy(value) {
  try { await navigator.clipboard.writeText(value); toast("Nilai DNS disalin."); }
  catch { toast("Nilai belum dapat disalin pada perangkat ini.", true); }
}

async function submit(controller, event) {
  const form = event.target.closest("form[data-d75-form]");
  if (!form || !controller.root.contains(form)) return;
  event.preventDefault();
  const data = new FormData(form); const domain = rootDomain(controller.domains);
  if (form.dataset.d75Form === "domain") {
    const hostname = String(data.get("hostname") || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/[/?#].*$/, "");
    if (!hostname) return toast("Masukkan domain pribadi.", true);
    return mutate(controller, "register", () => request("/api/domains/register", controller.token, { siteId: controller.site.id, hostname }), "Domain ditambahkan. Salin dua nameserver ke registrar.");
  }
  const host = String(data.get("host") || "").trim().toLowerCase();
  if (!host || !domain) return toast("Masukkan nama alamat.", true);
  return mutate(controller, "address", () => request("/api/domains/address", controller.token, { domainId: domain.id, host, enabled: true }), "Alamat tambahan diaktifkan.");
}

async function click(controller, event) {
  const button = event.target.closest("[data-d75-action]");
  if (!button || !controller.root.contains(button)) return;
  const action = button.dataset.d75Action; const domain = rootDomain(controller.domains);
  if (action === "reload") return load(controller);
  if (action === "copy") return copy(button.dataset.value || "");
  if (action === "copy-all") return copy(nameservers(domain).join("\n"));
  if (action === "publication") {
    const published = controller.site?.status === "active" && controller.site?.is_public;
    return mutate(controller, "publication", async () => {
      const updated = await setSitePublication(controller.site.id, !published);
      controller.site = { ...controller.site, ...updated }; window.__ngebloggingActiveSite = controller.site;
    }, published ? "Situs kembali menjadi draf." : "Subdomain gratis sudah aktif.");
  }
  if (!domain) return;
  if (action === "refresh") return mutate(controller, "refresh", () => request("/api/domains/refresh", controller.token, { domainId: domain.id }), "Pemeriksaan domain selesai.");
  if (action === "remove") {
    if (!confirm(`Lepaskan ${domain.hostname} dari situs ini?`)) return;
    return mutate(controller, "remove", () => request("/api/domains/remove", controller.token, { domainId: domain.id }), "Domain dilepaskan; subdomain gratis tetap ada.");
  }
  if (action === "toggle-address") {
    const host = button.dataset.host || ""; const enabled = button.dataset.enabled === "true";
    return mutate(controller, `toggle-${host}`, () => request("/api/domains/address", controller.token, { domainId: domain.id, host, enabled: !enabled }), enabled ? "Alamat dinonaktifkan." : "Alamat diaktifkan.");
  }
  if (action === "remove-address") {
    const host = button.dataset.host || ""; if (!confirm(`Hapus ${button.dataset.hostname || host}?`)) return;
    return mutate(controller, `remove-${host}`, () => request("/api/domains/address", controller.token, { domainId: domain.id, host, remove: true }), "Alamat tambahan dihapus.");
  }
}

function mount(view) {
  let controller = controllers.get(view);
  let root = view.querySelector(":scope > .d75-root");
  if (!root) { root = document.createElement("div"); root.className = "d75-root"; view.append(root); }
  [...view.children].forEach((child) => { if (child !== root) { child.hidden = true; child.dataset.domainAuthoritySuperseded = RELEASE; } });
  root.hidden = false; view.dataset.domainAuthority = RELEASE;
  if (controller) { controller.root = root; return controller; }
  controller = { view, root, token: "", site: validSite(window.__ngebloggingActiveSite), sites: [], config: null, domains: [], phase: "checking", error: "", busy: "", run: 0 };
  root.addEventListener("submit", (event) => submit(controller, event));
  root.addEventListener("click", (event) => click(controller, event));
  controllers.set(view, controller); load(controller); return controller;
}

function scan() {
  document.documentElement.dataset.domainAuthorityV75 = RELEASE;
  const view = domainView(); if (view) mount(view);
}

function schedule() { cancelAnimationFrame(frame); frame = requestAnimationFrame(scan); }
new MutationObserver((mutations) => { if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule(); }).observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener("pageshow", schedule);
window.addEventListener("ngeblogging:active-site-change", () => { const view = domainView(); const controller = view && controllers.get(view); if (controller) load(controller); });
document.addEventListener("click", (event) => { if (event.target.closest(".sn-workspace,.sn-sites-list button")) window.setTimeout(() => { const view = domainView(); const controller = view && controllers.get(view); if (controller) load(controller); }, 80); }, true);
scan();
