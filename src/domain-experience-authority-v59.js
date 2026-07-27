import { supabase, supabaseConfigured } from "./lib/supabase.js";
import {
  ACTIVE_SITE_STORAGE_KEY,
  listUserSites,
} from "./lib/studio-data.js";

const RELEASE = "domain-experience-authority-v59-20260727";
const controllers = new WeakMap();
let frame = 0;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function icon(name) {
  const icons = {
    link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/></svg>',
    layers: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></svg>',
    redirect: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h11a4 4 0 0 1 4 4v6"/><path d="m15 13 4 4 4-4"/><path d="M4 17h6"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/></svg>',
    browser: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 6.5h.01M10 6.5h.01"/></svg>',
    server: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01M17 7h2M17 17h2"/></svg>',
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3Z"/><path d="m9 12 2 2 4-4"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    unlock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 7-2"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
  };
  return icons[name] || "";
}

function rootElement() {
  return document.querySelector(".sn-main > .sn-view-pad[data-domain-full-zone-authority] > .dfz-root")
    || document.querySelector(".dfz-root");
}

function activeSiteId() {
  try { return localStorage.getItem(ACTIVE_SITE_STORAGE_KEY) || ""; } catch { return ""; }
}

async function accountState() {
  if (!supabaseConfigured || !supabase) throw new Error("Penyimpanan cloud belum dikonfigurasi.");
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const session = data.session;
  if (!session?.access_token || !session.user?.id) throw new Error("Silakan masuk kembali untuk mengelola domain.");
  const sites = await listUserSites(session.user.id);
  const site = sites.find((item) => item.id === activeSiteId()) || sites[0] || null;
  if (!site) throw new Error("Pilih atau buat situs terlebih dahulu.");
  return { token: session.access_token, user: session.user, site, sites };
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
    const error = new Error(payload.error || "Permintaan belum berhasil.");
    error.code = payload.code || "DOMAIN_REDIRECT_REQUEST_FAILED";
    error.status = response.status;
    throw error;
  }
  return payload;
}

function toast(message, tone = "success") {
  document.querySelector(".d59-toast")?.remove();
  const node = document.createElement("div");
  node.className = `d59-toast ${tone}`;
  node.innerHTML = `${icon(tone === "danger" ? "info" : "check")}<span>${escapeHtml(message)}</span>`;
  document.body.append(node);
  setTimeout(() => node.remove(), 3800);
}

function setText(node, value) {
  if (node && node.textContent !== value) node.textContent = value;
}

function mainPanels(root) {
  return [...(root?.querySelectorAll(":scope .dfz-grid > .dfz-panel:not(.d59-redirect-panel)") || [])];
}

function headerIcon(panel, name) {
  const header = panel?.querySelector(":scope > header");
  if (!header || header.querySelector(".d59-panel-icon")) return;
  header.insertAdjacentHTML("afterbegin", `<span class="d59-panel-icon">${icon(name)}</span>`);
}

function connectGuideMarkup() {
  return `
    <section class="d59-connect-guide" data-d59-connect-guide>
      <article><i>1</i><span>${icon("browser")}</span><div><b>Masukkan domain</b><p>Gunakan domain utama, subdomain, atau subdomain bertingkat.</p></div></article>
      <article><i>2</i><span>${icon("server")}</span><div><b>Pasang DNS / nameserver</b><p>Salin nilai resmi yang diberikan Ngeblogging ke pengelola domain.</p></div></article>
      <article><i>3</i><span>${icon("shield")}</span><div><b>Verifikasi otomatis</b><p>Sistem memeriksa koneksi, mengaktifkan HTTPS, dan menyiapkan routing.</p></div></article>
    </section>
  `;
}

function decoratePrimary(panel) {
  if (!panel) return;
  panel.classList.add("d59-domain-panel", "d59-primary-panel");
  headerIcon(panel, "link");
  const header = panel.querySelector(":scope > header");
  setText(header?.querySelector("small"), "MANAJEMEN DOMAIN");
  setText(header?.querySelector("h2"), "1. Hubungkan domain");
  setText(header?.querySelector("p"), "Hubungkan domain utama, subdomain, atau subdomain bertingkat ke situs ini.");

  const form = panel.querySelector(".dfz-root-form");
  if (form) {
    const input = form.querySelector('input[name="hostname"]');
    const button = form.querySelector('button[type="submit"]');
    setText(form.querySelector("label > span"), "Alamat domain");
    if (input) input.placeholder = "contoh: domainanda.com atau app.domainanda.com";
    if (button && !button.querySelector(".dfz-spinner")) {
      button.innerHTML = `${icon("arrow")}Hubungkan domain`;
    }
    if (!panel.querySelector("[data-d59-domain-helper]")) {
      form.insertAdjacentHTML("afterend", '<p class="d59-domain-helper" data-d59-domain-helper>Masukkan hostname tanpa <b>https://</b> dan tanpa path. Ngeblogging akan menyiapkan DNS, HTTPS, sertifikat, dan routing secara otomatis.</p>');
    }
  }

  if (!panel.querySelector("[data-d59-connect-guide]")) panel.insertAdjacentHTML("beforeend", connectGuideMarkup());
}

