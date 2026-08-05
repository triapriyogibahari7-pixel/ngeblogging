import { BUILT_IN_THEMES } from "./theme-catalog.js";

export const STUDIO_THEME_CATALOG_RELEASE_V296 = "studio-theme-catalog-100-v296-20260805";
export const STUDIO_THEME_TARGET_V296 = 100;

const TEMPLATE_INDEXES = [0, 10, 20, 35, 50];
const EXTRA_SPECS = [
  { suffix: "creator", name: "Creator Custom", category: "Kreatif", badge: "Custom", hueShift: 28, accentShift: 116, shellClass: "creator" },
  { suffix: "signal", name: "Signal Custom", category: "Berita", badge: "Live", hueShift: 202, accentShift: 18, shellClass: "signal" },
  { suffix: "venture", name: "Venture Custom", category: "Bisnis", badge: "Pro", hueShift: 146, accentShift: 48, shellClass: "venture" },
  { suffix: "folio", name: "Folio Custom", category: "Portofolio", badge: "Gallery", hueShift: 318, accentShift: 42, shellClass: "folio" },
  { suffix: "manual", name: "Manual Custom", category: "Dokumentasi", badge: "Docs", hueShift: 222, accentShift: 84, shellClass: "manual" },
];

function hsl(h, s, l) {
  const hue = ((Number(h) % 360) + 360) % 360;
  return `hsl(${hue} ${s}% ${l}%)`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function replaceThemeId(source, from, to) {
  return String(source || "").split(from).join(to);
}

function customCode(base, nextId, spec, index) {
  const html = replaceThemeId(base.code?.html, base.id, nextId).replace(
    /(<div class="ng-theme[^>]*>)/,
    `$1<section class="ng-v296-custom-strip ng-v296-${spec.shellClass}" data-v296-variant="${index + 1}"><b>${spec.name}</b><span>Theme Studio Custom · HTML/CSS/JS</span></section>`,
  );
  const css = `${replaceThemeId(base.code?.css, base.id, nextId)}\n/* ${STUDIO_THEME_CATALOG_RELEASE_V296}:${spec.suffix} */\n.ng-v296-custom-strip{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:10px clamp(16px,5vw,70px);border-bottom:1px solid var(--line);font-size:.78rem;letter-spacing:.04em;background:color-mix(in srgb,var(--surface),var(--accent) 7%)}.ng-v296-custom-strip span{opacity:.66}.ng-v296-${spec.shellClass}{border-top:3px solid var(--accent)}@media(max-width:720px){.ng-v296-custom-strip{align-items:flex-start;flex-direction:column;gap:2px;padding:9px 16px}}`;
  const javascript = `${replaceThemeId(base.code?.javascript, base.id, nextId)}\n(()=>{const root=document.querySelector('[data-theme="${nextId}"]');if(root)root.dataset.customCatalogV296="${spec.suffix}";})();`;
  return { enabled: false, html, css, javascript };
}

function createExtraTheme(base, spec, index) {
  const theme = clone(base);
  const nextId = `custom-${spec.suffix}-v296`;
  const primaryHue = spec.hueShift;
  const accentHue = spec.accentShift;
  theme.id = nextId;
  theme.name = spec.name;
  theme.category = spec.category;
  theme.badge = spec.badge;
  theme.description = `${spec.name} adalah tema custom bawaan ke-${96 + index}: struktur berasal dari keluarga ${base.name}, lalu ditambah blok identitas, HTML, CSS, JavaScript, palet, dan fingerprint v296 yang berbeda.`;
  theme.features = ["Custom HTML", "Custom CSS", "Custom JavaScript", ...(base.features || []).slice(0, 2)];
  theme.colors = {
    ...theme.colors,
    primary: hsl(primaryHue, 62 + index * 2, 34 + index),
    accent: hsl(accentHue, 78, 50 + (index % 2) * 4),
    surface: hsl(primaryHue + 8, 28, index === 1 ? 12 : 97),
    ink: index === 1 ? hsl(primaryHue + 4, 18, 92) : hsl(primaryHue + 4, 34, 14),
  };
  theme.defaultWidgetIds = [...new Set([...(base.defaultWidgetIds || []), "search", index % 2 ? "recent-posts" : "popular-posts"])].slice(0, 5);
  theme.code = customCode(base, nextId, spec, index);
  theme.catalogRelease = STUDIO_THEME_CATALOG_RELEASE_V296;
  theme.catalogOrdinal = 96 + index;
  return theme;
}

export function ensureThemeCatalog100V296() {
  if (!Array.isArray(BUILT_IN_THEMES)) return 0;
  if (BUILT_IN_THEMES.length >= STUDIO_THEME_TARGET_V296) return BUILT_IN_THEMES.length;

  const existing = new Set(BUILT_IN_THEMES.map((theme) => theme?.id));
  for (let index = 0; index < EXTRA_SPECS.length && BUILT_IN_THEMES.length < STUDIO_THEME_TARGET_V296; index += 1) {
    const spec = EXTRA_SPECS[index];
    const id = `custom-${spec.suffix}-v296`;
    if (existing.has(id)) continue;
    const base = BUILT_IN_THEMES[TEMPLATE_INDEXES[index]] || BUILT_IN_THEMES[index] || BUILT_IN_THEMES[0];
    if (!base) break;
    BUILT_IN_THEMES.push(createExtraTheme(base, spec, index));
    existing.add(id);
  }
  return BUILT_IN_THEMES.length;
}

function syncVisibleThemeCount() {
  const count = ensureThemeCatalog100V296();
  document.documentElement.dataset.studioThemeCatalogV296 = STUDIO_THEME_CATALOG_RELEASE_V296;
  document.documentElement.dataset.studioThemeCount = String(count);
  document.querySelectorAll(".tn-command span,.tn-library header h2,.tn-audit-strip article:first-child b").forEach((node) => {
    if (!node) return;
    if (node.matches(".tn-audit-strip article:first-child b")) {
      node.textContent = String(count);
      return;
    }
    node.textContent = String(node.textContent || "").replace(/\b\d+\s+tema\b/i, `${count} tema`);
  });
}

let frame = 0;
function schedule(delay = 0) {
  if (delay) {
    window.setTimeout(() => schedule(), delay);
    return;
  }
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    syncVisibleThemeCount();
  });
}

ensureThemeCatalog100V296();

if (typeof window !== "undefined" && typeof document !== "undefined") {
  document.addEventListener("click", () => { schedule(); schedule(120); schedule(500); }, false);
  window.addEventListener("pageshow", () => schedule(80), { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", () => schedule(80));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(80); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => schedule(120), { once: true });
  else schedule(80);
}
