const RELEASE = "domain-experience-authority-v58-20260727";
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
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 9.2 17 19 7"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3Z"/><path d="m9 12 2 2 4-4"/></svg>',
    warning: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5M12 17h.01"/></svg>',
    globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5"/></svg>',
  };
  return icons[name] || "";
}

function setText(node, value) {
  if (node && node.textContent !== value) node.textContent = value;
}

function setButton(node, key, markup) {
  if (!node || node.querySelector(".dfz-spinner") || node.dataset.domainV58Button === key) return;
  node.innerHTML = markup;
  node.dataset.domainV58Button = key;
}

function rootElement() {
  return document.querySelector(".sn-main > .sn-view-pad[data-domain-full-zone-authority] > .dfz-root")
    || document.querySelector(".dfz-root");
}

function panels(root) {
  return [...(root?.querySelectorAll(":scope .dfz-grid > .dfz-panel") || [])];
}

function setPanelHeader(panel, eyebrow, title, description) {
  const header = panel?.querySelector(":scope > header");
  if (!header) return;
  setText(header.querySelector("small"), eyebrow);
  setText(header.querySelector("h2"), title);
  setText(header.querySelector("p"), description);
}

function onboardingMarkup() {
  return `
    <section class="d58-onboarding" data-domain-v58-onboarding>
      <div class="d58-onboarding-copy">
        <span class="d58-icon">${icon("shield")}</span>
        <div>
          <small>PROSES OTOMATIS DAN TERPANDU</small>
          <h3>Satu domain, tiga langkah yang jelas</h3>
          <p>Masukkan domain tanpa <b>https://</b> atau garis miring. Setelah domain tersimpan, Ngeblogging menampilkan nameserver resmi yang harus dipasang di tempat Anda membeli atau mengelola domain.</p>
        </div>
      </div>
      <ol class="d58-steps d58-steps-onboarding">
        <li class="current"><i>1</i><div><b>Masukkan domain</b><span>Contoh: domainanda.com</span></div></li>
        <li><i>2</i><div><b>Pasang nameserver</b><span>Salin nilai yang diberikan Ngeblogging</span></div></li>
        <li><i>3</i><div><b>Verifikasi otomatis</b><span>HTTPS dan wildcard disiapkan sistem</span></div></li>
      </ol>
    </section>
  `;
}

function statusState(panel) {
  const status = panel.querySelector(".dfz-hostname-row .dfz-status");
  if (status?.classList.contains("active")) return "active";
  if (status?.classList.contains("danger") || panel.querySelector(".dfz-error")) return "danger";
  return "pending";
}

