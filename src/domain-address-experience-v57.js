const RELEASE = "domain-address-experience-v57-20260727";
let scanFrame = 0;

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
    globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/></svg>',
    layers: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></svg>',
    route: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h3a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3h1"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  };
  return icons[name] || "";
}

function domainPanel() {
  const root = document.querySelector(".dfz-root");
  const panels = root?.querySelectorAll(".dfz-grid > .dfz-panel");
  return panels?.[1] || null;
}

function connectedDomainName() {
  const value = document.querySelector(".dfz-hostname-row strong")?.textContent?.trim();
  return value || "domainanda.com";
}

function recordsFrom(panel) {
  return [...panel.querySelectorAll(".dfz-address-list > article")]
    .map((row) => {
      const toggle = row.querySelector('[data-action="toggle-address"]');
      const host = String(toggle?.dataset.host || "").trim();
      const hostname = row.querySelector(".dfz-address-name strong")?.textContent?.trim() || "";
      if (!host || !hostname) return null;
      return {
        host,
        hostname,
        enabled: toggle?.dataset.enabled === "true",
        disabled: Boolean(toggle?.disabled),
      };
    })
    .filter(Boolean);
}

function stateButton(record, disabled = false) {
  const enabled = record.enabled === true;
  return `
    <button
      type="button"
      class="dfz-state-button ${enabled ? "active" : "inactive"}"
      data-action="toggle-address"
      data-host="${escapeHtml(record.host)}"
      data-enabled="${enabled}"
      aria-pressed="${enabled}"
      aria-label="${enabled ? "Nonaktifkan" : "Aktifkan"} ${escapeHtml(record.hostname)}"
      ${disabled || record.disabled ? "disabled" : ""}
    >
      <span aria-hidden="true"></span>
      <b>${enabled ? "Aktif" : "Nonaktif"}</b>
    </button>
  `;
}

function addressRow(record, options = {}) {
  const removable = options.removable === true;
  const disabled = options.disabled === true;
  return `
    <article class="dfz-address-entry ${disabled ? "locked" : ""}">
      <div class="dfz-address-identity">
        <span class="${record.enabled ? "active" : "inactive"}">${options.icon || icon("globe")}</span>
        <div>
          <strong>${escapeHtml(record.hostname)}</strong>
          <small>${disabled ? "Tersedia setelah domain utama aktif" : record.enabled ? "Terhubung ke situs ini" : "Tidak menerima trafik"}</small>
        </div>
      </div>
      <div class="dfz-address-entry-actions">
        ${stateButton(record, disabled)}
        ${removable ? `<button type="button" class="dfz-remove-address" data-action="remove-address" data-host="${escapeHtml(record.host)}" data-hostname="${escapeHtml(record.hostname)}" aria-label="Hapus ${escapeHtml(record.hostname)}" ${disabled || record.disabled ? "disabled" : ""}>${icon("trash")}</button>` : ""}
      </div>
    </article>
  `;
}

function createForm({ mode, domain, active, busy }) {
  const nested = mode === "nested";
  const label = nested ? "Struktur alamat lanjutan" : "Alamat khusus";
  const eyebrow = nested ? "SUBDOMAIN BERTINGKAT" : "SUBDOMAIN";
  const description = nested
    ? "Gunakan tanda titik untuk membentuk beberapa tingkat dalam satu alamat."
    : "Buat jalur terpisah untuk layanan atau bagian tertentu dari situs.";
  const placeholder = nested ? "bagian.nama" : "nama";

  return `
    <section class="dfz-address-tier ${active ? "" : "locked"}">
      <header>
        <span class="dfz-address-tier-icon">${nested ? icon("layers") : icon("route")}</span>
        <div><small>${eyebrow}</small><h3>${label}</h3><p>${description}</p></div>
      </header>
      <form class="dfz-address-form dfz-address-create" data-action="add-address" data-address-mode="${mode}">
        <label>
          <span>Nama alamat</span>
          <div>
            <input name="host" autocomplete="off" spellcheck="false" placeholder="${placeholder}" ${active && !busy ? "" : "disabled"}/>
            <em>.${escapeHtml(domain)}</em>
          </div>
        </label>
        <button class="dfz-primary" type="submit" ${active && !busy ? "" : "disabled"}>${icon("plus")}Tambahkan</button>
      </form>
    </section>
  `;
}

