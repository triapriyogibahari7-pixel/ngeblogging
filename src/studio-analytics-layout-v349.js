export const RELEASE = "studio-analytics-layout-v349-20260929-text-only-cleanup";

function analyticsView() {
  const views = [...document.querySelectorAll(".sn-main > .sn-view-pad")];
  return views.find((view) => {
    const heading = view.querySelector(".sn-page-title h1, .sn-analytics-page-title h1");
    return String(heading?.textContent || "").trim().toLowerCase() === "analitik";
  }) || null;
}

function hideDuplicateToolbarText(view) {
  if (!view) return;
  const targets = [
    "RINGKASAN ANALITIK",
    "PERFORMA SITUS",
    "PANTAU KUNJUNGAN, PENGUNJUNG, DAN SUMBER TRAFIK DALAM SATU TAMPILAN.",
  ];
  const normalize = (value) => String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  const containsTarget = (value) => {
    const text = normalize(value);
    return targets.some((target) => text.includes(target));
  };

  const hasInteractive = (node) => !!node?.querySelector?.(
    "button, select, input, textarea, a[href]"
  );

  // Only clean the duplicate text layer inside analytics toolbars.
  // Never remove the real page title, metric cards, or toolbar controls.
  view.querySelectorAll(".op41-toolbar, .op41-clean-toolbar").forEach((toolbar) => {
    [...toolbar.children].forEach((child) => {
      if (!containsTarget(child.textContent)) return;
      if (hasInteractive(child)) return;
      child.remove();
    });
  });

  // Legacy heading class from earlier analytics renderers.
  view.querySelectorAll(".op41-clean-heading").forEach((node) => node.remove());

  // If an old renderer split the duplicate heading into several text nodes,
  // remove only those text-only descendants from the toolbar.
  view.querySelectorAll(".op41-toolbar, .op41-clean-toolbar").forEach((toolbar) => {
    const walker = document.createTreeWalker(toolbar, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach((textNode) => {
      if (!containsTarget(textNode.nodeValue)) return;
      textNode.nodeValue = "";
    });
  });
}
function normalizeTitle(view) {
  if (!view) return false;
  view.classList.add("sn-analytics-view-v349");
  view.dataset.analyticsLayoutV349 = RELEASE;

  const titles = [...view.querySelectorAll(":scope > .sn-page-title, :scope > .sn-analytics-page-title")];
  const primary = titles.find((node) => String(node.querySelector("h1")?.textContent || "").trim().toLowerCase() === "analitik") || titles[0];
  if (!primary) return true;

  titles.forEach((node) => {
    if (node !== primary) {
      node.hidden = true;
      node.setAttribute("aria-hidden", "true");
      node.dataset.analyticsLegacyTitle = "hidden-v349";
    }
  });

  primary.hidden = false;
  primary.removeAttribute("aria-hidden");
  primary.classList.add("sn-analytics-primary-title-v349");

  const headings = [...primary.querySelectorAll("h1")];
  headings.slice(1).forEach((node) => {
    node.hidden = true;
    node.setAttribute("aria-hidden", "true");
  });
  primary.querySelectorAll("small").forEach((node) => {
    node.hidden = true;
    node.setAttribute("aria-hidden", "true");
  });

  const firstHeading = headings[0];
  if (firstHeading) {
    firstHeading.textContent = "Analitik";
    firstHeading.setAttribute("aria-label", "Analitik");
  }
  return true;
}

let frame = 0;
function sync() {
  frame = 0;
  const view = analyticsView();
  normalizeTitle(view);
  hideDuplicateToolbarText(view);
}

function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(sync);
}

if (typeof document !== "undefined") {
  const observer = new MutationObserver(schedule);
  const start = () => {
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "hidden", "aria-hidden"],
    });
    schedule();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("orientationchange", schedule, { passive: true });
  window.addEventListener("ngeblogging:studio-device-mode-change", schedule);
}

export { analyticsView, normalizeTitle, sync };
