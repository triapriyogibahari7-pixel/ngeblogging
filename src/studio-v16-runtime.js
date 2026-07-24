const RELEASE = "studio-v16-20260724";
const PREFS_KEY = "ngeblogging-studio-layout-v16";
const DEFAULT_PREFS = Object.freeze({
  width: "comfortable",
  density: "comfortable",
  header: "split",
  accent: "#2f6fe4",
});

let frame = 0;
let activeShell = null;
let draftPrefs = { ...DEFAULT_PREFS };

function deviceProfile() {
  const viewportWidth = Math.max(1, Number(window.visualViewport?.width) || Number(window.innerWidth) || 1);
  const viewportHeight = Math.max(1, Number(window.visualViewport?.height) || Number(window.innerHeight) || 1);
  const screenWidth = Math.max(1, Number(window.screen?.width) || viewportWidth);
  const screenHeight = Math.max(1, Number(window.screen?.height) || viewportHeight);
  const shortSide = Math.min(screenWidth, screenHeight);
  return {
    mobile: shortSide <= 760 || viewportWidth <= 760 || window.matchMedia("(max-width: 760px)").matches,
    narrow: shortSide <= 390 || viewportWidth <= 390,
  };
}

function safePrefs(value) {
  const prefs = value && typeof value === "object" ? value : {};
  return {
    width: ["compact", "comfortable", "wide"].includes(prefs.width) ? prefs.width : DEFAULT_PREFS.width,
    density: ["compact", "comfortable", "spacious"].includes(prefs.density) ? prefs.density : DEFAULT_PREFS.density,
    header: ["split", "centered", "minimal"].includes(prefs.header) ? prefs.header : DEFAULT_PREFS.header,
    accent: /^#[0-9a-f]{6}$/i.test(String(prefs.accent || "")) ? prefs.accent : DEFAULT_PREFS.accent,
  };
}

function readPrefs() {
  try {
    return safePrefs(JSON.parse(localStorage.getItem(PREFS_KEY) || "null"));
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

function writePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(safePrefs(prefs)));
  } catch {
    // Private browsing and storage-restricted webviews may reject localStorage.
  }
}

function applyPrefs(prefs) {
  const next = safePrefs(prefs);
  const root = document.documentElement;
  root.dataset.snLayoutWidth = next.width;
  root.dataset.snLayoutDensity = next.density;
  root.dataset.snHeaderMode = next.header;
  root.style.setProperty("--sn-v16-accent", next.accent);
  document.querySelectorAll(".sn-shell").forEach((shell) => {
    shell.dataset.layoutWidth = next.width;
    shell.dataset.layoutDensity = next.density;
    shell.dataset.headerMode = next.header;
  });
  draftPrefs = { ...next };
  return next;
}

function panelIcon(open) {
  return open
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v16H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm10 0h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6M17 9l-3 3 3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v16H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm10 0h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6M14 12h5m-2-3 3 3-3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

function layoutIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 3v18M8 9h13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
}

function buttonLabel(button) {
  return button?.querySelector("span")?.textContent?.trim() || button?.textContent?.trim() || "";
}

function originalToggle(shell) {
  return shell.querySelector(":scope > .sn-main > .sn-top > .sn-icon");
}

function setSidebarOpen(shell, shouldOpen) {
  const side = shell.querySelector(":scope > .sn-side");
  const original = originalToggle(shell);
  if (!side || !original) return;
  const open = !side.classList.contains("collapsed");
  if (open !== shouldOpen) original.click();
  requestAnimationFrame(() => syncShell(shell));
}