function statusMarkup(state, hostname) {
  const safeHostname = escapeHtml(hostname || "domain Anda");
  const hostAttribute = escapeHtml(hostname || "domain-anda");
  if (state === "active") {
    return `
      <section class="d58-status-board active" data-domain-v58-status="active" data-domain-v58-host="${hostAttribute}">
        <div class="d58-status-summary">
          <span class="d58-icon">${icon("check")}</span>
          <div><small>KONEKSI SELESAI</small><h3>${safeHostname} aktif dan siap digunakan</h3><p>Nameserver, HTTPS, dan routing wildcard telah siap. Alamat www atau subdomain tetap bersifat opsional.</p></div>
        </div>
        <ol class="d58-steps">
          <li class="done"><i>${icon("check")}</i><div><b>Domain terverifikasi</b><span>Nameserver terhubung</span></div></li>
          <li class="done"><i>${icon("check")}</i><div><b>HTTPS aktif</b><span>Sertifikat diamankan otomatis</span></div></li>
          <li class="done"><i>${icon("check")}</i><div><b>Wildcard siap</b><span>www dan subdomain dapat ditambahkan</span></div></li>
        </ol>
      </section>
    `;
  }

  if (state === "danger") {
    return `
      <section class="d58-status-board danger" data-domain-v58-status="danger" data-domain-v58-host="${hostAttribute}">
        <div class="d58-status-summary">
          <span class="d58-icon">${icon("warning")}</span>
          <div><small>PERLU DIPERBAIKI</small><h3>Koneksi ${safeHostname} belum berhasil</h3><p>Pastikan seluruh nameserver lama sudah diganti dengan nameserver Ngeblogging, tidak ada salah ketik, lalu simpan perubahan dan jalankan pemeriksaan kembali.</p></div>
        </div>
        <ol class="d58-steps">
          <li class="done"><i>${icon("check")}</i><div><b>Domain tersimpan</b><span>Domain sudah tercatat di situs ini</span></div></li>
          <li class="current danger"><i>${icon("warning")}</i><div><b>Periksa nameserver</b><span>Samakan persis dengan daftar di bawah</span></div></li>
          <li><i>3</i><div><b>HTTPS menunggu</b><span>Aktif setelah DNS terverifikasi</span></div></li>
        </ol>
      </section>
    `;
  }

  return `
    <section class="d58-status-board pending" data-domain-v58-status="pending" data-domain-v58-host="${hostAttribute}">
      <div class="d58-status-summary">
        <span class="d58-icon">${icon("clock")}</span>
        <div><small>SEDANG DALAM PROPAGASI</small><h3>Menunggu nameserver ${safeHostname} terverifikasi</h3><p>Pasang nameserver di registrar domain, lalu tunggu pembaruan DNS. Status diperbarui saat halaman dibuka dan ketika tombol <b>Periksa koneksi</b> ditekan.</p></div>
      </div>
      <ol class="d58-steps">
        <li class="done"><i>${icon("check")}</i><div><b>Domain tersimpan</b><span>Berhasil ditambahkan ke Ngeblogging</span></div></li>
        <li class="current"><i>${icon("clock")}</i><div><b>Nameserver & propagasi</b><span>Waktu mengikuti proses registrar domain</span></div></li>
        <li><i>3</i><div><b>HTTPS & wildcard</b><span>Disiapkan otomatis setelah verifikasi</span></div></li>
      </ol>
    </section>
  `;
}

function ensureStatusBoard(panel, hostname, state) {
  const current = panel.querySelector("[data-domain-v58-status]");
  if (current?.dataset.domainV58Status === state && current.dataset.domainV58Host === hostname) return;
  current?.remove();
  panel.querySelector(".dfz-hostname-row")?.insertAdjacentHTML("afterend", statusMarkup(state, hostname));
}

function decorateRootPanel(panel) {
  setPanelHeader(
    panel,
    "DOMAIN UTAMA",
    "Hubungkan domain milik Anda",
    "Masukkan satu domain utama. Ngeblogging menyiapkan petunjuk nameserver, verifikasi DNS, HTTPS, dan koneksi situs secara otomatis.",
  );

  const form = panel.querySelector(".dfz-root-form");
  if (form) {
    const label = form.querySelector("label > span");
    const input = form.querySelector('input[name="hostname"]');
    const button = form.querySelector('button[type="submit"]');
    setText(label, "Domain utama");
    if (input) {
      if (input.placeholder !== "contoh: domainanda.com") input.placeholder = "contoh: domainanda.com";
      if (input.getAttribute("aria-describedby") !== "d58-domain-help") input.setAttribute("aria-describedby", "d58-domain-help");
    }
    setButton(button, "connect", `${icon("arrow")}Hubungkan domain`);
    if (!panel.querySelector("[data-domain-v58-onboarding]")) form.insertAdjacentHTML("afterend", onboardingMarkup());
    const helper = panel.querySelector("[data-domain-v58-onboarding] p");
    if (helper && helper.id !== "d58-domain-help") helper.id = "d58-domain-help";
    return;
  }

  const hostnameRow = panel.querySelector(".dfz-hostname-row");
  if (!hostnameRow) return;

  const hostname = hostnameRow.querySelector("strong")?.textContent?.trim() || "domain Anda";
  const state = statusState(panel);
  const status = hostnameRow.querySelector(".dfz-status");
  if (status) {
    setText(status, state === "active" ? "Aktif" : state === "danger" ? "Perlu diperbaiki" : "Sedang propagasi");
    status.classList.toggle("pending", state === "pending");
    status.classList.toggle("danger", state === "danger");
    status.classList.toggle("active", state === "active");
  }

  ensureStatusBoard(panel, hostname, state);

  const nameservers = panel.querySelector(".dfz-nameservers");
  if (nameservers) {
    const small = nameservers.querySelector("header small");
    const heading = nameservers.querySelector("header h3");
    const copy = nameservers.querySelector("header > div");
    setText(small, "LANGKAH WAJIB DI TEMPAT DOMAIN DIBELI");
    setText(heading, "Ganti nameserver lama dengan nameserver Ngeblogging");
    if (copy && !copy.querySelector(".d58-ns-help")) {
      copy.insertAdjacentHTML(
        "beforeend",
        '<p class="d58-ns-help">Buka pengaturan domain pada registrar atau penyedia tempat domain dikelola, pilih menu <b>Nameserver/DNS</b>, gunakan nameserver kustom, ganti seluruh nilai lama dengan daftar berikut, lalu simpan.</p>',
      );
    }
  }

  const refresh = panel.querySelector('[data-action="refresh-root"]');
  if (refresh && !refresh.querySelector(".dfz-spinner")) {
    const text = refresh.lastChild;
    if (text?.nodeType === Node.TEXT_NODE && text.textContent !== " Periksa koneksi") text.textContent = " Periksa koneksi";
  }
}