function addressTypesMarkup() {
  return `
    <section class="d59-address-types" data-d59-address-types>
      <article><span>${icon("globe")}</span><div><b>www</b><p>Alamat umum seperti www.domainanda.com.</p></div></article>
      <article><span>${icon("globe")}</span><div><b>Subdomain</b><p>Contoh: blog, toko, app, help, atau cloud.</p></div></article>
      <article><span>${icon("layers")}</span><div><b>Subdomain bertingkat</b><p>Contoh: docs.tim atau support.team.</p></div></article>
    </section>
  `;
}

function decorateAddresses(panel) {
  if (!panel) return;
  panel.classList.add("d59-domain-panel", "d59-address-panel");
  headerIcon(panel, "layers");
  const header = panel.querySelector(":scope > header");
  setText(header?.querySelector("small"), "ALAMAT LANJUTAN");
  setText(header?.querySelector("h2"), "2. Alamat lanjutan");
  setText(header?.querySelector("p"), "Tambahkan www, subdomain, atau subdomain bertingkat. Bagian ini sepenuhnya opsional.");
  if (header && !header.querySelector(".d59-optional-badge")) header.insertAdjacentHTML("beforeend", '<span class="d59-optional-badge">Opsional</span>');

  const form = panel.querySelector(".dfz-address-form");
  if (form) {
    setText(form.querySelector("label > span"), "Nama alamat");
    const input = form.querySelector('input[name="host"]');
    if (input) input.placeholder = "www, blog, toko, cloud, atau docs.tim";
    const helper = form.querySelector(":scope > p");
    setText(helper, "Satu kolom ini menerima www, subdomain biasa, dan subdomain bertingkat. Alamat dapat diaktifkan, dinonaktifkan, atau dihapus kapan saja.");
    const button = form.querySelector('button[type="submit"]');
    if (button && !button.querySelector(".dfz-spinner")) button.innerHTML = `${icon("plus")}Tambahkan`;
  }

  const locked = panel.querySelector(".dfz-locked");
  if (locked) {
    setText(locked.querySelector("b"), "Tersedia setelah domain utama aktif");
    setText(locked.querySelector("p"), "Selesaikan verifikasi domain utama untuk membuka www, subdomain, dan subdomain bertingkat. Fitur ini tidak wajib digunakan.");
  }

  if (!panel.querySelector("[data-d59-address-types]")) {
    const anchor = form || locked || header;
    anchor?.insertAdjacentHTML("afterend", addressTypesMarkup());
  }
}

function activeDomain(domain) {
  return Boolean(domain?.status === "active" && domain?.provider_status === "active" && domain?.ssl_status === "active");
}

function redirectForm(controller) {
  if (!controller.formOpen) return "";
  const domain = controller.domain;
  return `
    <form class="d59-redirect-form" data-d59-form="redirect">
      <label class="source"><span>Alamat sumber</span><div><input name="source" autocomplete="off" spellcheck="false" placeholder="cloud" required/><em>.${escapeHtml(domain.hostname)}</em></div></label>
      <label class="target"><span>Dialihkan ke</span><input name="target" autocomplete="off" spellcheck="false" placeholder="https://tujuan.com atau /halaman" required/></label>
      <label class="type"><span>Jenis redirect</span><select name="permanent"><option value="true">Permanen · 308</option><option value="false">Sementara · 307</option></select></label>
      <label class="preserve"><input type="checkbox" name="preservePath" checked/><span>Pertahankan path dan parameter URL</span></label>
      <div class="actions"><button type="button" data-d59-action="close-form">Batal</button><button class="dfz-primary" type="submit" ${controller.busy ? "disabled" : ""}>${controller.busy === "save" ? '<span class="dfz-spinner"></span>Menyimpan…' : `${icon("plus")}Simpan pengalihan`}</button></div>
      <p>${icon("info")}Alamat sumber akan otomatis diaktifkan sebagai subdomain Worker. Contoh: <b>cloud.${escapeHtml(domain.hostname)}</b>.</p>
    </form>
  `;
}