function lockedWorkspace() {
  const domain = connectedDomainName();
  const www = {
    host: "www",
    hostname: `www.${domain}`,
    enabled: false,
  };

  return `
    <div class="dfz-address-experience" data-domain-address-v57="locked" data-release="${RELEASE}">
      <section class="dfz-address-tier dfz-address-standard locked">
        <header>
          <span class="dfz-address-tier-icon">${icon("globe")}</span>
          <div><small>ALAMAT STANDAR</small><h3>Akses dengan www</h3><p>Sediakan versi alamat yang konsisten dan mudah dikenali pengunjung.</p></div>
        </header>
        ${addressRow(www, { disabled: true })}
      </section>
      <div class="dfz-address-tools">
        ${createForm({ mode: "single", domain, active: false, busy: false })}
        ${createForm({ mode: "nested", domain, active: false, busy: false })}
      </div>
      <div class="dfz-address-gate">${icon("lock")}<div><b>Pengaturan siap digunakan</b><p>Selesaikan verifikasi domain utama untuk membuka seluruh kontrol alamat.</p></div></div>
    </div>
  `;
}

function activeWorkspace(panel) {
  const domain = connectedDomainName();
  const records = recordsFrom(panel);
  const busy = Boolean(panel.querySelector('[data-action="toggle-address"]:disabled, .dfz-address-form button:disabled'));
  const www = records.find((record) => record.host === "www") || {
    host: "www",
    hostname: `www.${domain}`,
    enabled: true,
    disabled: busy,
  };
  const custom = records.filter((record) => record.host !== "www");

  return `
    <div class="dfz-address-experience" data-domain-address-v57="active" data-release="${RELEASE}">
      <section class="dfz-address-tier dfz-address-standard">
        <header>
          <span class="dfz-address-tier-icon">${icon("globe")}</span>
          <div><small>ALAMAT STANDAR</small><h3>Akses dengan www</h3><p>Sediakan versi alamat yang konsisten dan mudah dikenali pengunjung.</p></div>
        </header>
        ${addressRow(www)}
      </section>
      <div class="dfz-address-tools">
        ${createForm({ mode: "single", domain, active: true, busy })}
        ${createForm({ mode: "nested", domain, active: true, busy })}
      </div>
      <section class="dfz-address-tier dfz-address-managed">
        <header>
          <span class="dfz-address-tier-icon">${icon("route")}</span>
          <div><small>ALAMAT TERKELOLA</small><h3>Alamat yang terhubung</h3><p>Aktifkan, nonaktifkan, atau lepaskan alamat tanpa mengubah domain utama.</p></div>
        </header>
        <div class="dfz-address-managed-list">
          ${custom.length
            ? custom.map((record) => addressRow(record, { removable: true })).join("")
            : '<div class="dfz-address-empty-compact"><b>Belum ada alamat khusus</b><p>Alamat yang ditambahkan akan tampil di bagian ini.</p></div>'}
        </div>
      </section>
    </div>
  `;
}

function enhance(panel) {
  if (!panel?.isConnected || panel.querySelector("[data-domain-address-v57]")) return;

  const header = panel.querySelector(":scope > header");
  if (!header) return;

  const small = header.querySelector("small");
  const title = header.querySelector("h2");
  const description = header.querySelector("p");
  if (small) small.textContent = "PENGATURAN ALAMAT";
  if (title) title.textContent = "Kelola alamat situs";
  if (description) description.textContent = "Susun alamat publik untuk akses www, bagian khusus, dan struktur bertingkat dalam satu domain.";

  const active = !panel.classList.contains("disabled") && Boolean(panel.querySelector(".dfz-address-form"));
  const markup = active ? activeWorkspace(panel) : lockedWorkspace();
  [...panel.children].filter((child) => child !== header).forEach((child) => child.remove());
  panel.insertAdjacentHTML("beforeend", markup);
  panel.classList.toggle("dfz-address-ready", active);
}

function scan() {
  document.documentElement.dataset.domainAddressExperienceV57 = RELEASE;
  enhance(domainPanel());
}

function schedule() {
  cancelAnimationFrame(scanFrame);
  scanFrame = requestAnimationFrame(scan);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule();
}).observe(document.documentElement, { childList: true, subtree: true });

scan();
