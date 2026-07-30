export const THEME_LAYOUT_RUNTIME_V170 = "theme-layout-v170-20260730";

const TOP_AREAS = [
  "top-left-1", "top-left-2", "top-left-3",
  "top-right-1", "top-right-2", "top-right-3",
];
const LEFT_AREAS = ["sidebar-left-1", "sidebar-left-2", "sidebar-left-3"];
const RIGHT_AREAS = ["sidebar-right-1", "sidebar-right-2", "sidebar-right-3"];
const BOTTOM_AREAS = [
  "bottom-left-1", "bottom-left-2", "bottom-left-3",
  "bottom-right-1", "bottom-right-2", "bottom-right-3",
];

function escapeAttribute(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[character]));
}

function slotMarkup(widgets, renderWidgets, area, className = "") {
  const markup = renderWidgets(widgets, area);
  if (!markup) return "";
  return `<section class="ng-widget-slot ${escapeAttribute(className || area)}" data-layout-area="${escapeAttribute(area)}" aria-label="Widget ${escapeAttribute(area)}">${markup}</section>`;
}

function zoneMarkup(widgets, renderWidgets, areas, className, label) {
  const slots = areas.map((area) => slotMarkup(widgets, renderWidgets, area)).join("");
  return slots ? `<section class="ng-widget-zone ${className}" aria-label="${escapeAttribute(label)}">${slots}</section>` : "";
}

function wrapMain(sourceHtml, widgets, renderWidgets) {
  const before = slotMarkup(widgets, renderWidgets, "before-content", "before-content");
  const after = slotMarkup(widgets, renderWidgets, "after-content", "after-content");
  const left = zoneMarkup(widgets, renderWidgets, LEFT_AREAS, "sidebar-left", "Tiga area widget kiri postingan");
  const right = zoneMarkup(widgets, renderWidgets, RIGHT_AREAS, "sidebar-right", "Tiga area widget kanan postingan");
  const opening = sourceHtml.match(/<main\b[^>]*>/i);

  if (!opening || opening.index == null) {
    return `<main class="ng-layout-main-v170">${before}<div class="ng-content-grid-v170">${left}<div class="ng-main-content-v170">${sourceHtml}</div>${right}</div>${after}</main>`;
  }

  const openStart = opening.index;
  const openEnd = openStart + opening[0].length;
  const closeStart = sourceHtml.toLowerCase().lastIndexOf("</main>");
  if (closeStart < openEnd) return sourceHtml;

  const inner = sourceHtml.slice(openEnd, closeStart);
  const wrappedInner = `${before}<div class="ng-content-grid-v170">${left}<div class="ng-main-content-v170">${inner}</div>${right}</div>${after}`;
  return `${sourceHtml.slice(0, openEnd)}${wrappedInner}${sourceHtml.slice(closeStart)}`;
}

function injectBeforeFirstTag(html, tagName, markup) {
  if (!markup) return html;
  const expression = new RegExp(`<${tagName}\\b`, "i");
  return expression.test(html) ? html.replace(expression, `${markup}<$&`.replace("<<", "<")) : `${html}${markup}`;
}

export function composeThemeLayoutV170(sourceHtml, widgets, renderWidgets) {
  const top = zoneMarkup(widgets, renderWidgets, TOP_AREAS, "top-grid", "Enam area widget atas");
  const bottom = zoneMarkup(widgets, renderWidgets, BOTTOM_AREAS, "bottom-grid", "Enam area widget bawah");
  let html = wrapMain(String(sourceHtml || ""), widgets, renderWidgets);

  if (top) {
    const mainIndex = html.search(/<main\b/i);
    html = mainIndex >= 0 ? `${html.slice(0, mainIndex)}${top}${html.slice(mainIndex)}` : `${top}${html}`;
  }
  if (bottom) {
    const footerIndex = html.search(/<footer\b/i);
    html = footerIndex >= 0 ? `${html.slice(0, footerIndex)}${bottom}${html.slice(footerIndex)}` : `${html}${bottom}`;
  }

  return { html, css: THEME_LAYOUT_CSS_V170 };
}