function redirectRows(controller) {
  if (!controller.redirects.length) {
    return `<div class="d59-empty">${icon("redirect")}<b>Belum ada pengalihan alamat</b><p>Tambahkan aturan pertama untuk mengarahkan cloud, app, docs, atau alamat lain ke tujuan yang Anda tentukan.</p></div>`;
  }
  return `
    <div class="d59-redirect-table" role="table" aria-label="Daftar pengalihan alamat">
      <div class="head" role="row"><span>Alamat sumber</span><span>Dialihkan ke</span><span>Status</span><span>Aksi</span></div>
      ${controller.redirects.map((rule) => `
        <article class="row ${rule.locked ? "locked" : ""}" role="row">
          <div class="source"><span>${icon("globe")}</span><div><b>${escapeHtml(rule.source_hostname)}</b><small>${rule.permanent ? "Redirect permanen 308" : "Redirect sementara 307"}${rule.locked ? " · Dikunci" : ""}</small></div></div>
          <div class="target"><span>${icon("arrow")}</span><code title="${escapeHtml(rule.target_url)}">${escapeHtml(rule.target_url)}</code></div>
          <div class="state"><i class="${rule.enabled ? "active" : "inactive"}">${rule.enabled ? "Aktif" : "Nonaktif"}</i></div>
          <div class="actions">
            <button class="d59-switch ${rule.enabled ? "active" : ""}" type="button" data-d59-action="toggle" data-id="${escapeHtml(rule.id)}" data-enabled="${rule.enabled}" aria-label="${rule.enabled ? "Nonaktifkan" : "Aktifkan"} ${escapeHtml(rule.source_hostname)}" ${rule.locked || controller.busy ? "disabled" : ""}><span></span></button>
            <button class="icon" type="button" data-d59-action="lock" data-id="${escapeHtml(rule.id)}" data-locked="${rule.locked}" title="${rule.locked ? "Buka kunci" : "Kunci aturan"}" ${controller.busy ? "disabled" : ""}>${icon(rule.locked ? "unlock" : "lock")}</button>
            <button class="icon danger" type="button" data-d59-action="remove" data-id="${escapeHtml(rule.id)}" data-source="${escapeHtml(rule.source_hostname)}" title="Hapus aturan" ${rule.locked || controller.busy ? "disabled" : ""}>${icon("trash")}</button>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function redirectPanel(controller) {
  const domain = controller.domain;
  const ready = activeDomain(domain);
  return `
    <article class="dfz-panel d59-domain-panel d59-redirect-panel" data-d59-redirect-panel>
      <header>
        <span class="d59-panel-icon">${icon("redirect")}</span>
        <div><small>PENGALIHAN DOMAIN</small><h2>3. Pengalihan alamat</h2><p>Arahkan subdomain ke URL atau halaman lain, lalu aktifkan, nonaktifkan, atau kunci setiap aturan.</p></div>
        ${ready ? `<button class="d59-add-redirect" type="button" data-d59-action="${controller.formOpen ? "close-form" : "open-form"}">${controller.formOpen ? "Tutup" : `${icon("plus")}Tambah redirect`}</button>` : ""}
      </header>
      ${!domain ? `<div class="d59-redirect-locked">${icon("shield")}<b>Hubungkan domain terlebih dahulu</b><p>Pengalihan alamat membutuhkan domain full-zone yang aktif.</p></div>`
        : !ready ? `<div class="d59-redirect-locked">${icon("shield")}<b>Menunggu domain utama aktif</b><p>Setelah nameserver, HTTPS, dan Worker Domain aktif, pengalihan dapat digunakan.</p></div>`
          : controller.loading ? '<div class="d59-loading"><span class="dfz-spinner"></span>Memuat pengalihan…</div>'
            : controller.error ? `<div class="d59-error"><div><b>Pengalihan belum dapat dimuat</b><p>${escapeHtml(controller.error)}</p></div><button type="button" data-d59-action="reload">Coba lagi</button></div>`
              : `${redirectForm(controller)}${redirectRows(controller)}<div class="d59-redirect-note">${icon("info")}Aturan yang dikunci harus dibuka terlebih dahulu sebelum dapat dinonaktifkan, diubah, atau dihapus.</div>`}
    </article>
  `;
}

function renderRedirect(controller) {
  const grid = controller.root.querySelector(":scope .dfz-grid");
  if (!grid) return;
  grid.querySelector(":scope > .d59-redirect-panel")?.remove();
  grid.insertAdjacentHTML("beforeend", redirectPanel(controller));
}

async function load(controller) {
  const run = ++controller.run;
  controller.loading = true;
  controller.error = "";
  renderRedirect(controller);
  try {
    controller.account ||= await accountState();
    const payload = await api(`/api/domains/list?siteId=${encodeURIComponent(controller.account.site.id)}`, controller.account.token);
    if (run !== controller.run) return;
    controller.domain = (payload.domains || []).find((item) => item.provider === "cloudflare-full-zone") || payload.domains?.[0] || null;
    controller.redirects = [];
    if (activeDomain(controller.domain)) {
      const redirectPayload = await api(`/api/domain-redirects/list?domainId=${encodeURIComponent(controller.domain.id)}`, controller.account.token);
      if (run !== controller.run) return;
      controller.redirects = Array.isArray(redirectPayload.redirects) ? redirectPayload.redirects : [];
    }
  } catch (error) {
    if (run !== controller.run) return;
    controller.error = error.message || "Data pengalihan belum dapat dimuat.";
  } finally {
    if (run === controller.run) {
      controller.loading = false;
      renderRedirect(controller);
    }
  }
}

async function mutate(controller, key, path, body, success) {
  if (controller.busy || !controller.account) return;
  controller.busy = key;
  renderRedirect(controller);
  try {
    await api(path, controller.account.token, body);
    toast(success);
    controller.formOpen = false;
    await load(controller);
    if (key === "save") controller.root.querySelector('[data-action="refresh-root"]')?.click();
  } catch (error) {
    toast(error.message || "Perubahan belum berhasil.", "danger");
  } finally {
    controller.busy = "";
    renderRedirect(controller);
  }
}

async function handleSubmit(controller, event) {
  const form = event.target.closest('form[data-d59-form="redirect"]');
  if (!form || !controller.root.contains(form)) return;
  event.preventDefault();
  const data = new FormData(form);
  const source = String(data.get("source") || "").trim();
  const target = String(data.get("target") || "").trim();
  if (!source || !target) return toast("Lengkapi alamat sumber dan tujuan.", "danger");
  await mutate(controller, "save", "/api/domain-redirects/upsert", {
    domainId: controller.domain.id,
    source,
    target,
    permanent: data.get("permanent") !== "false",
    preservePath: data.get("preservePath") === "on",
    enabled: true,
  }, "Pengalihan berhasil disimpan dan alamat sumber diaktifkan.");
}

async function handleClick(controller, event) {
  const button = event.target.closest("[data-d59-action]");
  if (!button || !controller.root.contains(button)) return;
  const action = button.dataset.d59Action;
  if (action === "open-form") {
    controller.formOpen = true;
    renderRedirect(controller);
    requestAnimationFrame(() => controller.root.querySelector('.d59-redirect-form input[name="source"]')?.focus());
    return;
  }
  if (action === "close-form") {
    controller.formOpen = false;
    renderRedirect(controller);
    return;
  }
  if (action === "reload") return load(controller);
  const id = button.dataset.id;
  if (!id) return;
  if (action === "toggle") {
    const enabled = button.dataset.enabled === "true";
    return mutate(controller, `toggle-${id}`, "/api/domain-redirects/toggle", { id, enabled: !enabled }, enabled ? "Pengalihan dinonaktifkan." : "Pengalihan diaktifkan.");
  }
  if (action === "lock") {
    const locked = button.dataset.locked === "true";
    return mutate(controller, `lock-${id}`, "/api/domain-redirects/lock", { id, locked: !locked }, locked ? "Kunci pengalihan dibuka." : "Pengalihan dikunci.");
  }
  if (action === "remove") {
    if (!confirm(`Hapus pengalihan ${button.dataset.source || "ini"}?`)) return;
    return mutate(controller, `remove-${id}`, "/api/domain-redirects/remove", { id }, "Aturan pengalihan dihapus.");
  }
}

function controllerFor(root) {
  let controller = controllers.get(root);
  if (controller) return controller;
  controller = {
    root,
    shell: null,
    account: null,
    domain: null,
    redirects: [],
    loading: true,
    error: "",
    busy: "",
    formOpen: false,
    run: 0,
  };
  root.addEventListener("submit", (event) => handleSubmit(controller, event));
  root.addEventListener("click", (event) => handleClick(controller, event));
  controllers.set(root, controller);
  return controller;
}

function reconcile() {
  const root = rootElement();
  if (!root?.isConnected) return;
  const shell = root.querySelector(":scope > .dfz-shell");
  const [primary, addresses] = mainPanels(root);
  if (!shell || !primary || !addresses) return;
  document.documentElement.dataset.domainExperienceAuthorityV59 = RELEASE;
  root.dataset.domainExperienceAuthority = RELEASE;
  decoratePrimary(primary);
  decorateAddresses(addresses);
  const controller = controllerFor(root);
  if (controller.shell !== shell) {
    controller.shell = shell;
    controller.formOpen = false;
    load(controller);
  } else if (!root.querySelector("[data-d59-redirect-panel]")) {
    renderRedirect(controller);
  }
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(reconcile);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule();
}).observe(document.documentElement, { childList: true, subtree: true });

window.addEventListener("pageshow", schedule);
window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("orientationchange", schedule, { passive: true });

reconcile();
