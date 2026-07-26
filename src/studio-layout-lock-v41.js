const RELEASE = "studio-responsive-v41-20260726";
const RESERVED_HOSTS = new Set(["ngeblogging.com", "www.ngeblogging.com", "studio.ngeblogging.com", "api.ngeblogging.com"]);
const attached = new WeakSet();
let frame = 0;

function syncDevice(layer) {
  const selected = ["desktop", "tablet", "mobile"].includes(layer.dataset.lb40Preview)
    ? layer.dataset.lb40Preview
    : window.innerWidth <= 620 ? "mobile" : window.innerWidth <= 980 ? "tablet" : "desktop";
  layer.dataset.previewDevice = selected;
}

function upgradeBuilder(layer) {
  if (!(layer instanceof HTMLElement)) return;
  layer.querySelectorAll(".lb36-layer").forEach((legacy) => legacy.remove());
  syncDevice(layer);
  if (attached.has(layer)) return;
  attached.add(layer);
  layer.dataset.lb41Upgraded = "true";
  layer.addEventListener("click", (event) => {
    if (!event.target.closest("[data-lb40-mode]")) return;
    requestAnimationFrame(() => syncDevice(layer));
  });
}

function publicLayoutCss() {
  return `
  .ng-layout-v39,.ng-layout-v39 *{box-sizing:border-box}
  .ng-layout-v39{width:100%;min-width:0;max-width:100%;overflow-x:clip}
  .ng-layout-header,.ng-layout-footer,.ng-layout-body,.ng-layout-slot,.ng-layout-center,.ng-layout-side{min-width:0;max-width:100%}
  .ng-layout-body{grid-template-areas:"left center right";grid-template-columns:minmax(180px,.58fr) minmax(0,1.7fr) minmax(180px,.58fr)!important}
  .ng-layout-body>[data-slot="sidebar-left"]{grid-area:left}
  .ng-layout-center{grid-area:center;overflow:hidden}
  .ng-layout-body>[data-slot="sidebar-right"]{grid-area:right}
  .ng-layout-slot>.ng-widget,.ng-widget img,.ng-widget video,.ng-widget iframe{max-width:100%;min-width:0}
  @media(max-width:1080px){
    .ng-layout-body{grid-template-areas:"center center" "left right";grid-template-columns:repeat(2,minmax(0,1fr))!important}
    .ng-layout-center{margin-bottom:4px}
  }
  @media(max-width:700px){
    .ng-layout-header,.ng-layout-footer{grid-template-columns:minmax(0,1fr)!important;padding:12px!important}
    .ng-layout-body{grid-template-areas:"center" "left" "right";grid-template-columns:minmax(0,1fr)!important;padding:0 10px!important;gap:10px!important}
    .ng-layout-below,.ng-layout-before,.ng-layout-after,.ng-layout-footer-wide{padding-left:10px!important;padding-right:10px!important}
    .ng-layout-side{gap:10px!important}
    .ng-layout-copyright{padding:12px 10px!important;font-size:.72rem!important;overflow-wrap:anywhere}
  }`;
}

function injectPublicAuthority(doc) {
  if (!doc?.documentElement) return;
  doc.documentElement.dataset.ngLayoutResponsiveV41 = RELEASE;
  let style = doc.head?.querySelector("style[data-layout-responsive-v41]");
  if (!style && doc.head) {
    style = doc.createElement("style");
    style.dataset.layoutResponsiveV41 = "true";
    doc.head.append(style);
  }
  if (style && style.textContent !== publicLayoutCss()) style.textContent = publicLayoutCss();
}

function upgradeFrame(frameElement) {
  try {
    const run = () => injectPublicAuthority(frameElement.contentDocument);
    frameElement.addEventListener("load", run, { once:true });
    run();
  } catch {
    // Cross-origin and hardened previews remain untouched.
  }
}

function scan() {
  document.documentElement.dataset.studioResponsiveV41 = RELEASE;
  document.querySelectorAll(".lb36-layer").forEach((legacy) => legacy.remove());
  document.querySelectorAll(".lb39-layer").forEach(upgradeBuilder);
  document.querySelectorAll(".tn-frame-shell iframe").forEach(upgradeFrame);
  const host = location.hostname.toLowerCase();
  if (host.endsWith(".ngeblogging.com") && !RESERVED_HOSTS.has(host)) injectPublicAuthority(document);
}

function schedule() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(scan);
}

new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length || mutation.removedNodes.length)) schedule();
}).observe(document.documentElement, { childList:true, subtree:true });

window.addEventListener("resize", schedule);
scan();