function ensureEdgeController(shell) {
  const side = shell.querySelector(":scope > .sn-side");
  const original = originalToggle(shell);
  if (!side || !original) return;

  original.dataset.v16OriginalToggle = "true";
  original.tabIndex = -1;
  original.setAttribute("aria-hidden", "true");

  let edge = shell.querySelector(":scope > .sn-sidebar-edge-v16");
  if (!edge) {
    edge = document.createElement("button");
    edge.type = "button";
    edge.className = "sn-sidebar-edge-v16";
    edge.dataset.sidebarAuthority = "single-v16";
    edge.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const currentSide = shell.querySelector(":scope > .sn-side");
      if (!currentSide) return;
      setSidebarOpen(shell, currentSide.classList.contains("collapsed"));
    });
    shell.append(edge);
  }

  let scrim = shell.querySelector(":scope > .sn-sidebar-scrim-v16");
  if (!scrim) {
    scrim = document.createElement("button");
    scrim.type = "button";
    scrim.className = "sn-sidebar-scrim-v16";
    scrim.setAttribute("aria-label", "Tutup menu Studio");
    scrim.addEventListener("click", () => setSidebarOpen(shell, false));
    shell.append(scrim);
  }

  const profile = deviceProfile();
  if (profile.mobile && shell.dataset.v16InitialSidebarResolved !== "true") {
    shell.dataset.v16InitialSidebarResolved = "true";
    if (!side.classList.contains("collapsed")) {
      original.click();
      requestAnimationFrame(() => syncShell(shell));
      return;
    }
  }

  const open = !side.classList.contains("collapsed");
  side.id ||= "ngeblogging-studio-sidebar";
  shell.dataset.v16SidebarOpen = String(open);
  edge.innerHTML = panelIcon(open);
  edge.setAttribute("aria-controls", side.id);
  edge.setAttribute("aria-expanded", String(open));
  edge.setAttribute("aria-label", open ? "Tutup menu Studio" : "Buka menu Studio");
  edge.title = open ? "Tutup menu" : "Buka menu";
  scrim.hidden = !open || !profile.mobile;
}

function ensureNara(shell) {
  const nav = shell.querySelector(":scope > .sn-side > nav");
  [...(nav?.querySelectorAll(":scope > button") || [])].forEach((button) => {
    if (buttonLabel(button) !== "Nara AI") return;
    button.hidden = true;
    button.disabled = false;
    button.tabIndex = -1;
    button.setAttribute("aria-hidden", "true");
    button.dataset.naraWorkspaceRoute = "true";
  });

  shell.querySelectorAll(".sn-top-actions .sn-nara-button, .nara-floating-button").forEach((button) => {
    button.type = "button";
    button.hidden = false;
    button.disabled = false;
    button.removeAttribute("aria-hidden");
    button.style.removeProperty("display");
    button.style.removeProperty("visibility");
    button.style.removeProperty("opacity");
    button.style.removeProperty("pointer-events");
  });
}

function ensureLayoutRoute(shell) {
  const nav = shell.querySelector(":scope > .sn-side > nav");
  if (!nav) return;
  let button = nav.querySelector(':scope > button[data-layout-v16-route="true"]');
  if (button) return;

  button = document.createElement("button");
  button.type = "button";
  button.dataset.layoutV16Route = "true";
  button.innerHTML = `${layoutIcon()}<span>Tata letak</span>`;
  button.addEventListener("click", () => openLayoutStudio(shell));

  const theme = [...nav.querySelectorAll(":scope > button")].find((item) => buttonLabel(item) === "Tema");
  if (theme?.nextSibling) nav.insertBefore(button, theme.nextSibling);
  else nav.append(button);
}