export const THEME_LAYOUT_CSS_V170 = `
.ng-widget-zone,.ng-widget-slot,.ng-content-grid-v170,.ng-main-content-v170{min-width:0;max-width:100%;box-sizing:border-box}
.ng-widget-zone.top-grid,.ng-widget-zone.bottom-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:14px;width:100%;padding:24px clamp(16px,4vw,64px)}
.ng-content-grid-v170{display:grid;grid-template-columns:minmax(170px,.24fr) minmax(0,1fr) minmax(170px,.24fr);align-items:start;gap:20px;width:100%}
.ng-main-content-v170{min-width:0;max-width:100%;overflow:hidden}
.ng-widget-zone.sidebar-left,.ng-widget-zone.sidebar-right{display:grid;grid-template-columns:minmax(0,1fr);align-content:start;gap:14px;padding:0}
.ng-widget-slot.before-content,.ng-widget-slot.after-content{margin:18px 0;width:100%}
.ng-widget-slot>.ng-widget{height:100%}
.ng-widget-area{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:14px;width:100%;min-width:0}
.ng-widget{min-width:0;max-width:100%;padding:18px;border:1px solid color-mix(in srgb,currentColor,transparent 82%);border-radius:14px;background:color-mix(in srgb,var(--surface,#fff),white 10%);overflow:hidden}
.ng-widget h3{margin:0 0 12px;font-size:1rem;line-height:1.25;overflow-wrap:anywhere}.ng-widget p{margin:.5rem 0;opacity:.78;overflow-wrap:anywhere}
.ng-widget ol,.ng-widget ul{margin:0;padding-left:1.25rem}.ng-widget li+li{margin-top:.45rem}.ng-widget nav{display:flex;flex-wrap:wrap;gap:8px}
.ng-widget a{display:inline-flex;max-width:100%;color:inherit;text-decoration:none;overflow-wrap:anywhere}.ng-widget form{display:flex;gap:8px;flex-wrap:wrap}
.ng-widget input,.ng-widget textarea,.ng-widget select{min-width:0;max-width:100%;flex:1 1 150px;padding:10px;border:1px solid #9996;border-radius:8px;background:transparent;color:inherit}
.ng-widget button{min-height:40px;max-width:100%;border:0;border-radius:8px;padding:0 13px;background:var(--primary,#2d6edf);color:#fff;font-weight:700}
.ng-widget img,.ng-widget video,.ng-widget iframe,.ng-main-content-v170 img,.ng-main-content-v170 video,.ng-main-content-v170 iframe{max-width:100%;height:auto}
.ng-widget table,.ng-main-content-v170 table{display:block;max-width:100%;overflow-x:auto}.widget-gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.widget-gallery i{aspect-ratio:1;background:currentColor;opacity:.12;border-radius:8px}
@media(max-width:1100px){.ng-content-grid-v170{grid-template-columns:minmax(140px,.22fr) minmax(0,1fr) minmax(140px,.22fr);gap:14px}.ng-widget-zone.top-grid,.ng-widget-zone.bottom-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:820px){.ng-widget-zone.top-grid,.ng-widget-zone.bottom-grid{grid-template-columns:repeat(2,minmax(0,1fr));padding:18px 14px}.ng-content-grid-v170{grid-template-columns:minmax(0,1fr);gap:14px}.ng-main-content-v170{order:1}.ng-widget-zone.sidebar-left{order:2;grid-template-columns:repeat(3,minmax(0,1fr))}.ng-widget-zone.sidebar-right{order:3;grid-template-columns:repeat(3,minmax(0,1fr))}.ng-widget-slot.before-content,.ng-widget-slot.after-content{margin:14px 0}.ng-widget{padding:15px}}
@media(max-width:560px){.ng-widget-zone.top-grid,.ng-widget-zone.bottom-grid,.ng-widget-zone.sidebar-left,.ng-widget-zone.sidebar-right{grid-template-columns:minmax(0,1fr)}.ng-widget-zone.top-grid,.ng-widget-zone.bottom-grid{padding:14px 10px}.ng-widget form{display:grid;grid-template-columns:minmax(0,1fr)}.ng-widget input,.ng-widget textarea,.ng-widget select,.ng-widget button{width:100%;max-width:100%}}
`;
