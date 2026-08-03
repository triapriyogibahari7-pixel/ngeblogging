import { BUILT_IN_WIDGETS } from "./widget-system.js";

export const RELEASE = "studio-react-safe-v240-20260803";
const V239_RELEASE = "studio-final-authority-v239-20260803";

let frame = 0;
let popover = null;
const gutters = new Map();

const text = (value) => String(value || "").replace(/\s+/g, " ").trim();

function preemptUnsafeV239DomRewrites() {
  document.querySelectorAll(".tn-layout-canvas").forEach((canvas) => {
    if (!canvas.dataset.v239LayoutMap) canvas.dataset.v239LayoutMap = V239_RELEASE;
    canvas.dataset.v240ReactOwnedLightDom = "preserved";
  });
  document.querySelectorAll(".tn-code-pane textarea").forEach((textarea) => {
    if (!textarea.dataset.v239CodeEditor) textarea.dataset.v239CodeEditor = V239_RELEASE;
    textarea.dataset.v240LineNumbers = "true";
  });
}

function removePopover() {
  popover?.remove();
  popover = null;
}

function waitForWidgetStudio(callback, attempts = 24) {
  const studio = document.querySelector(".tn-widget-studio");
  if (studio) return callback(studio);
  if (attempts <= 0) {
    delete document.documentElement.dataset.v240WidgetAutoconfigure;
    return;
  }
  requestAnimationFrame(() => waitForWidgetStudio(callback, attempts - 1));
}