function addressKind(host) {
  if (host === "www") return "Alamat www";
  if (host.includes(".")) return "Subdomain bertingkat";
  return "Subdomain";
}

function decorateAddressRows(panel) {
  panel.querySelectorAll(".dfz-address-list > article").forEach((row) => {
    const toggle = row.querySelector('[data-action="toggle-address"]');
    const host = String(toggle?.dataset.host || "").trim();
    const meta = row.querySelector(".dfz-address-name small");
    if (!meta || !host) return;
    const enabled = toggle?.dataset.enabled === "true";
    setText(meta, `${addressKind(host)} · ${enabled ? "Aktif dan menerima trafik" : "Nonaktif"}`);
  });
}

function optionalIntroMarkup() {
  return `
    <div class="d58-optional-intro" data-domain-v58-optional>
      <span>${icon("globe")}www</span>
      <span>${icon("globe")}subdomain</span>
      <span>${icon("globe")}subdomain bertingkat</span>
      <p>Bagian ini bebas digunakan atau dilewati. Domain utama tetap bekerja tanpa alamat tambahan.</p>
    </div>
  `;
}

function decorateAddressPanel(panel) {
  setPanelHeader(
    panel,
    "ALAMAT OPSIONAL",
    "www, subdomain, dan subdomain bertingkat",
    "Tambahkan alamat publik tambahan hanya bila diperlukan. Semua alamat tetap menggunakan domain utama yang sama.",
  );

  const header = panel.querySelector(":scope > header");
  if (header && !panel.querySelector("[data-domain-v58-optional]")) header.insertAdjacentHTML("afterend", optionalIntroMarkup());

  const locked = panel.querySelector(".dfz-locked");
  if (locked) {
    setText(locked.querySelector("b"), "Opsional — tersedia setelah domain utama aktif");
    setText(locked.querySelector("p"), "Selesaikan verifikasi domain utama untuk membuka www, subdomain, dan subdomain bertingkat. Anda tidak wajib menggunakan fitur ini.");
    return;
  }

  const form = panel.querySelector(".dfz-address-form");
  if (form) {
    const label = form.querySelector("label > span");
    const input = form.querySelector('input[name="host"]');
    const helper = form.querySelector(":scope > p");
    const button = form.querySelector('button[type="submit"]');
    setText(label, "Alamat tambahan (opsional)");
    if (input?.placeholder !== "www, blog, toko, app, atau docs.tim") input.placeholder = "www, blog, toko, app, atau docs.tim";
    setText(helper, "Contoh hasil: www.domainanda.com, blog.domainanda.com, atau docs.tim.domainanda.com. Routing wildcard dan HTTPS dikelola otomatis setelah domain utama aktif.");
    setButton(button, "add-address", `${icon("plus")}Tambahkan`);
  }

  decorateAddressRows(panel);
}

function reconcile() {
  const root = rootElement();
  if (!root?.isConnected) return;
  const [mainPanel, optionalPanel] = panels(root);
  if (!mainPanel || !optionalPanel) return;

  document.documentElement.dataset.domainExperienceAuthorityV58 = RELEASE;
  root.dataset.domainExperienceAuthority = RELEASE;
  mainPanel.dataset.domainPanelRole = "primary";
  optionalPanel.dataset.domainPanelRole = "optional";
  decorateRootPanel(mainPanel);
  decorateAddressPanel(optionalPanel);
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