function ensureLayoutLayer() {
  let layer = document.querySelector(".sn-layout-v16-layer");
  if (layer) return layer;

  layer = document.createElement("div");
  layer.className = "sn-layout-v16-layer";
  layer.hidden = true;
  layer.innerHTML = `
    <button type="button" class="sn-layout-v16-backdrop" aria-label="Tutup Tata letak"></button>
    <section class="sn-layout-v16-panel" role="dialog" aria-modal="true" aria-label="Tata letak Studio">
      <header class="sn-layout-v16-head">
        <span>${layoutIcon()}</span>
        <div><small>STUDIO DESIGN SYSTEM</small><b>Tata letak</b></div>
        <button type="button" class="sn-layout-v16-close" aria-label="Tutup">×</button>
      </header>
      <div class="sn-layout-v16-body">
        <section class="sn-layout-v16-card">
          <b>Lebar ruang kerja</b><small>Atur ruang baca tanpa membuat konten terpotong.</small>
          <div class="sn-layout-v16-options" data-pref="width">
            <button type="button" data-value="compact">Ringkas</button>
            <button type="button" data-value="comfortable">Nyaman</button>
            <button type="button" data-value="wide">Lebar</button>
          </div>
        </section>
        <section class="sn-layout-v16-card">
          <b>Kepadatan</b><small>Sesuaikan jarak antarkartu dan kontrol Studio.</small>
          <div class="sn-layout-v16-options" data-pref="density">
            <button type="button" data-value="compact">Padat</button>
            <button type="button" data-value="comfortable">Normal</button>
            <button type="button" data-value="spacious">Lapang</button>
          </div>
        </section>
        <section class="sn-layout-v16-card wide">
          <b>Susunan header</b><small>Pratinjau situs dan Nara tetap sejajar pada semua pilihan.</small>
          <div class="sn-layout-v16-options" data-pref="header">
            <button type="button" data-value="split">Terbagi</button>
            <button type="button" data-value="centered">Terpusat</button>
            <button type="button" data-value="minimal">Minimal</button>
          </div>
        </section>
        <section class="sn-layout-v16-card wide">
          <b>Warna aksen Studio</b><small>Digunakan untuk tombol utama dan status aktif.</small>
          <label class="sn-layout-v16-color"><input type="color" value="#2f6fe4"/><code>#2f6fe4</code></label>
        </section>
      </div>
      <footer class="sn-layout-v16-actions">
        <button type="button" data-action="reset">Reset</button>
        <button type="button" data-action="cancel">Batal</button>
        <button type="button" class="primary" data-action="save">Simpan tata letak</button>
      </footer>
    </section>`;

  document.body.append(layer);
  const close = () => closeLayoutStudio(false);
  layer.querySelector(".sn-layout-v16-backdrop")?.addEventListener("click", close);
  layer.querySelector(".sn-layout-v16-close")?.addEventListener("click", close);
  layer.querySelector('[data-action="cancel"]')?.addEventListener("click", close);
  layer.querySelector('[data-action="reset"]')?.addEventListener("click", () => {
    draftPrefs = { ...DEFAULT_PREFS };
    applyPrefs(draftPrefs);
    renderLayoutControls(layer);
  });
  layer.querySelector('[data-action="save"]')?.addEventListener("click", () => {
    const saved = applyPrefs(draftPrefs);
    writePrefs(saved);
    closeLayoutStudio(true);
    const toast = activeShell?.querySelector(".sn-toast");
    if (!toast) {
      const message = document.createElement("div");
      message.className = "sn-toast sn-layout-v16-toast";
      message.textContent = "Tata letak disimpan";
      activeShell?.append(message);
      setTimeout(() => message.remove(), 2600);
    }
  });

  layer.querySelectorAll(".sn-layout-v16-options").forEach((group) => {
    group.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-value]");
      if (!button) return;
      const key = group.dataset.pref;
      draftPrefs = { ...draftPrefs, [key]: button.dataset.value };
      applyPrefs(draftPrefs);
      renderLayoutControls(layer);
    });
  });

  const color = layer.querySelector('.sn-layout-v16-color input[type="color"]');
  color?.addEventListener("input", () => {
    draftPrefs = { ...draftPrefs, accent: color.value };
    applyPrefs(draftPrefs);
    renderLayoutControls(layer);
  });

  layer.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeLayoutStudio(false);
  });
  return layer;
}