function configureWidget(widget, area) {
  document.documentElement.dataset.v240WidgetAutoconfigure = "true";
  document.querySelector(".tn-layout-studio-header button")?.click();
  waitForWidgetStudio((studio) => {
    const findArticle = () => [...studio.querySelectorAll(".tn-widget-grid > article")]
      .find((node) => text(node.querySelector(".tn-widget-toggle b")?.textContent) === widget.name);
    let article = findArticle();
    if (!article) {
      delete document.documentElement.dataset.v240WidgetAutoconfigure;
      return;
    }
    if (!article.classList.contains("active")) article.querySelector(".tn-widget-toggle")?.click();
    const finish = (remaining = 20) => {
      article = findArticle();
      const select = article?.querySelector(".tn-widget-settings select");
      if (!select && remaining > 0) return requestAnimationFrame(() => finish(remaining - 1));
      if (select) {
        select.value = area;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
      requestAnimationFrame(() => {
        const save = [...document.querySelectorAll(".tn-modal footer button")]
          .find((button) => /simpan widget/i.test(text(button.textContent)));
        save?.click();
        delete document.documentElement.dataset.v240WidgetAutoconfigure;
      });
    };
    finish();
  });
}

function openWidgetPopover(anchor, area) {
  removePopover();
  const box = document.createElement("div");
  box.className = "v240-widget-popover";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", "Pilih widget untuk slot tata letak");
  box.innerHTML = `<header><div><small>SLOT TERPILIH</small><b>${text(anchor.textContent)}</b></div><button type="button" data-close aria-label="Tutup">×</button></header><div class="v240-widget-options"></div><footer><button type="button" data-code>Edit HTML · CSS · JavaScript</button></footer>`;
  const options = box.querySelector(".v240-widget-options");
  for (const widget of BUILT_IN_WIDGETS) {
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `<span>${widget.icon}</span><div><b>${widget.name}</b><small>${widget.category}</small></div>`;
    button.addEventListener("click", () => {
      removePopover();
      configureWidget(widget, area);
    });
    options.append(button);
  }
  box.querySelector("[data-close]").addEventListener("click", removePopover);
  box.querySelector("[data-code]").addEventListener("click", () => {
    removePopover();
    [...document.querySelectorAll(".tn-hero-actions button,.tn-command button")]
      .find((button) => /edit html/i.test(text(button.textContent)))?.click();
  });
  document.body.append(box);
  const rect = anchor.getBoundingClientRect();
  const width = Math.min(360, Math.max(280, window.innerWidth - 24));
  const maxHeight = Math.min(460, window.innerHeight - 24);
  const left = Math.min(window.innerWidth - width - 12, Math.max(12, rect.left + (rect.width - width) / 2));
  const top = Math.min(window.innerHeight - maxHeight - 12, Math.max(12, rect.bottom + 8));
  Object.assign(box.style, { width: `${width}px`, left: `${left}px`, top: `${top}px`, maxHeight: `${maxHeight}px` });
  popover = box;
}

function shadowMapStyles() {
  return `
    :host{display:block;width:100%;font-family:Inter,system-ui,sans-serif;color:#1e3351}
    *{box-sizing:border-box;min-width:0}
    .frame{width:max(720px,100%);display:grid;gap:8px;padding:8px;margin:0 auto}
    button{font:inherit;cursor:pointer;border:1px solid rgba(77,101,137,.24);background:#fff;color:#1e3351;border-radius:12px;min-height:48px;overflow:hidden}
    button:hover,button:focus-visible{outline:2px solid #2d6edf;outline-offset:1px}
    .strip{display:grid;place-items:center;width:100%}.header{min-height:64px}.nav{min-height:42px}.after{min-height:48px}.footer{min-height:70px}
    .content{display:grid;grid-template-columns:minmax(150px,.25fr) minmax(360px,.5fr) minmax(150px,.25fr);gap:8px;min-height:360px}
    .side{display:grid;grid-template-rows:repeat(4,1fr);gap:8px}.side button{display:grid;place-items:center;padding:8px}
    .post{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:clamp(18px,4vw,42px);text-align:left;background:linear-gradient(180deg,#fff,#f7f9fc)}
    .post small{letter-spacing:.12em}.post strong{font-size:clamp(1.45rem,2.7vw,2.8rem);margin:.45rem 0 1.3rem}.post i{display:block;width:100%;height:9px;border-radius:99px;background:#dfe6f0;margin:6px 0}.post i.short{width:68%}
  `;
}

function ensureShadowLayoutMap() {
  document.querySelectorAll(".tn-layout-canvas").forEach((canvas) => {
    if (canvas.dataset.v240ShadowMap === RELEASE) return;
    let root = canvas.shadowRoot;
    try { if (!root) root = canvas.attachShadow({ mode: "open" }); } catch { return; }
    canvas.dataset.v240ShadowMap = RELEASE;
    root.innerHTML = `<style>${shadowMapStyles()}</style><div class="frame">
      <button class="strip header" data-area="header-left">Header</button>
      <button class="strip nav" data-area="below-header">Navigasi</button>
      <div class="content">
        <div class="side left">
          <button data-area="sidebar-left">Widget kiri 1</button><button data-area="sidebar-left">Widget kiri 2</button><button data-area="sidebar-left">Widget kiri 3</button><button data-area="sidebar-left">Widget kiri 4</button>
        </div>
        <button class="post" data-area="after-content"><small>POST / PAGE</small><strong>Konten utama</strong><i></i><i></i><i class="short"></i></button>
        <div class="side right">
          <button data-area="sidebar-right">Widget kanan 1</button><button data-area="sidebar-right">Widget kanan 2</button><button data-area="sidebar-right">Widget kanan 3</button><button data-area="sidebar-right">Widget kanan 4</button>
        </div>
      </div>
      <button class="strip after" data-area="before-content">Area konten tambahan</button>
      <button class="strip footer" data-area="footer-wide">Footer</button>
    </div>`;
    root.querySelectorAll("button[data-area]").forEach((button) => button.addEventListener("click", () => openWidgetPopover(button, button.dataset.area)));
  });
}

function gutterText(textarea) {
  const count = Math.min(10000, Math.max(1, String(textarea.value || "").split("\n").length));
  return { count, value: Array.from({ length: count }, (_, index) => index + 1).join("\n") };
}

function positionGutter(textarea, gutter) {
  if (!textarea.isConnected) return;
  const rect = textarea.getBoundingClientRect();
  const width = Math.min(58, Math.max(44, rect.width * .12));
  Object.assign(gutter.style, {
    left: `${Math.max(0, rect.left)}px`,
    top: `${Math.max(0, rect.top)}px`,
    width: `${width}px`,
    height: `${Math.max(0, rect.height)}px`,
    display: rect.width > 0 && rect.height > 0 ? "block" : "none",
  });
}

function ensurePortalGutters() {
  for (const [textarea, gutter] of gutters) {
    if (!textarea.isConnected) { gutter.remove(); gutters.delete(textarea); }
  }
  document.querySelectorAll(".tn-code-pane textarea").forEach((textarea) => {
    textarea.dataset.v240LineNumbers = "true";
    let gutter = gutters.get(textarea);
    if (!gutter) {
      gutter = document.createElement("pre");
      gutter.className = "v240-code-gutter-portal";
      gutter.setAttribute("aria-hidden", "true");
      document.body.append(gutter);
      gutters.set(textarea, gutter);
      const update = () => {
        const lines = gutterText(textarea);
        if (gutter.dataset.lines !== String(lines.count)) {
          gutter.dataset.lines = String(lines.count);
          gutter.textContent = lines.value;
        }
        gutter.scrollTop = textarea.scrollTop;
        positionGutter(textarea, gutter);
      };
      textarea.addEventListener("input", update);
      textarea.addEventListener("scroll", update, { passive: true });
      update();
    } else {
      const lines = gutterText(textarea);
      if (gutter.dataset.lines !== String(lines.count)) {
        gutter.dataset.lines = String(lines.count);
        gutter.textContent = lines.value;
      }
      gutter.scrollTop = textarea.scrollTop;
      positionGutter(textarea, gutter);
    }
  });
}

function bridgeSettingsFromProfile() {
  if (document.body?.dataset.v240SettingsBridge === RELEASE) return;
  if (!document.body) return;
  document.body.dataset.v240SettingsBridge = RELEASE;
  document.addEventListener("click", (event) => {
    const settings = event.target.closest(".sn-account-settings-v135");
    if (!settings || document.documentElement.dataset.v239AccountSurface !== "profile") return;
    document.documentElement.dataset.v240SettingsBridge = "running";
    requestAnimationFrame(() => {
      const avatar = document.querySelector(".sn-avatar");
      avatar?.click();
      const pick = (remaining = 16) => {
        const button = document.querySelector('.sn-profile-menu-v150 [data-v239-action="settings"]');
        if (button) {
          button.click();
          document.documentElement.dataset.v240SettingsBridge = "done";
          return;
        }
        if (remaining > 0) requestAnimationFrame(() => pick(remaining - 1));
      };
      pick();
    });
  }, true);
}

function safeEnhance() {
  frame = 0;
  document.documentElement.dataset.studioReactSafeV240 = RELEASE;
  ensureShadowLayoutMap();
  ensurePortalGutters();
  bridgeSettingsFromProfile();
}

function schedule() {
  preemptUnsafeV239DomRewrites();
  if (frame) return;
  frame = requestAnimationFrame(safeEnhance);
}

preemptUnsafeV239DomRewrites();
new MutationObserver(schedule).observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "data-nara-size", "hidden", "aria-expanded"],
});
window.addEventListener("resize", schedule, { passive: true });
window.addEventListener("scroll", schedule, { passive: true, capture: true });
document.addEventListener("click", (event) => {
  if (popover && !popover.contains(event.target)) removePopover();
});
schedule();