function renderLayoutControls(layer = ensureLayoutLayer()) {
  layer.querySelectorAll(".sn-layout-v16-options").forEach((group) => {
    const key = group.dataset.pref;
    group.querySelectorAll("button[data-value]").forEach((button) => {
      const active = draftPrefs[key] === button.dataset.value;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  });
  const color = layer.querySelector('.sn-layout-v16-color input[type="color"]');
  const code = layer.querySelector(".sn-layout-v16-color code");
  if (color) color.value = draftPrefs.accent;
  if (code) code.textContent = draftPrefs.accent;
}

function openLayoutStudio(shell) {
  activeShell = shell;
  draftPrefs = { ...readPrefs() };
  applyPrefs(draftPrefs);
  const layer = ensureLayoutLayer();
  renderLayoutControls(layer);
  layer.hidden = false;
  document.body.classList.add("sn-layout-v16-open");
  layer.querySelector(".sn-layout-v16-close")?.focus();
  if (deviceProfile().mobile) setSidebarOpen(shell, false);
}

function closeLayoutStudio(keepApplied) {
  const layer = document.querySelector(".sn-layout-v16-layer");
  if (!layer || layer.hidden) return;
  if (!keepApplied) applyPrefs(readPrefs());
  layer.hidden = true;
  document.body.classList.remove("sn-layout-v16-open");
  activeShell?.querySelector('[data-layout-v16-route="true"]')?.focus();
}

function syncShell(shell) {
  const profile = deviceProfile();
  document.documentElement.dataset.studioV16 = "true";
  document.documentElement.dataset.v16Mobile = String(profile.mobile);
  document.documentElement.dataset.v16Narrow = String(profile.narrow);
  document.documentElement.dataset.studioRelease = RELEASE;

  shell.dataset.studioRelease = RELEASE;
  shell.querySelectorAll(".sn-mobile-nav, .sn-mobile-sheet-layer, .sn-side-close, .sn-side-bottom")
    .forEach((node) => node.remove());

  ensureEdgeController(shell);
  ensureNara(shell);
  ensureLayoutRoute(shell);
  applyPrefs(readPrefs());
}

function sync() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    document.querySelectorAll(".sn-shell").forEach(syncShell);
  });
}

function fallbackNaraOpen(launcher) {
  window.setTimeout(() => {
    if (document.querySelector(".nara-assistant-layer")) return;
    const shell = launcher.closest(".sn-shell");
    const alternate = shell?.querySelector(".sn-top-actions .sn-nara-button");
    if (alternate && alternate !== launcher && alternate.dataset.v16FallbackClick !== "true") {
      alternate.dataset.v16FallbackClick = "true";
      alternate.click();
      window.setTimeout(() => delete alternate.dataset.v16FallbackClick, 500);
    }
  }, 180);
}

const observer = new MutationObserver(sync);
observer.observe(document.documentElement, { childList: true, subtree: true });

document.addEventListener("click", (event) => {
  const launcher = event.target.closest(".nara-floating-button, .sn-top-actions .sn-nara-button");
  if (launcher && !launcher.disabled) fallbackNaraOpen(launcher);

  const navButton = event.target.closest(".sn-side nav button");
  if (!navButton || !deviceProfile().mobile || navButton.dataset.layoutV16Route === "true") return;
  const shell = navButton.closest(".sn-shell");
  if (shell) requestAnimationFrame(() => setSidebarOpen(shell, false));
}, true);

if (!("PointerEvent" in window)) {
  document.addEventListener("touchend", (event) => {
    const launcher = event.target.closest(".nara-floating-button, .sn-top-actions .sn-nara-button");
    if (!launcher || launcher.disabled) return;
    event.preventDefault();
    launcher.click();
  }, { capture: true, passive: false });
}

window.addEventListener("resize", sync, { passive: true });
window.addEventListener("orientationchange", sync, { passive: true });
window.addEventListener("pageshow", sync, { passive: true });
window.visualViewport?.addEventListener("resize", sync, { passive: true });

applyPrefs(readPrefs());
ensureLayoutLayer();
sync();
